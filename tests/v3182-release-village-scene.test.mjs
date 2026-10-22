import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
test('V3.182 runtime OTA identifies itself and preserves native IPA V3.110',()=>{
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
 assert.ok(Number(pkg.version.split('.')[1])>=182,'v3.182 fix retained or newer');
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 const ver=pkg.version.replace(/\.0$/,'');
 assert.ok(read('src/index.js').includes('VERSION="V'+ver+'",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-'+ver.replaceAll('.','')+'"'));
 assert.ok(read('server-game/current/app.js').includes("const VERSION='"+ver+"'"));
 assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='"+ver+"'"));
 const html=read('server-game/current/GMWW.html');
 assert.ok(html.includes('<title>GMWW V'+ver+'</title>'));
 assert.ok(html.includes('style.css?v='+ver));
 assert.ok(html.includes('app.js?v='+ver));
});

test('V3.182 has user-visible release notes for village Day/Night actor layering',()=>{
 const script=read('.github/scripts/prepare-update-channel.mjs');
 assert.match(script,/"V3\.182:/);
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
