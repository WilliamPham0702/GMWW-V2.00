import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {normalizeRenderMode} from '../src/gmww-room-config-rules.js';
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
test('renderMode: only 3d is accepted, everything else falls back to 2d',()=>{
  assert.equal(normalizeRenderMode('3D'),'3d');
  for(const v of [undefined,null,'',' 2d','xyz',3])assert.equal(normalizeRenderMode(v),'2d');
});
test('renderMode is set by GM settings and exposed in the public room DTO',()=>{
  const idx=read('../src/index.js'),dto=read('../src/gmww-public-room-contract.js');
  assert.match(idx,/meta\.renderMode=renderMode/);
  assert.match(dto,/renderMode:normalizeRenderMode\(m\.renderMode\)/);
});
test('Player Web follows the server renderMode and has no player-side switch',()=>{
  const live=read('../src/gmww-members-live.js'),page3d=read('../assets/village/arena-3d/live.mjs');
  assert.match(live,/state\.room\?\.renderMode\|\|'2d'\)==='3d'/);
  assert.doesNotMatch(page3d,/player-2d/);
});
