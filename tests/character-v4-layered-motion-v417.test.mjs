import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skeletonPose,SKELETON_DIRECTIONS,SKELETON_ACTIONS} from '../assets/characters/v4/skeleton-rig.mjs';
import {V414_CHARACTERS} from '../assets/characters/v4/skin-v414.mjs';
import {V417_VERSION,V417_LAYERS,V417_DIRECTIONS,V417_ACTIONS,rigCoverage,allRigCoverage,
 layerTransform,layerFilename,inspectLayerFileName,drawLayeredSkin,drawReviewSkin,
 countUniqueImportedLayers,disposeLayerSet} from '../assets/characters/v4/layered-skin-v417.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function all(characterId,direction){
 return new Map(V417_LAYERS.map(x=>[characterId+'/'+direction+'/'+x,{
  image:{name:x},frame:{x:20,y:8,w:60,h:146},decodedBytes:1024
 }]));
}
function fakeCtx(){
 const log=[];const ctx={
  save(){log.push('save');},restore(){log.push('restore');},
  clearRect(){},scale(){},translate(){},rotate(){},
  drawImage(image){log.push(image.name);},
  beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},bezierCurveTo(){},closePath(){},
  arc(){},ellipse(){},fill(){},stroke(){},
  createLinearGradient(){return{addColorStop(){}}}
 };
 return {ctx,log};
}
test('9 approved actions, four honest directions and exactly seventeen unique parts',()=>{
 assert.match(V417_VERSION,/4\.17/);
 assert.deepEqual(V417_DIRECTIONS,SKELETON_DIRECTIONS);
 assert.deepEqual(V417_ACTIONS,SKELETON_ACTIONS);
 assert.equal(V417_LAYERS.length,17);
 assert.equal(new Set(V417_LAYERS).size,17);
 assert.equal(new Set(allRigCoverage(new Map()).map(c=>c.characterId+'/'+c.direction)).size,8);
});
test('filenames are independently direction-specific; full-body static PNG cannot masquerade as moving layer',()=>{
 for(const id of V414_CHARACTERS)for(const direction of SKELETON_DIRECTIONS)for(const layer of V417_LAYERS){
  const name=layerFilename(id,direction,layer);
  assert.deepEqual(inspectLayerFileName(name),{
   id,direction,layer,key:id+'/'+direction+'/'+layer
  });
 }
 assert.throws(()=>inspectLayerFileName('character-01_front.png'),/NOT_A_RIG_LAYER/);
 assert.throws(()=>inspectLayerFileName('character-01_right_unknown.png'),/NOT_A_RIG_LAYER/);
 assert.throws(()=>layerFilename('character-01','right','fake'),/INVALID_LAYER_NAME/);
});
test('bone binding translates and rotates independent artwork at tracked joints, head has zero tilt',()=>{
 for(const characterId of V414_CHARACTERS)for(const direction of SKELETON_DIRECTIONS){
  const neutral=skeletonPose({action:'idle',direction,elapsedMs:0});
  for(const action of SKELETON_ACTIONS){
   const current=skeletonPose({action,direction,elapsedMs:800,progress:.85});
   for(const layer of V417_LAYERS){
    const t=layerTransform(neutral,current,characterId,layer);
    assert.ok(Number.isFinite(t.to.x)&&Number.isFinite(t.to.y));
    assert.ok(Number.isFinite(t.angle)&&Number.isFinite(t.scale));
    assert.ok(t.scale>=.75&&t.scale<=1.25);
    assert.equal(t.headTiltDeg,0);
    if(['head','hair_back','hair_front'].includes(layer))assert.equal(t.angle,0);
   }
  }
  const t=layerTransform(neutral,neutral,characterId,'thigh_right');
  assert.equal(t.angle,0);assert.equal(t.scale,1);
 }
});
test('complete 17 real transparent layers animate on each of nine actions across 4 directions, two characters',()=>{
 for(const characterId of V414_CHARACTERS)for(const direction of SKELETON_DIRECTIONS){
  const assets=all(characterId,direction);
  const c=rigCoverage(assets,characterId,direction);
  assert.deepEqual({present:c.present,total:c.total,complete:c.complete}, {present:17,total:17,complete:true});
  assert.equal(countUniqueImportedLayers(assets),17);
  for(const action of SKELETON_ACTIONS){
   for(const outcome of action==='result'?['win','lose']:['win']){
    const pose=skeletonPose({action,direction,elapsedMs:780,progress:.7,outcome});
    const {ctx,log}=fakeCtx();
    const result=drawReviewSkin(ctx,pose,assets,{characterId,width:300,height:480,showAnchors:true});
    assert.equal(result.mode,'independent-hd-layers');
    assert.equal(result.layersDrawn,17);
    assert.equal(result.headTiltDeg,0);
    assert.deepEqual(new Set(log.filter(s=>V417_LAYERS.includes(s))),new Set(V417_LAYERS));
   }
  }
 }
});
test('missing real layers fail closed rather than overlaying a still character over animated arms',()=>{
 const pose=skeletonPose({action:'walk',direction:'front',elapsedMs:250});
 const set=all('character-01','front');
 set.delete('character-01/front/forearm_right');
 assert.equal(rigCoverage(set,'character-01','front').complete,false);
 assert.throws(()=>drawLayeredSkin(fakeCtx().ctx,pose,set,{characterId:'character-01'}),/INCOMPLETE_SKIN/);
 const {ctx}=fakeCtx();
 const fallback=drawReviewSkin(ctx,pose,set,{characterId:'character-01'});
 assert.equal(fallback.mode,'v414-vector-fallback');
 assert.equal(fallback.missing.includes('forearm_right'),true);
});
test('invalid image metadata rejected and bitmaps are released when reviewer clears',()=>{
 const pose=skeletonPose({action:'idle',direction:'front'});
 const bad=all('character-01','front');
 bad.set('character-01/front/head',{image:{name:'head'},frame:{x:0,y:0,w:0,h:30}});
 assert.throws(()=>drawLayeredSkin(fakeCtx().ctx,pose,bad,{characterId:'character-01'}),/INVALID_LAYER_FRAME/);
 let closes=0;const map=new Map([['a',{image:{close(){closes++;}}}],['b',{image:{close(){closes++;}}}]]);
 disposeLayerSet(map);assert.equal(closes,2);assert.equal(map.size,0);
});
test('web-only Studio iPhone controls real file import, FPS, 9 actions and protects live game and IPA',()=>{
 const page=read('assets/characters/v4/skin-motion-v417.html');
 for(const token of ['viewport-fit=cover','safe-area-inset-bottom','data-action="stand-up"',
  'data-action="result"','decodeLayerFile','drawReviewSkin','requestAnimationFrame','FPS',
  'CHƯA VÀO GAME','character-01_front_hair_back.png'])assert.ok(page.includes(token),token);
 const live=read('assets/village/village.mjs');
 const ipa=read('server-game/current/app.js');
 assert.doesNotMatch(live,/layered-skin-v417|skin-motion-v417/);
 assert.doesNotMatch(ipa,/layered-skin-v417|skin-motion-v417/);
 const spec=JSON.parse(read('assets/characters/v4/skin-art-spec.json'));
 assert.equal(spec.deliveryGate.productionSkinEnabled,false);
 assert.equal(spec.deliveryGate.ownerApproved,false);
});
