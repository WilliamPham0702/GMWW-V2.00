import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {createArenaSpellVfx,spellAppearance,SPELL_KINDS,SPELL_VFX_VERSION} from '../assets/village/arena-3d/spell-vfx.mjs';
import {createArenaCharacterField} from '../assets/village/arena-3d/character-atelier.mjs';

test('Separate allowed spell symbols use a sea-fantasy palette, unknown spells fail closed',()=>{
  assert.equal(SPELL_VFX_VERSION,'arena-spell-glyph-v1');
  assert.deepEqual(SPELL_KINDS,['shield','inspect','heal','attack','vote']);
  const palette=SPELL_KINDS.map(kind=>spellAppearance(kind));
  assert.equal(new Set(palette.map(x=>x.color)).size,5);
  assert.equal(new Set(palette.map(x=>x.symbol)).size,5);
  for(const input of ['raw-role',undefined,null,'action_wolf_secret',''])assert.equal(spellAppearance(input),null);
});
test('GPU FX uses constant four shared draw calls for all 6–30, reduces pearls for low power',()=>{
  const scene=new THREE.Scene();
  const effects=createArenaSpellVfx(THREE,scene);
  assert.equal(effects.drawBudget,4);
  const now=performance.now(),cue={type:'shield',
    from:{x:1,y:1.5,z:2},to:{x:4,y:.8,z:3},start:now-50,end:now+2400};
  assert.equal(effects.update(cue,now),true);
  assert.equal(effects.active,true);
  assert.equal(effects.effectKind,'shield');
  assert.equal(effects.visiblePearls,16);
  assert.equal(scene.getObjectByName('arena-spell-pearls').count,16);
  effects.setLowPower(true);
  effects.update(cue,now+100);
  assert.equal(effects.visiblePearls,7);
  effects.setReducedMotion(true);
  effects.update(cue,now+110);
  assert.equal(effects.visiblePearls,4);
  effects.setReducedMotion(false);
  effects.setLowPower(false);
  assert.equal(effects.update({...cue,type:'inspect'},now+120),true);
  assert.equal(effects.effectKind,'inspect');
  assert.equal(effects.visiblePearls,16);
  assert.equal(effects.update({...cue,type:'not-from-core'},now+160),false);
  assert.equal(effects.visiblePearls,0);
  assert.equal(effects.update(cue,now+3000),false,'expired event has no VFX');
  assert.equal(effects.update({...cue,from:{x:NaN,y:1,z:2}},now),false);
  effects.dispose();
  assert.equal(scene.getObjectByName('arena-spell-vfx'),undefined);
});
test('Character runtime displays VFX only after approved caster-to-target cue and hides on turn switch',()=>{
  for(const n of [6,12,20,30]){
    const scene=new THREE.Scene(),field=createArenaCharacterField(THREE,scene);
    const players=Array.from({length:n},(_,i)=>({
      id:'member:p'+i,seatId:i+1,characterId:'character-'+String(i+1).padStart(2,'0'),
      position:{x:Math.cos(i/n*Math.PI*2)*6,z:Math.sin(i/n*Math.PI*2)*5},statusTags:[]
    }));
    field.setActors(players,{seatCount:n,seatLayout:'circle'});
    assert.equal(field.actorCount,n);
    assert.ok(field.drawBudget<=45,'GPU draw budget independent of number of players');
    field.draw(performance.now()+1,true);
    assert.equal(field.spellVfxActive,false);
    const now=performance.now(),date=Date.now();
    field.setCastingTurn({turnId:'GM:night:1',actorIds:['member:p1']},now);
    field.setCastingTurn({turnId:'GM:night:1',actorIds:['member:p1'],
      cast:{actorId:'member:p1',targetIds:['member:p2'],kind:'heal',
        startedAt:date,expiresAt:date+3200}},now+900);
    field.draw(now+1100,true);
    assert.equal(field.beamVisible,true);
    assert.equal(field.spellVfxActive,true);
    assert.equal(field.spellVfxKind,'heal');
    assert.equal(field.spellVfxPearls,16);
    field.setLowPower(true);
    field.draw(now+1200,true);
    assert.equal(field.spellVfxPearls,7);
    field.setCastingTurn({turnId:'GM:night:2',actorIds:['member:p3']},now+1250);
    field.draw(now+1280,true);
    assert.equal(field.spellVfxActive,false);
    assert.equal(field.spellVfxPearls,0);
    field.clearEffects();field.dispose();
  }
});
test('Client never fabricates secret effects or persists GM role identities to URL/local storage',()=>{
  const runtime=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const core=readFileSync('src/arena3d-stage-worker.mjs','utf8');
  assert.match(runtime,/field\.setCastingTurn\(data\.casting\|\|null\)/);
  assert.match(runtime,/field\.setLowPower/);
  assert.match(core,/this\.gmAuthorized\(request\)/);
  assert.doesNotMatch(runtime,/localStorage|sessionStorage/);
  assert.doesNotMatch(runtime,/searchParams\.set\(['"]gmToken/);
});
