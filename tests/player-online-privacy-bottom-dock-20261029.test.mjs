import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statusTagsFor} from '../src/gmww-public-room-contract.js';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const read=path=>readFileSync(path,'utf8'),worker=read('src/index.js'),
  village=read('src/player-web-src/20-village-and-profile.part'),
  ws=read('src/player-web-src/30-rooms-and-realtime.part'),
  chat=read('src/player-web-src/35-online-chat.part'),
  session=read('src/player-web-src/00-bootstrap-and-session.part');
const has=(src,fragment)=>assert.ok(src.includes(fragment),'Expected fragment: '+fragment);

test('P0: legacy and night-action statuses require explicit GM display approval',()=>{
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
  const gm=read('server-game/src/45-online-chat.part');
  assert.ok(gm.includes("String(ch.channel).startsWith('gm:')"));
  assert.ok(gm.includes("playRoomApi('/chat',{method:'POST'"));
  assert.ok(gm.includes("loginId,text:msg"));
  assert.ok(worker.includes('async gmChatSend(request,body)'));
  assert.ok(worker.includes('this.gmAuthorized(request)'));
  assert.ok(worker.includes('this.broadcast({type:"chat_tick",serverTime:now})'));
  assert.ok(!worker.includes('this.broadcast({type:"chat_message"'));
});

import vm from 'node:vm';
const recordingCode=worker.split('// BEGIN RECORDED PUBLIC ANNOUNCEMENTS')[1]?.split('// END RECORDED PUBLIC ANNOUNCEMENTS')[0]||'';
const mod=vm.runInNewContext(recordingCode+';({saveAnnouncement:typeof saveAnnouncement===\"function\"?saveAnnouncement:null,readAnnouncement:typeof readAnnouncement===\"function\"?readAnnouncement:null})',{Response,Uint8Array,atob});
test('public announcement recordings validate bytes and reject stale turn uploads',async()=>{
  assert.equal(typeof mod.saveAnnouncement,'function','recorded announcement transport is missing');
  const data=new Map(),storage={get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),delete:async k=>data.delete(k),transaction:async fn=>fn(storage)};
  const bytes=new Uint8Array(150000);bytes.set(new TextEncoder().encode('ID3'));
  const body={key:'match:night:turn',mime:'audio/mpeg',base64:Buffer.from(bytes).toString('base64')};
  assert.equal((await mod.saveAnnouncement(storage,body,'other')).status,409);
  assert.equal(data.size,0);
  assert.equal((await mod.saveAnnouncement(storage,{...body,mime:'text/html'},body.key)).status,400);
  assert.equal((await mod.saveAnnouncement(storage,{...body,base64:Buffer.from('<html>').toString('base64')},body.key)).status,400);
  assert.equal((await mod.saveAnnouncement(storage,body,body.key)).status,200);
  const response=await mod.readAnnouncement(storage,body.key,body.key);
  assert.equal(response.headers.get('content-type'),'audio/mpeg');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  assert.equal((await mod.readAnnouncement(storage,body.key,'next-turn')).status,404);
  const small={...body,key:'next-turn',base64:Buffer.from('ID3recording').toString('base64')};
  await mod.saveAnnouncement(storage,small,small.key);
  assert.equal(data.has('announcement:chunk:1'),false,'previous recording chunks are removed');
});

test('recorded audio room handlers enforce GM auth and current room membership',async()=>{
  const start=worker.indexOf('  async currentAnnouncement(meta)'),end=worker.indexOf('  async gmRoleAssets(',start);
  const Room=vm.runInNewContext('(class Room {'+worker.slice(start,end)+'})',{
    ...mod,announcementCue:vm.runInNewContext(recordingCode+';announcementCue'),normalizeLoginId:x=>String(x||'').toLowerCase(),j:(data,status)=>Response.json(data,{status})
  });
  const meta={phase:'running',cyclePhase:'morning',matchId:'m',cycleKey:'day:1'};
  const room=new Room();room.ctx={storage:{get:async k=>k==='meta'?meta:k==='players'?{'member:alice':{}}:null}};
  room.gmAuthorized=async()=>({ok:false,response:new Response(null,{status:401})});
  assert.equal((await room.gmAnnouncement({},{})).status,401);
  assert.equal((await room.playerAnnouncement({loginId:'intruder',key:'m:day:1:wakeup'})).status,403);
  meta.enabled=false;
  assert.equal((await room.playerAnnouncement({loginId:'alice',key:'m:day:1:wakeup'})).status,403);
});

test('Player retries late recordings, stops old audio on turn change and rejects foreign URLs',async()=>{
  const data=new Map(),players=[],requests=[];
  class RecordedAudio{
    constructor(){this.src='';this.paused=false;players.push(this)}
    play(){return Promise.resolve()}
    pause(){this.paused=true}
    load(){}
    removeAttribute(){this.src=''}
  }
  const context={state:{roomCode:'ABCDEF',participantId:'member:alice'},document:{addEventListener(){}},localStorage:{getItem:k=>data.get(k)},
    updatePlayerTopMenu(){},auth:()=>({Authorization:'Bearer player'}),Audio:RecordedAudio,AbortController,URL,
    fetch:async(url,opts)=>{requests.push({url,opts});return new Response('ID3recording',{headers:{'content-type':'audio/mpeg'}})}};
  const code=chat.slice(0,chat.indexOf('function gmwwChatAudioButton()'));
  vm.runInNewContext(code+';globalThis.actions={announce:gmwwChatAnnounce,stop:gmwwStopAnnouncement};',context);
  const cue={key:'m:night:1',label:'Bầy Sói'};
  context.actions.announce(cue);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,0);
  context.actions.announce({...cue,audioUrl:'/api/rooms/ABCDEF/announcement-audio?key=m%3Anight%3A1'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(players.length,1,'late GM recording plays after next private poll');
  assert.equal(requests[0].opts.headers.Authorization,'Bearer player');
  context.actions.announce({key:'next',label:'Bảo Vệ',audioUrl:'https://other.example/private.mp3'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(players[0].paused,true,'old cue is stopped');
  assert.equal(requests.length,1,'foreign recording URL is rejected');
  context.actions.stop();
});

test('ISO server deadline produces a countdown',()=>{
 const s=read('src/player-web-src/35-online-chat.part');
 const code=s.slice(s.indexOf('function gmwwChatDockSync(){'),s.indexOf('function gmwwChatClear(){'));
 const clock={},panel={classList:{add(){},toggle(){}}},footer={},game={classList:{contains:()=>true}};
 const c={Date:class extends Date {static now(){return Date.parse('2026-10-29T12:00:00.000Z')}},state:{roomCode:'ABCDEF',participantId:'a',room:{phase:'running',roomMode:'online',dayDeadlineAt:'2026-10-29T12:01:30.000Z'}},document:{getElementById:id=>({gmwwOnlineFooter:footer,gmwwChatPanel:panel,gmwwPlayerClock:clock,game}[id])},clearTimeout(){},setInterval(){return 1}};
 vm.runInNewContext('let gmwwChatOpen=false,gmwwChatIdleTimer=null,gmwwOnlineFooterTimer=null;'+code+'gmwwChatDockSync()',c);
 assert.equal(clock.textContent,'01:30');
});
test('Online shortcuts enter the shared private viewer',()=>{
 const s=read('src/player-web-src/20-village-and-profile.part');
 const handler=s.slice(s.indexOf('button.onclick=()=>{if(button.dataset.gmwwMiniMoved)'),s.indexOf('host.hidden=',s.indexOf('button.onclick=()=>{if(button.dataset.gmwwMiniMoved)')));
 assert.ok(handler.includes('openPrivateCardViewer(type)'));
});
