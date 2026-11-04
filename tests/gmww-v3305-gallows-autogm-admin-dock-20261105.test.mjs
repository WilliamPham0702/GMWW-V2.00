// V3.305 (05/11/2026) — 7 yêu cầu chủ dự án:
// 1 mục tiêu chạy tại chỗ trên Player Web · 2 icon hành động cao hơn (không che chat) · 3 vào ván bật Auto GM
// 4 menu GM góc phải trên (Cứu/Giết/Cấm Chat/Auto GM) · 5 dải Thông cáo Làng trên menu trên Player
// 6 Server tự phát đếm ngược 30 giây cuối tới Player Web · 7 hết giờ thảo luận → Lên Giàn rồi mới sang Đêm.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import * as rules from '../src/gmww-gallows-rules.js';
import {gmwwMembersLiveScript as live} from '../src/gmww-members-live.js';

const worker=readFileSync('src/index.js','utf8');
const gm=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const village=readFileSync('assets/village/village.mjs','utf8');
const slice=(src,a,b)=>{const i=src.indexOf(a);assert.ok(i>=0,a+' missing');const j=src.indexOf(b,i+a.length);assert.ok(j>i,b+' missing');return src.slice(i,j)};
const memStorage=()=>{const data=new Map(),storage={data,get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},delete:async k=>data.delete(k),
  list:async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix))),transaction:async fn=>fn(storage)};return storage};

// ---------- 7. Lên Giàn trước khi sang Đêm ----------
test('7a. autoGallowsDue: discussion end waits for the Gallows deadlines, never jumps to night',()=>{
  const meta={matchId:'m',cycleKey:'morning-1'},now=1_000_000,due=now-1;
  assert.equal(rules.autoGallowsDue(null,meta,now+5000,now),now+5000,'discussion still running');
  assert.equal(rules.autoGallowsDue(null,meta,due,now),now,'no ballot yet → act now (open nomination)');
  const b=x=>({matchId:'m',cycleKey:'morning-1',mode:'auto',...x});
  assert.equal(rules.autoGallowsDue(b({stage:'nominating',nominationDeadlineAt:now+60000}),meta,due,now),now+60000);
  assert.equal(rules.autoGallowsDue(b({stage:'selecting',hangingStartedAt:now}),meta,due,now),now+rules.AUTO_GALLOWS_LOCK_PAUSE_MS);
  assert.equal(rules.autoGallowsDue(b({stage:'voting',deadlineAt:now+60000}),meta,due,now),now+60000);
  assert.equal(rules.autoGallowsDue(b({stage:'resolved',resolvedAt:now}),meta,due,now),now+30000,'verdict shown 30s');
  assert.equal(rules.autoGallowsDue(b({stage:'resolved',resolvedAt:now,acknowledgedAt:now}),meta,due,now),due,'GM acknowledged → night');
  assert.equal(rules.autoGallowsDue(b({stage:'ready',mode:'gm'}),meta,due,now),0,'GM manual Gallows: Auto GM holds the day');
  assert.equal(rules.autoGallowsDue({...b({stage:'resolved',resolvedAt:1}),cycleKey:'morning-0'},meta,due,now),now,'old ballot ignored');
});

function makeRoom(){
  const methods=slice(worker,'  async autoAdvanceDue(meta){','  async gmTurn(request,body){');
  const sch=slice(methods,'  async scheduleRoomAlarm(','  async runAutoAdvanceIfDue(');
  const Room=vm.runInNewContext('(class Room {'+methods.replace(sch,'')+`
    async scheduleRoomAlarm(){this.scheduled++}
    async getNightRuntime(){return null}
    async applyCycle(meta,p,n,key,src){this.cycles.push([p,n,key,src])}
    async gallowsState(meta){
      const key="gallows:"+meta.matchId+":"+meta.cycleKey,now=Date.now();
      let b=await this.ctx.storage.get(key)||{id:"g",matchId:meta.matchId,cycleKey:meta.cycleKey,stage:"ready",mode:"auto",
        nominationDurationSec:60,voteDurationSec:60,nominations:{},votes:{},eligible:["a","b","c"],blockedNomination:[],blockedVotes:[]};
      if(b.stage==="nominating"&&now>=b.nominationDeadlineAt){b=gallowsCloseNomination(b,now).value;await this.ctx.storage.put(key,b)}
      if(b.stage==="voting"&&now>=b.deadlineAt){b=gallowsResolve(b,gallowsAutomaticOutcome(b),now).value;await this.ctx.storage.put(key,b)}
      return {key,ballot:b,eligible:b.eligible};
    }
  })`,{...rules,publicRoom:m=>({code:m.code}),Date,Math,Number,String,Object,Array,JSON});
  const room=new Room();room.ctx={storage:memStorage()};room.cycles=[];room.sent=[];room.scheduled=0;room.broadcast=m=>room.sent.push(m);
  return room;
}

test('7b. Reproduces the bug: discussion timeout used to go straight to Night; now opens nominations',async()=>{
  const room=makeRoom(),started=Date.now()-301000;
  const meta={phase:'running',autoGM:true,cyclePhase:'morning',cycleNight:1,matchId:'m',cycleKey:'morning-1',code:'ABC',
    cycleStartedAt:new Date(started).toISOString(),dayDeadlineAt:new Date(started+300000).toISOString()};
  await room.ctx.storage.put('meta',meta);await room.ctx.storage.put('gameConfig',{timing:{villageDiscussionSec:300}});
  assert.ok(await room.autoAdvanceDue(meta)<=Date.now()+25,'discussion deadline is due');
  assert.equal(await room.runAutoAdvanceIfDue(meta),true);
  assert.equal(room.cycles.length,0,'NOT night yet');
  const g=room.ctx.storage.data.get('gallows:m:morning-1');
  assert.equal(g.stage,'nominating','Auto GM opened nominations');
  assert.equal(room.sent.at(-1).type,'gallows_updated');
  assert.ok(await room.autoAdvanceDue(meta)>Date.now()+50000,'next wake-up = nomination deadline');

  // Nomination closes with a unique leader → locked, then after the short pause vote opens.
  g.nominations={a:'c',b:'c',c:'a'};g.nominationDeadlineAt=Date.now()-1;
  await room.runAutoAdvanceIfDue(meta);
  let s=room.ctx.storage.data.get('gallows:m:morning-1');
  assert.equal(s.stage,'selecting');assert.equal(s.candidateId,'c');assert.equal(room.cycles.length,0);
  s.hangingStartedAt=Date.now()-rules.AUTO_GALLOWS_LOCK_PAUSE_MS-1;
  await room.runAutoAdvanceIfDue(meta);
  s=room.ctx.storage.data.get('gallows:m:morning-1');
  assert.equal(s.stage,'voting','Chốt đề cử → mở bỏ phiếu Sống/Chết');assert.equal(s.candidateId,'c');assert.equal(room.cycles.length,0);

  // Vote ends → verdict; night only after 30s verdict or GM acknowledgment.
  s.votes={a:'👎',b:'👎'};s.deadlineAt=Date.now()-1;
  await room.runAutoAdvanceIfDue(meta);
  s=room.ctx.storage.data.get('gallows:m:morning-1');
  assert.equal(s.stage,'resolved');assert.equal(s.outcome,'dead');assert.equal(room.cycles.length,0);
  s.acknowledgedAt=Date.now();
  await room.runAutoAdvanceIfDue(meta);
  assert.equal(JSON.stringify(room.cycles),JSON.stringify([['night',2,'night-2','auto']]),'Đêm sau khi có kết quả Lên Giàn');
});

test('7c. Tied nominations end the Gallows without a vote, then night; GM manual mode holds',async()=>{
  const room=makeRoom(),meta={phase:'running',autoGM:true,cyclePhase:'morning',cycleNight:2,matchId:'m',cycleKey:'morning-2',
    dayDeadlineAt:new Date(Date.now()-1).toISOString()};
  await room.runAutoAdvanceIfDue(meta);
  const g=room.ctx.storage.data.get('gallows:m:morning-2');g.nominations={a:'b',b:'a'};g.nominationDeadlineAt=Date.now()-1;
  await room.runAutoAdvanceIfDue(meta);
  const s=room.ctx.storage.data.get('gallows:m:morning-2');
  assert.equal(s.outcome,'no_lynch');assert.equal(room.cycles.length,0);
  s.resolvedAt=Date.now()-30001;
  await room.runAutoAdvanceIfDue(meta);
  assert.equal(JSON.stringify(room.cycles),JSON.stringify([['night',3,'night-3','auto']]));
  const manual=makeRoom();
  await manual.ctx.storage.put('gallows:m:morning-1',{matchId:'m',cycleKey:'morning-1',stage:'ready',mode:'gm',eligible:['a']});
  const m1={...meta,cycleNight:1,cycleKey:'morning-1'};
  assert.equal(await manual.autoAdvanceDue(m1),0);
  assert.equal(await manual.runAutoAdvanceIfDue(m1),false);assert.equal(manual.cycles.length,0);
});

test('7d. GM shows each new Gallows stage started by the Server',()=>{
  assert.match(gm,/\['nominating','voting','closed','resolved'\]\.includes\(stage\)&&battleState\.gallowsShowKey!==key/);
});

// ---------- 3. Auto GM mặc định bật khi vào ván ----------
test('3. Starting a real match turns Auto GM ON (even if the last match paused it); DEMO stays off',()=>{
  const start=slice(worker,'meta.phase="running";meta.status="running";meta.gmStage="battle";','await this.scheduleRoomAlarm(meta);');
  assert.match(start,/if\(meta\.demo!==true\)meta\.autoGM=true;/);
  assert.match(start,/if\(meta\.demo\)\{\s*meta\.autoGM=false;/);
  assert.match(gm,/await playRoomApi\('\/start'[^\n]*\n\s*if\(playSceneRuntime\.room\?\.demo!==true\)\{playSceneState\.autoGM=true;savePlayScene\(\)\}/);
});

// ---------- 6. Đếm ngược 30 giây cuối trên Player Web ----------
test('6. Server publishes the 30s countdown to every Player at deadline-30s, once per day, without the GM app',async()=>{
  const recording=worker.split('// BEGIN RECORDED PUBLIC ANNOUNCEMENTS')[1].split('// END RECORDED PUBLIC ANNOUNCEMENTS')[0];
  const mod=vm.runInNewContext(recording+';({announcementCue,dayAnnouncementTargets,saveAnnouncementTarget,announcementLibrary,decodeRecording,readAnnouncementBlob,DAY_COUNTDOWN_MS})',
    {Response,Uint8Array,atob,crypto:webcrypto,Object,Date,Math,Number,String,Array,Set});
  const methods=slice(worker,'  async currentAnnouncement(meta,runtime){','  async gmRoleAssets(');
  const Room=vm.runInNewContext('(class Room {'+methods+'})',{...mod,normalizeLoginId:x=>String(x||'').toLowerCase(),
    j:(data,status)=>Response.json(data,{status}),setTimeout,Response,Date,Math,Number,String,Array});
  const s=memStorage(),sent=[],room=new Room();room.ctx={storage:s};room.broadcast=m=>sent.push(m);
  let alarms=0;room.scheduleRoomAlarm=async()=>{alarms++};
  const deadline=Date.now()+20000;
  const meta={phase:'running',autoGM:true,cyclePhase:'morning',cycleNight:1,matchId:'m',cycleKey:'morning-1',code:'ABCDEF',dayDeadlineAt:new Date(deadline).toISOString()};
  await s.put('meta',meta);room.gmAuthorized=async()=>({ok:true,meta});
  assert.equal(await room.dayCountdownDue(meta),0,'no clip uploaded yet');
  const clip=new Uint8Array(400).fill(7);clip.set(new TextEncoder().encode('ID3'));
  const up=await room.gmAnnouncement({},{target:'system:audio_system_countdown',mime:'audio/mpeg',base64:Buffer.from(clip).toString('base64')});
  assert.equal(up.status,200);assert.equal(alarms,1,'upload re-arms the room alarm');
  assert.ok(Math.abs(await room.dayCountdownDue(meta)-Date.now())<50,'already inside the last 30s → due now');
  assert.equal(await room.dayCountdownCue(meta),true);
  const cue=sent.at(-1);
  assert.equal(cue.type,'announcement_ready');
  assert.equal(cue.audioCue.audio.length,1);
  assert.equal(cue.audioCue.startedAt,deadline-30000,'Players join at the Server countdown position');
  assert.equal(await room.dayCountdownCue(meta),false,'never twice per day');
  assert.equal(await room.dayCountdownDue({...meta,autoGM:false,cycleKey:'morning-2'}),0,'paused day clock: no countdown');
  assert.equal(await room.dayCountdownDue({...meta,demo:true,cycleKey:'morning-2'}),0);
  const later={...meta,cycleKey:'morning-2',dayDeadlineAt:new Date(Date.now()+200000).toISOString()};
  assert.ok(await room.dayCountdownDue(later)>Date.now()+160000,'next day: scheduled at deadline-30s');
  assert.match(worker,/if\(typeof this\.dayCountdownCue==="function"&&await this\.dayCountdownCue\(meta\)\)/);
  assert.match(worker,/countdownDue=typeof this\.dayCountdownDue==="function"\?await this\.dayCountdownDue\(meta\):0/);
});

test('6b. GM pre-uploads the countdown clip at day start and never publishes it twice',()=>{
  assert.match(gm,/gmwwServerDayCues=\[\{kind:'system',targetId:'audio_system_countdown'/);
  assert.match(gm,/battleMorningPlayAudio=function\(\)\{void gmwwPublishAnnouncement\(null\);\s*gmwwAnnouncementQueue=gmwwAnnouncementQueue\.then\(\(\)=>gmwwUploadAnnouncementCues\(gmwwServerDayCues\)\)/);
  assert.match(slice(gm,'function gmwwPublishDayAnnouncement(cues){','\nbattleQueueDayAudio='),/c\[0\]!=='audio_system_countdown'/);
});

// ---------- 4. Menu GM góc phải trên ----------
test('4. GM top-right menu: Cứu · Giết · Cấm Chat · Auto GM, game icons, mounted under #start so it is visible',()=>{
  const mount=slice(gm,'function gmwwGMAdminMount(){','function renderPlayBattle(){');
  const order=[...mount.matchAll(/data-gm-admin="([a-z-]+)"[^>]*><img src="(action-icons\/v3\/[0-9a-z_]+\.webp)"/g)].map(m=>[m[1],m[2]]);
  assert.deepEqual(order,[['revive','action-icons/v3/07_cuu.webp'],['dead','action-icons/v3/15_san_giet.webp'],
    ['mute-chat','action-icons/v3/39_cam_noi.webp'],['auto-gm','action-icons/v3/31_rung_chuong.webp']]);
  for(const [,src] of order)assert.ok(readFileSync('assets/'+src).length>100,src+' is an existing game icon');
  assert.match(mount,/\(document\.getElementById\('start'\)\|\|document\.body\)\.appendChild\(bar\)/,'CSS is scoped to #start');
  assert.doesNotMatch(mount,/document\.body\.appendChild\(bar\)/);
  assert.match(mount,/if\(type==='auto-gm'\)\{void togglePlayAutoGM\(\);return\}/);
  assert.match(mount,/aria-pressed',String\(auto\?!!playSceneState\.autoGM/);
  for(const [type,left] of [['revive',202],['dead',152],['mute-chat',102],['auto-gm',52]])
    assert.ok(css.includes(`#start #gmwwGMAdminDock button[data-gm-admin="${type}"]{left:calc(100vw - ${left}px)}`),type);
  assert.match(readFileSync('server-game/current/GMWW.html','utf8'),/style\.css\?v=gmww-v3305-admin-dock/);
});

// ---------- 5. Thông cáo Làng trên menu trên Player ----------
test('5. Player top menu runs the same Village bulletin right after "Làng ơi dậy đi" (day only)',()=>{
  assert.match(live,/gmwwTopTicker=\{sig,content:safe\.length\?content:''\};gmwwTopTickerRender\(\);/);
  assert.match(live,/if\(typeof gmwwTopTickerRender==='function'\)gmwwTopTickerRender\(\);/);
  const render=slice(live,'function gmwwTopTickerRender(){','\nfunction gmwwVillageTickerUpdate(');
  const list={children:[],get lastElementChild(){return this.children.at(-1)||null},appendChild(n){this.children=this.children.filter(x=>x!==n);this.children.push(n);n.parentNode=this}};
  const mk=()=>{const el={dataset:{},style:{setProperty(k,v){this[k]=v}},attrs:{},setAttribute(k,v){this.attrs[k]=v},remove(){list.children=list.children.filter(x=>x!==el)},
    span:{clientWidth:200},b:{textContent:'',scrollWidth:300,style:{setProperty(k,v){this[k]=v}}},
    querySelector(q){return q==='span'?this.span:this.b},set innerHTML(v){}};return el};
  const root={getElementById:()=>({}),querySelector:q=>q==='#battleTimeline'?list:null,appendChild(){}};
  list.querySelector=()=>list.children.find(x=>x.className==='gmww-top-ticker')||null;
  const ctx={state:{room:{phase:'running',cyclePhase:'morning'}},gmwwTopTicker:{sig:'s1',content:'Đêm qua An đã chết'},
    document:{getElementById:()=>({shadowRoot:root}),createElement:()=>mk()},Math,Number};
  vm.runInNewContext('var gmwwTopTicker=this.gmwwTopTicker;'+render+';gmwwTopTickerRender()',ctx);
  assert.equal(list.children.length,1);assert.equal(list.children[0].b.textContent,'Đêm qua An đã chết');
  assert.equal(list.children[0].attrs.role,'marquee');
  ctx.state.room.cyclePhase='night';
  vm.runInNewContext('var gmwwTopTicker=this.gmwwTopTicker;'+render+';gmwwTopTickerRender()',ctx);
  assert.equal(list.children.length,0,'hidden at night');
});

// ---------- 1. Mục tiêu chạy tại chỗ ----------
test('1. Player Web village: a MỤC TIÊU target runs in place like the GM Server; actor/dead/frozen stay still',()=>{
  assert.match(village,/function animationCommandFor\(data,position\)\{const command=animationCommandBase\(data,position\);return battleStatic&&command\.state!=="dead"/);
  assert.match(village,/normalizeRendererCommand\(\{\.\.\.command,state:"running",motion:"run",activity:"run",paused:false\}/);
  const fn=slice(village,'  function battleTargetRunning(data){','\n');
  const node=cls=>({classList:{contains:c=>cls.split(' ').includes(c)}});
  const run=(cls,data={})=>vm.runInNewContext(fn+';battleTargetRunning(data)',{mountedPlayerNodes:new Map([['p1',node(cls)]]),visuallyDeceased:d=>d.dead===true,data:{id:'p1',...data},String,Array});
  assert.equal(run('player is-battle-target'),true);
  assert.equal(run('player is-battle-target is-battle-actor'),false,'GM rule: the actor itself does not run');
  assert.equal(run('player'),false);
  assert.equal(run('player is-battle-target',{dead:true}),false);
  assert.equal(run('player is-battle-target',{statusTags:[{statusId:'frozen'}]}),false);
  assert.match(village,/new MutationObserver\(list=>\{for\(const m of list\)\{const el=m\.target;if\(el\?\.classList\?\.contains\("player"\)&&targetOn\(el\.className\)!==targetOn\(m\.oldValue\)\)refreshBattleTargetRig\(el\)\}\}\)/);
  assert.match(readFileSync('assets/village/index.html','utf8'),/village\.mjs\?[^"]*target=3305-run/);
});

// ---------- 2. Icon hành động cao hơn ----------
test('2. Action icons sit 48px above the bottom menu on GM and Player, and follow the footer when chat opens',()=>{
  assert.match(live,/bottom=Math\.max\(140,Math\.min\(vh-24,footerTop-48\)\)/);
  assert.match(live,/new ResizeObserver\(replace\)\.observe\(f\)/);
  assert.match(gm,/backup\.top-size\.height\/2-48\);/);
});
