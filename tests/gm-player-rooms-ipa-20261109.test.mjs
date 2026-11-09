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
  assert.ok(core.includes("const VERSION='3.316'"));
  assert.ok(html.includes('<title>GMWW V3.316</title>'));
});
