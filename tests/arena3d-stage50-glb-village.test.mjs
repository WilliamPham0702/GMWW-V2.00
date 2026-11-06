// GĐ50 - kiểm quy cách 14 model GLB của làng (ChatGPT dựng) trước khi đưa vào game.
// Rủi ro của task: model quá nặng cho iPhone, sai gốc/đơn vị/hướng, hoặc chứa thứ không an toàn (animation, URI ngoài).
// Test không đo vẻ đẹp; vẻ đẹp do chủ dự án duyệt qua ảnh chụp.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {parseGlb,buildGlbGroup} from '../assets/village/arena-3d/glb-lite.mjs';

const dir='assets/village/arena-3d/models/village/';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.glb')).sort();
const limits={'house-white-orange-roof.glb':9000};
const heights={'house-white-orange-roof.glb':[3,4],'stall-striped.glb':[2,2.5],'lantern-post.glb':[2.2,2.6],'tree-palm.glb':[3.5,4.5],'tree-cypress.glb':[4.5,5.5],'gate-arch.glb':[3.2,3.8]};
const load=f=>{const b=fs.readFileSync(dir+f);return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};

test('đủ 14 model làng',()=>assert.equal(files.length,14));
for(const f of files)test('GLB '+f+': nhẹ, gốc ở đáy, đơn vị mét, không animation/URI',()=>{
  assert.ok(fs.statSync(dir+f).size<=1.5*1024*1024,'dung lượng');
  const parsed=load(f),g=buildGlbGroup(THREE,parsed,{name:f});
  assert.ok(g.triangles>0&&g.triangles<=(limits[f]||6000),'tam giác '+g.triangles);
  const box=new THREE.Box3().setFromObject(g.root),size=box.getSize(new THREE.Vector3());
  assert.ok(Math.abs(box.min.y)<.02,'gốc phải ở đáy, minY='+box.min.y);
  // Tâm CHÂN ĐẾ (đỉnh sát đất) phải ở gốc; tán cây nghiêng thì tâm bao quanh có thể lệch nên không dùng.
  g.root.updateMatrixWorld(true);let sx=0,sz=0,n=0;const v=new THREE.Vector3();
  g.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<.15){sx+=v.x;sz+=v.z;n++}}});
  assert.ok(n>0&&Math.abs(sx/n)<.6&&Math.abs(sz/n)<.6,'chân đế phải ở giữa gốc: '+(sx/n).toFixed(2)+','+(sz/n).toFixed(2));
  if(heights[f])assert.ok(size.y>=heights[f][0]&&size.y<=heights[f][1],'chiều cao '+size.y);
  assert.ok(size.x<=6&&size.z<=6,'kích thước ngang quá lớn');
  assert.equal((parsed.json.animations||[]).length,0);
  assert.equal((parsed.json.buffers||[]).filter(b=>b.uri).length,0);
  g.dispose();
});
test('đèn lồng/cửa sổ dùng vật liệu glow để bật sáng ban đêm',()=>{
  for(const f of ['lantern-post.glb','house-white-orange-roof.glb','campfire-stone.glb']){
    const g=buildGlbGroup(THREE,load(f));assert.ok(g.materials.some(m=>m.userData.glow),f+' thiếu glow');g.dispose();
  }
});
test('bộ đọc từ chối file không an toàn',()=>{
  const enc=json=>{const j=new TextEncoder().encode(JSON.stringify(json)),pad=(4-j.length%4)%4,
    out=new Uint8Array(12+8+j.length+pad);const v=new DataView(out.buffer);
    v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.length,true);
    v.setUint32(12,j.length+pad,true);v.setUint32(16,0x4e4f534a,true);out.set(j,20);out.fill(32,20+j.length);return out.buffer};
  assert.throws(()=>parseGlb(enc({asset:{version:'2.0'},animations:[{}]})),/animations/);
  assert.throws(()=>parseGlb(enc({asset:{version:'2.0'},buffers:[{uri:'http://x/a.bin',byteLength:1}]})),/uri/);
  assert.throws(()=>parseGlb(enc({asset:{version:'2.0'},images:[{uri:'a.png'}]})),/texture/);
  assert.throws(()=>parseGlb(new ArrayBuffer(8)),/GLB/);
});
