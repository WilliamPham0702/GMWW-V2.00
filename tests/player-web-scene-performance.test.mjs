import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const raw=fs.readFileSync('src/gmww-members-live.js','utf8');
const player=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,''));

test('unchanged public village snapshots do not trigger full iframe scene replacements',()=>{
  const start=player.indexOf('function villageSceneSignature(payload)');
  const end=player.indexOf('function syncVillageFrame(force=false)',start);
  assert.ok(start>0&&end>start);
  const ctx={};
  vm.runInNewContext(player.slice(start,end)+'\nthis.sceneKey=villageSceneSignature;',ctx);
  const base={room:{code:'ABCDEF',gmStage:'seats'},cycle:{phase:'day',night:0},setup:{clockOffsetMs:100,showSeats:true},players:[{participantId:'member:a',seatId:2,online:true}]};
  const key=ctx.sceneKey(base);
  assert.equal(ctx.sceneKey({...base,setup:{...base.setup,clockOffsetMs:140}}),key,'heartbeat clock jitter is not a scene mutation');
  assert.notEqual(ctx.sceneKey({...base,room:{...base.room,gmStage:'deal'}}),key,'GM stage updates immediately');
  assert.notEqual(ctx.sceneKey({...base,players:[{...base.players[0],seatId:3}]}),key,'seat changes update immediately');
  assert.notEqual(ctx.sceneKey({...base,players:[{...base.players[0],online:false}]}),key,'presence updates immediately');
  assert.match(player,/gmwwVillageLastFrame===iframe\.contentWindow&&gmwwVillageLastSignature===signature\)return/);
  assert.match(player,/iframe\.contentWindow\.postMessage\(payload,location\.origin\)/);
  assert.match(player,/gmww:village-ready'\)syncVillageFrame\(true\)/);
  assert.match(player,/iframe\.addEventListener\('load',\(\)=>syncVillageFrame\(true\)/);
});
test('player lobby uses throttled fallback reads and retains immediate websocket updates',()=>{
  assert.match(player,/gmPresencePoll=setInterval\(\(\)=>\{if\(state\.member&&!document\.hidden\)refreshGmPresence\(\)\},2500\)/);
  assert.match(player,/lobbyPoll=setInterval\(\(\)=>\{if\(state\.member&&!state\.roomCode&&!document\.hidden\)loadVillageLobby\(\)\},1600\)/);
  assert.match(player,/state\.ws\.onmessage=e=>/);
  assert.match(player,/if\(d\.type==='room_state'\|\|movementEvent\)/);
});
