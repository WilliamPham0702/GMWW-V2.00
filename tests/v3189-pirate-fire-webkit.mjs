// Functional iPhone WebKit QA for actual V3.189 pirate gesture and calibrated fire menu.
// Uses isolated DOM: never requests, changes or joins a real game room.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webkit} from 'playwright';

const village=fs.readFileSync('assets/village/village.mjs','utf8');
const source=fs.readFileSync('server-game/current/app.js','utf8');
function extract(text,start,end){
  const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Extract shipped source '+start);return text.slice(a,b);
}
const pirate=extract(village,'  function syncPirateNominationFlag(){','  function makePlayerButton(');
const fire=extract(source,'function gmwwPlaceWolfMenuAtFire(menu){','\nfunction demoTurnDescription(');
const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
 <body style="margin:0;height:100dvh"><div id="stage" style="width:390px;height:844px;position:relative">
 <div class="play-village-core" style="position:absolute;left:45%;top:48%"><button class="play-core-pearl" style="width:44px;height:44px">🔥</button></div>
 <div id="playBattleDock" style="position:absolute;bottom:0;left:0;width:390px;height:70px">
 <div id="battleWolfMenu" style="position:absolute;width:188px;height:172px;background:#174e64;color:white;padding:6px;box-sizing:border-box">GM</div></div>
 <div id="players"><div class="player" data-player-id="member:player2" style="position:fixed;left:195px;top:230px;width:85px;height:95px;background:#5a7"></div>
 <div class="player" data-player-id="member:player1" style="position:fixed;left:50px;top:230px;width:85px;height:95px;background:#bb9"></div></div>
 </div></body></html>`;
 await page.route('https://v3189.qa.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.goto('https://v3189.qa.test/');
 await page.addScriptTag({content:`
  window.__messages=[];
  window.addEventListener('message',event=>window.__messages.push(event.data));
  const embedded=true;
  const stageElement=document.getElementById('stage'),layout={fire:{x:50,y:50}};
  const screenPoint=point=>point;
  let setupState={gallowsCanNominate:true,viewerParticipantId:'member:player1',gallowsEligibleTargets:['player2']};
  ${pirate}
  function battleTargetClampPosition(w,h,left,top){
    return {left:Math.max(8,Math.min(innerWidth-w-8,left)),top:Math.max(8,Math.min(innerHeight-h-8,top))};
  }
  ${fire}
  window.__qa={syncPirateNominationFlag,gmwwPlaceWolfMenuAtFire,
    eligible(v){setupState.gallowsCanNominate=v;syncPirateNominationFlag()}};
  syncPirateNominationFlag();`});
 const flag=page.locator('#gmwwPirateNominate');
 assert.equal(await flag.isVisible(),true,'🚩 displayed to eligible Player');
 const pulse=async (x,y,id)=>{
   await flag.dispatchEvent('pointerdown',{pointerId:id,button:0,clientX:350,clientY:700});
   await flag.dispatchEvent('pointerup',{pointerId:id,button:0,clientX:x,clientY:y});
 };
 await pulse(195,422,1);await pulse(195,422,2);
 await page.waitForFunction(()=>__messages.some(m=>m.type==='gmww:gallows-open-nominations'));
 assert.equal(await page.evaluate(()=>__messages.filter(m=>m.type==='gmww:gallows-open-nominations').length),1,'double tap opens list once');
 await flag.dispatchEvent('pointerdown',{pointerId:3,button:0,clientX:195,clientY:422});
 await flag.dispatchEvent('pointermove',{pointerId:3,button:0,clientX:237,clientY:277});
 await flag.dispatchEvent('pointerup',{pointerId:3,button:0,clientX:237,clientY:277});
 await page.waitForFunction(()=>__messages.some(m=>m.type==='gmww:gallows-preview-nominate'));
 assert.equal(await page.evaluate(()=>__messages.find(m=>m.type==='gmww:gallows-preview-nominate')?.participantId),'player2');
 await page.locator('#gmwwPirateConfirm [data-gallows-ok]').click();
 await page.waitForFunction(()=>__messages.some(m=>m.type==='gmww:gallows-confirm-nominate'));
 assert.equal(await page.evaluate(()=>__messages.find(m=>m.type==='gmww:gallows-confirm-nominate')?.participantId),'player2');
 await page.evaluate(()=>__qa.eligible(false));
 assert.equal(await flag.isVisible(),false,'ineligible Player must not see pirate flag');
 await page.evaluate(()=>__qa.eligible(true));

 for(const spot of [{x:75,y:145},{x:220,y:430},{x:285,y:630}]){
   const result=await page.evaluate(({x,y})=>{
     const core=document.querySelector('.play-village-core');core.style.left=x+'px';core.style.top=y+'px';
     const menu=document.getElementById('battleWolfMenu');
     if(!__qa.gmwwPlaceWolfMenuAtFire(menu))throw Error('Menu was not placed');
     const a=document.querySelector('.play-core-pearl').getBoundingClientRect(),b=menu.getBoundingClientRect();
     const hit=b.left<a.right&&b.right>a.left&&b.top<a.bottom&&b.bottom>a.top;
     const gapX=Math.max(0,b.left-a.right,a.left-b.right),gapY=Math.max(0,b.top-a.bottom,a.top-b.bottom);
     return {hit,gap:Math.hypot(gapX,gapY),within:b.left>=0&&b.top>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1};
   },spot);
   assert.equal(result.hit,false,'GM menu cannot obscure calibrated 🔥 at '+JSON.stringify(spot));
   assert.equal(result.within,true,'GM menu must fit phone viewport');
   assert.ok(result.gap<40,'GM menu must stay close to flame: '+JSON.stringify(result));
 }
 await page.screenshot({path:'/tmp/gmww-v3189-iphone-pirate-fire.png'});
 console.log('PASS V3.189 WebKit: pirate drag/double-tap, alive gate, dynamic 3-scene campfire positioning');
}finally{await browser.close()}
