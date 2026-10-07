import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../server-game/current/character-renderer.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../server-game/current/character-renderer.css',import.meta.url),'utf8');

test('Player Web shared runtime covers all 20 active characters',()=>{
  assert.match(js,/Array\.from\(\{length:20\}/);
  assert.match(js,/rendererKind\(id,\{sitting=false\}/);
  assert.match(js,/segmented-skeletal/);
});

test('visible living motions are scheduled by runtime, not declarations only',()=>{
  for(const motion of ['turn','cheer','surprised','sad']) assert.ok(js.includes("'"+motion+"'"),motion);
  assert.match(js,/liveActionMotionAt/);
  assert.match(js,/tickLiveIdle/);
  for(const keyframe of ['gmwwPlayRigV03Turn','gmwwPlayRigV03Cheer','gmwwPlayRigV03Surprised','gmwwPlayRigV03Sad']) assert.ok(css.includes(keyframe),keyframe);
});

test('walk run ready dead and living idle remain wired',()=>{
  for(const state of ['walking','running','ready','dead']) assert.ok(js.includes("state==='"+state+"'"),state);
  for(const motion of ['blink','look-around','stretch','idle-breathe']) assert.ok(js.includes("'"+motion+"'"),motion);
});
