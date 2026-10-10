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
       const describe=id=>{const el=document.querySelector(id);return el?{hidden:el.hidden,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,cls:el.className}:null};
       return {path:location.pathname,game:describe('#game'),dock:describe('#gmwwPlayerPrivateDock'),role:describe('#gmwwPlayerPrivateDock button[data-private-card="role"]'),login:describe('#login'),screens:[...document.querySelectorAll('.screen.active')].map(e=>e.id),version:document.documentElement.dataset.gmwwMembersVersion||null};
     }).catch(()=>({error:'page closed'}));
     const privateData=await request('/api/rooms/'+room.roomCode+'/me',{token:s.token}).catch(err=>({error:String(err.message)}));
     throw new Error('role back not visible '+JSON.stringify({debug,receipt:{phase:privateData?.room?.phase,roleId:privateData?.role?.roleId,artifactId:privateData?.artifact?.artifactId,manifest:privateData?.deliveryManifest}})+'; '+e.message);
   }
   await role.click({timeout:10000});
   const face=page.locator('#gmwwPlayerUnifiedCard:not([hidden])');
   await face.waitFor({state:'visible',timeout:15000});
   const roleTitle=(await face.locator('.gmww-card-title').innerText()).toLocaleLowerCase('vi-VN');
   assert.ok(roleTitle.includes(('Vai '+s.kind).toLocaleLowerCase('vi-VN')),'incorrect role card face '+roleTitle);
   // The canonical full-face should close when the player taps outside.
   await page.mouse.click(7,7);await face.waitFor({state:'hidden',timeout:10000});
   const artifact=page.locator('#gmwwPlayerPrivateDock button[data-private-card="artifact"]');
   if(i<3){
     await artifact.waitFor({state:'visible',timeout:10000});
     await artifact.click({position:{x:60,y:65},timeout:10000});
     await face.waitFor({state:'visible',timeout:10000});
     const artTitle=(await face.locator('.gmww-card-title').innerText()).toLocaleLowerCase('vi-VN');
     assert.ok(artTitle.includes(('Bảo Vật '+s.kind).toLocaleLowerCase('vi-VN')),'incorrect Artifact face '+artTitle);
     await page.mouse.click(7,7);await face.waitFor({state:'hidden',timeout:10000});
   }else assert.equal(await artifact.isVisible(),false,'no-Artifact game must not show Artifact button');
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
