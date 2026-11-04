import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const gm=read('server-game/src/40-battle-and-timeline.part');
const compiled=read('server-game/current/app.js');
const web=read('src/player-web-src/35-online-chat.part');
const bundled=read('src/gmww-members-live.js');
const sourceWolf=read('assets/status-visuals.js');
const wolf=read('server-game/current/status-visuals.css');
const webWolf=read('assets/village/status-visuals.css');
const exact="kind==='actor'?'🧞‍♂️':'🐦‍🔥'";
test('V3.298: 🧞‍♂️ replaces ☄️ for actor only; 🐦‍🔥 target unchanged on GM & Player',()=>{
 for(const part of [gm,compiled,web]){
  assert.ok(part.includes(exact));
  assert.ok(!part.includes("kind==='actor'?'☄️':'🐦‍🔥'"));
  assert.ok(part.includes("item.className='gmww-sv-orbit-item'"));
  assert.ok(part.includes("(-6*k/count).toFixed(4)+'s'"));
  assert.ok(part.includes('count=6'));
 }
 const prefix='export const gmwwMembersLiveScript = ';
 assert.ok(bundled.startsWith(prefix));
 assert.ok(JSON.parse(bundled.slice(prefix.length).trim().replace(/;$/,'')).includes(web));
});
test('V3.298 keeps same 🐺 orbit and existing public/private target rules',()=>{
 assert.ok(sourceWolf.includes("wolf_bitten:['🐺']"));
 assert.ok(wolf.includes('@keyframes gmwwSvVerticalOrbit'));
 assert.ok(wolf.includes('animation:gmwwSvVerticalOrbit 6s linear infinite!important'));
 assert.ok(webWolf.startsWith(wolf));
 assert.ok(web.includes('@keyframes gmwwSvVerticalOrbit'));
 assert.ok(web.includes('animation:gmwwSvVerticalOrbit 6s linear infinite'));
 assert.ok(!web.includes('gmww-player-character-orbit'));
 assert.ok(web.includes("const actor=active&&id===me,target=targets.has(id)"));
 assert.ok(gm.includes('playSceneRuntime.battleUndo?.turnId===t?.id'));
});
test('V3.298 orbit remains correct across safe Runtime upgrades',()=>{
 const version=JSON.parse(read('package.json')).version;
 assert.match(version,/^3\.(298|299)\.0$/);
 assert.equal(JSON.parse(read('package-lock.json')).version,version);
 const minor=version.replace(/\.0$/,'');
 assert.ok(read('src/index.js').includes('VERSION="V'+minor+'"'));
 assert.ok(read('server-game/current/GMWW.html').includes('<title>GMWW V'+minor+'</title>'));
 assert.ok(compiled.includes("const VERSION='"+minor+"'"));
 assert.ok(read('docs/releases/GMWW-RUNTIME-V3.298-GENIE-TURN-ICON-20261104.md').includes('Rollback'));
});
