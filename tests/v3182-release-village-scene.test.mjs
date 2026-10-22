import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
test('V3.182 runtime OTA identifies itself and preserves native IPA V3.110',()=>{
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
 assert.equal(pkg.version,'3.182.0');
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 assert.match(read('src/index.js'),/VERSION="V3\.182",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3182"/);
 assert.match(read('server-game/current/app.js'),/const VERSION='3\.182'/);
 assert.match(read('server-game/src/00-core-and-library.part'),/const VERSION='3\.182'/);
 const html=read('server-game/current/GMWW.html');
 assert.match(html,/<title>GMWW V3\.182<\/title>/);
 assert.match(html,/style\.css\?v=3\.182/);
 assert.match(html,/app\.js\?v=3\.182/);
});

test('V3.182 has user-visible release notes for village Day/Night actor layering',()=>{
 const script=read('.github/scripts/prepare-update-channel.mjs');
 assert.match(script,/releaseNotes:\["V3\.182:/);
 assert.match(script,/V3\.182:[^"\n]*Player Web/);
 assert.match(script,/shellVersion:shell|shellVersion:/);
 assert.match(read('docs/RELEASE-V3.182-VILLAGE-SCENE.md'),/Runtime V3\.182/);
});

test('V3.182 preserves PR400 Character40/Seat image layering fix',()=>{
 const player=read('assets/village/village.css');
 const art=read('assets/village/village-art.css');
 const gm=read('server-game/current/style.css');
 assert.doesNotMatch(player,/\.stage\.custom-scene > \*\{position:relative\}/);
 assert.match(art,/\.stage\.custom-scene > \.scene\{\s*position:absolute!important;\s*inset:0!important/);
 assert.match(gm,/#start #playWorld\.has-custom-scene > #playPlayerRing\{\s*position:absolute!important/);
});
