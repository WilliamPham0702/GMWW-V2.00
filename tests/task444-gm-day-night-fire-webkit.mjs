// Isolated iPhone WebKit QA. Do not access Production or change rooms.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webkit} from 'playwright';

const source=readFileSync('server-game/current/app.js','utf8');
const start=source.indexOf('function gmwwPlaceWolfMenuAtFire(menu){');
const end=source.indexOf('\nfunction demoTurnDescription(',start);
assert.ok(start>=0&&end>start);
const fireMenu=source.slice(start,end);

const browser=await webkit.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.route('https://task444.qa.test/**',route=>route.fulfill({status:200,contentType:'text/html',
  body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0">
  <div id="stage" style="position:relative;width:100vw;height:100dvh;background:#e3f4f1">
   <div class="play-village-core" style="position:absolute;left:50%;top:50%;width:72px;height:65px;transform:translate(-50%,-50%);z-index:5">
    <button class="play-core-pearl" style="width:72px;height:65px;border:0;padding:0;background:#fc9;cursor:pointer" aria-label="Đống lửa · Công cụ GM">🔥</button>
   </div>
  </div>
  <div id="playBattleDock" style="position:fixed;inset:0;width:0;height:0;overflow:visible;pointer-events:none">
   <div id="battleWolfMenu" style="position:fixed;display:block;width:186px;height:164px;max-width:95vw;background:#174e64;box-sizing:border-box;pointer-events:auto;color:white">CÔNG CỤ GM</div>
  </div>
  </body></html>`}));
 await page.goto('https://task444.qa.test/');
 await page.addScriptTag({content:`
  const playSceneState={step:'battle',phase:'day'};
  const villageScenePublished={revision:4,day:'day-image',night:'night-image',
   fireAnchors:{day:{x:25,y:38},night:{x:75,y:63}}};
  function villageFirePosition(){
   const key=playSceneState.phase==='night'?'night':'day',p=villageScenePublished.fireAnchors[key];
   return [p.x,p.y]
  }
  function battleTargetClampPosition(w,h,left,top){
   return {left:Math.max(8,Math.min(innerWidth-w-8,left)),top:Math.max(8,Math.min(innerHeight-h-8,top))}
  }
  ${fireMenu}
  window.__task444={place:()=>gmwwPlaceWolfMenuAtFire(document.getElementById('battleWolfMenu')),
   phase:p=>{playSceneState.phase=p},anchor:p=>{villageScenePublished.fireAnchors[playSceneState.phase]=p}};
 `});
 for(const [phase,x,y] of [['day',25,38],['night',75,63],['day',25,38],['night',90,81],['day',12,17]]){
  await page.evaluate(({phase,x,y})=>{
   window.__task444.phase(phase);
   window.__task444.anchor({x,y});
  },{phase,x,y});
  const state=await page.evaluate(()=>{
   const menu=document.querySelector('#battleWolfMenu');
   if(!window.__task444.place())throw Error('GM menu was not placed');
   const fire=document.querySelector('.play-core-pearl').getBoundingClientRect(),m=menu.getBoundingClientRect();
   const hit=m.left<fire.right&&m.right>fire.left&&m.top<fire.bottom&&m.bottom>fire.top;
   const dx=Math.max(0,m.left-fire.right,fire.left-m.right),dy=Math.max(0,m.top-fire.bottom,fire.top-m.bottom);
   return {fire:{x:(fire.left+fire.right)/2,y:(fire.top+fire.bottom)/2},marker:document.querySelector('.play-village-core').dataset.gmwwFirePhase,
    hit,gap:Math.hypot(dx,dy),within:m.left>=0&&m.top>=0&&m.right<=innerWidth+1&&m.bottom<=innerHeight+1}
  });
  assert.equal(state.marker,phase);
  assert.ok(Math.abs(state.fire.x-x*3.9)<1,'fire X must match current picture');
  assert.ok(Math.abs(state.fire.y-y*8.44)<1.5,'fire Y must match current picture');
  assert.equal(state.hit,false,'GM menu must not cover Day or Night fire hitbox: '+JSON.stringify(state));
  assert.ok(state.gap<45,'GM menu must stay beside current fire: '+JSON.stringify(state));
  assert.equal(state.within,true,'GM menu must stay inside iPhone viewport');
 }
 console.log('PASS Task #444: Day/Night GM menu follows actual clickable fire marker on iPhone');
} finally {await browser.close()}
