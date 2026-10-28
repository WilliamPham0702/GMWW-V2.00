import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {characterArtProfile,accessoryPartVisible,characterMotionFrame,CHARACTER_ART_COUNT} from '../assets/village/arena-3d/character-art-direction.mjs';
import {ritualArt,ritualKinds,ritualFrame,ritualPearlPoint} from '../assets/village/arena-3d/role-ritual-art.mjs';
import {createArenaCharacterField,atelierPalette} from '../assets/village/arena-3d/character-atelier.mjs';
import {createArenaSpellVfx} from '../assets/village/arena-3d/spell-vfx.mjs';

test('Stage6: 40 deterministic sea chibi identities, five silhouettes, eight palettes',()=>{
  const looks=Array.from({length:40},(_,i)=>characterArtProfile('character-'+String(i+1).padStart(2,'0')));
  assert.equal(CHARACTER_ART_COUNT,40);
  assert.equal(new Set(looks.map(p=>p.signature)).size,40);
  assert.equal(new Set(looks.map(p=>p.silhouette)).size,5);
  assert.equal(new Set(looks.map(p=>p.palette)).size,8);
  for(const l of looks)for(const key of ['cloth','hair','skin','accessory','trim'])
    assert.match(l[key],/^#[\da-f]{6}$/i);
  assert.deepEqual(atelierPalette('character-40'),looks[39]);
  assert.equal(accessoryPartVisible('shellCrown',looks[39]),true);
  assert.equal(accessoryPartVisible('shellCrown',looks[0]),false);
  assert.deepEqual(characterArtProfile('character-41'),looks[0]);
  assert.equal(JSON.stringify(looks).includes('gmToken'),false);
});
test('Stage6: movements animate cast/roam and respect reduced motion',()=>{
  const walk=characterMotionFrame({time:420,index:7,moving:true,standing:true});
  const cast=characterMotionFrame({time:420,index:7,casting:true,standing:true});
  assert.ok(walk.step>0);assert.ok(cast.armLift>walk.armLift);
  const calm=characterMotionFrame({time:420,index:7,moving:true,casting:true,reducedMotion:true});
  assert.equal(calm.step,0);assert.equal(calm.capeSway,0);
  assert.ok(calm.armLift>=0);
});
test('Stage6: GPU draw budget remains <=37 at 6/12/20/30 after adding head dress + sash',()=>{
  for(const n of [6,12,20,30]){
    const scene=new THREE.Scene(),field=createArenaCharacterField(THREE,scene);
    const players=Array.from({length:n},(_,i)=>({id:'member:p'+i,
      characterId:'character-'+String(i+11).padStart(2,'0'),seatId:i+1,statusTags:[]}));
    field.setActors(players,{seatCount:n,seatLayout:'circle'});
    assert.equal(field.actorCount,n);
    assert.equal(field.drawBudget,37,'constant geometry instancing budget');
    assert.ok(scene.getObjectByName('arena-chibi-waistSash'));
    assert.ok(scene.getObjectByName('arena-chibi-shellCrown'));
    field.draw(performance.now()+500,true);
    assert.ok(field.drawUpdates>0);
    const dumped=JSON.stringify(field.actors);
    for(const word of ['gmToken','roleName','faction','secretTarget'])assert.ok(!dumped.includes(word));
    field.clearEffects();field.dispose();
  }
});
test('Stage6: five unique art rituals, private-cue only and fixed four GPU VFX draw calls',()=>{
  assert.deepEqual(ritualKinds,['shield','inspect','heal','attack','vote']);
  const motifs=ritualKinds.map(k=>ritualArt(k).motif);
  assert.equal(new Set(motifs).size,5);
  for(const kind of ritualKinds){
    const art=ritualArt(kind),frame=ritualFrame(kind,1200,{start:1000,end:4200});
    assert.equal(frame.color,art.color);
    for(const p of [0,3,7,11]){
      const r=ritualPearlPoint(kind,p,16,1200,{start:1000,end:4200});
      assert.ok([r.x,r.y,r.z,r.scale].every(Number.isFinite));
    }
  }
  assert.equal(ritualArt('role_wolf'),null);
  assert.equal(ritualFrame('private_role',100),null);
  assert.equal(ritualPearlPoint('secret',0,16,100),null);
  const group=new THREE.Scene(),vfx=createArenaSpellVfx(THREE,group);
  assert.equal(vfx.drawBudget,4);
  const now=performance.now();
  for(const kind of ritualKinds){
    assert.equal(vfx.update({type:kind,from:{x:0,y:1,z:0},to:{x:2,y:1,z:2},start:now-1,end:now+1000},now),true);
    assert.equal(vfx.effectKind,kind);
    assert.ok(vfx.visiblePearls<=16);
  }
  vfx.setLowPower(true);
  vfx.update({type:'heal',from:{x:0,y:1,z:0},to:{x:2,y:1,z:2},start:now-1,end:now+1000},now);
  assert.equal(vfx.visiblePearls,7);
  vfx.setReducedMotion(true);
  vfx.update({type:'heal',from:{x:0,y:1,z:0},to:{x:2,y:1,z:2},start:now-1,end:now+1000},now);
  assert.equal(vfx.visiblePearls,4);
  assert.equal(vfx.update({type:'not-allowed',from:{x:0,y:1,z:0},to:{x:2,y:1,z:2},start:now-1,end:now+1000},now),false);
  vfx.dispose();
});
test('Stage6: 40-look gallery and sample rituals cannot command live GMWW',()=>{
  const source=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const html=readFileSync('assets/village/arena-3d/live.html','utf8');
  assert.match(source,/if\(!synthetic\).*Bộ sưu tập mỹ thuật/);
  assert.match(source,/if\(!synthetic\).*Chế độ phòng thật chỉ hiển thị hiệu ứng/);
  assert.match(source,/field\.setCastingTurn\(data\.casting\|\|null\)/);
  assert.match(source,/ritualArt\(requestedKind\)/);
  assert.match(html,/data-gallery="1"/);
  assert.match(html,/data-fx="vote"/);
  assert.doesNotMatch(source,/localStorage|sessionStorage/);
});
