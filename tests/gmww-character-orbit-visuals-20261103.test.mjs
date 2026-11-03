import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gm=readFileSync('server-game/current/style.css','utf8');
const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const bundled=readFileSync('src/gmww-members-live.js','utf8');

test('GM ⭐/🔥 orbit is centered on the character avatar, not labels',()=>{
  assert.match(gm,/\.play-player-avatar>\.battle-orbit\{/);
  assert.match(gm,/@keyframes gmwwCharacterBodyOrbit/);
  assert.match(gm,/translate\(0,12px\) scale\(1\.24\)/);
  assert.match(gm,/\[data-kind="actor"\] i::before\{\s*content:"⭐"/);
  assert.match(gm,/\[data-kind="target"\] i:nth-child\(5\)/);
  assert.match(gm,/prefers-reduced-motion:reduce/);
});
test('Player Web attaches the orbit to the portrait, with offset icons',()=>{
  assert.match(player,/const portrait=node\.querySelector\(':scope>\.portrait\.game-character'\)/);
  assert.match(player,/portrait\.appendChild\(orbit\)/);
  assert.match(player,/\.portrait>\.gmww-online-orbit/);
  assert.match(player,/@keyframes gmww-player-character-orbit/);
  assert.match(player,/star\.style\.setProperty\('--orbit-delay'/);
  assert.match(player,/star\.textContent=kind==='actor'\?'⭐':'🔥'/);
  assert.match(player,/prefers-reduced-motion:reduce/);
});
test('Compiled Player Web contains the exact updated visual source',()=>{
  const prefix='export const gmwwMembersLiveScript = ';
  assert.ok(bundled.startsWith(prefix));
  const body=JSON.parse(bundled.slice(prefix.length).trim().replace(/;$/,''));
  assert.ok(body.includes(player),'compiled Player Web must include unmodified authored source');
});
