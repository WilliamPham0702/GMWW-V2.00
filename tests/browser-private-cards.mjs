// Actual browser presentation smoke. Run only after the local Worker is ready:
// node tests/browser-private-cards.mjs
// Uses Google Chrome, Microsoft Edge and Playwright WebKit (Safari engine).
// WebKit on Linux is not a substitute for a physical iPhone Safari acceptance test.
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';

const origin=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
const mark=Date.now().toString(36).slice(-7);
async function request(path,{method='GET',body,token}={}){
 const res=await fetch(origin+path,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await res.json().catch(()=>null);if(!res.ok||!d?.ok)throw new Error(method+' '+path+' => '+res.status+' '+JSON.stringify(d));
 return d;
}
const room=await request('/api/rooms',{method:'POST',body:{roomName:'Browser Cards '+mark}});
const sessions=[
 {kind:'Chrome',id:'cichrome'+mark,launch:()=>chromium.launch({channel:'chrome',headless:true})},
 {kind:'Edge',id:'ciedge'+mark,launch:()=>chromium.launch({channel:'msedge',headless:true})},
 {kind:'WebKit',id:'ciwebkit'+mark,launch:()=>webkit.launch({headless:true})}
];
for(const [i,s] of sessions.entries()){
 await request('/api/members/register',{method:'POST',body:{loginId:s.id,displayName:'CI '+s.kind,gameCharacterId:'character-0'+(i+1)}});
 const login=await request('/api/members/login',{method:'POST',body:{loginId:s.id}});
 s.token=login.token;s.member=login.member;
 assert.ok(s.token,'expected a private bearer token');
 await request('/api/rooms/'+room.roomCode+'/join',{method:'POST',body:{token:s.token}});
}
const assignments=sessions.map((s,i)=>({loginId:s.id,roleId:'role-browser-'+i,roleName:'Vai '+s.kind,
 roleCard:{name:'Vai '+s.kind,faction:'Phe Dân',information:'Vai Trò riêng cho '+s.kind},
 ...(i<3?{artifact:{artifactId:'artifact-browser-'+i,artifactCard:{name:'Bảo Vật '+s.kind,information:'Artifact riêng cho '+s.kind}}}:{})
}));
await request('/api/gm/rooms/'+room.roomCode+'/assignments',{method:'POST',token:room.gmToken,
 body:{matchId:'browser-'+mark,matchRevision:1,deliveryVersion:1,assignments,multiAssign:false}});
for(const [i,s] of sessions.entries()){
 let browser,context,page;const errors=[];
 try{
   browser=await s.launch();
   context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
   await context.addInitScript(data=>{
     localStorage.setItem('gmww_token',data.token);
     localStorage.setItem('gmww_member',JSON.stringify(data.member));
     localStorage.setItem('gmww_active_room_v4',JSON.stringify({roomCode:data.code,participantId:'member:'+data.loginId,savedAt:Date.now()}));
   },{token:s.token,member:s.member,code:room.roomCode,loginId:s.id});
   page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/'+room.roomCode,{waitUntil:'domcontentloaded',timeout:35000});
   const role=page.locator('#gmwwPlayerPrivateDock button[data-private-card="role"]');
   try{await role.waitFor({state:'visible',timeout:22000})}
   catch(e){
     const debug=await page.evaluate(()=>{
       const describe=id=>{const el=document.querySelector(id);return el?{hidden:el.hidden,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,cls:el.className,deliveryState:el.dataset.deliveryState||'',privateCardView:el.dataset.privateCardView||'',focus:el.dataset.privateCardFocus||''}:null};
       return {path:location.pathname,game:describe('#game'),dock:describe('#gmwwPlayerPrivateDock'),role:describe('#gmwwPlayerPrivateDock button[data-private-card="role"]'),login:describe('#login'),screens:[...document.querySelectorAll('.screen.active')].map(e=>e.id),version:document.documentElement.dataset.gmwwMembersVersion||null};
     }).catch(()=>({error:'page closed'}));
     const privateData=await request('/api/rooms/'+room.roomCode+'/me',{token:s.token}).catch(err=>({error:String(err.message)}));
     throw new Error('role back not visible '+JSON.stringify({debug,receipt:{phase:privateData?.room?.phase,roleId:privateData?.role?.roleId,artifactId:privateData?.artifact?.artifactId,manifest:privateData?.deliveryManifest}})+'; '+e.message);
   }
   const deck=page.locator('#gmwwPlayerPrivateDock');
   assert.equal(await deck.locator('[data-shuffle-deck], .gmww-deck-shuffle').count(),0,'no dedicated shuffle button');
   assert.equal(await deck.getAttribute('data-deck-top'),'role','new Role starts above Artifact');
   await role.click({timeout:10000});
   const face=page.locator('#gmwwPlayerUnifiedCard:not([hidden])');
   await face.waitFor({state:'visible',timeout:15000});
   const roleTitle=(await face.locator('.gmww-card-title').innerText()).toLocaleLowerCase('vi-VN');
   assert.ok(roleTitle.includes(('Vai '+s.kind).toLocaleLowerCase('vi-VN')),'incorrect Role face '+roleTitle);
   // Tapping the full card closes it; the viewed Role automatically sinks.
   await face.click({position:{x:35,y:35},timeout:10000});
   await face.waitFor({state:'hidden',timeout:10000});
   assert.equal(await deck.getAttribute('data-deck-top'),'artifact','viewed Role automatically goes below Artifact');
   // Each visible rear-card edge is independently clickable and brings the selected card forward.
   await role.click({timeout:10000});
   await face.waitFor({state:'visible',timeout:10000});
   assert.equal(await deck.getAttribute('data-deck-top'),'role','tapping lower Role raises it above Artifact');
   await page.mouse.click(7,7);
   await face.waitFor({state:'hidden',timeout:10000});
   assert.equal(await deck.getAttribute('data-deck-top'),'artifact','Role returns below after viewing');
   const actionPanel=page.locator('#gmwwArtifactBar');
   if(await actionPanel.count())assert.equal(await actionPanel.evaluate(el=>getComputedStyle(el).display),'none','offline Player must hide Artifact controls');
   const artifact=deck.locator('button[data-private-card="artifact"]');
   await artifact.waitFor({state:'visible',timeout:10000});
   await artifact.click({position:{x:60,y:65},timeout:10000});
   await face.waitFor({state:'visible',timeout:10000});
   assert.equal(await deck.getAttribute('data-deck-top'),'artifact','Artifact selected is now top');
   const artTitle=(await face.locator('.gmww-card-title').innerText()).toLocaleLowerCase('vi-VN');
   assert.ok(artTitle.includes(('Bảo Vật '+s.kind).toLocaleLowerCase('vi-VN')),'incorrect Artifact face '+artTitle);
   if(s.kind==='Chrome'){
     // An untouched full card folds itself after 30 seconds for privacy.
     await face.waitFor({state:'hidden',timeout:37000});
     assert.equal(await page.locator('#game').getAttribute('data-private-card-view'),'closed');
   }else if(s.kind==='Edge'){
     await face.click({position:{x:35,y:35},timeout:10000});
     await face.waitFor({state:'hidden',timeout:10000});
   }else{
     await page.mouse.click(7,7);
     await face.waitFor({state:'hidden',timeout:10000});
   }
   let received;
   for(let attempt=0;attempt<24;attempt++){
     received=await request('/api/rooms/'+room.roomCode+'/me',{token:s.token});
     if(received.deliveryManifest.receivedAt)break;
     await new Promise(resolve=>setTimeout(resolve,250));
   }
   assert.ok(received?.deliveryManifest?.receivedAt,'browser should eventually confirm full private receipt');
   console.log(JSON.stringify({browser:s.kind,success:true,role:roleTitle,artifact:'opened'}));
 }catch(error){
   if(page)try{await page.screenshot({path:'/tmp/gmww-player-cards-'+s.kind.toLowerCase()+'.png',fullPage:true})}catch{}
   throw new Error('Browser '+s.kind+' failed: '+error.message+'; page errors='+JSON.stringify(errors));
 }finally{
   if(context)await context.close().catch(()=>{});
   if(browser)await browser.close().catch(()=>{});
 }
}
console.log('All Chrome / Edge / WebKit private-card opens passed');
