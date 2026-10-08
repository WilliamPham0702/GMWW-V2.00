import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SITTING_RIG_SEGMENTS} from '../assets/village/character-renderer.mjs';

const css=fs.readFileSync(new URL('../assets/village/character-renderer.css',import.meta.url),'utf8');

test('Sit uses dedicated articulated thighs and shins',()=>{
  assert.deepEqual(SITTING_RIG_SEGMENTS.map(x=>x.id),[
    'sit-thigh-back','sit-shin-back','sit-thigh-front','sit-shin-front'
  ]);
  assert.match(css,/data-state="sitting"[^\n]*\.gmww-rig-leg-back,[\s\S]*\.gmww-rig-leg-front\{display:none!important\}/);
  for(const token of ['gmww-rig-sit-thigh-back','gmww-rig-sit-shin-back','gmww-rig-sit-thigh-front','gmww-rig-sit-shin-front']) assert.ok(css.includes(token),token);
});

test('Sit folds thighs outward and shins inward to cross in front',()=>{
  assert.match(css,/gmww-rig-sit-thigh-back[^\n]*rotate\(38deg\)/);
  assert.match(css,/gmww-rig-sit-thigh-front[^\n]*rotate\(-38deg\)/);
  assert.match(css,/gmww-rig-sit-shin-back[^\n]*rotate\(-58deg\)/);
  assert.match(css,/gmww-rig-sit-shin-front[^\n]*rotate\(58deg\)/);
});
