import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldSkipMemberHeartbeat,shouldSkipMemberSessionTouch,
  shouldSkipGmHeartbeat,shouldSkipDirectoryHeartbeat
} from '../src/gmww-do-write-optimizer.js';

test('member heartbeats reduce unchanged writes but update within 90s presence TTL',()=>{
  const now=500000;
  const before={presenceAt:now-20000,currentRoomCode:'ABCDEF',ready:true,gmCalledRoomCode:null};
  assert.equal(shouldSkipMemberHeartbeat(before,{...before,presenceAt:now},now),true);
  assert.equal(shouldSkipMemberHeartbeat({...before,presenceAt:now-50000},{...before},now),false);
  assert.equal(shouldSkipMemberHeartbeat(before,{...before,ready:false},now),false);
  assert.equal(shouldSkipMemberHeartbeat(before,{...before,currentRoomCode:'GGGGGG'},now),false);
  assert.equal(shouldSkipMemberHeartbeat(before,{...before,gmCalledRoomCode:'ABCDEF'},now),false);
  assert.equal(shouldSkipMemberHeartbeat(before,{...before},now-30000),false);
  assert.equal(shouldSkipMemberSessionTouch(before,now),true);
  assert.equal(shouldSkipMemberSessionTouch({...before,presenceAt:now-46000},now),false);
});
test('GM must persist immediate offline / room change and renew before TTL',()=>{
  const now=500000,old={online:true,lastSeenAt:now-20000,roomCode:'AAAAAA'};
  assert.equal(shouldSkipGmHeartbeat(old,true,true,'AAAAAA',now),true);
  assert.equal(shouldSkipGmHeartbeat(old,false,true,'AAAAAA',now),false);
  assert.equal(shouldSkipGmHeartbeat(old,true,true,'BBBBBB',now),false);
  assert.equal(shouldSkipGmHeartbeat({...old,lastSeenAt:now-36000},true,true,'AAAAAA',now),false);
  assert.equal(shouldSkipGmHeartbeat({...old,online:false},true,false,'',now),false);
});
test('directory never coalesces actual changes or lets its live lease expire',()=>{
  const now=500000,base={code:'AAAAAA',roomName:'A',gameName:'Test',phase:'lobby',status:'waiting',locked:false,
    enabled:true,demo:false,roomMode:'online',seatMoveMode:'manual',seatCount:12,playerCount:10,
    joinedCount:5,resetVersion:0,leaseUntil:now+130000,updatedAt:'old'};
  assert.equal(shouldSkipDirectoryHeartbeat(base,{...base,leaseUntil:now+180000,updatedAt:'new'},now),true);
  assert.equal(shouldSkipDirectoryHeartbeat(base,{...base,joinedCount:6},now),false);
  assert.equal(shouldSkipDirectoryHeartbeat(base,{...base,resetVersion:1},now),false);
  assert.equal(shouldSkipDirectoryHeartbeat({...base,leaseUntil:now+99000},base,now),false);
});

test('settings button links to auth-protected read-only DO stats and versions stay synchronized',async()=>{
  const {readFileSync}=await import('node:fs');
  const app=readFileSync('server-game/current/app.js','utf8');
  const part=readFileSync('server-game/src/20-members-and-roster.part','utf8');
  const html=readFileSync('server-game/current/GMWW.html','utf8');
  const worker=readFileSync('src/index.js','utf8');
  assert.match(html,/id="settingsRunHealth".*id="settingsOptimizeDO"/s);
  assert.match(html,/id="settingsOptimizeDOStatus"/);
  assert.match(app,/gmApi\('\/api\/gm\/storage-optimizer'/);
  assert.match(part,/gmApi\('\/api\/gm\/storage-optimizer'/);
  assert.match(worker,/if\(bearer\(request\)!==GM_SYNC_TOKEN\)return j\(\{ok:false,error:"UNAUTHORIZED"\},401\)/);
  assert.match(worker,/url\.pathname==="\/api\/gm\/storage-optimizer"/);
  assert.match(worker,/url\.pathname==="\/storage-optimizer\/stats"/);
  assert.match(app,/const VERSION='3\.228';/);
  assert.match(worker,/VERSION="V3\.228"/);
});
