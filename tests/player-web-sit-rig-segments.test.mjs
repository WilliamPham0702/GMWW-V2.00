import test from 'node:test';
import assert from 'node:assert/strict';
import {SITTING_RIG_SEGMENTS} from '../assets/village/character-renderer.mjs';

test('Sit exposes four dedicated articulated leg segments',()=>{
  assert.deepEqual(SITTING_RIG_SEGMENTS.map(x=>x.id),[
    'sit-thigh-back','sit-shin-back','sit-thigh-front','sit-shin-front'
  ]);
});
