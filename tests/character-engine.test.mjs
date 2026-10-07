import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_ENGINE_VERSION,
  CHARACTER_MASTER,
  CHARACTER_STATES,
  SHARED_RIGS,
  createCharacterManifest,
  createCharacterModel,
  beginCharacterMove,
  arriveCharacter,
  scheduleIdleBehavior,
  transitionCharacter,
  characterRendererCommand,
  characterStateFromPlayer
} from '../src/gmww-character-engine.js';

test('Character Master uses the shared muscular rig and animation adapter',()=>{
  assert.equal(CHARACTER_ENGINE_VERSION,'0.1.0');
  assert.equal(CHARACTER_MASTER.id,'character-01');
  assert.equal(CHARACTER_MASTER.rigId,SHARED_RIGS['male-muscular'].id);
  assert.equal(CHARACTER_MASTER.renderer,'adapter');
  assert.ok(CHARACTER_MASTER.motionSet.includes('walk'));
  assert.ok(CHARACTER_MASTER.motionSet.includes('blink'));
});

test('one manifest scales the engine contract to all 42 characters',()=>{
  const manifest=createCharacterManifest();
  assert.equal(manifest.length,42);
  assert.equal(new Set(manifest.map(x=>x.id)).size,42);
  assert.ok(manifest.every(x=>x.rigId&&x.motions.includes('walk')&&x.motions.includes('dead')));
});

test('walking and arrival are state-machine transitions, not frame sequencing',()=>{
  const start=createCharacterModel({id:'character-01',now:100});
  const walking=beginCharacterMove(start,{x:20,y:10,now:200});
  assert.equal(walking.state,CHARACTER_STATES.WALKING);
  assert.equal(walking.motion,'walk');
  assert.deepEqual(walking.target,{x:20,y:10});
  assert.equal(walking.facing,'right');
  const idle=arriveCharacter(walking,{now:900});
  assert.equal(idle.state,CHARACTER_STATES.IDLE);
  assert.equal(idle.motion,'idle');
  assert.equal(idle.x,20);
  assert.equal(idle.y,10);
  assert.equal(idle.target,null);
});

test('dead state is terminal',()=>{
  const start=createCharacterModel({id:'character-02'});
  const dead=transitionCharacter(start,CHARACTER_STATES.DEAD,{now:1});
  const rejected=transitionCharacter(dead,CHARACTER_STATES.WALKING,{now:2});
  assert.equal(rejected.state,CHARACTER_STATES.DEAD);
  assert.equal(rejected.transitionRejected,true);
});

test('idle behavior is deterministic per character but not hard-coded to one loop',()=>{
  let model=createCharacterModel({id:'character-01',now:0});
  const seen=new Set();
  for(let i=0;i<12;i++){
    model=scheduleIdleBehavior(model,{now:i*10000,minDelayMs:2000,maxDelayMs:6000});
    seen.add(model.motion);
    assert.ok(model.nextBehaviorAt>=i*10000+2000);
    assert.ok(model.nextBehaviorAt<=i*10000+6000);
  }
  assert.ok(seen.size>=2);
});

test('renderer adapter receives semantic motion commands and facing',()=>{
  let model=createCharacterModel({id:'character-03'});
  model=beginCharacterMove(model,{x:-8,y:4,now:5});
  const cmd=characterRendererCommand(model);
  assert.equal(cmd.characterId,'character-03');
  assert.equal(cmd.motion,'walk');
  assert.equal(cmd.facing,'left');
  assert.equal(cmd.loop,true);
});


test('realtime player payload maps into semantic animation state',()=>{
  const animation=characterStateFromPlayer({
    gameCharacterId:'character-12',
    positionX:10,
    positionY:20,
    movementStatus:'moving',
    moveFromX:10,
    moveFromY:20,
    moveToX:4,
    moveToY:22,
    moveStartedAt:1000,
    moveId:'move-1',
    villageActivity:'roaming'
  },{now:1200});
  assert.equal(animation.characterId,'character-12');
  assert.equal(animation.motion,'walk');
  assert.equal(animation.facing,'left');
  assert.equal(animation.sourceMoveId,'move-1');
  assert.equal(animation.engineVersion,CHARACTER_ENGINE_VERSION);
});

test('Worker exposes character engine manifest and semantic animation in public player payload',async()=>{
  const fs=await import('node:fs');
  const worker=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.ok(worker.includes('from "./gmww-character-engine.js"'));
  assert.ok(worker.includes('/api/character-engine/manifest'));
  assert.ok(worker.includes('characterAnimation:characterStateFromPlayer(p)'));
});
