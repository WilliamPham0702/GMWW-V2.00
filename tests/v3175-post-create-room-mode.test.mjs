import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const worker=readFileSync('src/index.js','utf8');
const battle=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');

function buildRoom(){
  const start=worker.indexOf('  async gmRoomSettings(request,body){');
  const end=worker.indexOf('  async gmSeatLock(request,body){',start);
  assert.ok(start>0&&end>start);
  const sandbox={
    Response,Date,Math,Object,JSON,Number,String,Error,
    j:(value,status=200)=>Response.json(value,{status}),
    normalizeRoomMode:v=>v==='online'?'online':'offline',
    normalizeSeatMoveMode:v=>v==='walk'?'walk':'instant',
    normalizeSeatCount:(v,defaultCount=12)=>Math.max(1,Math.min(30,Number(v||defaultCount)||12)),
    normalizeSeatLayout:v=>v||'circle',normalizeSeatId:v=>Number(v)||0,
    clearPlayerMovement:()=>{},
    villageLayout:{recommendedSeatShape:()=> 'circle',normalizeSeatOffset:()=>({x:0,y:0}),resolveSeatOffset:()=>({x:0,y:0}),
      normalizeSeatSpacing:v=>Number(v)||1,positions:()=>[]},
    publicRoom:x=>({...x}),publicPlayer:x=>({...x})
  };
  const cls=vm.runInNewContext('(class {'+worker.slice(start,end)+'})',sandbox),room=new cls();
  const meta={code:'ABCDEF',roomMode:'offline',demo:false,autoGM:true,phase:'lobby',
    seatCount:12,seatLayout:'circle',seatOffset:{x:0,y:0},seatSpacing:1,
    seatsLocked:false,locked:false,startedAt:null,roleDeliveredAt:null};
  const state=new Map([['meta',meta],['players',{}],['assignments',[]]]);
  room.ctx={storage:{get:async key=>state.get(key),put:async(key,value)=>{state.set(key,value)},
    delete:async key=>state.delete(key)}};
  room.gmAuthorized=async()=>({ok:true,meta});
  room.broadcast=()=>{};
  return {state,meta,run:async patch=>{
    const r=await room.gmRoomSettings({method:'POST'},patch);
    return {status:r.status,...await r.json()};
  }};
}

test('An empty room switches Offline -> Online -> Demo (online transport) -> Offline without changing identity',async()=>{
  const h=buildRoom();
  let r=await h.run({demo:false,roomMode:'offline'});
  assert.equal(r.status,200);assert.equal(r.room.code,'ABCDEF');
  r=await h.run({demo:false,roomMode:'online'});
  assert.equal(r.room.roomMode,'online');assert.equal(r.room.demo,false);
  r=await h.run({demo:true,roomMode:'offline'});
  assert.equal(r.room.demo,true);assert.equal(r.room.roomMode,'online');assert.equal(r.room.autoGM,false);
  assert.equal(h.state.get('demoLease'),undefined);assert.equal(h.state.get('demoClock'),undefined);
  r=await h.run({demo:false,roomMode:'offline'});
  assert.equal(r.room.demo,false);assert.equal(r.room.roomMode,'offline');
  assert.equal(r.room.autoGM,true);assert.equal(r.room.code,'ABCDEF');
});
test('Changing the Demo isolation flag fails atomically when live members or assignments exist',async()=>{
  const h=buildRoom();h.state.set('players',{alice:{loginId:'alice',seatId:1}});
  let r=await h.run({demo:true,roomMode:'offline'});
  assert.equal(r.status,409);assert.equal(r.error,'ROOM_MODE_REQUIRES_EMPTY_RESET');
  assert.equal(h.meta.demo,false);assert.ok(h.state.get('players').alice);
  h.state.set('players',{});h.state.set('assignments',[{loginId:'alice'}]);
  r=await h.run({demo:true});assert.equal(r.status,409);assert.equal(h.meta.demo,false);
  h.state.set('assignments',[]);h.meta.phase='running';
  r=await h.run({demo:true});assert.equal(r.status,409);assert.equal(h.meta.demo,false);
});
test('GM Demo and speed are within the same action grid, not a separate visible row',()=>{
  const menu=html.indexOf('id="battleWolfMenu"'),actions=html.indexOf('class="battle-wolf-actions"'),
    demo=html.indexOf('id="battleDemoToggle"'),speed=html.indexOf('id="battleDemoSpeedWrap"'),
    artifact=html.indexOf('id="battleLabelArtifact"'),panel=html.indexOf('id="battleDemoPanel"');
  // The legacy panel is intentionally hidden and can appear earlier in the HTML.
  assert.ok(menu>=0&&menu<actions&&actions<demo&&demo<speed&&speed<artifact&&panel>=0);
  assert.match(css,/#battleWolfMenu \.battle-wolf-actions #battleDemoToggle/);
  assert.match(css,/#battleWolfMenu #battleDemoPanel\{display:none!important\}/);
});
test('The template selector waits for the saved template to be rehydrated before showing one sheet',()=>{
  const start=battle.indexOf('async function openPlayGameSheet(){');
  const end=battle.indexOf('async function openLibraryGameTemplate(',start);
  const block=battle.slice(start,end);
  assert.ok(block.indexOf("sheet.classList.add('hidden')")<block.indexOf('await loadPlayGameTemplates()'));
  assert.ok(block.indexOf('await loadPlayGameTemplates()')<block.lastIndexOf("sheet.classList.remove('hidden')"));
  assert.match(block,/openSeq!==playGameSheetOpenSeq/);
  assert.match(battle,/function closePlayGameSheet\(\)\{\+\+playGameSheetOpenSeq/);
});

test('DEMO chooses online room transport without losing bot isolation or enabling ordinary online actions',()=>{
  const setup=readFileSync('server-game/src/30-village-and-setup.part','utf8');
  assert.match(setup,/const patch=\{demo:target==='demo',roomMode:\(target==='online'\|\|target==='demo'\)\?'online':'offline'\}/);
  assert.match(worker,/roomMode=b\?\.demo===true\?"online":normalizeRoomMode\(b\?\.roomMode\)/);
  assert.match(worker,/const roomMode=desiredDemo\?"online":/);
  assert.match(worker,/const onlineActions=meta\.demo!==true&&String\(meta\.roomMode\|\|""\)\.toLowerCase\(\)==="online"/);
  assert.match(worker,/const demoActions=meta\.demo===true\?/);
});
