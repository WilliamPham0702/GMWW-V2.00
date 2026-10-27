import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {stageCastingCue,publicCastingState,choreographyPose,classifyCastingAction} from '../assets/village/arena-3d/casting-choreography.mjs';
import {createArenaCharacterField} from '../assets/village/arena-3d/character-atelier.mjs';
import {redactStagingPublicBroadcast} from '../src/arena3d-visual-effect-policy.mjs';
import {readFileSync} from 'node:fs';

test('Only server-verified GM and same match/cycle may see a night caster or target',()=>{
  const now=Date.now();
  const cue=stageCastingCue({matchId:'m1',cycleKey:'night-1',phase:'night',turnId:'witch-1',
    actorIds:['member:witch','member:witch'],targetIds:['member:victim'],
    kind:'attack',createdAt:now,expiresAt:now+4500},now);
  assert.deepEqual(cue.actorIds,['member:witch']);
  assert.equal(cue.cast.targetIds[0],'member:victim');
  const room={phase:'running',matchId:'m1',cycleKey:'night-1',cyclePhase:'night'};
  assert.equal(publicCastingState(room,cue,{authorizedGM:false}),null);
  assert.equal(publicCastingState({...room,cycleKey:'night-2'},cue,{authorizedGM:true}),null);
  assert.equal(publicCastingState({...room,matchId:'m2'},cue,{authorizedGM:true}),null);
  assert.equal(publicCastingState({...room,phase:'ended'},cue,{authorizedGM:true}),null);
  assert.deepEqual(publicCastingState(room,cue,{authorizedGM:true}),cue);
  assert.equal(stageCastingCue({...cue,actorIds:[],turnId:'role-1'},now),null);
  const expired=stageCastingCue({...cue,actorIds:['member:witch'],expiresAt:now-1},now);
  assert.equal(expired.cast,null);
  const malicious=stageCastingCue({matchId:'m1',cycleKey:'night-1',phase:'night',turnId:'witch-1',
    kind:'attack',createdAt:now,expiresAt:now+4500,actorIds:['member:witch','member:../secret'],
    targetIds:['member:victim','member:a\nb']},now);
  assert.deepEqual(malicious.actorIds,['member:witch']);assert.deepEqual(malicious.cast.targetIds,['member:victim']);
});
test('Spell type derived from known Server action IDs and never guessed from a client role label',()=>{
  assert.equal(classifyCastingAction('action_protect'),'shield');
  assert.equal(classifyCastingAction('action_witch_save'),'heal');
  assert.equal(classifyCastingAction('action_prophet_inspect'),'inspect');
  assert.equal(classifyCastingAction('action_wolf_bite'),'attack');
  assert.equal(classifyCastingAction('secret-ui-spell'),null);
});
test('6–30 seated characters: ONLY server-approved actor stands, casts toward target, and sits',()=>{
  for(const n of [6,12,20,30]){
    const field=createArenaCharacterField(THREE,new THREE.Scene());
    const actors=Array.from({length:n},(_,i)=>({
      id:'member:p'+i,characterId:'character-'+String(i+1).padStart(2,'0'),
      position:{x:Math.cos(Math.PI*2*i/n)*6,z:Math.sin(Math.PI*2*i/n)*5},statusTags:[]
    }));
    field.setActors(actors);
    assert.equal(field.actorCount,n);
    assert.ok(field.drawBudget<=37,'seats + 30 actors should share geometry');
    assert.equal(field.actors.filter(x=>x.standing).length,0,'everyone seated by default');
    const now=Date.now();
    field.setCastingTurn({turnId:'turn-1',actorIds:['member:p1']});
    assert.deepEqual(field.actors.filter(x=>x.standing).map(x=>x.id),['member:p1']);
    field.setCastingTurn({turnId:'turn-1',actorIds:['member:p1'],cast:{
      actorId:'member:p1',targetIds:['member:p2'],kind:'shield',startedAt:now,expiresAt:now+2500}});
    assert.deepEqual(field.actors.filter(x=>x.casting).map(x=>x.id),[],
      'caster walks toward the ritual spot before starting the spell');
    field.draw(performance.now()+900,true);
    assert.equal(field.beamVisible,true,'GM-authorized spell from caster to real target');
    const last=field.actors.find(x=>x.id==='member:p1');
    assert.ok(Number.isFinite(last.yaw));
    field.setCastingTurn({turnId:'turn-2',actorIds:['member:p3']});
    assert.ok(field.actors.find(x=>x.id==='member:p3').standing);
    field.setCastingTurn(null);
    field.clearEffects();
    field.draw(performance.now()+1000,true);
    assert.equal(field.beamVisible,false,'the private spell disappears on turn change');
    assert.equal(choreographyPose({standAt:1000,standUntil:1800,castStartedAt:1300,castUntil:1500},1600).casting,0);
    assert.equal(choreographyPose({standAt:1000,standUntil:1800},1000).stand,0);
    assert.equal(choreographyPose({standAt:1000,standUntil:1800},1400).stand>0,true);
    assert.equal(choreographyPose({standAt:1000,standUntil:1800},1900).stand,0);
    field.dispose();
  }
});
test('Public Player Web WebSockets never carry full secret role queue or night action targets',()=>{
  const source={type:'night_turn',night:1,runtime:{queue:[{loginIds:['witch'],roleId:'seer'}]},
    room:{code:'ABCD'},serverTime:42};
  const safe=redactStagingPublicBroadcast(source);
  assert.equal(safe.night,1);assert.equal(safe.runtime,undefined);
  assert.ok(!JSON.stringify(safe).includes('witch'));assert.ok(!JSON.stringify(safe).includes('seer'));
  const cycle=redactStagingPublicBroadcast({type:'room_cycle',cycleKey:'night-1',
    nightRuntime:{queue:[{recognitionIds:['hidden-wolf']} ]},room:{code:'ABCD'}});
  assert.equal(cycle.nightRuntime,undefined);
  assert.ok(!JSON.stringify(cycle).includes('hidden-wolf'));
  for(const type of ['battle_action_confirmed','battle_action_undone']){
    const output=redactStagingPublicBroadcast({type,targets:['alice'],targetIds:['bob'],actorId:'wolf',roleId:'wolf',serverTime:12});
    assert.ok(!JSON.stringify(output).includes('alice'));
    assert.ok(!JSON.stringify(output).includes('bob'));
    assert.ok(!JSON.stringify(output).includes('wolf'));
  }
  assert.deepEqual(redactStagingPublicBroadcast({type:'room_state',room:{code:'ABCD'}}),{type:'room_state',room:{code:'ABCD'}});
});
test('GM casting cue is generated only by server-confirmed action, and synthetic demo cannot issue a Core spell',()=>{
  const wrapper=readFileSync('src/arena3d-stage-worker.mjs','utf8');
  const browser=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  assert.match(wrapper,/async gmBattleAction\(request,body\)/);
  assert.match(wrapper,/await super\.gmBattleAction\(request,body\)/);
  assert.match(wrapper,/async gmDayAction\(request,body\)/);
  assert.match(wrapper,/result\?\.ok!==true/);
  assert.match(wrapper,/await this\.gmCastingState\(meta\)/);
  assert.match(wrapper,/this\.gmAuthorized\(request\)/);
  assert.match(browser,/syntheticCastSeq/);
  assert.match(browser,/if\(!synthetic\)/);
  // Đường GĐ8+ kiểm tra quyền và đối chiếu actor hợp lệ trước khi diễn hoạt;
  // không được cấp trực tiếp data.casting từ response cho renderer.
  assert.match(browser,/const normalized=normalizeRitualCue\(data\.casting,authorized\)/);
  assert.match(browser,/field\.setCastingTurn\(normalized\)/);
  assert.doesNotMatch(browser,/field\.setCastingTurn\(data\.casting\|\|null\)/);
  assert.doesNotMatch(browser,/localStorage|sessionStorage/);
});
