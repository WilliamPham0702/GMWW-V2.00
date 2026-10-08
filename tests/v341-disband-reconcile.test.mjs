import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('src/index.js','utf8');
const gm=source.slice(source.indexOf('  async gmParticipants(request,body){'),source.indexOf('  async gmRoomSettings(request,body){'));
const presence=source.slice(source.indexOf('  async memberPresenceInternal(body){'),source.indexOf('  async memberRecordResult(body){'));
const worker=source.slice(source.indexOf('async function gmRoomParticipants(env,raw,request){'),source.indexOf('async function gmRoomConfig(env,raw,request)'));
test('V3.41 server remembers members for retry even after a disbanded room becomes empty',async()=>{
  const records=new Map([['players',{'member:alice':{kind:'member',participantId:'member:alice',loginId:'alice',seatId:1},'member:bob':{kind:'member',participantId:'member:bob',loginId:'bob',seatId:null}}],['meta',{code:'ABCDGH',phase:'lobby',seatCount:12}],['assignments',[]]]);
  const storage={get:async k=>records.get(k),put:async(k,v)=>records.set(k,v),delete:async k=>records.delete(k),setAlarm:async()=>{}};
  const ctx={storage,getWebSockets:()=>[]};const runtime={storage,ctx,normalizeLoginId:x=>String(x||'').toLowerCase(),LOGIN_RE:/^[a-z0-9._]{4,20}$/,normalizeDisplayName:s=>s,normalizeGameCharacterId:v=>v||null,normalizeSeatId:v=>v||null,publicPlayer:v=>({...v}),publicRoom:v=>({...v}),enforceUniqueSeatClaims:()=>{},ROOM_IDLE_TTL:10000,j:x=>x};
  const Room=vm.runInNewContext('(class Room{constructor(){this.ctx=ctx} async gmAuthorized(){return{ok:true,meta:await storage.get("meta")}}broadcast(){} '+gm+'})',runtime);
  const room=new Room();const first=await room.gmParticipants(null,{members:[],replace:true}),again=await room.gmParticipants(null,{members:[],replace:true});
  assert.equal(first.removedCount,2);assert.equal(again.removedCount,0);
  assert.deepEqual([...again.reconcileLogins].sort(),['alice','bob']);
});
test('V3.41 re-disband does not overwrite a player who already joined another room',async()=>{
  const records=new Map([['member:alice',{loginId:'alice',currentRoomCode:'XYGHJK',ready:true}],['member:bob',{loginId:'bob',currentRoomCode:'ABCDGH',ready:true}]]);
  const storage={get:async k=>records.get(k),put:async(k,v)=>records.set(k,v)};
  const ctx={storage,normalizeLoginId:x=>String(x||'').toLowerCase(),normalizeRoomCode:x=>String(x||'').toUpperCase(),directoryMember:m=>({...m}),j:x=>x};
  const Obj=vm.runInNewContext('(class Obj{constructor(){this.ctx={storage}} '+presence+'})',ctx);const obj=new Obj();
  const notMoved=await obj.memberPresenceInternal({loginId:'alice',roomCode:null,ready:false,expectedRoomCode:'ABCDGH'});
  assert.equal(notMoved.skippedDifferentRoom,true);assert.equal(records.get('member:alice').currentRoomCode,'XYGHJK');
  await obj.memberPresenceInternal({loginId:'bob',roomCode:null,ready:false,expectedRoomCode:'ABCDGH'});
  assert.equal(records.get('member:bob').currentRoomCode,null);
});
test('V3.41 Worker reconciles saved disband logins and reports failures',()=>{
  assert.match(worker,/if\(data\?\.disbanded\)for\(const loginId/);
  assert.match(worker,/syncPresence\(loginId,null,false,code\)/);
  assert.match(worker,/ROSTER_PRESENCE_PENDING/);
});
