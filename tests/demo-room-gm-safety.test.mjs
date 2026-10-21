import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker=readFileSync('src/index.js','utf8');
const contract=readFileSync('src/gmww-public-room-contract.js','utf8');
const setup=readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const events=readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');

test('Demo identity is an immutable server flag, never inferred from room name',()=>{
  assert.match(worker,/demo:b\?\.demo===true/);
  assert.match(contract,/demo:m\.demo===true/);
  assert.match(worker,/if\(r\?\.demo===true\)continue/);
  assert.match(worker,/if\(meta\.demo===true\)return j\(\{ok:false,error:"DEMO_ROOM_GM_ONLY"/);
});

test('Demo members cannot change real room presence, ranking or history',()=>{
  assert.match(worker,/if\(data\?\.room\?\.demo===true\)\{await syncRoomDirectory\(env,code\);return res\}/);
  assert.match(worker,/room\.demo===true\?\[\]:Array\.isArray\(data\?\.memberResults\)/);
  assert.match(worker,/data\?\.room\?\.demo===true\?\[\]:Array\.isArray\(data\?\.players\)/);
  assert.match(worker,/if\(data\?\.room\?\.demo===true\)\{await syncRoomDirectory\(env,c\);return res\}/);
});

test('Playback uses one lease owner and existing server game action endpoints',()=>{
  assert.match(worker,/DEMO_LEASE_OWNED/);
  assert.match(worker,/demoLease/);
  assert.match(worker,/x-gmww-demo-owner/);
  assert.match(worker,/async gmDemo\(request,body\)/);
  assert.match(battle,/async function demoActionNight/);
  assert.match(battle,/async function demoActionDay/);
  assert.match(battle,/\/battle-action/);
  assert.match(battle,/\/day-action/);
  assert.match(battle,/\/gallows/);
  assert.match(setup,/expectedTurnId:t\.id/);
  assert.match(battle,/demoRunner\.pending\.add\(signature\)/);
  assert.match(battle,/demoRunner\.completed\.add\(signature\)/);
});

test('GM-only Demo appears as a room tile and only renders controls inside Demo game',()=>{
  for(const id of ['playDemoRoomChoice','battleDemoToggle','battleDemoSpeed'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(setup,/async function playOpenDemoRoom/);
  assert.match(setup,/demo:isDemo/);
  assert.match(battle,/if\(auto\)auto\.hidden=false/);
  assert.match(events,/playDemoRoomChoice/);
  assert.match(events,/demoStop\('exit_play'\)/);
});

test('Playback stops on uncertainty and does not proclaim unverified victories',()=>{
  assert.match(setup,/Kết quả giao dịch lượt này chưa rõ/);
  assert.match(battle,/if\(playSceneRuntime\.winProposal\)/);
  assert.match(battle,/await demoStop\('winner_ready'\);await openPlayCompletionSheet\(\)/);
  assert.doesNotMatch(battle,/demoActionNight[\s\S]*?gmEnd\(/);
});
