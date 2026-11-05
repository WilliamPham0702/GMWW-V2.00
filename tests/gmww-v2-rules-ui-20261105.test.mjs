import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const worker=read('src/index.js'),gm=read('server-game/current/app.js'),page=read('src/gmww-members-page.js'),
  part=n=>read('src/player-web-src/'+n+'.part'),village=read('assets/village/village.mjs');

test('V2.00 has no room-picker page and legacy routes land in the village',()=>{
  assert.doesNotMatch(page,/id="rooms"|Chọn Phòng/);
  assert.match(part('20-village-and-profile'),/if\(id==='rooms'\)\{if\(state\.member&&!opts\.fromRooms\)enterVillage\(\);return false\}/);
});
test('Witch never sees the bite again once the save potion is used',()=>{
  assert.match(worker,/witchSaveUsed=witchActor\?/);
  assert.match(worker,/nightIntel\.witchSaveUsed=/);
  assert.match(gm,/!intel\.packDisabled&&!intel\.witchSaveUsed\?/);
});
test('Assassin target killed the same night is still woken; earlier deaths and expulsions are not',()=>{
  assert.match(worker,/const assassinPromptBlocked=/);
  assert.equal((worker.match(/assassinPromptBlocked\(rows,loginId,meta\.matchId/g)||[]).length,2);
  assert.match(worker,/alreadyDeadSameNight/);
});
test('Shared notice centre: 15 s, one box, vote box draggable at the action-icon spot',()=>{
  assert.match(part('20-village-and-profile'),/toastTimer=setTimeout\(\(\)=>t\.style\.display='none',15000\)/);
  assert.match(part('35-online-chat'),/toast\(text\)/);
  const g=part('30-rooms-and-realtime');
  assert.match(g,/gmwwOnlinePlaceAtFire\(dock\)/);
  assert.match(g,/dock\.dataset\.userMoved='1'/);
  assert.match(g,/toast\(stageText\)/);
});
test('Village background resets to day on lobby; nomination count and vote mark mirror GM',()=>{
  assert.match(village,/phase==="lobby"\)applyPhase\(phase==="night",cycle\)/);
  assert.match(village,/color:#ff3045/);
  assert.match(village,/gmwwNominationVoteBounce/);
});
