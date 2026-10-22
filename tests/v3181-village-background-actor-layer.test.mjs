import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const layout=read('assets/village/village.css');
const art=read('assets/village/village-art.css');
const gm=read('server-game/current/style.css');

test('published Player Web image replaces old art without a second overlay',()=>{
 assert.doesNotMatch(layout,/\.stage\.custom-scene::before\s*\{/,'custom scene must not paint an image in ::before');
 assert.doesNotMatch(layout,/\.stage\.custom-scene\s*>\s*\*\s*\{\s*position:\s*relative/,'the old rule collapses the absolute camera');
 assert.match(art,/\.stage\.custom-scene,\.night \.stage\.custom-scene\{\s*background-image:none!important/);
 assert.match(art,/\.stage\.custom-scene::after,\.night \.stage\.custom-scene::after\{\s*z-index:0!important/);
 assert.match(art,/\.stage\.custom-scene > \.scene\{\s*position:absolute!important;\s*inset:0!important;\s*z-index:2!important/);
 assert.match(art,/\.scene\{\s*z-index:2!important/);
 assert.match(art,/\.scene \.players\{pointer-events:auto\}/);
});

test('GM uses an image background behind its unchanged Character/Seat ring',()=>{
 assert.match(gm,/#start #playWorld\.has-custom-scene\{\s*background-image:var\(--gmww-gm-scene-image\)!important/);
 assert.match(gm,/#start #playWorld\.has-custom-scene > #playPlayerRing\{\s*position:absolute!important;\s*inset:0!important;\s*z-index:3!important/);
 assert.match(gm,/\.play-player-ring\{position:absolute;inset:0;z-index:3;pointer-events:none\}/);
 assert.doesNotMatch(gm.slice(gm.indexOf('/* Published GM art is a CSS background')),/\.play-player-token\s*\{|\.play-player-avatar\s*\{/);
});

test('iPhone caches reload corrected styles without touching gameplay sources',()=>{
 const player=read('assets/village/index.html');
 const server=read('server-game/current/GMWW.html');
 assert.match(player,/village\.css\?v=303&amp;status=freeze1&amp;visual=v3139&amp;layer=fix1/);
 assert.match(player,/village-art\.css\?v=gp2-25d-actor-layer-fix1/);
 const runtime=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 assert.ok(server.includes('style.css?v='+runtime+'-compact-room-mobile2-village-scene-align-1-actor-layer-fix1'));
 assert.match(read('assets/village/scene-manager.mjs'),/scene\.classList\.add\('custom-scene'\)/);
});
