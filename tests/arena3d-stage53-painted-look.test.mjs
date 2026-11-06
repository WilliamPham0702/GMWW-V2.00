import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {paintedFit,PAINTED_PLAZA} from '../assets/village/arena-3d/backdrop-camera.mjs';
import {installPaintedBackdrop} from '../assets/village/arena-3d/painted-look.mjs';
const live=fs.readFileSync('assets/village/arena-3d/live.mjs','utf8');
test('kiểu tranh chỉ bật khi trong app (immersive) — trang QA/CI độc lập giữ nguyên cảnh dựng bằng code',()=>{
  assert.match(live,/const paintedLook=immersiveWanted\(\)/);
  assert.match(live,/alpha:immersiveWanted\(\)/);
  assert.match(live,/paintedLook\?new THREE.OrthographicCamera/);
  assert.match(live,/if\(paintedLook\)installPaintedBackdrop\(scene,village,render\)/);
});
test('camera tranh: không méo (tỉ lệ điểm ảnh 1:1), lửa nằm đúng điểm neo của tranh',()=>{
  for(const [w,h] of [[390,844],[430,932],[820,1180]]){
    const f=paintedFit(w,h),sin=Math.sin(f.tiltDeg*Math.PI/180);
    const pxPerX=w/(f.right-f.left),pxPerY=h/(f.top-f.bottom);
    assert.ok(Math.abs(pxPerX-pxPerY)<1e-9,'méo '+w+'x'+h);
    assert.ok(sin>=.35&&sin<=.9);
    assert.ok(Math.abs(-f.left/(f.right-f.left)*100-PAINTED_PLAZA.fire.x)<1e-9);
    assert.ok(Math.abs(f.top/(f.top-f.bottom)*100-PAINTED_PLAZA.fire.y)<1e-9);
  }
});
test('installPaintedBackdrop: ẩn làng, giữ đèn, thêm iframe tranh không nhận chạm, gửi pha Ngày/Đêm',()=>{
  const lights=[{isLight:true},{isLight:true}],root={visible:true,traverse:f=>[{},...lights].forEach(f)};
  const added=[],hooks=[];const posted=[];
  const mk=tag=>({tag,children:[],attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(n,f){this.listeners[n]=f},
    contentWindow:{postMessage:(m)=>posted.push(m)}});
  const doc={createElement:mk,head:{appendChild:()=>{}},body:{firstChild:null,insertBefore:(n)=>added.push(n)}};
  const render={setClearColor:()=>{}},scene={background:{},add:l=>added.push(l)};
  const r=installPaintedBackdrop(scene,{root,onNight:h=>hooks.push(h)},render,{doc,base:'http://x/backdrop.html'});
  assert.equal(root.visible,false);assert.equal(r.lights,2);assert.equal(scene.background,null);
  assert.equal(r.frame.src,'http://x/backdrop.html');
  hooks[0](true);r.frame.listeners.load();assert.equal(posted.at(-1).night,true);
});
