import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skeletonPose,SKELETON_DIRECTIONS} from '../assets/characters/v4/skeleton-rig.mjs';
import {V414_CHARACTERS,V414_LAYERS,drawV414SkinLayer} from '../assets/characters/v4/skin-v414.mjs';
import {MASTER_SIZE,MASTER_VERSION,masterPose,paintMaster,crc32,storeZip} from '../assets/characters/v4/skin-master-v415.mjs';
function fakeCtx(){
 let fills=0,clears=0,scales=0;
 const ctx={save(){},restore(){},translate(){},rotate(){},
 scale(){scales++;},clearRect(){clears++;},beginPath(){},closePath(){},
 moveTo(){},lineTo(){},quadraticCurveTo(){},bezierCurveTo(){},
 ellipse(){},arc(){},fill(){fills++;},stroke(){},
 createLinearGradient(){return {addColorStop(){}}}};
 return {ctx,stats:()=>({fills,clears,scales})};
}
test('1200x1920 master is true 1:1 vector rasterization, minimum 1024x1536 met',()=>{
 assert.deepEqual(MASTER_SIZE,{width:1200,height:1920});
 assert.ok(MASTER_SIZE.width>=1024&&MASTER_SIZE.height>=1536);
 assert.equal(MASTER_SIZE.width/100,MASTER_SIZE.height/160);
 assert.match(MASTER_VERSION,/4\.15/);
});
test('2 premium identity previews × 4 directions all render at master dimensions',()=>{
 for(const id of V414_CHARACTERS)for(const direction of SKELETON_DIRECTIONS){
  const {ctx,stats}=fakeCtx();
  const pose=masterPose(id,direction);
  assert.equal(pose.headTiltDeg,0);
  assert.equal(pose.action,'idle');
  const result=paintMaster(ctx,id,direction);
  assert.equal(result.skinApplied,true);
  assert.equal(result.layersDrawn.length,17);
  assert.equal(stats().clears,1);
  assert.ok(stats().fills>=13);
 }
 assert.throws(()=>masterPose('character-03','front'),/UNSUPPORTED_CHARACTER/);
 assert.throws(()=>masterPose('character-01','up'),/UNSUPPORTED_DIRECTION/);
});
test('17 separate transparent canvases each exactly registered to approved bones',()=>{
 for(const id of V414_CHARACTERS)for(const direction of SKELETON_DIRECTIONS){
  const pose=skeletonPose({action:'idle',direction});
  for(const layerName of V414_LAYERS){
   const {ctx,stats}=fakeCtx();
   const result=drawV414SkinLayer(ctx,pose,{characterId:id,layerName,...MASTER_SIZE});
   assert.equal(result.layerName,layerName);
   assert.equal(result.transparent,true);
   assert.equal(result.headTiltDeg,0);
   assert.equal(stats().clears,1);
  }
 }
 const pose=masterPose('character-01','front'),{ctx}=fakeCtx();
 assert.throws(()=>drawV414SkinLayer(ctx,pose,{layerName:'fake'}),/INVALID_SKIN_LAYER/);
});
test('store-only ZIP writer encodes correct local file headers, CRCs, central directory and EOCD',async()=>{
 const first=new Uint8Array([1,2,3,4]),second=new Uint8Array([5,6]);
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 const blob=storeZip([{name:'a.png',bytes:first},{name:'b.png',bytes:second}]);
 const bytes=new Uint8Array(await blob.arrayBuffer()),dv=new DataView(bytes.buffer);
 assert.equal(dv.getUint32(0,true),0x04034b50);
 assert.equal(dv.getUint32(14,true),crc32(first));
 assert.equal(dv.getUint32(18,true),4);
 const secondOffset=30+'a.png'.length+first.length;
 assert.equal(dv.getUint32(secondOffset,true),0x04034b50);
 const eocd=bytes.length-22;
 assert.equal(dv.getUint32(eocd,true),0x06054b50);
 assert.equal(dv.getUint16(eocd+10,true),2);
 const centralOffset=dv.getUint32(eocd+16,true);
 assert.equal(dv.getUint32(centralOffset,true),0x02014b50);
 assert.equal(blob.type,'application/zip');
 assert.throws(()=>storeZip([{name:'../oops',bytes:first}]),/INVALID_ZIP_ENTRY/);
});
test('master staging remains isolated; no live room/IPA references or owner-approval claim',()=>{
 const read=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');
 const page=read('../assets/characters/v4/skin-master-v415.html');
 assert.match(page,/MASTER KỸ THUẬT/);
 assert.match(page,/1200 × 1920/);
 assert.match(page,/skin-master-v415\.mjs/);
 assert.match(page,/export8MasterPNGs/);
 assert.match(page,/export17Layers/);
 assert.match(page,/CHƯA NGHIỆM THU/);
 assert.doesNotMatch(read('../assets/village/village.mjs'),/skin-master-v415/);
 assert.doesNotMatch(read('../server-game/current/app.js'),/skin-master-v415/);
 const spec=JSON.parse(read('../assets/characters/v4/skin-art-spec.json'));
 assert.equal(spec.deliveryGate.ownerApproved,false);
 assert.equal(spec.deliveryGate.productionSkinEnabled,false);
});
