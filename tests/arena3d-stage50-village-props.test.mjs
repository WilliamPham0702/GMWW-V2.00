// GĐ50 - gắn model GLB vào làng. Rủi ro của task: model đè lên nhân vật/ghế, đè nhau, tốn draw call,
// hoặc lỗi tải làm hỏng làng. Test không đo vẻ đẹp.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {parseGlb,buildGlbGroup} from '../assets/village/arena-3d/glb-lite.mjs';
import {villagePlacements,bakeGroup,installVillageProps,PROP_FILES} from '../assets/village/arena-3d/village-props.mjs';
import {createCoastalVillage} from '../assets/village/arena-3d/coastal-village.mjs';

test('bố cục: không vật thể nào nằm trong vòng ghế/quảng trường, đủ loại, mọi loại có file model',()=>{
  const {items,skipped}=villagePlacements();
  const types=new Set(items.map(i=>i.type));
  for(const t of types)assert.ok(PROP_FILES[t]&&fs.existsSync('assets/village/arena-3d/models/village/'+PROP_FILES[t]+'.glb'),t);
  for(const it of items){
    if(it.type==='campfire'||it.type==='boat')continue;
    assert.ok(Math.hypot(it.x,it.z)>=9.8,it.type+' quá gần tâm: '+Math.hypot(it.x,it.z).toFixed(2));
  }
  for(const t of ['house','stall','lamp','banner','palm','gate','stairs','campfire','dome'])assert.ok(types.has(t),'thiếu '+t);
  assert.ok(items.filter(i=>i.type==='house').length>=4);
  assert.equal(skipped.length,0,'bỏ quá nhiều vật thể do đè nhau: '+skipped.join(','));
  const again=villagePlacements().items;assert.deepEqual(again,items,'bố cục phải xác định, không ngẫu nhiên');
});
test('bakeGroup: gộp vật liệu thành vertex color, tách phần phát sáng, giữ số tam giác',()=>{
  for(const f of ['house-white-orange-roof','lantern-post','tree-palm']){
    const b=fs.readFileSync('assets/village/arena-3d/models/village/'+f+'.glb');
    const g=buildGlbGroup(THREE,parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)));
    const baked=bakeGroup(THREE,g.root);
    assert.equal(baked.triangles,g.triangles,f);
    assert.ok(baked.solid.getAttribute('color'));
    if(f!=='tree-palm')assert.ok(baked.glow&&baked.emissive,f+' phải có phần glow');
    baked.solid.dispose();baked.glow?.dispose();g.dispose();
  }
});
test('installVillageProps: ít draw call, thay thế khối dựng bằng code, theo Ngày/Đêm; lỗi tải thì giữ làng cũ',async()=>{
  const realFetch=globalThis.fetch;
  globalThis.fetch=async url=>{
    const path=decodeURIComponent(new URL(url).pathname);
    const buf=fs.readFileSync(path);return {ok:true,arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};
  };
  try{
    const scene=new THREE.Scene(),village=createCoastalVillage(THREE,scene);
    const status=[];
    const props=await installVillageProps(THREE,village,{onStatus:s=>status.push(s)});
    assert.ok(props,status.join('|'));
    assert.ok(props.drawCalls<=30,'draw call model: '+props.drawCalls);
    const root=scene.getObjectByName('arena-tropical-village');
    assert.ok(root.getObjectByName('arena-village-glb-props'));
    const hiddenGroups=village.groupNames.filter(n=>['houses','stalls','lamps','banners','palms','campfire'].includes(n));
    assert.equal(hiddenGroups.length,6);
    village.setNight(true);village.setNight(false);
    props.dispose();village.dispose();
    // tải lỗi: không ném lỗi, không ẩn làng cũ
    globalThis.fetch=async()=>({ok:false});
    const scene2=new THREE.Scene(),v2=createCoastalVillage(THREE,scene2),st=[];
    assert.equal(await installVillageProps(THREE,v2,{onStatus:s=>st.push(s)}),null);
    assert.match(st[0],/giữ làng dựng bằng code/);
    assert.ok(scene2.getObjectByName('arena-tropical-village').children.every(c=>c.visible!==false||c.isLight===undefined));
    v2.dispose();
  }finally{globalThis.fetch=realFetch}
});
test('live.mjs và player.mjs gọi installVillageProps và không để lỗi làm sập trang',()=>{
  for(const f of ['live','player']){
    const s=fs.readFileSync('assets/village/arena-3d/'+f+'.mjs','utf8');
    assert.match(s,/installVillageProps\(THREE,village\)\.catch\(\(\)=>null\)/,f);
  }
});
