import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');

test('GM mounts one wolf runtime with segmented master layers',()=>{
  const start=app.indexOf('function renderPlayGmToken');
  const end=app.indexOf('function updatePlayGmToken',start);
  const block=app.slice(start,end);
  assert.match(block,/data-gm-wolf-runtime="1"/);
  assert.equal((block.match(/gm\/gm-white-wolf\.webp/g)||[]).length,4);
  for(const part of ['gm-wolf-body','gm-wolf-rear-legs','gm-wolf-front-legs','gm-wolf-head'])assert.match(block,new RegExp(part));
});

test('GM runtime exposes all five approved behavior states and articulated motion',()=>{
  for(const state of ['idle','walk','run','shake','howl']){
    assert.match(app,new RegExp("gm-action-"+state));
    assert.match(css,new RegExp("gm-action-"+state));
  }
  assert.match(app,/gait:moving\?'run':'idle'/);
  assert.match(app,/gait:moving\?'walk':'idle'/);
  for(const motion of ['gmWolfRuntimeWalkRear','gmWolfRuntimeWalkFront','gmWolfRuntimeRunRear','gmWolfRuntimeRunFront','gmWolfRuntimeShakeHead','gmWolfRuntimeHowlHead'])assert.match(css,new RegExp(motion));
});


test('GM scene contains no retired second wolf actor or controller',()=>{
  assert.doesNotMatch(html,/id="gmWolfCharacter"/);
  assert.doesNotMatch(app,/function gmWolfSetMotion/);
  assert.equal((html.match(/gm\/gm-white-wolf\.webp/g)||[]).length,0);
});
