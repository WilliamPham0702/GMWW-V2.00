import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CHARACTER_RENDERER_VERSION,
  MASTER_CHARACTER_ID,
  MASTER_RIG_SEGMENTS,
  SHARED_RIG_BATCH_IDS,
  SHARED_RIG_PROOF_IDS,
  defaultRigIdFor,
  masterTextureUrl,
  normalizeRendererCommand,
  rendererKind,
  motionProfileFor
} from '../assets/village/character-renderer.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Character-01 is the segmented skeletal master and does not sequence walk frames',()=>{
  assert.equal(CHARACTER_RENDERER_VERSION,'0.4.0');
  assert.equal(rendererKind('character-01',{sitting:true}),'segmented-skeletal');
  assert.equal(MASTER_CHARACTER_ID,'character-01');
  assert.equal(rendererKind('character-01'),'segmented-skeletal');
  assert.equal(rendererKind('character-02'),'segmented-skeletal');
  assert.equal(rendererKind('character-03'),'segmented-skeletal');
  assert.equal(rendererKind('character-04'),'segmented-skeletal');
  assert.equal(rendererKind('character-20'),'segmented-skeletal');
  assert.equal(rendererKind('character-21'),'fallback');
  assert.equal(SHARED_RIG_BATCH_IDS.length,20);
  assert.deepEqual(SHARED_RIG_PROOF_IDS,SHARED_RIG_BATCH_IDS);
  assert.equal(MASTER_RIG_SEGMENTS.length,6);
  assert.deepEqual(MASTER_RIG_SEGMENTS.map(x=>x.id),['leg-back','leg-front','torso','arm-back','arm-front','head']);
  assert.equal(masterTextureUrl('character-01','right'),'/api/game-characters/character-01/frame/1');
  assert.equal(masterTextureUrl('character-01','left'),'/api/game-characters/character-01/frame/1?dir=left');
});

test('semantic engine state maps directly into renderer state',()=>{
  const c=normalizeRendererCommand({
    characterId:'character-01',
    rigId:'rig-male-muscular-v1',
    state:'walking',
    motion:'walk',
    facing:'left',
    loop:true,
    engineVersion:'0.1.0'
  });
  assert.equal(c.state,'walking');
  assert.equal(c.motion,'walk');
  assert.equal(c.facing,'left');
  assert.equal(c.rigId,'rig-male-muscular-v1');
});

test('Player Web preserves server Character Engine payload and mounts the master renderer',()=>{
  const village=read('assets/village/village.mjs');
  assert.ok(village.includes('mapCharacterAnimation(p)'));
  assert.ok(village.includes('characterAnimation:mapCharacterAnimation(p)'));
  assert.ok(village.includes('mountCharacterRenderer(avatar'));
  assert.ok(village.includes('updateCharacterRenderer(avatar,semantic)'));
  assert.ok(village.includes('animationCommandFor(data,pos)'));
});

test('master rig animation is body-part driven and never runtime mirrored',()=>{
  const renderer=read('assets/village/character-renderer.mjs');
  const css=read('assets/village/character-renderer.css');
  assert.ok(renderer.includes("dataset.rigPart"));
  assert.ok(css.includes('.gmww-rig-leg-back'));
  assert.ok(css.includes('.gmww-rig-arm-front'));
  assert.ok(css.includes('@keyframes gmww-rig-leg-a'));
  assert.ok(css.includes('@keyframes gmww-rig-breathe'));
  assert.doesNotMatch(css,/scaleX\s*\(/);
  assert.doesNotMatch(renderer,/frame\/(?:2|3|4|5|6)/);
});

test('village loads renderer CSS and renderer module as part of the live scene',()=>{
  const html=read('assets/village/index.html');
  assert.ok(html.includes('./character-renderer.css?v=ce4'));
  assert.ok(html.includes('./village.mjs?v=ce4'));
});


test('Character-02 and Character-03 reuse the same segmented renderer contract',()=>{
  for(const id of ['character-01','character-02','character-03']){
    assert.equal(rendererKind(id),'segmented-skeletal');
    assert.equal(MASTER_RIG_SEGMENTS.length,6);
    assert.match(masterTextureUrl(id,'right'),new RegExp('/'+id+'/frame/1$'));
    assert.match(masterTextureUrl(id,'left'),new RegExp('/'+id+'/frame/1\\?dir=left$'));
  }
});


test('first 20 characters share two rig archetypes instead of per-character animation files',()=>{
  assert.equal(defaultRigIdFor('character-01'),'rig-male-muscular-v1');
  assert.equal(defaultRigIdFor('character-12'),'rig-male-muscular-v1');
  assert.equal(defaultRigIdFor('character-13'),'rig-male-normal-v1');
  assert.equal(defaultRigIdFor('character-20'),'rig-male-normal-v1');
  assert.equal(rendererKind('character-20'),'segmented-skeletal');
  assert.equal(rendererKind('character-21'),'fallback');
  const css=read('assets/village/character-renderer.css');
  assert.ok(css.includes('[data-rig-id="rig-male-normal-v1"]'));
});


test('micro-behaviors are shared across Player Web and GM renderer',()=>{
  const web=read('assets/village/character-renderer.css');
  const gm=read('server-game/current/character-renderer.css');
  for(const token of ['data-motion="blink"','data-motion="look-around"','data-motion="stretch"']){
    assert.ok(web.includes(token));
    assert.ok(gm.includes(token));
  }
  assert.ok(web.includes('gmww-rig-blink'));
  assert.ok(web.includes('gmww-rig-look'));
  assert.ok(web.includes('gmww-rig-stretch-torso'));
  assert.ok(gm.includes('gmwwPlayRigBlink'));
  assert.ok(gm.includes('gmwwPlayRigLook'));
  assert.ok(gm.includes('gmwwPlayRigStretchTorso'));
});


test('local idle-life scheduler is shared and phase-shifted without per-character timers',async()=>{
  const mod=await import('../assets/village/character-renderer.mjs');
  const times=Array.from({length:80},(_,i)=>i*500);
  const a=times.map(t=>mod.liveIdleMotionAt('character-01',t));
  const b=times.map(t=>mod.liveIdleMotionAt('character-02',t));
  assert.deepEqual(a,times.map(t=>mod.liveIdleMotionAt('character-01',t)));
  assert.notDeepEqual(a,b);
  assert.ok(a.some(x=>x!=='idle-breathe'));
  const source=read('assets/village/character-renderer.mjs');
  assert.equal((source.match(/setInterval\s*\(/g)||[]).length,1);
  assert.ok(source.includes('LIVE_IDLE_ROOTS'));
});


test('audited Character-01 to 03 rig profiles use per-character alpha bounds',()=>{
  const web=read('assets/village/character-renderer.css');
  const gm=read('server-game/current/character-renderer.css');
  for(const id of ['character-01','character-02','character-03']){
    assert.ok(web.includes(`data-character-id="${id}"`));
    assert.ok(gm.includes(`data-character-id="${id}"`));
  }
  assert.ok(web.includes('41.8% 58%'));
  assert.ok(web.includes('45.2% 57.2%'));
  assert.ok(web.includes('43.4% 57.4%'));
  assert.ok(gm.includes('41.8% 58%'));
  assert.ok(gm.includes('45.2% 57.2%'));
  assert.ok(gm.includes('43.4% 57.4%'));
});


test('gait profiles distinguish muscular and normal rigs and walking from running',()=>{
  const muscularWalk=motionProfileFor('walking','rig-male-muscular-v1');
  const normalWalk=motionProfileFor('walking','rig-male-normal-v1');
  const muscularRun=motionProfileFor('running','rig-male-muscular-v1');
  assert.notEqual(muscularWalk.cycleMs,normalWalk.cycleMs);
  assert.ok(muscularRun.cycleMs<muscularWalk.cycleMs);
  assert.ok(Math.abs(muscularRun.legBack)>Math.abs(muscularWalk.legBack));
  assert.ok(muscularRun.lift>muscularWalk.lift);
  const web=read('assets/village/character-renderer.css');
  const gm=read('server-game/current/character-renderer.css');
  assert.ok(web.includes('Character Motion V0.3'));
  assert.ok(web.includes('--rig-leg-forward'));
  assert.ok(web.includes('data-motion="turn"'));
  assert.ok(web.includes('data-motion="cheer"'));
  assert.ok(gm.includes('Character Motion V0.3'));
  assert.ok(gm.includes('gmwwPlayRigV03Body'));
});
