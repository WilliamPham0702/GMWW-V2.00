import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gm=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const status=readFileSync('server-game/current/status-visuals.css','utf8');
const webStatus=readFileSync('assets/village/status-visuals.css','utf8');
const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const bundled=readFileSync('src/gmww-members-live.js','utf8');

test('PR765 superseded: GM 🫧 and 🐦‍🔥 orbit uses original wolf status animation',()=>{
  assert.ok(gm.includes("className='battle-orbit gmww-sv-orbit'"));
  assert.ok(gm.includes("kind==='actor'?'🫧':'🐦‍🔥'"));
  assert.ok(status.includes('animation:gmwwSvVerticalOrbit 6s linear infinite!important'));
  assert.ok(webStatus.startsWith(status),'GM and Player status shared CSS must remain identical');
});
test('Player Web attaches the exact wolf orbit to character portrait',()=>{
  assert.ok(player.includes("const portrait=node.querySelector(':scope>.portrait.game-character')"));
  assert.ok(player.includes('portrait.appendChild(orbit)'));
  assert.ok(player.includes("item.className='gmww-sv-orbit-item'"));
  assert.ok(player.includes("@keyframes gmwwSvVerticalOrbit"));
  assert.ok(player.includes("kind==='actor'?'🫧':'🐦‍🔥'"));
  assert.ok(!player.includes('gmww-player-character-orbit'));
});
test('Compiled Player Web contains exact authored source',()=>{
  const prefix='export const gmwwMembersLiveScript = ';
  assert.ok(bundled.startsWith(prefix));
  const body=JSON.parse(bundled.slice(prefix.length).trim().replace(/;$/,''));
  assert.ok(body.includes(player));
});
