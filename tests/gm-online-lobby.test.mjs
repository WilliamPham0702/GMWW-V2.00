import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/index.js','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const live=fs.readFileSync('src/gmww-members-live.js','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');
const css=fs.readFileSync('assets/village/village.css','utf8');
const gmAsset=fs.readFileSync('assets/gm/gm-white-wolf.webp');

test('GM presence API has authenticated heartbeat and public online TTL',()=>{
  assert.match(server,/GM_PRESENCE_TTL=75000/);
  assert.match(server,/\/api\/gm-presence/);
  assert.match(server,/\/api\/gm\/presence/);
  assert.match(server,/globalSetting:gmPresence/);
  assert.match(app,/gmwwSendGmPresence/);
  assert.match(app,/setInterval\(\(\)=>\{if\(document\.visibilityState!=='hidden'\)gmwwSendGmPresence\(true\)\},20000\)/);
});

test('Player Web renders a dedicated GM rider only while GM is online',()=>{
  assert.match(live,/GM_VILLAGE_HOLD_MS=15000/);
  assert.match(live,/GM_VILLAGE_MOVE_MS=8500/);
  assert.match(live,/avatarUrl:'\/gm\/gm-white-wolf\.webp'/);
  assert.match(live,/gmPlayer=gmVillagePlayer\(\)/);
  assert.match(village,/isGM=p\?\.isGM===true\|\|p\?\.kind==="gm"/);
  assert.match(village,/scale=isGM\?normalScale\*1\.5:normalScale/);
  assert.match(village,/if\(isGM\)return/);
  assert.match(css,/\.player\.gm/);
});

test('GM rider asset is packaged as a real WebP',()=>{
  assert.ok(gmAsset.length>10000);
  assert.equal(gmAsset.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(gmAsset.subarray(8,12).toString('ascii'),'WEBP');
});
