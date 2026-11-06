import test from 'node:test';import assert from 'node:assert/strict';
import {unissuedArtifactIds,pickRandom,aliveNeighbors,awakeLastNight,needsStorageArtifact} from '../src/gmww-artifact-rules.js';
test('Artifact chưa phát: loại lá đã gán/đã phát; hết thì null',()=>{
  const ids=unissuedArtifactIds({catalogIds:['a1','a2','a3'],assignments:[{artifactId:'a1'}],issued:['a2']});
  assert.deepEqual(ids,['a3']);assert.equal(pickRandom(ids,()=>0.99),'a3');
  assert.equal(pickRandom(unissuedArtifactIds({catalogIds:['a1'],assignments:[{artifactId:'a1'}]})),null);
});
test('hàng xóm: người sống sát ghế, vòng tròn, bỏ qua người chết',()=>{
  const players={};for(let i=1;i<=5;i++)players['member:p'+i]={kind:'member',loginId:'p'+i,seatId:i};
  assert.deepEqual(aliveNeighbors({players,interactions:[],matchId:'m',actorId:'p1'}),{left:'p5',right:'p2'});
  const dead=[{type:'dead',loginId:'p2',matchId:'m'}];
  assert.deepEqual(aliveNeighbors({players,interactions:dead,matchId:'m',actorId:'p1'}),{left:'p5',right:'p3'});
});
test('thức = đã dùng chức năng đêm',()=>{
  const usage=[{matchId:'m',night:2,actorId:'p2'}];
  assert.equal(awakeLastNight({usage,matchId:'m',night:2,loginId:'p2'}),true);
  assert.equal(awakeLastNight({usage,matchId:'m',night:3,loginId:'p2'}),false);
});
test('nhóm cần kho dữ liệu',()=>{for(const id of ['01','03','10','16','17','25'])assert.equal(needsStorageArtifact('artifact_'+id),true);assert.equal(needsStorageArtifact('artifact_06'),false)});
