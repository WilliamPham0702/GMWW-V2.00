import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {playerOfferedActions} from '../src/gmww-demo-runner.js';
import {chatPolicy} from '../src/gmww-online-chat-policy.js';
import {expireCycleEffects} from '../src/gmww-cycle-effect-expiry.js';

const read=p=>fs.readFileSync(p,'utf8');
const chat=read('src/player-web-src/35-online-chat.part');
const player=read('src/player-web-src/20-village-and-profile.part');
const ws=read('src/player-web-src/30-rooms-and-realtime.part');
const gm=read('server-game/src/45-online-chat.part');
const gmSocket=read('server-game/src/30-village-and-setup.part');
const gmControls=read('server-game/src/40-battle-and-timeline.part');
const gmHtml=read('server-game/current/GMWW.html');
const server=read('src/index.js');

test('Online action dock follows the rendered campfire with a scaled iframe',()=>{
  const code=chat.slice(chat.indexOf('function gmwwOnlinePlaceAtFire(dock){'));
  const fire={getBoundingClientRect:()=>({left:180,top:360,width:40,height:40})};
  const frame={clientWidth:400,clientHeight:800,
    contentWindow:{innerWidth:400,innerHeight:800},
    contentDocument:{querySelector:()=>fire},
    getBoundingClientRect:()=>({left:20,top:40,width:200,height:400})};
  const dock={style:{}};
  const env={document:{getElementById:()=>frame},window:{innerWidth:390,innerHeight:800},Math};
  vm.runInNewContext(code+';globalThis.place=gmwwOnlinePlaceAtFire;',env);
  env.place(dock);
  assert.equal(dock.style.left,'120px');
  assert.equal(dock.style.top,'230px');
  frame.contentDocument.querySelector=()=>null;
  env.place(dock);
  assert.equal(dock.style.left,'120px');
  assert.equal(dock.style.top,'260px');
  assert.match(player,/gmww:village-ready'\)\{syncVillageFrame\(true\);gmwwOnlinePlaceAtFire/);
});

test('Chat displays a new-message cue on first remote message in an initially empty channel',async()=>{
  const start=chat.indexOf('async function gmwwChatRefresh(){');
  const end=chat.indexOf('async function gmwwChatSend(){',start);
  assert.ok(start>=0&&end>start);
  const messages=[
    {messages:[],notices:[],channel:'day',canSend:true},
    {messages:[{id:'m1',senderId:'bob',senderName:'Bob',text:'Hello'}],notices:[],channel:'day',canSend:true},
    {messages:[{id:'m1',senderId:'bob',senderName:'Bob',text:'Hello'},{id:'m2',senderId:'alice',senderName:'Alice',text:'Hi'}],notices:[],channel:'day',canSend:true}
  ];
  let cue=null;
  const panel={classList:{toggle(){}},setAttribute(){}};
  const lines={dataset:{},scrollHeight:100,clientHeight:100,scrollTop:0,replaceChildren(){},appendChild(){}};
  const input={disabled:false,placeholder:''},send={disabled:false};
  const nodes={gmwwChatPanel:panel,gmwwChatLines:lines,gmwwChatHeading:{},gmwwChatText:input,gmwwChatSubmit:send,gmwwChatHelp:{}};
  const env={state:{roomCode:'ABCDE',participantId:'member:alice',member:{loginId:'alice'}},
    gmwwChatTarget:'room',gmwwChatSeq:0,gmwwChatLatestByChannel:new Map(),gmwwChatOpen:false,
    document:{getElementById:id=>nodes[id],createElement:()=>({style:{},append(){}})},
    gmwwChatColor:()=>'#fff',gmwwChatUnread:value=>{cue=value},auth:()=>({}),
    api:async()=>messages.shift()};
  vm.runInNewContext(chat.slice(start,end)+';globalThis.refresh=gmwwChatRefresh;',env);
  await env.refresh();assert.equal(cue,null);
  await env.refresh();assert.equal(cue,true);
  await env.refresh();assert.equal(cue,true,'Sending your own message does not clear an unread remote message');
  assert.match(chat,/gmwwChatExpand\(\)[\s\S]*?gmwwChatUnread\(false\)/);
  assert.match(chat,/#gmwwChatPanel\.gmww-chat-unread/);
  assert.match(ws,/d\.type==='chat_tick'/);
  assert.doesNotMatch(server,/this\.broadcast\(\{type:"chat_message"/);
});

test('Frozen players can chat and use day privileges after morning transition',()=>{
  const meta={phase:'running',cyclePhase:'morning',cycleNight:1,matchId:'M',cycleKey:'morning-1'};
  const players={'member:alice':{loginId:'alice'}};
  const effect={id:'fx',type:'frozen',loginId:'alice',matchId:'M',night:1,cycleKey:'night-1',effectActive:true};
  assert.equal(chatPolicy({meta,players,rows:[effect],loginId:'alice'}).canSend,true);
  const expired=expireCycleEffects([effect],{phase:'morning',night:1,cycleKey:'morning-1',matchId:'M',statusDefs:{},now:'2026-10-30T00:00:00Z'});
  assert.equal(expired.length,1);assert.equal(effect.effectActive,false);
  assert.match(server,/expireCycleEffects\(rows,\{phase:p,night:n,cycleKey:key,matchId:meta\.matchId,statusDefs:STATUS_DEFS,now\}\)/);
});

test('Blocked players retain visible action offers but cannot execute',async()=>{
  const base={phase:'running',roomMode:'online',demo:false,cyclePhase:'morning',cycleNight:1,matchId:'M',cycleKey:'morning-1'};
  const fakeRole={functions:[{id:'action_seer',name:'Soi Ngày',phase:'day',targetCount:1}]};
  let effects=[];
  const storage={get:async key=>{
    if(key==='players')return {'member:alice':{loginId:'alice'}};
    if(key==='assignments')return [{loginId:'alice',roleId:'role_seer',matchId:'M'}];
    if(key==='roleCatalog:role_seer')return {roleCard:fakeRole};
    if(key==='role:alice')return {roleCard:fakeRole};
    if(key==='interactions')return effects;
    return null;
  }};
  const room={ctx:{storage},gallowsState:async()=>({ballot:{stage:'nominating'}})};
  effects=[{type:'expelled',loginId:'alice',matchId:'M',effectActive:true}];
  const expelled=await playerOfferedActions(room,base,'alice');
  assert.equal(expelled.length,1);
  assert.equal(expelled[0].blocked,true);
  assert.equal(expelled[0].blockedType,'expelled');
  effects=[{type:'frozen',loginId:'alice',matchId:'M',effectActive:true,night:1}];
  const morning=await playerOfferedActions(room,base,'alice');
  assert.equal(morning.length,1);
  assert.equal(morning[0].blocked,false,'Last night freeze must not suppress morning action');
  assert.match(chat,/data-effect-icon/);
  assert.match(chat,/if\(action\.blocked\)/);
  assert.match(server,/if\(online\)\{[\s\S]*?ACTOR_CANNOT_ACT/);
});

test('GM day footer follows approved six controls and day actions use free icons',()=>{
  const ids=['playBattleClockFloat','battleDayNoticeFloat','battleFactionStatsFloat','battleGMChatFloat','battleDayGallowsFloat','battleUndoFloat'];
  const footer=gmHtml.slice(gmHtml.indexOf('id="battleBottomControls"'),gmHtml.indexOf('id="battleTargetSheet"'));
  const offsets=ids.map(id=>footer.indexOf('id="'+id+'"'));
  assert.ok(offsets.every(x=>x>=0));
  assert.deepEqual(offsets,[...offsets].sort((a,b)=>a-b));
  assert.match(footer,/id="battleFactionStatsToggle"[\s\S]*?⚖️/);
  assert.match(footer,/id="battleGMChatToggle"/);
  assert.match(gmControls,/battleDayActionFloat:false/);
  assert.match(gmControls,/battleGMChatFloat:day/);
  assert.match(gmControls,/battleIconDock\(actions,phase\)/);
  assert.match(gm,/battleGMChatToggle/);
  assert.match(gmSocket,/d\.type==='chat_tick'/);
  assert.match(gm,/playRoomApi\('\/chat',\{method:'GET'\}\)/);
});
