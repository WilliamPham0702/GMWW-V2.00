import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {stagingHtml,STAGING_BASE} from '../.github/scripts/build-arena3d-staging-runtime.mjs';
import {backdropFrustum,backdropCameraPosition,framePctToFloor} from '../assets/village/arena-3d/backdrop-camera.mjs';
const SRC=fs.readFileSync('.github/runtime-staging/gmww-play3d.js','utf8');
const portal=fs.readFileSync('server-game/current/GMWW.html','utf8');
const layoutCtx={};layoutCtx.globalThis=layoutCtx;layoutCtx.window=layoutCtx;vm.createContext(layoutCtx);
vm.runInContext(fs.readFileSync('assets/village/village-layout.js','utf8'),layoutCtx);

function el(tag,id){const e={tag,id,children:[],cls:new Set(),attrs:{},style:{},listeners:{},dataset:{},
  appendChild(c){c.parent=e;e.children.push(c);return c},insertBefore(c,r){c.parent=e;e.children.unshift(c);return c},
  remove(){if(e.parent)e.parent.children=e.parent.children.filter(x=>x!==e);e.removed=true},
  setAttribute(k,v){e.attrs[k]=v},addEventListener(n,f){(e.listeners[n]||(e.listeners[n]=[])).push(f)},
  classList:{toggle:(n,on)=>on?e.cls.add(n):e.cls.delete(n),contains:n=>e.cls.has(n)},
  contentWindow:{post:[],postMessage(m,o){this.post.push([m,o])}}};
  Object.defineProperty(e,'firstChild',{get:()=>e.children[0]});return e}
function run({base=STAGING_BASE,stored=null,phase='day',room={roomCode:'ABCDEF',gmToken:'tok_123456789012'}}={}){
  const world=el('div','playWorld'),shell=el('div','playShell');shell.dataset.phase=phase;
  const byId={playWorld:world,playShell:shell};const fetches=[],store=new Map(stored?[['gmww.play3d.mode',stored]]:[]);
  const doc={readyState:'complete',head:el('head'),getElementById:id=>byId[id]||world.children.find(c=>c.id===id)||null,
    createElement:t=>{const e=el(t);Object.defineProperty(e,'id',{get:()=>e._id,set:v=>{e._id=v;byId[v]=e}});return e},
    addEventListener(){}};
  const ctx={GMWW_SERVER_BASE:base,playSceneState:room,document:doc,URL,JSON,String,Boolean,
    localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},setInterval(){return 1},
    MutationObserver:class{constructor(f){this.f=f}observe(){}},fetch:(u,o)=>{fetches.push({u,o});return Promise.resolve({})},
    window:{addEventListener(){}}};
  ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(SRC,ctx);return {ctx,world,shell,byId,fetches,store};
}
test('3D bật mặc định: iframe nền nằm dưới mọi nút 2D, đúng URL cùng origin STAGING',()=>{
  const {world,byId}=run();const f=byId.gmww3dBackdrop;
  assert.ok(f&&world.children[0]===f);assert.equal(f.src,STAGING_BASE+'/village/arena-3d/backdrop.html');
  assert.ok(world.cls.has('gmww-3d-on'));assert.equal(byId.gmww3dToggle.textContent,'3D');
  assert.match(SRC,/z-index:-1;pointer-events:none/);
});
test('Không chạy ở Runtime Production',()=>{
  const {byId}=run({base:'https://gmww-v2-00.williampham0702.workers.dev'});
  assert.equal(byId.gmww3dBackdrop,undefined);assert.equal(byId.gmww3dToggle,undefined);
});
test('GM đổi 2D: gỡ iframe, nhớ lựa chọn, báo Player bằng token GM (không đưa token lên URL)',()=>{
  const {world,byId,store,fetches}=run();byId.gmww3dToggle.listeners.click[0]();
  assert.equal(store.get('gmww.play3d.mode'),'2d');assert.ok(byId.gmww3dBackdrop===undefined||byId.gmww3dBackdrop.removed);
  assert.ok(!world.cls.has('gmww-3d-on'));
  assert.equal(fetches.length,1);assert.equal(fetches[0].u,STAGING_BASE+'/api/arena-staging/rooms/ABCDEF/view-mode');
  assert.equal(fetches[0].o.headers.authorization,'Bearer tok_123456789012');assert.deepEqual(JSON.parse(fetches[0].o.body),{mode:'2d'});
  assert.ok(!fetches[0].u.includes('tok_'));
});
test('Không có quyền GM thì không gọi server',()=>{
  const {byId,fetches}=run({room:{roomCode:'—',gmToken:''}});byId.gmww3dToggle.listeners.click[0]();assert.equal(fetches.length,0);
});
test('Pha Đêm được gửi cho nền 3D (không kèm dữ liệu game)',()=>{
  const {byId}=run({phase:'night'});const f=byId.gmww3dBackdrop;f.listeners.load[0]();
  assert.equal(JSON.stringify(f.contentWindow.post.at(-1)),JSON.stringify([{kind:'gmww-backdrop-phase',night:true},STAGING_BASE]));
});
test('Gói Runtime STAGING nạp script 3D sau app.js; Production html không đổi',()=>{
  const h=stagingHtml(portal);assert.match(h,/<script src="app\.js[^"]*"><\/script>\s*<script src="gmww-play3d\.js"><\/script>/);
  assert.ok(!portal.includes('gmww-play3d'));
});
test('Camera trực giao: ghế 2D (%) rơi đúng vòng sàn 3D, lửa ở tâm, vòng 30 ghế ≈ bán kính 8.35 m',()=>{
  const fire=framePctToFloor(50,64);assert.ok(Math.abs(fire.x)<1e-9&&Math.abs(fire.z)<1e-9);
  const pts=layoutCtx.GMWW_VILLAGE_LAYOUT.positions(30,undefined,undefined,100);
  const rs=pts.map(p=>{const w=framePctToFloor(p.x,p.y);return Math.hypot(w.x,w.z)});
  assert.ok(Math.max(...rs)<9.6&&Math.min(...rs)>4,'bán kính sàn '+Math.min(...rs).toFixed(1)+'–'+Math.max(...rs).toFixed(1));
  const f=backdropFrustum();assert.ok(f.right>f.left&&f.top>f.bottom&&f.top>0&&f.bottom<0);
  assert.ok(backdropCameraPosition().y>0);
});
