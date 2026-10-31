import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderQualityBudget} from '../assets/village/arena-3d/stage7-expression-motion.mjs';
import {arenaCrowdDetailPolicy} from '../assets/village/arena-3d/stage23-25-mobile-budget.mjs';

test('GĐ43: 20/24/30-character GM GPU framebuffer cap applies in all visual quality modes',()=>{
 for(const mode of [{fps:60},{fps:28},{fps:2,lowPower:true}]){
  const a=[6,12,20,24,30].map(characters=>renderQualityBudget({...mode,characters}));
  assert.deepEqual(a.map(x=>x.pixelRatioCap<=.85),[false,false,false,true,true]);
  assert.equal(a[2].pixelRatioCap,1);
  assert.equal(a[3].pixelRatioCap,.85);
  assert.equal(a[4].pixelRatioCap,.85);
  for(const x of a)assert.ok(x.animationHz>0&&x.particles>0);
 }
});

test('GĐ43: all 30 Core actors retain interactive silhouettes and status/VFX',()=>{
 for(const chars of [20,24,30]){
  const policy=arenaCrowdDetailPolicy({characters:chars,lowPower:true});
  assert.equal(policy.characterCount,chars);
  for(const essential of ['head','eyeL','eyeR','armL','armR','tunic','skirt','shoeL','shoeR']){
   assert.ok(!policy.hiddenParts.includes(essential),essential);
  }
 }
 const source=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(source,/renderQualityBudget\(\{characters:field\.actorCount/);
 assert.match(source,/render\.setPixelRatio\(ratio\)/);
 assert.match(source,/connectStagingRoom\(/);
});

test('GĐ43: quality budget remains purely visual without gameplay secrets',()=>{
 const s=readFileSync('assets/village/arena-3d/stage7-expression-motion.mjs','utf8')
  .replace(/^\s*\/\/.*$/gm,'');
 for(const secret of [/\/api\/gm\//,/gmToken/,/faction/,/roleId/,/artifactId/,/localStorage/])assert.doesNotMatch(s,secret);
});
