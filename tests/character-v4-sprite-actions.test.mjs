import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {V4_SPRITE_ACTIONS,v4ActionPose,createV4SpriteRenderer} from '../assets/characters/v4/animated-sprite.mjs';
const markup=fs.readFileSync(new URL('../assets/characters/v4/index.html',import.meta.url),'utf8');

test('all 9 V4 buttons alter actual limb or torso pose instead of sliding a still',()=>{
 assert.deepEqual(V4_SPRITE_ACTIONS,['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
 for(const action of V4_SPRITE_ACTIONS){
   const p=v4ActionPose(action,180,.6,'win');
   assert.equal(p.headTiltDeg,0,action+' must keep head upright');
   assert.ok(Object.values(p).every(v=>Number.isFinite(v)));
 }
 assert.notEqual(v4ActionPose('walk',160,.3).legL,v4ActionPose('walk',360,.6).legL);
 assert.notEqual(v4ActionPose('run',160,.3).legR,v4ActionPose('run',360,.6).legR);
 assert.ok(v4ActionPose('sit',400,.5).sit>.95);
 assert.ok(v4ActionPose('sit-down',400,.5).sit>.2);
 assert.ok(v4ActionPose('stand-up',400,.5).sit>.2);
 assert.ok(v4ActionPose('wave',400,.5).armR< -1);
 assert.ok(v4ActionPose('vote',400,.5).armR< -1);
 assert.ok(v4ActionPose('result',400,.5,'win').armL>1);
 assert.ok(v4ActionPose('result',400,.5,'lose').sit>.3);
 assert.ok(v4ActionPose('idle',400,.5).breath!==1);
});
test('Canvas preview draws clipped articulated segments for both real V4 characters',()=>{
 const events=[];
 const ctx=new Proxy({}, {get:(target,key)=>{
   if(key==='canvas')return null;
   if(!target[key])target[key]=(...args)=>{events.push({name:key,args});};
   return target[key];
 },set:(target,key,value)=>{target[key]=value;return true;}});
 const canvas={width:0,height:0,getContext:()=>ctx};
 const oldImage=globalThis.Image;
 globalThis.Image=class{
   set src(s){this._src=s;this.onload?.();}
   set decoding(v){this._decoding=v;}
 };
 try{
   const renderer=createV4SpriteRenderer(canvas,'./approved-two-characters.avif');
   assert.equal(renderer.loaded,true);assert.deepEqual([canvas.width,canvas.height],[200,290]);
   for(const characterId of ['character-01','character-02']){
    for(const facing of ['front','left','right','back']){
     for(const actionId of V4_SPRITE_ACTIONS){
       events.length=0;
       assert.equal(renderer.render({characterId,facing,actionId,elapsedMs:280,progress:.56,result:'win'}),true);
       assert.ok(events.filter(x=>x.name==='drawImage').length>=6,characterId+' '+facing+' '+actionId);
       assert.ok(events.some(x=>x.name==='clip'),'clip must separate body parts');
     }
    }
   }
 }finally{globalThis.Image=oldImage;}
});
test('Web-only demo uses animated canvas frames, never frozen src assignments',()=>{
 assert.match(markup,/<canvas id="labCharacter"/);
 assert.match(markup,/createV4SpriteRenderer\(actor/);
 assert.match(markup,/sprite\.render\(\{/);
 assert.ok(!markup.includes('actor.src=imageUrl('));
 assert.ok(!markup.includes('chân chưa có frame chuyển động'));
});
