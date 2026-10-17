import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {V562_VERSION,createV562SleeveGeometry} from '../assets/characters/v5/skin-v562-original-sleeves.mjs';
test('V5.62 sleeves are genuine curved UV 3D geometry with normalized 16-bone weights',()=>{
 assert.match(V562_VERSION,/^5\.62-/);
 for(const [side,expectedBones,sign] of [['left',[2,4,5],-1],['right',[2,7,8],1]]){
  const {geometry,vertexCount,blendedVertices,elbowDrivenVertices}=createV562SleeveGeometry(side);
  assert.ok(vertexCount>200);
  assert.ok(blendedVertices>100);
  assert.ok(elbowDrivenVertices>50);
  const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  const indices=geometry.getAttribute('skinIndex'),weights=geometry.getAttribute('skinWeight');
  assert.equal(p.itemSize,3);assert.equal(uv.itemSize,2);
  assert.equal(indices.itemSize,4);assert.equal(weights.itemSize,4);
  assert.equal(p.count,uv.count);assert.equal(p.count,weights.count);
  let elbowPositive=0,positiveX=0;
  for(let i=0;i<p.count;i++){
   const sum=[0,1,2,3].reduce((n,j)=>n+weights.getComponent(i,j),0);
   assert.ok(Math.abs(sum-1)<1e-5,'weights must sum to 1');
   assert.deepEqual([0,1,2].map(j=>indices.getComponent(i,j)),expectedBones);
   assert.ok(indices.getComponent(i,3)<16);
   assert.ok(uv.getX(i)>=-1e-6&&uv.getX(i)<=1+1e-6);
   if(weights.getComponent(i,2)>.001)elbowPositive++;
   if(p.getX(i)*sign>0)positiveX++;
  }
  assert.ok(elbowPositive>50);
  assert.equal(positiveX,p.count,'sleeve must be on correct body side');
  geometry.dispose();
 }
 assert.throws(()=>createV562SleeveGeometry('center'),/INVALID_SLEEVE/);
});
test('V5.62 imports genuine V4.17 mapped V5.61 fabric, never 2D body cutouts',()=>{
 const code=readFileSync(new URL('../assets/characters/v5/skin-v562-original-sleeves.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../assets/characters/v5/test-skin-v562.html',import.meta.url),'utf8');
 const build=readFileSync(new URL('../.github/scripts/build-character-v561-preview.mjs',import.meta.url),'utf8');
 assert.match(code,/addV561OriginalArtSwatchToRig\(rig,options\)/);
 assert.match(code,/new THREE\.SkinnedMesh\(shape\.geometry,shirt\.surface\.material\)/);
 assert.match(code,/rig\.mesh\.skeleton/);
 assert.match(code,/isOriginalCompleteSkin:false/);
 assert.match(code,/gameIntegrated:false/);
 assert.doesNotMatch(code,/Sprite|PlaneGeometry|canvas\.drawImage/);
 assert.match(html,/addV562OriginalFabricSleevesToRig/);
 assert.match(html,/Chưa đạt Skin gốc hoàn chỉnh/);
 assert.match(build,/test-skin-v562\.html/);
});

test('V5.62 accepted-motion gate has exactly four user-approved animation choices',()=>{
 const html=readFileSync(new URL('../assets/characters/v5/test-skin-v562.html',import.meta.url),'utf8');
 const buttons=[...html.matchAll(/<button data-action="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(buttons,['idle','walk','run','result']);
 assert.match(html,/APPROVED_ACTIONS=new Set\(\['idle','walk','run','result'\]\)/);
 assert.match(html,/!APPROVED_ACTIONS\.has\(b\.dataset\.action\)/);
 for(const disallowed of ['sit','sit-down','stand-up','wave','vote']){
  assert.ok(!buttons.includes(disallowed),'unapproved button '+disallowed);
 }
 // The heritage V5.00 engine stays backwards compatible: production is unchanged.
 const core=readFileSync(new URL('../assets/characters/v5/character-motion-v500.mjs',import.meta.url),'utf8');
 assert.match(core,/V500_ACTIONS=Object\.freeze/);
 assert.match(html,/data-gmww-v562-actions/);
});
test('V5.62 demonstrates actual travel and one-shot celebration without entering the live game',()=>{
 const html=readFileSync(new URL('../assets/characters/v5/test-skin-v562.html',import.meta.url),'utf8');
 assert.match(html,/setDestination\(motion,x,z,action==='run'\)/);
 assert.match(html,/function startPatrol\(\)/);
 assert.match(html,/motion\.actionTime>=2\.0/);
 assert.match(html,/setAction\(motion,'idle'\);setActive\('idle'\)/);
 assert.match(html,/travel\.addEventListener\('change'/);
 assert.match(html,/new THREE\.WebGLRenderer/);
 assert.match(html,/animateSkinnedChibi\(rig,motion\)/);
 assert.match(html,/addV562OriginalFabricSleevesToRig\(rig/);
 assert.match(html,/Chưa đạt Skin gốc hoàn chỉnh/);
});
