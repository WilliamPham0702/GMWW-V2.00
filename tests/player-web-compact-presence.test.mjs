import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene=fs.readFileSync('assets/village/village.mjs','utf8');
const css=fs.readFileSync('assets/village/village.css','utf8');

test('Village shows one compact name badge with a colored presence dot, never a second status chip',()=>{
  const make=scene.slice(scene.indexOf('function makePlayerButton('),scene.indexOf('function stablePlayerNode('));
  assert.match(make,/nameText\.className="name-text";nameText\.textContent=playerName/);
  assert.match(make,/presence\.className="player-presence";presence\.dataset\.online=data\?\.online===false\?"false":"true"/);
  assert.match(make,/name\.append\(nameText,presence\)/);
  assert.match(make,/over\.append\(name\)/);
  assert.doesNotMatch(make,/className="player-status"/);
  assert.match(css,/\.player \.player-presence\{[\s\S]*?background:#39e680/);
  assert.match(css,/\.player \.player-presence\[data-online="false"\]\{[\s\S]*?background:#ff5363/);
  assert.match(css,/\.player \.player-status\{display:none!important\}/);
});

test('Existing character node updates presence without replacing name badge and remains accessible',()=>{
  const stable=scene.slice(scene.indexOf('function stablePlayerNode('),scene.indexOf('function ',scene.indexOf('function stablePlayerNode(')+10));
  assert.match(stable,/button\.querySelector\("\.name-text"\),presence=button\.querySelector\("\.player-presence"\)/);
  assert.match(stable,/if\(presence&&presence\.dataset\.online!==online\)presence\.dataset\.online=online/);
  assert.match(stable,/data\?\.online===false\?" · Offline":" · Online"/);
  assert.doesNotMatch(stable,/querySelector\("\.player-status"\)/);
  assert.doesNotMatch(scene,/el\.querySelector\("\.player-status"\)/);
});
