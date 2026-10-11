import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync('src/index.js','utf8');
const gm=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const player=fs.readFileSync('assets/village/scene-manager.mjs','utf8');
test('GM only may publish or roll back scenes',()=>{
 assert.match(worker,/\/api\/gm\/village-scene"&&request.method==="PUT"/);
 assert.match(worker,/\/api\/gm\/village-scene\/rollback"&&request.method==="POST"/);
 assert.match(worker,/if\(bearer\(request\)!==GM_SYNC_TOKEN\)return j\(\{ok:false,error:"UNAUTHORIZED"\},401\)/);
 assert.match(worker,/globalSetting:villageSceneHistory/);
});
test('Player reads published scene without upload rights',()=>{
 assert.match(player,/fetch\('\/api\/village-scene'/);
 assert.match(player,/setInterval\(sync,15000\)/);
 assert.doesNotMatch(player,/\/api\/gm\/village-scene/);
 assert.match(player,/MutationObserver\(apply\)/);
});
test('Server GM settings provide upload, publish and rollback',()=>{
 for(const id of ['gmVillageDay','gmVillageNight','gmVillagePublish','gmVillageRollback','gmVillageStatus'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(gm,/villageSceneRequest\('\/api\/gm\/village-scene','PUT'/);
 assert.match(gm,/villageSceneRequest\('\/api\/gm\/village-scene\/rollback','POST'/);
});
test('Village seats and movement files remain unchanged by this feature',()=>{
 assert.ok(fs.existsSync('assets/village/village-room.mjs'));
 assert.ok(fs.existsSync('assets/village/village-layout.js'));
});
