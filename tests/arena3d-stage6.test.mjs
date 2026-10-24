import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {STAGE6_ART_VERSION,characterArtProfile,spellGesturePose,SPELL_STYLES} from '../assets/village/arena-3d/stage6-art-direction.mjs';
import {createArenaCharacterField} from '../assets/village/arena-3d/character-atelier.mjs';
import {createArenaSpellVfx,spellMotif} from '../assets/village/arena-3d/spell-vfx.mjs';

const players=n=>Array.from({length:n},(_,i)=>({
  id:'member:player'+(i+1),seatId:i+1,characterId:'character-'+String(i+1).padStart(2,'0'),
  position:{x:Math.cos(i/n*2*Math.PI)*6,z:Math.sin(i/n*2*Math.PI)*5},statusTags:[]
}));
test('GĐ6: 40 public character IDs produce 40 selectable costume signatures, not secret roles',()=>{
  assert.equal(STAGE6_ART_VERSION,'arena-ocean-chibi-stage6-v1');
  const looks=Array.from({length:40},(_,i)=>characterArtProfile('character-'+String(i+1).padStart(2,'0')));
  assert.equal(new Set(looks.map(p=>p.costume)).size,40);
  assert.deepEqual([...new Set(looks.map(p=>p.headwear))].sort(),[0,1,2,3,4]);
  assert.equal(looks.some(p=>p.mantle),true);
  assert.equal(looks.some(p=>!p.pearl),true);
  for(const look of looks){
    assert.deepEqual(Object.keys(look).sort(),['costume','hairShape','headwear','mantle','pearl']);
    assert.doesNotMatch(JSON.stringify(look),/role|target|faction|token/i);
  }
});

test('GĐ6: five Core-approved effect groups have distinct poses and visual motifs, fail closed',()=>{
  assert.deepEqual(SPELL_STYLES,['shield','inspect','heal','attack','vote']);
  const poses=SPELL_STYLES.map(kind=>spellGesturePose(kind,900));
  assert.equal(new Set(poses.map(p=>JSON.stringify(p))).size,5);
  assert.equal(new Set(SPELL_STYLES.map(k=>JSON.stringify(spellMotif(k)))).size,5);
  assert.deepEqual(spellGesturePose('role_secret',600),{left:0,right:0,lean:0,tilt:0,pulse:0});
  assert.equal(spellMotif('hidden_wolf_role'),null);
  for(const p of SPELL_STYLES.map(k=>spellGesturePose(k,900,{lowMotion:true}))) {
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(Math.max(Math.abs(p.left),Math.abs(p.right))<=.3,'reduced-motion pose constrained');
  }
});
test('GĐ6: fixed GPU batch budget remains constant from 6 to 30 actors, 40 looks no extra state',()=>{
  const budgets=[];
  for(const n of [6,12,20,30]){
    const scene=new THREE.Scene(),field=createArenaCharacterField(THREE,scene);
    field.setActors(players(n),{seatCount:n,seatLayout:'circle'});
    budgets.push(field.drawBudget);
    assert.ok(field.drawBudget<=45);
    assert.equal(field.actorCount,n);
    for(const name of ['irisL','irisR','browL','browR','seaBow','tiara','mantle','shellBuckle'])
      assert.equal(scene.getObjectByName('arena-chibi-'+name)?.isInstancedMesh,true);
    const before=field.actors.map(x=>x.position);
    field.draw(performance.now()+80,true);
    assert.deepEqual(field.actors.map(x=>x.position),before);
    field.dispose();
  }
  assert.equal(new Set(budgets).size,1,'adding players must not multiply draw-call batches');
});
test('GĐ6: casting motion and VFX only on explicitly permitted actor; stop on turn transition',()=>{
  const scene=new THREE.Scene(),field=createArenaCharacterField(THREE,scene);
  field.setActors(players(6),{seatCount:6});
  const now=performance.now(),clock=Date.now();
  field.setCastingTurn({turnId:'gm-turn1',actorIds:['member:player1']},now);
  field.setCastingTurn({turnId:'gm-turn1',actorIds:['member:player1'],
    cast:{actorId:'member:player2',targetIds:['member:player3'],kind:'attack',
      startedAt:clock,expiresAt:clock+3000}},now+500);
  field.draw(now+1100,true);
  assert.equal(field.spellVfxActive,false,'forged non-turn actor must never create a cue');
  field.setCastingTurn({turnId:'gm-turn1',actorIds:['member:player1'],
    cast:{actorId:'member:player1',targetIds:['member:player3'],kind:'heal',
      startedAt:clock,expiresAt:clock+3200}},now+700);
  field.draw(now+1250,true);
  assert.equal(field.spellVfxKind,'heal');
  field.setCastingTurn({turnId:'gm-turn2',actorIds:['member:player4']},now+1400);
  field.draw(now+1450,true);
  assert.equal(field.spellVfxActive,false);
  field.clearEffects();field.dispose();
});
test('GĐ6: VFX motif reuse has fixed four meshes and no hidden role inference',()=>{
  const scene=new THREE.Scene(),fx=createArenaSpellVfx(THREE,scene),now=performance.now();
  const base={from:{x:1,y:1,z:2},to:{x:3,y:1,z:3},start:now-10,end:now+1500};
  for(const kind of SPELL_STYLES){
    assert.equal(fx.update({...base,type:kind},now),true);
    assert.equal(fx.effectKind,kind);
    assert.ok(fx.visiblePearls<=16);
    assert.equal(fx.drawBudget,4);
  }
  assert.equal(fx.update({...base,type:'role_wolf'},now),false);
  fx.dispose();
  const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  assert.match(live,/STAGE6_ART_VERSION/);
  assert.match(live,/if\(!synthetic\)/);
  assert.doesNotMatch(live,/localStorage|sessionStorage/);
});
