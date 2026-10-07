import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('src/index.js','utf8');
const live=fs.readFileSync('src/gmww-members-live.js','utf8');

test('OFF room rejects every join including previously known players',()=>{
  const start=worker.indexOf('async join(body)');
  const end=worker.indexOf('async ready(body)',start);
  const block=worker.slice(start,end);
  const guard=block.indexOf('if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED"');
  const memberBranch=block.indexOf('if(body?.member?.loginId)');
  assert.ok(guard>=0&&memberBranch>=0&&guard<memberBranch);
});

test('OFF room rejects heartbeat and websocket reconnects',()=>{
  const hb=worker.slice(worker.indexOf('async heartbeat(body)'),worker.indexOf('async leave(body)'));
  const ws=worker.slice(worker.indexOf('async websocket(request,url)'),worker.indexOf('async webSocketMessage'));
  assert.match(hb,/meta\.enabled===false.*ROOM_DISABLED/);
  assert.match(ws,/meta\.enabled===false.*ROOM_DISABLED/);
});

test('OFF broadcasts room_disabled, closes sockets and returns members to waiting room',()=>{
  const enabled=worker.slice(worker.indexOf('async gmEnabled(request,body)'),worker.indexOf('async gmLock',worker.indexOf('async gmEnabled(request,body)')));
  const wrapper=worker.slice(worker.indexOf('async function gmRoomEnabled'),worker.indexOf('async function gmRoomLock'));
  assert.match(enabled,/type:"room_disabled"/);
  assert.match(enabled,/ws\.close\(1000,"ROOM_DISABLED"\)/);
  assert.match(wrapper,/roomCode:null,ready:true/);
  assert.match(wrapper,/gm-presence/);
  assert.match(wrapper,/roomCode:null/);
});

test('Player Web handles room OFF by returning to lobby',()=>{
  assert.match(live,/d\.type==='room_disabled'/);
  assert.match(live,/e\?\.reason==='ROOM_DISABLED'/);
  assert.match(live,/Bạn đã được đưa về Phòng chờ/);
});


test('OFF clears occupants, detects disabled rooms in polling, and evicts websocket clients',()=>{
  const enabled=worker.slice(worker.indexOf('async gmEnabled(request,body)'),worker.indexOf('async gmLock',worker.indexOf('async gmEnabled(request,body)')));
  assert.match(enabled,/await this\.ctx\.storage\.put\("players",\{\}\)/);
  assert.match(live,/pub\.room\.enabled===false/);
  assert.match(live,/e\?\.status===423/);
});
