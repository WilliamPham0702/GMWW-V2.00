import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await import(pathToFileURL(resolve(root,'assets/village/village-layout.js')));
const layout=globalThis.GMWW_VILLAGE_LAYOUT;

async function loadWorker(){
  const srcDir=resolve(root,'src');
  let source=await readFile(resolve(srcDir,'index.js'),'utf8');
  source=source.replace('import { DurableObject } from "cloudflare:workers";','class DurableObject { constructor(ctx,env){this.ctx=ctx;this.env=env} }');
  source=source.replace(/from "(\.\/[^"]+)"/g,(_,spec)=>`from ${JSON.stringify(pathToFileURL(resolve(srcDir,spec)).href)}`);
  source=source.replace(/import "(\.\.\/assets\/[^"]+)";/g,(_,spec)=>`import ${JSON.stringify(pathToFileURL(resolve(srcDir,spec)).href)};`);
  const dir=await mkdtemp(join(tmpdir(),'gmww-v260-'));
  const target=join(dir,'worker.mjs');await writeFile(target,source);
  return import(pathToFileURL(target).href);
}

class Storage{
  constructor(){this.data=new Map()}
  async get(key){return structuredClone(this.data.get(key))}
  async put(key,value){this.data.set(key,structuredClone(value))}
  async delete(key){this.data.delete(key)}
  async list({prefix=''}={}){return new Map([...this.data].filter(([key])=>String(key).startsWith(prefix)))}
  async setAlarm(){}
}
class Context{
  constructor(){this.storage=new Storage();this.queue=Promise.resolve()}
  getWebSockets(){return[]}
  blockConcurrencyWhile(fn){const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result}
}
function member(id,seatId){return{participantId:'member:'+id,loginId:id,displayName:id,gameCharacterId:'character-01',seatId,positionX:50,positionY:76,movementStatus:'idle',lastHeartbeatAt:Date.now()}}
function meta(){return{code:'V260AA',phase:'lobby',status:'waiting',seatCount:30,seatsLocked:false,enabled:true,roomMode:'online',seatMoveMode:'walk',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}

test('all 30 shared GM/Web positions are unique and inside the courtyard',()=>{
  const points=layout.positions(30);
  assert.equal(points.length,30);
  assert.equal(new Set(points.map(p=>`${p.x.toFixed(4)}:${p.y.toFixed(4)}`)).size,30);
  for(const p of points){assert.equal(layout.inside(p.x,p.y),true);assert.ok(Math.hypot((p.x-layout.fire.x)/6,(p.y-layout.fire.y)/3)>=1)}
});

test('seat layout fills 8 inner, 16 outer, then opens a third ring above 24',()=>{
  const p8=layout.positions(8),p24=layout.positions(24),p30=layout.positions(30);
  assert.deepEqual(p8.map(p=>p.ring),Array(8).fill(0));
  assert.equal(p24.filter(p=>p.ring===0).length,8);
  assert.equal(p24.filter(p=>p.ring===1).length,16);
  assert.equal(p24.filter(p=>p.ring===2).length,0);
  assert.equal(p30.filter(p=>p.ring===0).length,8);
  assert.equal(p30.filter(p=>p.ring===1).length,16);
  assert.equal(p30.filter(p=>p.ring===2).length,6);
});

test('concurrent swap requests are serialized and only the recipient can accept',async()=>{
  const {RoomDurableObject}=await loadWorker(),ctx=new Context(),room=new RoomDurableObject(ctx,{}),roomMeta=meta();
  await ctx.storage.put('meta',roomMeta);
  await ctx.storage.put('players',Object.fromEntries(['alice','bob','cara'].map((id,i)=>['member:'+id,member(id,i+1)])));
  const request=id=>new Request('https://room.internal/player/seat-swap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(id==='alice'?{action:'request',loginId:'alice',targetParticipantId:'member:bob'}:{action:'request',loginId:'cara',targetParticipantId:'member:bob'})});
  const responses=await Promise.all([room.fetch(request('alice')),room.fetch(request('cara'))]);
  assert.deepEqual(responses.map(r=>r.status),[200,409]);
  const [pending]=await ctx.storage.get('seatSwaps');assert.ok(pending?.id);
  const forged=await room.playerSeatSwap({action:'accept',loginId:'cara',requestId:pending.id});assert.equal(forged.status,409);
  const accepted=await room.playerSeatSwap({action:'accept',loginId:'bob',requestId:pending.id});assert.equal(accepted.status,200);
  const players=await ctx.storage.get('players');assert.equal(players['member:alice'].seatId,2);assert.equal(players['member:bob'].seatId,1);
  const expected=layout.positions(30);assert.deepEqual({x:players['member:alice'].positionX,y:players['member:alice'].positionY},{x:expected[1].x,y:expected[1].y});
});

test('GM cannot lock positions until every admitted player is seated and idle',async()=>{
  const {RoomDurableObject}=await loadWorker(),ctx=new Context(),room=new RoomDurableObject(ctx,{}),roomMeta=meta();
  room.gmAuthorized=async()=>({ok:true,meta:roomMeta});await ctx.storage.put('meta',roomMeta);
  await ctx.storage.put('players',{'member:alice':member('alice',1),'member:bob':member('bob',null)});
  let response=await room.gmSeatLock(new Request('https://room.internal/gm/seat-lock'),{locked:true});assert.equal(response.status,409);
  const players=await ctx.storage.get('players');players['member:bob'].seatId=2;await ctx.storage.put('players',players);
  response=await room.gmSeatLock(new Request('https://room.internal/gm/seat-lock'),{locked:true});assert.equal(response.status,200);assert.equal((await response.json()).seatsLocked,true);
});
