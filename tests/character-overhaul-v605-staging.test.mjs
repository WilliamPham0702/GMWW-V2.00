import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER21_V605_STAGING,character21V605PreviewAsset,character21V605Motion,character21V605DirectionRange} from '../src/gmww-character-v605-staging.mjs';
test('Character21 must be manually opted into Preview only',()=>{
 assert.equal(CHARACTER21_V605_STAGING.productionEnabled,false);
 assert.equal(CHARACTER21_V605_STAGING.stagingOnly,true);
 assert.equal(character21V605PreviewAsset('character-21'),null);
 assert.equal(character21V605PreviewAsset('character-22',{enableStaging:true}),null);
 assert.equal(character21V605PreviewAsset('character-21',{enableStaging:true})?.rigJointCount,16);
});
test('All four clips and eight distinct directional artwork ranges',()=>{
 const directions=['front','front-right','right','back-right','back','back-left','left','front-left'];
 for(let i=0;i<8;i++){const v=character21V605Motion('run',directions[i]);assert.equal(v.directionIndex,i);assert.equal(v.clip,'Run')}
 assert.equal(character21V605Motion('celebrate','left').clip,'Result');
 assert.equal(character21V605Motion('walk','right').clip,'Walk');
 assert.equal(character21V605Motion().clip,'Idle');
 const gltf={meshes:[{extras:{directionalPrimitiveIndexRanges:Array.from({length:8},(_,i)=>({direction:i,firstIndex:i*100,indexCount:100}))}}]};
 assert.deepEqual(character21V605DirectionRange(gltf,'left'),{firstIndex:600,indexCount:100});
 assert.throws(()=>character21V605DirectionRange(gltf,'none'),/INVALID_CHARACTER_DIRECTION/);
 assert.throws(()=>character21V605DirectionRange({},'front'),/MISSING_APPROVED_DIRECTION_RANGE/);
});
