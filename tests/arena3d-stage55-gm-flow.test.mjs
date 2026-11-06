import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {flowState,FLOW_STEPS,installGmFlow} from '../assets/village/arena-3d/gm-flow.mjs';
test('flowState: chuỗi bước giống màn 2D và nút "chạm để tiếp" trỏ đúng nút có sẵn',()=>{
  assert.equal(FLOW_STEPS.length,6);
  assert.deepEqual(flowState({}),{step:1,next:{label:'Vào phòng',hint:'Kết nối phòng',target:'connect'}});
  assert.equal(flowState({room:'AB12',phase:'lobby'}).next.target,'open-setup');
  assert.equal(flowState({room:'AB12',phase:'lobby',seatsLocked:true}).next.target,'start');
  assert.equal(flowState({room:'AB12',phase:'running',cyclePhase:'morning'}).next.target,'night');
  const n=flowState({room:'AB12',phase:'running',cyclePhase:'night'});assert.equal(n.step,6);assert.equal(n.next.target,'day');
});
test('installGmFlow: vẽ 6 bước, bấm nút tiếp thì bấm đúng nút của trang, không gọi API riêng',()=>{
  const mk=t=>({t,children:[],cls:'',style:{},append(...c){this.children.push(...c)},replaceChildren(){this.children=[]},
    setAttribute(){},insertBefore(c){this.children.push(c)},remove(){}});
  const body=mk('body'),clicks=[];const els={'gm-dock':mk('dock'),'gm-dock-open':mk('b')};
  const doc={createElement:mk,head:{appendChild(){}},body,getElementById:id=>els[id]||null};
  let st={room:null};const f=installGmFlow({doc,read:()=>st,click:id=>clicks.push(id),interval:99999});
  const strip=body.children[0];assert.equal(strip.children.length,6);
  const next=els['gm-dock'].children[0];next.onclick();assert.deepEqual(clicks,['connect']);
  st={room:'AB12',phase:'lobby',seatsLocked:true};f.refresh();next.onclick();assert.deepEqual(clicks,['connect','start']);
  assert.equal(strip.children[4].className,'cur');assert.equal(strip.children[0].className,'done');
  f.dispose();
});
test('live.mjs chỉ bật gm-flow khi immersive (trang CI giữ nguyên)',()=>{
  const live=fs.readFileSync('assets/village/arena-3d/live.mjs','utf8');
  assert.match(live,/if\(immersiveWanted\(\)\)\{installImmersive\(\);\s*installGmFlow\(/);
});
