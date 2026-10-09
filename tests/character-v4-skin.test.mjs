import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skeletonPose,SKELETON_ACTIONS,SKELETON_DIRECTIONS} from '../assets/characters/v4/skeleton-rig.mjs';
import {renderV4Skin,V4_SKIN_IDS,V4_SKIN_VERSION} from '../assets/characters/v4/skeleton-skin.mjs';
function fakeContext(){
 const calls=[];
 const canvas=new Proxy({},{
  get(target,key){
   if(key==='calls')return calls;
   if(key in target)return target[key];
   const method=(...args)=>{calls.push({method:key,args});};
   target[key]=method;return method;
  },
  set(target,key,v){target[key]=v;return true;}
 });
 return canvas;
}
test('web-only two original characters, nine actions, four directions - exactly two skin limb chains',()=>{
 assert.equal(V4_SKIN_IDS.length,2);
 assert.match(V4_SKIN_VERSION,/4\.13/);
 const atlas={complete:true,naturalWidth:400,naturalHeight:290};
 for(const characterId of V4_SKIN_IDS)for(const direction of SKELETON_DIRECTIONS)for(const action of SKELETON_ACTIONS){
  const pose=skeletonPose({direction,action,elapsedMs:590,progress:.7,outcome:'win'});
  const ctx=fakeContext();
  const result=renderV4Skin(ctx,pose,{characterId,atlas,showJoints:true});
  assert.equal(result.skinApplied,true);
  assert.equal(result.armChains,2,'exactly two anatomical arms');
  assert.equal(result.legChains,2,'exactly two anatomical legs');
  assert.equal(result.headFromSource,true,'approved head required');
  const images=ctx.calls.filter(x=>x.method==='drawImage');
  assert.equal(images.length,1,'do not overlay an original static character or duplicate hands');
  const [,sx,sy,sw,sh]=images[0].args;
  const row=characterId==='character-01'?0:1;
  assert.ok(sx>=0&&sx+sw<=400,'head crop must remain inside approved atlas');
  assert.ok(sy>=row*145&&sy+sh<=row*145+80,'crop must stop above original arms');
  assert.ok(!ctx.calls.some(x=>x.method==='rotate'),'head stays upright');
 }
});
test('no artwork loaded uses anatomical fallback instead of old character raster',()=>{
 const ctx=fakeContext();
 const pose=skeletonPose({action:'walk',elapsedMs:100,direction:'right'});
 const result=renderV4Skin(ctx,pose,{characterId:'character-02'});
 assert.equal(result.headFromSource,false);
 assert.equal(ctx.calls.filter(x=>x.method==='drawImage').length,0);
 assert.ok(ctx.calls.some(x=>x.method==='stroke'),'rig-based limbs still drawn');
 assert.throws(()=>renderV4Skin(ctx,pose,{characterId:'character-03'}),/INVALID_CHARACTER_SKIN/);
});
test('Skin approval page offers independent skeleton comparison but does not touch rooms or IPA',()=>{
 const skin=fs.readFileSync(new URL('../assets/characters/v4/skin.html',import.meta.url),'utf8');
 const skeleton=fs.readFileSync(new URL('../assets/characters/v4/skeleton-rig.mjs',import.meta.url),'utf8');
 const live=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
 const ipa=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
 assert.match(skin,/skeleton-skin\.mjs/);assert.match(skin,/skeleton-rig\.mjs/);
 assert.match(skin,/data-mode="joint"/);assert.match(skin,/data-mode="bones"/);
 assert.match(skin,/id="boy"/);assert.match(skin,/id="girl"/);
 assert.match(skin,/approved-two-characters\.avif/);
 assert.match(skin,/Chưa nghiệm thu Skin/);assert.match(skin,/Chưa cập nhật game\/IPA/);
 assert.ok(!skin.includes('/api/rooms'));
 assert.ok(!skin.includes('animated-sprite.mjs'));
 assert.ok(!live.includes('skeleton-skin.mjs'));
 assert.ok(!ipa.includes('skeleton-skin.mjs'));
 assert.match(skeleton,/4\.12-action-review/);
});

test('Production verifies exactly served Skin assets with bounded retries and checksum diagnostics',()=>{
 const yaml=fs.readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
 assert.match(yaml,/skeleton\.html skeleton-rig\.mjs skin\.html skeleton-skin\.mjs/);
 assert.match(yaml,/EXPECTED_HASH=/);
 assert.match(yaml,/LIVE_HASH=/);
 assert.match(yaml,/skinverify=/);
 assert.match(yaml,/for ATTEMPT in/);
 assert.match(yaml,/MATCHED/);
});
