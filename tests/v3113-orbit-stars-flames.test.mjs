import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

test('actor orbit uses green sparkles and target orbit uses fire, rotating on the vertical axis',()=>{
  assert.match(css,/battle-orbit\[data-kind="actor"\] i::before\{content:"✦";color:#b6f5c2/);
  assert.match(css,/battle-orbit\[data-kind="target"\] i::before\{content:"🔥"/);
  assert.match(css,/@keyframes gmwwOrbitSpin\{to\{--orb-spin:360deg\}\}/);
  assert.match(css,/calc\(cos\(var\(--a\)\) \* 40px\)/);
  assert.doesNotMatch(css,/battle-orbit\{[^}]*border-radius:50%/);
});

test('actor sparkles are slightly larger than target flames',()=>{
  assert.match(css,/battle-orbit\[data-kind="actor"\] i\{font-size:15px\}/);
  assert.match(css,/battle-orbit i\{[^}]*font-size:12px/);
});

test('turn label stays above the head in green; target label is red',()=>{
  assert.match(css,/battle-turn-mark\{[^}]*background:#7ee08a/);
  assert.match(css,/is-battle-target:after\{content:"MỤC TIÊU";[^}]*background:#ff6b5b/);
});

test('orbit items are built per kind and rebuilt when kind changes',()=>{
  assert.match(app,/orb\.dataset\.kind!==kind/);
  assert.match(app,/orb\.replaceChildren\(/);
  assert.match(app,/setProperty\('--b'/);
});
