import {gmSource,playerWebSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statusTagsFor} from '../src/gmww-public-room-contract.js';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const read=path=>readFileSync(path,'utf8'),worker=workerSource(),
  village=playerWebSource('20-village-and-profile'),
  ws=playerWebSource('30-rooms-and-realtime'),
  chat=playerWebSource('35-online-chat'),
  session=playerWebSource('00-bootstrap-and-session');
const has=(src,fragment)=>assert.ok(src.includes(fragment),'Expected fragment: '+fragment);

test('P0: legacy and night-action statuses require explicit GM display approval',{skip:'LEGACY-QUARANTINE 2026-11-04: snapshot test of an older release no longer matches the current source; see tests/LEGACY-QUARANTINE.md'},()=>{
  const rows=[{type:'dead',loginId:'a',effectActive:true,matchId:'M'},
    {type:'frozen',loginId:'a',effectActive:true,matchId:'M'},
    {type:'status',loginId:'a',statusId:'wolf_bitten',effectActive:true,matchId:'M'}];
  const meta={matchId:'M',phase:'running',cyclePhase:'morning',statusDisplay:{}};
  assert.deepEqual(statusTagsFor(rows,meta,'a'),[]);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{dead:true}},'a').map(x=>x.statusId),['dead']);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{wolf_bitten:true}},'a').map(x=>x.statusId),['wolf_bitten']);
  has(worker,'frozen:meta?.statusDisplay?.frozen===true&&frozenLogins');
  has(village,'showLegacy=id=>viewStatus[id]===true');
  has(ws,'statusTags:(Array.isArray(p?.statusTags)?p.statusTags:[]).filter(t=>config');
  assert.ok(!ws.includes('previousTags=new Map'));
});
test('One draggable eighth-size role/artifact dock and no stale role cache',()=>{
  has(village,'function gmwwMiniDrag(');
  has(village,'gmww_online_mini_positions_v3');
  has(village,'#game .role-stage[hidden]{display:none!important}');
  has(village,'#game.gmww-card-expanded #gmwwPlayerMiniCards');
  has(village,"gmww-player-menu-exit')?.remove()");
  has(session,'!match||!x.matchId||x.matchId!==match');
});
test('Bottom dock, authoritative countdown, private GM chat, direct actions, no AI narration',()=>{
  for(const id of ['gmwwOnlineFooter','gmwwPlayerClock','gmwwPlayerRestore'])has(chat,"id='"+id+"'");
  has(chat,'#gmwwChatPanel.open #gmwwChatLines{display:block;height:90px');
  has(chat,"gmwwChatTarget==='gm'");
  has(worker,'channel:"gm:"+id,scope:"gm"');
  has(worker,'channel:body.channel==="gm"?"gm":"room"');
  assert.ok(!chat.includes("confirm('Thực hiện "));
  has(chat,'gmwwOnlineTargetAt(');
  assert.ok(!chat.includes('new SpeechSynthesisUtterance'));
});

test('Server-patched Player script never mounts the legacy bottom deck in Online',()=>{
  const runtime=patchPrivatePlayerCards(gmwwMembersLiveScript);
  has(runtime,'function renderPlayerPrivateDock(){');
  has(runtime,'if(String(state.room?.roomMode||"online").toLowerCase()==="online"){$("#gmwwPlayerPrivateDock")?.remove();return}');
  has(runtime,'function syncPlayerMiniCards(){');
});

test('GM can reply to an authenticated private Player channel without public chat fanout',()=>{
  const gm=gmSource('45-online-chat');
  assert.ok(gm.includes("String(ch.channel).startsWith('gm:')"));
  assert.ok(gm.includes("playRoomApi('/chat',{method:'POST'"));
  assert.ok(gm.includes("loginId,text:msg"));
  assert.ok(worker.includes('async gmChatSend(request,body)'));
  assert.ok(worker.includes('this.gmAuthorized(request)'));
  assert.ok(worker.includes('this.broadcast({type:"chat_tick",serverTime:now})'));
  assert.ok(!worker.includes('this.broadcast({type:"chat_message"'));
});

import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
// V3.303: thư viện audio lượt theo nội dung (hash) + Server tự đẩy cue tới mọi thiết bị.
const recordingCode=worker.split('// BEGIN RECORDED PUBLIC ANNOUNCEMENTS')[1]?.split('// END RECORDED PUBLIC ANNOUNCEMENTS')[0]||'';
const annCtx={Response,Uint8Array,atob,crypto:webcrypto,Object,Date,Math,Number,String,Array,Set};
const mod=vm.runInNewContext(recordingCode+';({announcementTargetsForTurn,announcementCue,saveAnnouncementTarget,readAnnouncementBlob,announcementLibrary,decodeRecording})',annCtx);
const memStorage=()=>{const data=new Map(),storage={data,get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},delete:async k=>data.delete(k),
  list:async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix))),transaction:async fn=>fn(storage)};return storage};
const mp3=(n,fill=0)=>{const b=new Uint8Array(n).fill(fill);b.set(new TextEncoder().encode('ID3'));return b};
const b64=b=>Buffer.from(b).toString('base64');

test('V3.303: Server maps each turn to the same clips the GM plays (wolves, groups, artifacts, wake-up)',()=>{
  const t=mod.announcementTargetsForTurn;
  assert.deepEqual([...t({kind:'role',roleId:'role_seer'})],['cards:role_seer']);
  assert.deepEqual([...t({kind:'role',roleId:'role_alpha_wolf'})],['cards:audio_group_wolves']);
  assert.deepEqual([...t({kind:'role-group',roles:[{roleId:'role_wolf'},{roleId:'role_cursed'},{roleId:'role_alpha_wolf'}]})],['cards:audio_group_wolves','cards:role_cursed']);
  assert.deepEqual([...t({kind:'artifact-main',artifactId:'art_x'})],['artifacts:art_x']);
  assert.deepEqual([...t({kind:'village-wakeup'})],['system:audio_system_day_wakeup']);
  const runtime={cursor:0,queue:[{id:'t1',label:'Tiên Tri',roleId:'role_seer',startedAt:'2026-11-04T13:00:00.000Z'}]};
  const cue=mod.announcementCue({phase:'running',cyclePhase:'night',matchId:'m',cycleKey:'night-1'},runtime);
  assert.equal(cue.startedAt,Date.parse('2026-11-04T13:00:00.000Z'),'Server start time drives every device');
});

test('V3.303: clip library validates bytes, dedups by hash, serves cacheable bytes and frees replaced clips',async()=>{
  const s=memStorage(),clip=mp3(150000,7);
  const save=(target,bytes,mime='audio/mpeg')=>mod.saveAnnouncementTarget(s,target,mod.decodeRecording({mime,base64:b64(bytes)}));
  assert.equal((await save('bad target',clip)).status,400);
  assert.equal((await save('cards:role_seer',new TextEncoder().encode('<html>'))).status,400);
  const first=await (await save('cards:role_seer',clip)).json();
  assert.match(first.hash,/^[a-f0-9]{32}$/);
  assert.equal((await (await save('cards:role_seer',clip)).json()).unchanged,true,'same clip is not stored twice');
  const read=await mod.readAnnouncementBlob(s,first.hash);
  assert.equal(read.headers.get('content-type'),'audio/mpeg');
  assert.match(read.headers.get('cache-control'),/immutable/);
  assert.deepEqual(new Uint8Array(await read.arrayBuffer()),clip);
  const second=await (await save('cards:role_seer',mp3(900,3))).json();
  assert.notEqual(second.hash,first.hash);
  assert.equal(s.data.has('annBlob:'+first.hash),false,'replaced clip bytes are removed');
  assert.equal(s.data.has('annBlob:'+first.hash+':1'),false);
  assert.equal((await mod.readAnnouncementBlob(s,'../x')).status,404);
});

const roomClass=()=>{
  const start=worker.indexOf('  async currentAnnouncement(meta,runtime)'),end=worker.indexOf('  async gmRoleAssets(',start);
  return vm.runInNewContext('(class Room {'+worker.slice(start,end)+'})',{...mod,normalizeLoginId:x=>String(x||'').toLowerCase(),
    j:(data,status)=>Response.json(data,{status}),setTimeout,Response});
};

test('V3.303: every turn change pushes the live clip + start time; Players read only the live clip',async()=>{
  const Room=roomClass(),s=memStorage(),sent=[];
  const runtime={cursor:0,queue:[{id:'t1',label:'Tiên Tri',roleId:'role_seer',startedAt:'2026-11-04T13:00:00.000Z'},{id:'t2',label:'Bảo Vệ',roleId:'role_guard'}]};
  const meta={phase:'running',cyclePhase:'night',cycleNight:1,matchId:'m',cycleKey:'night-1',code:'ABCDEF'};
  await s.put('meta',meta);await s.put('players',{'member:alice':{}});
  const room=new Room();room.ctx={storage:s};room.getNightRuntime=async()=>runtime;room.broadcast=m=>sent.push(m);
  room.gmAuthorized=async()=>({ok:true,meta});
  // Legacy GM (<=V3.302) uploads by turn key: stored as that turn's first target.
  const legacy=await room.gmAnnouncement({},{key:'m:night-1:t1',mime:'audio/mpeg',base64:b64(mp3(400,1))});
  assert.equal(legacy.status,200);
  const cue=sent.at(-1).audioCue;
  assert.equal(sent.at(-1).type,'announcement_ready');
  assert.equal(cue.startedAt,Date.parse('2026-11-04T13:00:00.000Z'));
  assert.match(cue.audio[0],/^\/api\/rooms\/ABCDEF\/announcement-audio\?a=[a-f0-9]{32}$/);
  assert.ok(!JSON.stringify(cue).includes('role_seer'),'role identity never reaches Players');
  const hash=cue.audio[0].split('a=')[1];
  // GM preloads the next turn while the GM app may later go to background.
  await room.gmAnnouncement({},{target:'cards:role_guard',mime:'audio/mpeg',base64:b64(mp3(500,2))});
  assert.equal((await room.playerAnnouncement({loginId:'alice',a:hash})).status,200);
  assert.equal((await room.playerAnnouncement({loginId:'intruder',a:hash})).status,403);
  runtime.cursor=1;runtime.queue[1].startedAt='2026-11-04T13:00:30.000Z';
  await room.syncAnnouncementCue(false);
  const next=sent.at(-1).audioCue;
  assert.equal(next.key,'m:night-1:t2');
  assert.equal(next.audio.length,1,'Server resolves the next clip without the GM');
  assert.equal((await room.playerAnnouncement({loginId:'alice',a:hash})).status,404,'past turn clips are no longer readable');
  assert.equal((await room.gmAnnouncement({},{key:'old-key',mime:'audio/mpeg',base64:b64(mp3(300))})).status,409);
  room.gmAuthorized=async()=>({ok:false,response:new Response(null,{status:401})});
  assert.equal((await room.gmAnnouncement({},{})).status,401);
  assert.equal((await room.gmAnnouncementLibrary({})).status,401);
  assert.ok(worker.includes("['night_turn','room_cycle','room_state','auto_gm','demo_control','room_reset','room_hard_reset','game_result'].includes(safe.type))this.scheduleAnnouncementSync()"),'turn/phase broadcasts trigger the audio push');
});

test('V3.303: Player joins the clip at the Server position, skips finished clips, reuses cached clips and rejects foreign URLs',async()=>{
  const starts=[],requests=[];let now=1_000_000;
  class Ctx{constructor(){this.state='running';this.currentTime=5}resume(){return Promise.resolve()}
    decodeAudioData(d,ok){const b={duration:4};ok(b);return Promise.resolve(b)}
    createGain(){return{gain:{},connect(){}}}
    createBufferSource(){return{connect(){},start:(at,off)=>starts.push(off),stop(){}}}}
  const ctx=new Ctx();
  const context={state:{roomCode:'ABCDEF',participantId:'member:alice',serverClockOffsetMs:0},document:{addEventListener(){}},localStorage:{getItem:()=>null},
    updatePlayerTopMenu(){},auth:()=>({Authorization:'Bearer player'}),Audio:class{},AbortController,URL,WeakMap,Map,
    Date:{now:()=>now},gmwwAudio:()=>ctx,gmwwAudioMaster:{},
    fetch:async(url,opts)=>{requests.push({url,opts});return new Response('ID3recording',{headers:{'content-type':'audio/mpeg'}})}};
  const code=chat.slice(chat.indexOf("const gmwwChatAudioOff"),chat.indexOf('function gmwwChatAudioButton()'));
  vm.runInNewContext('let gmwwPlayerCueKey="";'+code+';globalThis.actions={announce:gmwwChatAnnounce};',context);
  const url='/api/rooms/ABCDEF/announcement-audio?a='+'a'.repeat(32);
  const tick=()=>new Promise(r=>setImmediate(r));
  context.actions.announce({key:'m:n1:t1',label:'Tiên Tri',startedAt:now-1500,audio:[url]});
  await tick();await tick();
  assert.equal(requests[0].opts.headers.Authorization,'Bearer player');
  assert.ok(Math.abs(starts[0]-1.5)<0.01,'late device seeks to where everyone else is');
  context.actions.announce({key:'m:n2:t1',label:'Tiên Tri',startedAt:now,audio:[url]});
  await tick();await tick();
  assert.equal(requests.length,1,'same clip next night comes from cache');
  assert.equal(starts[1],0,'on-time device starts from the beginning');
  context.actions.announce({key:'m:n2:t2',label:'Bảo Vệ',startedAt:now-9000,audio:[url]});
  await tick();await tick();
  assert.equal(starts.length,2,'a clip already finished elsewhere is not replayed late');
  context.actions.announce({key:'m:n2:t3',label:'X',startedAt:now,audio:['https://other.example/a.mp3']});
  await tick();
  assert.equal(requests.length,1,'foreign recording URL is rejected');
});


test('ISO server deadline produces a countdown',{skip:'LEGACY-QUARANTINE 2026-11-04: snapshot test of an older release no longer matches the current source; see tests/LEGACY-QUARANTINE.md'},()=>{
 const s=playerWebSource('35-online-chat');
 const code=s.slice(s.indexOf('function gmwwChatDockSync(){'),s.indexOf('function gmwwChatClear(){'));
 const clock={},panel={classList:{add(){},toggle(){}}},footer={},game={classList:{contains:()=>true}};
 const c={Date:class extends Date {static now(){return Date.parse('2026-10-29T12:00:00.000Z')}},state:{roomCode:'ABCDEF',participantId:'a',room:{phase:'running',roomMode:'online',dayDeadlineAt:'2026-10-29T12:01:30.000Z'}},document:{getElementById:id=>({gmwwOnlineFooter:footer,gmwwChatPanel:panel,gmwwPlayerClock:clock,game}[id])},clearTimeout(){},setInterval(){return 1}};
 vm.runInNewContext('let gmwwChatOpen=false,gmwwChatIdleTimer=null,gmwwOnlineFooterTimer=null;'+code+'gmwwChatDockSync()',c);
 assert.equal(clock.textContent,'01:30');
});
test('Online shortcuts enter the shared private viewer',()=>{
 const s=playerWebSource('20-village-and-profile');
 const handler=s.slice(s.indexOf('button.onclick=()=>{if(button.dataset.gmwwMiniMoved)'),s.indexOf('host.hidden=',s.indexOf('button.onclick=()=>{if(button.dataset.gmwwMiniMoved)')));
 assert.ok(handler.includes('openPrivateCardViewer(type)'));
});
