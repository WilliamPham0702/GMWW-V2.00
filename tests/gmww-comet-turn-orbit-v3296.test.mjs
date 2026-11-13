import {gmSource,playerWebSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(f,'utf8');
const gm=gmSource('40-battle-and-timeline');
const live=read('server-game/current/app.js');
const player=playerWebSource('35-online-chat');
const bundle=read('src/gmww-members-live.js');
const wolf=read('server-game/current/status-visuals.css');
const webWolf=read('assets/village/status-visuals.css');
const exact="kind==='actor'?'🧞‍♂️':'🐦‍🔥'";
test('Comet marks acting player on Server and Player Web, phoenix remains target',()=>{
 for(const s of [gm,live,player]){assert.ok(s.includes(exact)); assert.ok(!s.includes("kind==='actor'?'🫧':'🐦‍🔥'"));}
 const p="export const gmwwMembersLiveScript = ";
 assert.ok(bundle.startsWith(p));
 assert.ok(JSON.parse(bundle.slice(p.length).trim().replace(/;$/,'')).includes(player));
});
test('Both icons use existing wolf orbit, same six slots, six-second phase',()=>{
 assert.ok(wolf.includes('@keyframes gmwwSvVerticalOrbit'));
 assert.ok(wolf.includes('animation:gmwwSvVerticalOrbit 6s linear infinite!important'));
 assert.ok(webWolf.startsWith(wolf));
 for(const s of [gm,live,player]){
  assert.ok(s.includes("item.className='gmww-sv-orbit-item'"));
  assert.ok(s.includes("(-6*k/count).toFixed(4)+'s'"));
  assert.ok(s.includes("count=6"));
 }
 assert.ok(player.includes('@keyframes gmwwSvVerticalOrbit'));
 assert.ok(!player.includes('gmww-player-character-orbit'));
});
