// Actual Chrome/Edge browser acceptance for GM -> Player without refresh.
// Invoked with local wrangler already running on GMWW_TEST_URL.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
const id='p0'+Date.now().toString(36).slice(-7);
async function api(path,{method='GET',body,token}={}){
 const r=await fetch(origin+path,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const d=await r.json().catch(()=>null);
 if(!r.ok||!d?.ok)throw Error(method+' '+path+': HTTP '+r.status+' '+JSON.stringify(d));
 return d;
}
const room=await api('/api/rooms',{method:'POST',body:{roomName:'P0 live Chrome Edge '+id}});
const code=room.roomCode,gm=(endpoint,body)=>api('/api/gm/rooms/'+code+endpoint,{method:body?'POST':'GET',body,token:room.gmToken});
const sessions=[
 {name:'Chrome',loginId:id+'c',channel:'chrome'},
 {name:'Edge',loginId:id+'e',channel:'msedge'}
];
const opened=[];
try{
 for(const [i,s] of sessions.entries()){
  await api('/api/members/register',{method:'POST',body:{loginId:s.loginId,displayName:'P0 '+s.name,gameCharacterId:'character-0'+(i+1)}});
  const auth=await api('/api/members/login',{method:'POST',body:{loginId:s.loginId}});
  s.token=auth.token;s.member=auth.member;
  await api('/api/rooms/'+code+'/join',{method:'POST',body:{token:s.token}});
 }
 for(const s of sessions){
  const browser=await chromium.launch({channel:s.channel,headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.addInitScript((data)=>{
   if(window.top===window){
    localStorage.setItem('gmww_token',data.token);
    localStorage.setItem('gmww_member',JSON.stringify(data.member));
    localStorage.setItem('gmww_active_room_v4',JSON.stringify({roomCode:data.roomCode,participantId:'member:'+data.loginId,savedAt:Date.now()}));
   }
   window.addEventListener('message',event=>{
    if(event.data?.type==='gmww:village-state'&&Array.isArray(event.data.players))
     window.__gmwwCiVisiblePlayers=event.data.players.map(p=>p.loginId||p.participantId||p.displayName);
   },true);
  },{token:s.token,member:s.member,roomCode:code,loginId:s.loginId});
  const page=await context.newPage();
  s.errors=[];page.on('pageerror',error=>s.errors.push(error.message));
  await page.goto(origin+'/'+code,{waitUntil:'domcontentloaded',timeout:35000});
  await page.locator('#gmwwVillageFrame').waitFor({state:'attached',timeout:25000});
  opened.push({browser,context,page,s});
 }
 const roster=async(page)=>page.evaluate(()=>{
   const frame=document.querySelector('#gmwwVillageFrame')?.contentWindow;
   return frame?.__gmwwCiVisiblePlayers||[];
 });
 for(const {page,s} of opened){
  await page.waitForFunction(()=>document.querySelector('#gmwwVillageFrame')?.contentWindow?.__gmwwCiVisiblePlayers?.length>=2,null,{timeout:25000});
  assert.equal((await roster(page)).length,2,s.name+' lobby must show both players');
 }
 const match='p0-match-'+id;
 const assignments=sessions.map((s,i)=>({loginId:s.loginId,roleId:'role-p0-'+i,roleName:'Vai '+s.name,
  roleCard:{name:'Vai '+s.name,faction:'Phe Dân',information:'Private card during realtime release'},
  artifact:{artifactId:'artifact-p0-'+i,artifactCard:{name:'Bảo Vật '+s.name,information:'Realtime private artifact'}}
 }));
 // GM sends cards while BOTH browsers are already in the lobby.
 await gm('/assignments',{matchId:match,matchRevision:1,deliveryVersion:1,assignments,multiAssign:false});
 for(const {page,s} of opened){
  const role=page.locator('#gmwwPlayerPrivateDock [data-private-card="role"]');
  await role.waitFor({state:'visible',timeout:25000});
  await role.click({timeout:10000});
  const face=page.locator('#gmwwPlayerUnifiedCard:not([hidden])');
  await face.waitFor({state:'visible',timeout:10000});
  assert.match(await face.locator('.gmww-card-title').innerText(),new RegExp(s.name,'i'));
  await face.click({position:{x:35,y:35}});
  await face.waitFor({state:'hidden',timeout:10000});
  const artifact=page.locator('#gmwwPlayerPrivateDock [data-private-card="artifact"]');
  await artifact.waitFor({state:'visible',timeout:10000});
  await artifact.click({timeout:10000});
  await face.waitFor({state:'visible',timeout:10000});
  assert.match(await face.locator('.gmww-card-title').innerText(),/Bảo Vật/);
  await face.click({position:{x:35,y:35}});
  await face.waitFor({state:'hidden',timeout:10000});
  assert.equal((await roster(page)).length,2,'opening Role/Artifact cannot collapse roster');
 }
 await gm('/start',{matchId:match});
 await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'});
 await gm('/gallows',{command:'open'});
 for(const {page,s} of opened){
  await page.locator('#gmwwGallowsOpenNomination').waitFor({state:'visible',timeout:20000});
  assert.equal((await roster(page)).length,2,s.name+' roster intact during nomination');
 }
 const first=opened[0].page;
 await first.locator('#gmwwGallowsOpenNomination').click();
 await first.locator('#gmwwGallowsNominee').selectOption(sessions[1].loginId);
 await first.locator('#gmwwGallowsNominate').click();
 const poll=async(pred,desc)=>{
  for(let n=0;n<40;n++){
   const d=await gm('');
   if(pred(d.gallows||{}))return d;
   await new Promise(done=>setTimeout(done,150));
  }
  throw Error('Timeout confirming '+desc);
 };
 await poll(g=>g.nominations?.[sessions[0].loginId]===sessions[1].loginId,'nomination receipt');
 await gm('/gallows',{command:'begin',targetId:sessions[1].loginId});
 for(const {page} of opened)await page.locator('#gmwwGallowsDock [data-gallows-vote="👍"]').waitFor({state:'visible',timeout:15000});
 await opened[0].page.locator('#gmwwGallowsDock [data-gallows-vote="👍"]').click();
 await opened[1].page.locator('#gmwwGallowsDock [data-gallows-vote="👎"]').click();
 const voted=await poll(g=>g.voteTotals?.cast===2,'both votes');
 assert.equal(voted.gallows.voteTotals.save,1);assert.equal(voted.gallows.voteTotals.kill,1);
 // Browser refresh must recover room, role and all members without changing the match.
 for(const {page,s} of opened){
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#gmwwPlayerPrivateDock [data-private-card="role"]').waitFor({state:'visible',timeout:22000});
  await page.waitForFunction(()=>document.querySelector('#gmwwVillageFrame')?.contentWindow?.__gmwwCiVisiblePlayers?.length>=2,null,{timeout:22000});
  assert.equal((await roster(page)).length,2,s.name+' roster survives refresh');
 }
 console.log(JSON.stringify({success:true,case:'GM release -> two live browsers -> nomination -> two votes -> refresh',browsers:sessions.map(s=>s.name)}));
} catch(e){
 for(const {page,s} of opened){
  try{await page.screenshot({path:'/tmp/gmww-player-cards-p0-'+s.name.toLowerCase()+'.png',fullPage:true})}catch{}
 }
 throw e;
} finally{
 for(const {context,browser} of opened.reverse()){
  await context.close().catch(()=>{});await browser.close().catch(()=>{});
 }
}
