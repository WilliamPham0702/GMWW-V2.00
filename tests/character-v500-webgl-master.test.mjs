import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {V500_ACTIONS,V500_DIRECTIONS,facingAngle,createMotionState,setAction,setFacing,setDestination,
 tickMotion,V500_WALK_SPEED,V500_RUN_SPEED} from '../assets/characters/v5/character-motion-v500.mjs';
const source=fs.readFileSync(new URL('../assets/characters/v5/character-master-v500.mjs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../assets/characters/v5/index.html',import.meta.url),'utf8');
const live=fs.readFileSync(new URL('../src/gmww-members-live.js',import.meta.url),'utf8');
const village=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
const advance=(m,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)tickMotion(m,1/60);return m;};

test('V5.00 exposes nine existing action categories and eight independently oriented 3D directions',()=>{
 assert.deepEqual([...V500_ACTIONS],['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
 assert.equal(V500_DIRECTIONS.length,8);
 assert.equal(new Set(V500_DIRECTIONS.map(facingAngle)).size,8);
 assert.ok(Math.abs(facingAngle('left')+Math.PI/2)<.001);
 assert.ok(Math.abs(facingAngle('right')-Math.PI/2)<.001);
 assert.throws(()=>facingAngle('diagonal-9'),/INVALID_DIRECTION/);
});
test('Master-01 moves smoothly through world coordinates and stops exactly at destination',()=>{
 const m=createMotionState();setDestination(m,1,2);
 advance(m,3);
 assert.equal(m.x,1);assert.equal(m.z,2);assert.equal(m.goal,null);
 assert.ok(Number.isFinite(m.yaw));assert.equal(m.action,'idle');
});
test('running travels faster than walking over equal duration',()=>{
 const a=createMotionState('a'),b=createMotionState('b');
 setDestination(a,5,0,false);setDestination(b,5,0,true);
 advance(a,.7);advance(b,.7);
 assert.ok(b.x>a.x+.4,'running should cover more world distance than walking');
 assert.ok(V500_RUN_SPEED>V500_WALK_SPEED);
});
test('animated walk uses opposite legs, opposite arms and nonzero knee bends',()=>{
 const m=createMotionState();setAction(m,'walk');advance(m,.23);
 assert.ok(Math.abs(m.pose.legL-m.pose.legR)>.03);
 assert.ok(Math.abs(m.pose.armL-m.pose.armR)>.03);
 assert.ok(m.pose.kneeL>=0&&m.pose.kneeR>=0);
});
test('sitting and standing respect temporal transitions',()=>{
 const m=createMotionState();setAction(m,'sit-down');advance(m,.9);
 assert.equal(m.action,'sit');assert.equal(m.seated,true);assert.ok(m.pose.hipY<-.3);
 setAction(m,'stand-up');advance(m,.95);
 assert.equal(m.action,'idle');assert.equal(m.seated,false);assert.ok(m.pose.hipY>-.14);
});
test('wave, vote and result animate arms independently of legs',()=>{
 const m=createMotionState();
 setAction(m,'wave');advance(m,.6);const wave=m.pose.armR;
 setAction(m,'vote');advance(m,.6);const vote=m.pose.armR;
 setAction(m,'result');advance(m,.6);
 assert.ok(wave< -1&&vote< -2);
 assert.ok(m.pose.armL< -2&&m.pose.armR< -2);
});
test('no NaN/Infinity after simulating thirty actors for 900 updates',()=>{
 const crowd=Array.from({length:30},(_,i)=>createMotionState(String(i),0,0,i*.7));
 crowd.forEach((m,i)=>setDestination(m,Math.sin(i)*4,Math.cos(i)*3,i%3===0));
 for(let frame=0;frame<900;frame++)for(const m of crowd)tickMotion(m,1/60);
 for(const m of crowd)for(const v of [m.x,m.z,m.yaw,m.velocity,...Object.values(m.pose)])assert.ok(Number.isFinite(v));
});
test('WebGL Master-01 is a review-only lab, not imported into live game or IPA',()=>{
 assert.doesNotMatch(live,/characters\/v5/);
 assert.doesNotMatch(village,/characters\/v5/);
 assert.match(source,/new THREE\.WebGLRenderer/);
 assert.match(source,/new THREE\.OrthographicCamera/);
 assert.match(source,/requestAnimationFrame\(frame\)/);
 assert.match(source,/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0/);
 assert.match(html,/THỬ NGHIỆM RIÊNG/);
 for(const action of V500_ACTIONS)assert.ok(html.includes('data-action="'+action+'"'));
 for(const direction of V500_DIRECTIONS)assert.ok(html.includes('data-dir="'+direction+'"'));
 assert.match(html,/max="30"/);
});
