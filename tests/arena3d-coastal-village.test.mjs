import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {createCoastalVillage,COASTAL_VILLAGE_VERSION} from '../assets/village/arena-3d/coastal-village.mjs';
import {createArenaCharacterField} from '../assets/village/arena-3d/character-atelier.mjs';

test('One coastal village scene is reused for day and night with fire/lantern/moon and stable seat positions',()=>{
  const scene=new THREE.Scene();
  const village=createCoastalVillage(THREE,scene);
  assert.equal(COASTAL_VILLAGE_VERSION,'coastal-day-night-v1');
  assert.equal(village.sky,'day');
  assert.equal(village.night,false);
  assert.ok(village.lanternCount>=4);
  assert.ok(village.staticDrawBudget<=18,'instanced foliage/huts/pier must stay cheap');
  const root=scene.getObjectByName('arena-tropical-village');
  assert.ok(root);
  const sceneObjects=root.children.length;
  const defaultPositions=root.children.map(x=>x.position.toArray());
  village.setNight(true);
  assert.equal(village.sky,'night');
  assert.equal(village.night,true);
  assert.equal(root.children.length,sceneObjects);
  assert.deepEqual(root.children.map(x=>x.position.toArray()),defaultPositions);
  village.animate(12345);
  village.setQuality(true);
  village.animate(12345);
  village.setNight(false);
  assert.equal(village.sky,'day');
  assert.equal(root.children.length,sceneObjects);
  village.dispose();
  assert.equal(scene.getObjectByName('arena-tropical-village'),undefined);
});
test('Seat ring 6–30 has no isolated seat or overlapping player positions',()=>{
  for(const n of [6,12,20,30]){
    const scene=new THREE.Scene(),field=createArenaCharacterField(THREE,scene);
    const people=Array.from({length:n},(_,i)=>({
      id:'member:'+i,seatId:i+1,characterId:'character-'+String(i+1).padStart(2,'0'),
      position:{x:(i%4)-2,z:(i%3)-1},statusTags:[]
    }));
    field.setActors(people,{seatCount:n,seatLayout:'circle'});
    const ring=field.actors;
    assert.equal(ring.length,n);
    const points=ring.map(x=>x.position);
    assert.ok(points.every(p=>Math.hypot(p.x,p.z)<=9),'all seats inside island');
    for(let i=0;i<n;i++) {
      const a=points[i],b=points[(i+1)%n],distance=Math.hypot(a.x-b.x,a.z-b.z);
      assert.ok(distance>=1.35,'seat spacing '+n+' players at '+i+': '+distance);
    }
    const before=ring.map(x=>({...x.position}));
    field.setCastingTurn({turnId:'server-turn',actorIds:['member:1']});
    field.draw(performance.now()+200,true);
    assert.deepEqual(field.actors.map(x=>x.position),before);
    assert.equal(field.actors.filter(x=>x.standing).length,1);
    field.setCastingTurn(null);
    field.dispose();
  }
});
test('Noncircle position projection preserves the authoritative XY seat geometry',()=>{
  const field=createArenaCharacterField(THREE,new THREE.Scene());
  field.setActors([{id:'member:1',seatId:1,characterId:'character-01',position:{x:2.4,z:-1.4}}],{seatCount:6,seatLayout:'rectangle'});
  assert.deepEqual(field.actors[0].position,{x:2.4,z:-1.4});
  field.dispose();
});
