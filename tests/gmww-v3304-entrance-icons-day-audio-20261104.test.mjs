// V3.304 (04/11/2026) — 3 yêu cầu chủ dự án: icon hành động ở lối cầu thang (GM + Player),
// menu trên Player ban ngày bỏ Thông cáo Làng / Lên Giàn, audio ban ngày đồng bộ tới Player Web.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {gmwwMembersLiveScript as live} from '../src/gmww-members-live.js';

const worker=readFileSync('src/index.js','utf8');
const gm=readFileSync('server-game/current/app.js','utf8');
const slice=(src,a,b)=>{const i=src.indexOf(a);assert.ok(i>=0,a+' missing');const j=src.indexOf(b,i+a.length);return src.slice(i,j<0?undefined:j)};

test('1a. Player: action icons rest centred just above the bottom menu, not on the campfire',()=>{
  const code=slice(live,'function gmwwOnlinePlaceAtFire(dock){','\n}\n')+'\n}';
  const footer={offsetHeight:70,offsetTop:730},dock={style:{},offsetHeight:50};
  const ctx={window:{innerWidth:400,innerHeight:800},document:{getElementById:id=>id==='gmwwOnlineFooter'?footer:null}};
  vm.runInNewContext(code+';gmwwOnlinePlaceAtFire(dock)',{...ctx,dock,Math,Number});
  assert.equal(dock.style.left,'200px');
  assert.equal(dock.style.top,'720px','bottom edge 10px above the footer');
  assert.equal(dock.style.transform,'translate(-50%,-100%)','rows grow upward, never over the footer');
  assert.doesNotMatch(code,/querySelector\('\.fire'\)/);
});

test('1b. GM: action icons spawn above battleBottomControls (entrance stairs)',()=>{
  const code=slice(gm,'function battleIconScaleRatio(){','function battleIconResetPositions(){');
  const rail={getBoundingClientRect:()=>({left:0,top:700,width:400,height:80})};
  const ctx={innerWidth:400,innerHeight:800,globalThis:{},document:{documentElement:{style:{getPropertyValue:()=>''}},getElementById:id=>id==='battleBottomControls'?rail:null,querySelector:()=>{throw new Error('campfire not used')}},Math,Number};
  ctx.globalThis=ctx;
  const p=vm.runInNewContext(code+';battleIconEntryPoint()',ctx);
  assert.equal(p.x,200);
  assert.equal(p.y,700-46-10);
});

test('2. Player daytime top menu only shows Làng ơi dậy đi',()=>{
  const timeline=slice(worker,'const publicTimeline=','const audioCue=');
  assert.match(timeline,/steps:\[\{label:"Làng ơi dậy đi",status:"active"\}\]\}/);
  assert.doesNotMatch(timeline,/Thông cáo Làng|Lên Giàn/);
});

const recordingCode=worker.split('// BEGIN RECORDED PUBLIC ANNOUNCEMENTS')[1].split('// END RECORDED PUBLIC ANNOUNCEMENTS')[0];
const mod=vm.runInNewContext(recordingCode+';({announcementCue,dayAnnouncementTargets,saveAnnouncementTarget,announcementLibrary,decodeRecording,readAnnouncementBlob})',
  {Response,Uint8Array,atob,crypto:webcrypto,Object,Date,Math,Number,String,Array,Set});
const memStorage=()=>{const data=new Map(),storage={data,get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},delete:async k=>data.delete(k),
  list:async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix))),transaction:async fn=>fn(storage)};return storage};
const mp3=(n,fill)=>{const b=new Uint8Array(n).fill(fill);b.set(new TextEncoder().encode('ID3'));return b};
const b64=b=>Buffer.from(b).toString('base64');

test('3a. Day cue accepts only public system clips and caps the sequence',()=>{
  const t=mod.dayAnnouncementTargets;
  assert.deepEqual([...t(['system:audio_system_day_wakeup','cards:role_seer','artifacts:x','system:audio_system_day_wakeup','system:../x'])],['system:audio_system_day_wakeup']);
  assert.equal(t(Array.from({length:30},(_,i)=>'system:audio_system_n'+i)).length,12);
});

test('3b. GM day queue becomes one Server cue pushed to every Player; morning without it still plays wake-up',async()=>{
  const start=worker.indexOf('  async currentAnnouncement(meta,runtime)'),end=worker.indexOf('  async gmRoleAssets(',start);
  const Room=vm.runInNewContext('(class Room {'+worker.slice(start,end)+'})',{...mod,normalizeLoginId:x=>String(x||'').toLowerCase(),
    j:(data,status)=>Response.json(data,{status}),setTimeout,Response,Date,Math,Number,String,Array});
  const s=memStorage(),sent=[];
  const meta={phase:'running',cyclePhase:'morning',cycleNight:1,matchId:'m',cycleKey:'morning-1',code:'ABCDEF',cycleStartedAt:new Date(Date.now()-500).toISOString()};
  await s.put('meta',meta);await s.put('players',{'member:alice':{}});
  const room=new Room();room.ctx={storage:s};room.broadcast=m=>sent.push(m);room.gmAuthorized=async()=>({ok:true,meta});
  const put=body=>room.gmAnnouncement({},body);
  for(const [id,fill] of [['audio_system_day_wakeup',1],['audio_system_morning_deaths_intro',2],['audio_system_morning_number_2',3]])
    assert.equal((await put({target:'system:'+id,mime:'audio/mpeg',base64:b64(mp3(300,fill))})).status,200);
  // Before any day queue: the wake-up clip is the morning cue.
  const wake=sent.at(-1).audioCue;
  assert.equal(wake.key,'m:morning-1:wakeup');assert.equal(wake.audio.length,1);
  const r=await put({day:['system:audio_system_day_wakeup','system:audio_system_morning_deaths_intro','system:audio_system_morning_number_2','cards:role_seer'],elapsedMs:3000});
  assert.equal(r.status,200);
  const cue=sent.at(-1).audioCue;
  assert.equal(sent.at(-1).type,'announcement_ready');
  assert.equal(cue.key,'m:morning-1:day:1');
  assert.equal(cue.audio.length,3,'whole morning sequence, role cards rejected');
  assert.ok(Math.abs(Date.now()-3000-cue.startedAt)<1500,'start time follows the GM queue, not upload delay');
  const hash=cue.audio[2].split('a=')[1];
  assert.equal((await room.playerAnnouncement({loginId:'alice',a:hash})).status,200,'live day clip readable');
  await put({target:'system:audio_system_time_up',mime:'audio/mpeg',base64:b64(mp3(300,9))});
  await put({day:['system:audio_system_time_up']});
  assert.equal(sent.at(-1).audioCue.key,'m:morning-1:day:2');
  assert.equal(sent.at(-1).audioCue.label,'Thông báo Làng');
  // A new cycle never replays the previous day's cue.
  meta.cycleKey='morning-2';
  assert.equal((await room.currentAnnouncement(meta,null)).key,'m:morning-2:wakeup');
  meta.cyclePhase='night';
  assert.equal((await put({day:['system:audio_system_time_up']})).status,409);
});

test('3c. GM mirrors battleQueueDayAudio to the Server; Player plays up to 12 clips',()=>{
  assert.match(gm,/battleQueueDayAudio=function\(cues\)\{\s*if\(playSceneState\.phase==='day'\)gmwwPublishDayAnnouncement\(cues\);\s*return gmwwLocalDayAudio\(cues\);/);
  const pub=slice(gm,'function gmwwPublishDayAnnouncement(cues){','\nbattleQueueDayAudio=');
  assert.match(pub,/room\.demo===true/);
  assert.match(pub,/await gmwwUploadAnnouncementCues\(list\)/);
  assert.match(pub,/JSON\.stringify\(\{day,elapsedMs:Date\.now\(\)-queuedAt\}\)/);
  assert.match(live,/u\.slice\(base\.length\)\)\)\.slice\(0,12\)/);
});
