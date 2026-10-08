import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const server=readFileSync('src/index.js','utf8');
const player=JSON.parse(readFileSync('src/gmww-members-live.js','utf8').split(' = ').slice(1).join(' = ').trim().replace(/;\s*$/,''));
const method=server.slice(server.indexOf('  async gmParticipants(request,body){'),server.indexOf('  async gmRoomSettings(request,body){'));
assert.ok(method.startsWith('  async gmParticipants')&&method.endsWith('\n'),'GM disband method exists');

function setupRoom(){
  const players={
    'member:alice':{participantId:'member:alice',kind:'member',loginId:'alice',displayName:'Alice',seatId:1,ready:true},
    'member:bob':{participantId:'member:bob',kind:'member',loginId:'bob',displayName:'Bob',seatId:null,ready:false},
    'guest:g1':{participantId:'guest:g1',kind:'guest',displayName:'Guest',seatId:2}
  };
  const records=new Map([['players',players],['meta',{phase:'lobby',code:'A2C3D4',seatCount:10}],['assignments',[{loginId:'alice',roleId:'r1'}]]]);
  const storage={get:async k=>records.get(k),put:async(k,v)=>{records.set(k,v)},delete:async k=>{records.delete(k)},setAlarm:async()=>{}};
  const events=[],socketIds=['member:alice','member:bob','guest:g1',null];
  const sockets=socketIds.map(id=>({id,closed:false,deserializeAttachment:()=>({participantId:id}),close(){this.closed=true}}));
  const ctx={
    normalizeLoginId:v=>String(v||'').trim().toLowerCase(),
    LOGIN_RE:/^[A-Za-z0-9._]{4,20}$/,
    normalizeDisplayName:v=>String(v||''),
    normalizeGameCharacterId:v=>v||null,
    normalizeSeatId:(v)=>Number(v)||null,
    publicPlayer:v=>({...v}),
    publicRoom:v=>({...v}),
    enforceUniqueSeatClaims:()=>{},
    ROOM_IDLE_TTL:10000,
    j:(x)=>x
  };
  // Real test IDs are syntactically valid for GM members.
  const src=method;
  const Room=vm.runInNewContext('(class Room{constructor(){this.ctx={storage};this.events=events;this.sockets=sockets} async gmAuthorized(){return{ok:true,meta:await storage.get("meta")}} broadcast(payload){this.events.push(payload)} '+src+' getWebSockets(){return this.sockets}})',{...ctx,storage,events,sockets});
  const room=new Room();
  // The test Durable Object exposes websockets via ctx.
  room.ctx.getWebSockets=()=>sockets;
  return {room,records,events,sockets}
}
test('Giải tán tất cả removes online, offline, unseated and guest participants atomically',async()=>{
  const {room,records,events,sockets}=setupRoom();
  const response=await room.gmParticipants(null,{members:[],replace:true});
  assert.equal(response.ok,true);
  assert.equal(response.selectedCount,0);
  assert.equal(response.removedCount,3);
  assert.deepEqual(Object.keys(records.get('players')),[]);
  assert.equal(records.get('meta').playerCount,0);
  assert.equal(records.get('meta').seatsLocked,false);
  assert.deepEqual(records.get('assignments'),[]);
  assert.deepEqual([...records.get('evictedMembers')].sort(),['alice','bob']);
  assert.equal(sockets.filter(s=>s.closed).length,3);
  assert.equal(sockets.at(-1).closed,false);
  assert.equal(events.filter(e=>e.type==='room_disbanded').length,1);
  assert.equal(events.find(e=>e.type==='room_state').players.length,0);
});
test('GM may recall a removed member, and other removed members stay blocked',async()=>{
  const {room,records}=setupRoom();
  await room.gmParticipants(null,{members:[],replace:true});
  const response=await room.gmParticipants(null,{members:[{loginId:'alice',displayName:'Alice',seatId:1}],replace:true});
  assert.equal(response.selectedCount,1);
  assert.equal(records.get('players')['member:alice'].ready,true);
  assert.deepEqual([...records.get('evictedMembers')],['bob']);
});
test('Player Web handles disband notification, missing roster after poll, and stale presence',()=>{
  assert.match(player,/d\.type==='room_disbanded'/);
  assert.match(player,/state\.players\.some\(p=>p\.participantId===state\.participantId\)/);
  assert.match(player,/presence\?\.roomRevoked&&state\.participantId/);
  assert.match(server,/!evicted\.includes\(loginId\)/);
  assert.match(server,/evicted\.includes\(normalizeLoginId\(m\.loginId\)\)/);
  assert.match(server,/roomCode=null;body\.ready=false;revoked=true/);
});
test('Disband updates all public member presences and reports failures instead of false success',()=>{
  assert.match(server,/async function gmRoomParticipants\(env,raw,request\)/);
  assert.match(server,/ROSTER_PRESENCE_PENDING/);
  assert.match(server,/for\(const p of \(Array\.isArray\(data\?\.removedPlayers\)/);
  assert.match(server,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
  assert.match(server,/if\(revoked&&res\.ok\).*roomRevoked:true/);
});
