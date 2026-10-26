import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const part=readFileSync('server-game/src/20-members-and-roster.part','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const arena=readFileSync('assets/village/arena-3d/live.mjs','utf8');
const portal=readFileSync('server-game/current/GMWW.html','utf8');
const anchor='// Adopt a room CREATED inside official Arena 3D into GMWW';
function extract(source){
  const start=source.indexOf(anchor),end=source.indexOf('function playLiveMembers()',start);
  assert.ok(start>=0&&end>start,'missing controlled GM adoption code');
  return source.slice(start,end);
}
const origin='https://gmww-v2-00.williampham0702.workers.dev';

test('Room adoption remains in assembled app, native portal and 3D GM same origin',()=>{
 assert.equal(extract(part),extract(app));
 assert.match(arena,/kind:'gmww-arena3d-adopt-room',roomCode:code,gmToken/);
 assert.match(portal,/window\.addEventListener\('gmww-arena3d-room-adopted'/);
 assert.match(portal,/const arenaUrl='https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/village\/arena-3d\/live\.html'/);
 assert.doesNotMatch(arena,/searchParams\.set\(['"]gmToken/);
});

function scenario({http=200,wrongCode=false,hidden=false}={}){
 const messages=[],fetches=[],mutations=[],listeners=[];
 const frame={isConnected:true,closest:()=>hidden?{}:null,contentWindow:{
   postMessage:(payload,dst)=>messages.push({payload,dst})
 }};
 const playSceneState={roomCode:'—',gmToken:'',phase:'lobby',step:'lobby'};
 const playRoomUiState={stage:'rooms'};
 const runtime={room:null};
 const context={
  GMWW_ARENA_OFFICIAL_ORIGIN:origin,
  GMWW_SERVER_BASE:origin,
  window:{
   addEventListener:(name,fn)=>listeners.push({name,fn}),
   dispatchEvent:event=>mutations.push(['event',event.type])
  },
  document:{getElementById:id=>id==='gmwwArena3dQaFrame'?frame:null},
  fetch:async(url,opts)=>{
   fetches.push({url,opts});
   return {ok:http===200,status:http,json:async()=>({
     ok:http===200,room:{code:wrongCode?'WRONGQ':'ABCDEF',seatCount:12,roomMode:'online',roomName:'Arena 3D'}
   })};
  },
  playSceneState,playSceneRuntime:runtime,playRoomUiState,
  isLivePlayRoom:()=>false,
  rememberPlayRoom:(...args)=>mutations.push(['remember',...args]),
  savePlayScene:()=>mutations.push(['save']),
  playSyncRoom:async()=>mutations.push(['sync']),
  renderPlayScene:()=>mutations.push(['render']),
  Event:class Event{constructor(type){this.type=type}}
 };
 vm.runInNewContext(extract(part),context);
 const receive=async(extra={})=>listeners[0].fn({
  origin,source:frame.contentWindow,
  data:{kind:'gmww-arena3d-adopt-room',roomCode:'ABCDEF',gmToken:'Valid_GM_1234567890'},...extra
 });
 return {receive,fetches,mutations,messages,context,frame};
}

test('Core-verified Arena room becomes GMWW real selected room before navigating setup',async()=>{
 const x=scenario();await x.receive();
 assert.equal(x.fetches.length,1);
 assert.equal(x.fetches[0].url,origin+'/api/gm/rooms/ABCDEF');
 assert.equal(x.fetches[0].opts.headers.Authorization,'Bearer Valid_GM_1234567890');
 assert.equal(x.context.playSceneState.roomCode,'ABCDEF');
 assert.equal(x.context.playSceneState.step,'room');
 assert.equal(x.context.playRoomUiState.selectedCode,'ABCDEF');
 assert.ok(x.mutations.some(x=>x[0]==='remember'));
 assert.deepEqual(x.mutations.at(-1),['event','gmww-arena3d-room-adopted']);
 assert.deepEqual(x.messages,[]);
});

test('Spoofed parent-frame event, hidden portal and Core denial never adopt a GM room',async()=>{
 const a=scenario();await a.receive({origin:'https://evil.example'});await a.receive({source:{}});
 assert.equal(a.fetches.length,0);assert.equal(a.mutations.length,0);
 const b=scenario({hidden:true});await b.receive();
 assert.equal(b.fetches.length,0);assert.equal(b.mutations.length,0);
 const c=scenario({http:403});await c.receive();
 assert.equal(c.context.playSceneState.roomCode,'—');
 assert.equal(c.mutations.some(x=>x[0]==='remember'),false);
 assert.equal(c.messages[0]?.payload.kind,'gmww-arena3d-adopt-failed');
 const d=scenario({wrongCode:true});await d.receive();
 assert.equal(d.context.playSceneState.roomCode,'—');
});
test('Malformed room and bearer fail closed before calling Core',async()=>{
 const a=scenario();
 await a.receive({data:{kind:'gmww-arena3d-adopt-room',roomCode:'../',gmToken:'Valid_GM_1234567890'}});
 await a.receive({data:{kind:'gmww-arena3d-adopt-room',roomCode:'ABCDEF',gmToken:'BAD???badTOKEN'}});
 assert.equal(a.fetches.length,0);
 assert.equal(a.mutations.length,0);
});
