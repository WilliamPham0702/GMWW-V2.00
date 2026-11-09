import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const village=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const bind=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const core=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
test('IPA room sheet has player-rooms card',()=>{
  for(const id of ['playPlayerRoomsCard','playPlayerRoomsCount','playPlayerRoomsRefresh','playPlayerRoomList','playPlayerRoomNote'])assert.ok(html.includes(`id="${id}"`),id);
});
test('IPA loads only playerRoom rooms from GM API and observes them',()=>{
  assert.match(village,/gmApi\('\/api\/gm\/rooms',/);
  assert.match(village,/playerRoom===true/);
  for(const f of ['loadPlayerRooms','renderPlayerRooms','observePlayerRoom','bindPlayerRoomsCard'])assert.match(village,new RegExp('function '+f));
  assert.match(village,/gmToken\s*=\s*''/);
  assert.ok(bind.includes('bindPlayerRoomsCard();'));
});
test('assembled app.js contains the feature and version is synced',()=>{
  assert.ok(app.includes('function observePlayerRoom'));
  assert.ok(core.includes("const VERSION='3.320'"));
  assert.ok(html.includes('<title>GMWW V3.320</title>'));
});
test('V3.317 menu: 7-step top with Phòng tab, 4-button bottom with Box Chat',()=>{
  const roles=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
  assert.match(html,/data-play-room-tab="1"[^>]*><span>2<\/span><b>Phòng<\/b>/);
  assert.match(html,/<span>7<\/span><b>Vào Trận<\/b>/);
  assert.match(roles,/\[data-play-room-tab\]'\)\?\.addEventListener\('click'/);
  assert.match(roles,/playChatTop'\)\?\.addEventListener/);
  assert.doesNotMatch(html,/id="playAutoGM"|id="playAudioTop"/);
});
test('V3.320: entering Ván Mẫu opens the creation form unless a template is already chosen',()=>{
  const bt=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  assert.match(bt,/async function openPlayGameStep\(\)/);
  assert.match(bt,/if\(String\(playSceneState\.gameTemplateId\|\|''\)\)return;/);
  assert.match(bt,/playGameReturnToSelection=true;\s*await openLibraryGameTemplate\(''\)/);
  assert.match(bt,/void openPlayGameStep\(\);return/);
});

test('V3.320: Phòng chỉ xem/xoá, Tiếp tục ở Sảnh chờ mở Phòng, Box Chat dạng ô',()=>{
  const part=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const phase=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');

  assert.ok(part.includes('async function deletePlayerRoom(')&&part.includes("method:'DELETE'"));
  assert.ok(css.includes('.play-room-picker-card,#playCreateRoomSheet #playRoomModeStep'));
  assert.ok(phase.includes("sheet?.classList.add('hidden');await playEnsureGatherRoom();return}"));
  assert.ok(html.includes('play-chat-top-text'));
  assert.ok(!phase.includes('add(villager,villageSlots-chosenVillage)'));
});
