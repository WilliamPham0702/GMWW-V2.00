import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('GM renders exactly one white-wolf master image',()=>{
  const start=app.indexOf('function renderPlayGmToken');
  const end=app.indexOf('function updatePlayGmToken',start);
  const block=app.slice(start,end);
  assert.match(block,/gm-wolf-master/);
  assert.equal((block.match(/gm\/gm-white-wolf\.webp/g)||[]).length,1);
  assert.doesNotMatch(block,/gm-wolf-head/);
  assert.doesNotMatch(block,/gm-wolf-leg-a/);
});

test('GM master exposes all five approved behavior states',()=>{
  for(const state of ['idle','walk','run','shake','howl']){
    assert.match(app,new RegExp("gm-action-"+state));
    assert.match(css,new RegExp("gm-action-"+state));
  }
  assert.match(app,/gait:moving\?'run':'idle'/);
  assert.match(app,/gait:moving\?'walk':'idle'/);
});
