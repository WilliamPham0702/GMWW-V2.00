import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {approachPoint,travelProgress,renderWalkPosition,WALK_TIMING} from '../assets/village/arena-3d/casting-choreography.mjs';
import {createArenaCharacterField} from '../assets/village/arena-3d/character-atelier.mjs';
import {readFileSync} from 'node:fs';

const range=[6,12,20,30];
const radius=n=>n<=8?4.15:n<=12?5.1:n<=18?6.15:n<=24?7.2:8.35;
const world=(mesh,index)=>{
  const matrix=new THREE.Matrix4(),translation=new THREE.Vector3();
  mesh.getMatrixAt(index,matrix);translation.setFromMatrixPosition(matrix);
  return {x:translation.x,y:translation.y,z:translation.z};
};
test('6–30 ritual approach points remain in cleared village without touching central fire',()=>{
  for(const n of range){
    for(let i=0;i<n;i++){
      const angle=-Math.PI/2+2*Math.PI*i/n,r=radius(n),
        seat={x:Math.cos(angle)*r,z:Math.sin(angle)*r*.89},
        destination=approachPoint(seat);
      assert.ok(Math.hypot(seat.x-destination.x,seat.z-destination.z)<=1.9,
        'walk is short enough for '+n+' seats');
      for(let p=0;p<=10;p++){
        const x=seat.x+(destination.x-seat.x)*p/10,
          z=seat.z+(destination.z-seat.z)*p/10;
        assert.ok(Math.hypot(x,z-1.8)>=1.69,
          'must never cross active fire at '+n+' seats index '+i);
      }
    }
  }
});
test('walk easing respects seated start, approach midpoint, return and no movement without cue',()=>{
  const now=1000,travel={from:0,to:1,startedAt:now,duration:WALK_TIMING.approachMs};
  assert.equal(travelProgress(null,now),0);
  assert.equal(travelProgress(travel,now),0);
  assert.ok(travelProgress(travel,now+WALK_TIMING.approachMs/2)>.45);
  assert.equal(travelProgress(travel,now+WALK_TIMING.approachMs),1);
  const p=renderWalkPosition({x:6,z:2},{x:4.4,z:1.5},travel,now+WALK_TIMING.approachMs);
  assert.deepEqual(p,{x:4.4,z:1.5});
  const back={from:1,to:0,startedAt:2000,duration:WALK_TIMING.returnMs};
  assert.equal(travelProgress(back,2000),1);
  assert.equal(travelProgress(back,2000+WALK_TIMING.returnMs),0);
  assert.ok(travelProgress(back,2000+WALK_TIMING.returnMs/2)>.45);
});
test('30 actors: only active member leaves seat; stool remains; spell starts after walk; next turn returns actor',()=>{
  const now=performance.now();
  const fieldScene=new THREE.Scene(),field=createArenaCharacterField(THREE,fieldScene);
  const n=30,players=Array.from({length:n},(_,i)=>({
    id:'member:p'+i,seatId:i+1,characterId:'character-'+String(i+1).padStart(2,'0'),
    position:{x:i*.1,z:i*.2},statusTags:[]
  }));
  field.setActors(players,{seatCount:n,seatLayout:'circle'});
  const original=field.actors.map(x=>({...x.position}));
  const head=fieldScene.getObjectByName('arena-chibi-head'),
    stool=fieldScene.getObjectByName('arena-chibi-stool');
  assert.ok(head&&stool);
  field.setCastingTurn({turnId:'server-turn-1',actorIds:['member:p1']},now);
  field.draw(now+WALK_TIMING.approachMs+1,true);
  const casterWorld=world(head,1),seatWorld=world(stool,1),
    destination=approachPoint(original[1]);
  assert.ok(Math.hypot(casterWorld.x-destination.x,casterWorld.z-destination.z)<.05);
  assert.ok(Math.hypot(seatWorld.x-original[1].x,seatWorld.z-original[1].z)<.2,
    'stool remains at authoritative seat, never follows caster');
  assert.deepEqual(field.actors.map(x=>x.position),original);
  const bystander=world(head,2),bySeat=world(stool,2);
  assert.ok(Math.hypot(bystander.x-bySeat.x,bystander.z-bySeat.z)<.2);
  const emit=Date.now();
  field.setCastingTurn({turnId:'server-turn-1',actorIds:['member:p1'],
    cast:{actorId:'member:p1',targetIds:['member:p5'],kind:'shield',startedAt:emit,expiresAt:emit+3500}},now+WALK_TIMING.approachMs);
  field.draw(now+WALK_TIMING.approachMs+100,true);
  assert.equal(field.beamVisible,true);
  field.setCastingTurn({turnId:'server-turn-2',actorIds:['member:p3']},now+WALK_TIMING.approachMs+200);
  field.draw(now+WALK_TIMING.approachMs+200+WALK_TIMING.returnMs+1,true);
  const returned=world(head,1);
  assert.ok(Math.hypot(returned.x-original[1].x,returned.z-original[1].z)<.05,'former caster returns');
  assert.equal(field.beamVisible,false,'private beam cleared on server turn switch');
  field.setCastingTurn(null,now+3800);
  assert.deepEqual(field.actors.map(x=>x.position),original);
  field.dispose();
});
test('GM-only camera follow and pinch zoom do not alter roster or secrets',()=>{
  const ui=readFileSync('assets/village/arena-3d/live.mjs','utf8'),
    html=readFileSync('assets/village/arena-3d/live.html','utf8');
  assert.match(ui,/const trackedPointers=new Map/);
  assert.match(ui,/cameraAim\.lerp/);
  assert.match(ui,/field\.activeCasterWorld/);
  assert.match(ui,/trackedPointers\.size>=2/);
  assert.match(ui,/normalizeRitualCue\(data\.casting,authorized\)/);
  assert.match(ui,/field\.setCastingTurn\(normalized\)/);
  assert.match(html,/id="camera-follow"/);
  assert.match(html,/id="camera-reset"/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|gmToken.*searchParams/);
});
