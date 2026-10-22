import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('approved portrait art remains aligned between GM and Player Web',()=>{
 const gm=read('server-game/current/style.css'),player=read('assets/village/village-art.css');
 assert.match(gm,/#start #playWorld\.has-custom-scene\{\s*background-size:100% 100%!important/);
 assert.match(player,/\.stage\.custom-scene::after,\.night \.stage\.custom-scene::after\{\s*background-size:100% 100%!important/);
 assert.match(read('assets/village/village-layout.js'),/const fire=\{x:50,y:49\.7\}/);
 assert.ok(player.includes('gmww-village-night-v260.webp'));
 assert.ok(player.includes('gmww-village-day-v260.webp'));
 assert.doesNotMatch(gm.slice(gm.indexOf('/* V3.180 — same full-frame')),/play-player-avatar|play-player-token|seat-offset/);
});
test('Player loads both published image revisions before switching backgrounds',()=>{
 const s=read('assets/village/scene-manager.mjs');
 assert.match(s,/await Promise\.all\(\[preloadSceneImage\(next\.day\),preloadSceneImage\(next\.night\)\]\)/);
 assert.ok(s.indexOf('await Promise.all')<s.indexOf('state.published=next;apply()'));
 assert.match(s,/if\(syncInFlight\)return/);
 assert.match(s,/finally\{syncInFlight=false\}/);
 assert.match(s,/MutationObserver\(apply\)\.observe\(game/);
});
test('GM Runtime V3.180 includes new scene camera without changing native shell',()=>{
 const v=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 assert.equal(v,'3.180');
 const worker=read('src/index.js'),gm=read('server-game/current/app.js');
 assert.ok(worker.includes('VERSION="V'+v+'"'));
 assert.ok(worker.includes('NATIVE_SHELL_VERSION="3.110"'));
 assert.ok(worker.includes('UPDATE_CHANNEL_REV="runtime-3180"'));
 assert.ok(gm.includes("const VERSION='"+v+"'"));
 assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='"+v+"'"));
 assert.ok(read('server-game/current/GMWW.html').includes('style.css?v='+v));
 assert.ok(read('server-game/current/GMWW.html').includes('app.js?v='+v));
});
