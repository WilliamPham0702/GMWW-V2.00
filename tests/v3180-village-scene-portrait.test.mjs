import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('approved portrait art remains aligned between GM and Player Web',()=>{
 const gm=read('server-game/current/style.css'),player=read('assets/village/village-art.css');
 assert.match(gm,/#start #playWorld\.has-custom-scene\{\s*background-size:100% 100%!important/);
 assert.match(player,/\.stage\.custom-scene,\.night \.stage\.custom-scene\{[\s\S]*?background-size:100% 100%!important/);
 assert.match(read('assets/village/village-layout.js'),/const fire=\{x:50,y:64\}/);
 assert.match(read('assets/village/index.html'),/class="stage scene-awaiting"/);
 assert.match(player,/\.stage\.scene-awaiting\{visibility:hidden!important\}/);
 assert.doesNotMatch(gm.slice(gm.indexOf('/* V3.180 — same full-frame')),/play-player-avatar|play-player-token|seat-offset/);
});
test('Player loads both published image revisions before switching backgrounds',()=>{
 const s=read('assets/village/scene-manager.mjs');
 assert.match(s,/await Promise\.all\(\[preloadSceneImage\(saved\.images\.day\),preloadSceneImage\(saved\.images\.night\)\]\)/);
 assert.ok(s.indexOf('await Promise.all')<s.indexOf('state.published=next;state.ready=true;apply()'));
 assert.match(s,/if\(syncInFlight\)return/);
 assert.match(s,/finally\{syncInFlight=false\}/);
 assert.match(s,/MutationObserver\(apply\)\.observe\(game/);
});
test('GM Runtime V3.180 includes new scene camera without changing native shell',()=>{
 const v=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 assert.ok(v.localeCompare('3.180',undefined,{numeric:true})>=0);
 const worker=read('src/index.js'),gm=read('server-game/current/app.js');
 assert.ok(worker.includes('VERSION="V'+v+'"'));
 assert.ok(worker.includes('NATIVE_SHELL_VERSION="3.110"'));
 assert.ok(worker.includes('UPDATE_CHANNEL_REV="runtime-'+v.replaceAll('.','')+'"'));
 assert.ok(gm.includes("const VERSION='"+v+"'"));
 assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='"+v+"'"));
 assert.ok(read('server-game/current/GMWW.html').includes('style.css?v='+v));
 assert.ok(read('server-game/current/GMWW.html').includes('app.js?v='+v));
});
