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

import {characterImageId,seatRadius,paintedWorldRadius,spriteHeight} from '../assets/village/arena-3d/character-sprites.mjs';
test('GĐ54: nhân vật GMWW thật — ánh xạ ảnh, bán kính ghế khớp atelier, kích thước theo số người',()=>{
  assert.equal(characterImageId('character-07'),'character-07');assert.equal(characterImageId('character-41'),'character-39');
  assert.equal(characterImageId('character-42'),'character-40');assert.equal(characterImageId('x'),'character-01');
  assert.equal(characterImageId('character-45'),'character-05');
  for(const [n,r] of [[6,4.15],[12,5.1],[18,6.15],[24,7.2],[30,8.35]])assert.equal(seatRadius(n),r);
  assert.ok(paintedWorldRadius(6)<paintedWorldRadius(30));
  for(const n of [6,12,20,30])assert.ok(fs.existsSync('assets/characters/gmww40/originals/'+characterImageId('character-'+n)+'.webp'));
  assert.ok(spriteHeight(30)>0&&spriteHeight(6)>0);
  const atelier=fs.readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
  assert.match(atelier,/radius=count<=8\?4\.15:count<=12\?5\.1:count<=18\?6\.15:count<=24\?7\.2:8\.35/);
  assert.match(atelier,/setBodiesVisible/);
});
