import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('server-game/current/GMWW.html','utf8');
const script=html.match(/<!-- Arena 3D GĐ32[\s\S]*?<script>([\s\S]*?)<\/script>/)?.[1];

function runPortal() {
  const body={style:{overflow:''},appendChild(element){this.child=element;}};
  const buttons={},listeners={},state={twoD:0};
  const makeElement=(tag)=>{
    const node={tag,style:{},hidden:false,children:[],attrs:{},listeners:{},
      append(...nodes){this.children.push(...nodes);},
      setAttribute(key,value){this.attrs[key]=value;},
      addEventListener(type,fn){this.listeners[type]=fn;},
      focus(){state.focused=this}};
    if(tag==='iframe')node.src='';
    return node;
  };
  const home=makeElement('button');
  const nav=makeElement('button');
  nav.click=()=>{state.twoD++};
  const document={body,activeElement:home,
    getElementById(id){
      if(id==='gmwwHomeEnterVillage')return home;
      if(id==='gmwwArena3dQaClose')return body.child?.children?.[0]?.children?.[0];
      return null;
    },
    createElement:makeElement,
    addEventListener(type,handler,capture){listeners[type]=handler;state.capture=capture},
    querySelector(selector){return selector==='#bottomNav .nav[data-page="start"]'?nav:null}
  };
  vm.runInNewContext(script,{document},{timeout:1000});
  return {document,body,listeners,state,home};
}

test('V3.222: VÀO LÀNG mở STAGING 3D trong iframe thay vì main-frame Safari',()=>{
  assert.match(html,/GMWW V3\.222/);
  assert.match(html,/gmwwHomeEnterVillage[^>]+aria-label="Vào Làng và thử nghiệm Arena 3D STAGING"/);
  assert.match(html,/<small>THỬ NGHIỆM ARENA 3D<\/small>/);
  assert.ok(script,'missing isolated Arena3D HOME portal script');
  const {body,listeners,state,home}=runPortal();
  let canceled=0;
  const event={target:{closest:selector=>selector==='#gmwwHomeEnterVillage'?home:null},
    preventDefault(){canceled++},stopPropagation(){},stopImmediatePropagation(){}};
  listeners.click(event);
  assert.equal(canceled,1);
  assert.equal(state.capture,true,'capture should run before the existing handler');
  assert.equal(body.child.id,'gmwwArena3dQaPortal');
  assert.equal(body.child.hidden,false);
  const frame=body.child.children[1];
  assert.equal(frame.tag,'iframe');
  assert.equal(frame.src,'https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html');
  assert.equal(frame.attrs.referrerpolicy,'no-referrer');
  assert.equal(body.style.overflow,'hidden');
  assert.equal(state.twoD,0);
  const back=body.child.children[0].children[0];
  back.listeners.click();
  assert.equal(frame.src,'about:blank','must release 3D renderer when closing');
  assert.equal(body.child.hidden,true);
  assert.equal(body.style.overflow,'');
});

test('V3.222: nút Chơi 2D giữ nguyên điều hướng cũ, đóng Arena QA',()=>{
  const {body,listeners,state,home}=runPortal();
  listeners.click({target:{closest:()=>home},preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
  const to2d=body.child.children[0].children[2];
  to2d.listeners.click();
  assert.equal(state.twoD,1);
  assert.equal(body.child.hidden,true);
  assert.equal(body.child.children[1].src,'about:blank');
  const src=readFileSync('server-game/current/app.js','utf8');
  assert.match(src,/gmwwHomeNavigate\('start'\)/);
  assert.match(src,/const VERSION='3\.222'/);
});

test('V3.222: OTA change is navigation-only, independent production/Core boundaries',()=>{
  const releases=readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  assert.match(releases,/V3\.222: Trang Chủ/);
  assert.match(releases,/copy\('server-game\/current\/GMWW\.html','GMWW\.html'\)/);
  assert.match(releases,/sha256:sha\(path\.join\(outRoot,rel\)\)/);
  const worker=readFileSync('src/index.js','utf8');
  assert.match(worker,/VERSION="V3\.222"/);
  assert.doesNotMatch(script,/api\/gm\/rooms|localStorage|gmToken|fetch\(/);
  assert.match(script,/iframe/);
  assert.match(script,/frame\.src='about:blank'/);
  const notes=readFileSync('docs/releases/GMWW-V3.222-arena3d-home-portal-20261025.md','utf8');
  assert.match(notes,/Rollback/);
});
