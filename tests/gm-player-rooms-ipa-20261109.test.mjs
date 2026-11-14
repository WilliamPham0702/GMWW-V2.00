import {gmSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const village=gmSource('30-village-and-setup');
const bind=gmSource('50-roles-and-artifacts');
const core=gmSource('00-core-and-library');
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
  const release=JSON.parse(fs.readFileSync('package.json','utf8')).version.replace(/[.]0$/,'');
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.ok(core.includes("const VERSION='"+release+"'"),'GM source matches package Runtime');
  assert.ok(app.includes("const VERSION='"+release+"'"),'packaged GM app matches Runtime');
  assert.ok(html.includes('<title>GMWW V'+release+'</title>'),'GM HTML matches Runtime');
  assert.ok(worker.includes('VERSION="V'+release+'"'),'Worker matches Runtime');
});
test('V3.317 menu: 7-step top with Phòng tab, 4-button bottom with Box Chat',()=>{
  const roles=gmSource('50-roles-and-artifacts');
  assert.match(html,/data-play-room-tab="1"[^>]*><span>2<\/span><b>Phòng<\/b>/);
  assert.match(html,/<span>7<\/span><b>Vào Trận<\/b>/);
  assert.match(roles,/\[data-play-room-tab\]'\)\?\.addEventListener\('click'/);
  assert.match(roles,/playChatTop'\)\?\.addEventListener/);
  assert.doesNotMatch(html,/id="playAutoGM"|id="playAudioTop"/);
});
test('V3.320: entering Ván Mẫu opens the creation form unless a template is already chosen',()=>{
  const bt=gmSource('40-battle-and-timeline');
  assert.match(bt,/async function openPlayGameStep\(\)/);
  assert.match(bt,/if\(String\(playSceneState\.gameTemplateId\|\|''\)\)return;/);
  assert.match(bt,/playGameReturnToSelection=true;\s*await openLibraryGameTemplate\(''\)/);
  assert.match(bt,/void openPlayGameStep\(\);return/);
});

test('V3.320: Phòng chỉ xem/xoá, Tiếp tục ở Sảnh chờ mở Phòng, Box Chat dạng ô',()=>{
  const part=gmSource('30-village-and-setup');
  const phase=gmSource('40-battle-and-timeline');
  const css=fs.readFileSync('server-game/current/style.css','utf8');

  assert.ok(part.includes('async function deletePlayerRoom(')&&part.includes("method:'DELETE'"));
  assert.ok(css.includes('.play-room-picker-card,#playCreateRoomSheet #playRoomModeStep'));
  assert.ok(phase.includes("sheet?.classList.add('hidden');await playEnsureGatherRoom();return}"));
  assert.ok(html.includes('play-chat-top-text'));
  assert.ok(!phase.includes('add(villager,villageSlots-chosenVillage)'));
});
