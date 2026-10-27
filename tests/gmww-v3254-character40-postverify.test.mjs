import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('Production post-verify uses independent GM and Player Web SHA-256 sources',()=>{
 const verify=read('.github/scripts/verify-character40-production.mjs');
 assert.match(verify,/sha\(playerBytes\),sha\(localPlayerBytes\)/);
 assert.match(verify,/assets\/characters\/gmww40\/runtime\.js/);
 assert.match(verify,/server-game\/current\/gmww-shared-motion\.js/);
 assert.match(verify,/GM low-power controller OTA SHA/);
 assert.match(verify,/Player controller OTA SHA/);
 assert.doesNotMatch(verify,/GM\/Player identical controller/);
 assert.notEqual(read('assets/characters/gmww40/runtime.js'),read('server-game/current/gmww-shared-motion.js'));
});
test('Only CI scripts and workflow route change; no Runtime version or native IPA bump',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'3.254.0');
 const gm=read('server-game/current/GMWW.html');
 assert.match(gm,/<title>GMWW V3\.254<\/title>/);
 assert.match(gm,/gmww-performance\.js\?v=gm-perf-3254/);
});
