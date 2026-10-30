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
  // This test verifies room/Role/Artifact/vote sync, not unrelated roaming motion.
  const profile=await api('/api/members/profile',{method:'POST',token:s.token,body:{lobbyMotionEnabled:false}});
  s.member=profile.member;
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
   }else if(location.pathname.startsWith('/village/')){
    // Only test instrumentation: read public messages inside the real iframe.
    window.__p0RoomFrames=[];
    window.addEventListener('message',event=>{
      if(event.origin===location.origin&&event.data?.type==='gmww:village-state'){
        window.__p0RoomFrames.push({at:Date.now(),players:(event.data.players||[]).map(p=>({id:p.participantId,name:p.displayName,seatId:p.seatId,kind:p.kind}))});
        if(window.__p0RoomFrames.length>8)window.__p0RoomFrames.shift();
      }
    },true);
   }
  },{token:s.token,member:s.member,roomCode:code,loginId:s.loginId});
  const page=await context.newPage();
  s.errors=[];s.privateReads=[];page.on('pageerror',error=>{s.errors.push(error.message);console.error(s.name+' PAGE ERROR: '+error.stack)});
  page.on('console',msg=>{if(['warning','error'].includes(msg.type())&&msg.text().includes('[GMWW'))console.error(s.name+' '+msg.text())});
  page.on('requestfailed',req=>{if(req.url().includes('/api/rooms/'))s.privateReads.push({event:'requestfailed',url:new URL(req.url()).pathname,error:req.failure()?.errorText})});
  page.on('response',res=>{if(res.url().includes('/api/rooms/')&&res.url().endsWith('/me')){
    s.privateReads.push({event:'private-me',status:res.status(),url:new URL(res.url()).pathname,at:Date.now()});
    if(s.privateReads.length>40)s.privateReads.shift();
  }});
  await page.goto(origin+'/'+code,{waitUntil:'domcontentloaded',timeout:35000});
  await page.locator('#gmwwVillageFrame').waitFor({state:'attached',timeout:25000});
  opened.push({browser,context,page,s});
 }
 // The iframe paints real Character nodes: verify the visible team, not an
 // instrumentation message which may be installed after the first frame update.
 const roster=page=>page.frameLocator('#gmwwVillageFrame').locator('button.player:not(.gm) .name-text').allInnerTexts();
 async function expectTeam(page,label,timeout=25000){
  let names=[];
  for(let attempt=0;attempt<Math.ceil(timeout/250);attempt++){
    names=await roster(page);
    if(names.includes('P0 Chrome')&&names.includes('P0 Edge'))return names;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  const live=await api('/api/rooms/'+code).catch(error=>({error:String(error)}));
  const browser=await page.evaluate(()=>({
   url:location.href,
   visible:document.visibilityState,
   scene:document.querySelector('#gmwwVillageFrame')?.getAttribute('src')||'',
   activeScreens:[...document.querySelectorAll('.screen.active')].map(el=>el.id)
  })).catch(error=>({error:String(error)}));
  const iframe=await page.frameLocator('#gmwwVillageFrame').locator('html').evaluate(el=>({
    lastFrames:window.__p0RoomFrames||[],
    rendered:[...document.querySelectorAll('button.player')].map(b=>({name:b.querySelector('.name-text')?.textContent,classes:b.className,seatId:b.dataset.seatId})),
    roster:[...document.querySelectorAll('#roster span')].map(x=>x.textContent),
    count:document.querySelector('#count')?.textContent,
    metrics:window.GMWWVillageRenderMetrics||null
  })).catch(error=>({error:String(error)}));
  throw Error(label+' did not show both Chrome and Edge Characters: '+
   JSON.stringify({errors:opened.find(x=>x.page===page)?.s.errors,rendered:names,server:live?.players?.map(p=>({id:p.participantId,name:p.displayName,seatId:p.seatId,kind:p.kind}))||[],browser,iframe}));
 }
 for(const {page,s} of opened){
  const names=await expectTeam(page,s.name+' lobby');
  assert.equal(names.length,2,s.name+' lobby must show both players');
 }
 const match='p0-match-'+id;
 const assignments=sessions.map((s,i)=>({loginId:s.loginId,roleId:'role-p0-'+i,roleName:'Vai '+s.name,
  roleCard:{name:'Vai '+s.name,faction:'Phe Dân',information:'Private card during realtime release'},
  artifact:{artifactId:'artifact-p0-'+i,artifactCard:{name:'Bảo Vật '+s.name,information:'Realtime private artifact'}}
 }));
 // GM sends cards while BOTH browsers are already in the lobby.
 // Online UI uses the single miniature card dock, not the removed legacy private dock.
 await gm('/assignments',{matchId:match,matchRevision:1,deliveryVersion:1,assignments,multiAssign:false});
 for(const {page,s} of opened){
  const role=page.locator('#gmwwPlayerMiniCards [data-mini="role"]');
  try{await role.waitFor({state:'visible',timeout:20000})}
  catch(error){
    const receipt=await api('/api/rooms/'+code+'/me',{token:s.token}).catch(e=>({error:String(e)}));
    const client=await page.evaluate(()=>{
      const dock=document.querySelector('#gmwwPlayerPrivateDock'),button=dock?.querySelector('[data-private-card="role"]'),game=document.querySelector('#game');
      return {dockHidden:dock?.hidden,deliveryState:dock?.dataset.deliveryState,
        roleHidden:button?.hidden,roleDisplay:button?getComputedStyle(button).display:null,
        activeScreen:[...document.querySelectorAll('.screen.active')].map(x=>x.id),
        scene:game?.dataset.gmwwPlayerScene,privateCardView:game?.dataset.privateCardView,
        localToken:!!localStorage.getItem('gmww_token'),activeRoom:localStorage.getItem('gmww_active_room_v4')?.slice(0,100)}
    }).catch(e=>({error:String(e)}));
    throw Error(s.name+' live GM role release failed: '+JSON.stringify({
      server:{phase:receipt?.room?.phase,matchId:receipt?.room?.matchId,roleId:receipt?.role?.roleId,
        roleCount:receipt?.deliveryManifest?.roleCount,deliveryVersion:receipt?.room?.deliveryVersion},client,
      privateReads:s.privateReads.slice(-30),browserErrors:s.errors.slice(-12),
      original:String(error)}));
  }
  await role.click({timeout:10000});
  const face=page.locator('#gmwwPlayerUnifiedCard:not([hidden])');
  await face.waitFor({state:'visible',timeout:10000});
  assert.match(await face.locator('.gmww-card-title').innerText(),new RegExp(s.name,'i'));
  await face.click({position:{x:35,y:35}});
  await face.waitFor({state:'hidden',timeout:10000});
  const artifact=page.locator('#gmwwPlayerMiniCards [data-mini="artifact"]');
  await artifact.waitFor({state:'visible',timeout:10000});
  await artifact.click({timeout:10000});
  await face.waitFor({state:'visible',timeout:10000});
  assert.equal((await face.locator('.gmww-card-title').innerText()).toLocaleUpperCase('vi'),('Bảo Vật '+s.name).toLocaleUpperCase('vi'));
  await face.click({position:{x:35,y:35}});
  await face.waitFor({state:'hidden',timeout:10000});
  assert.equal((await roster(page)).length,2,'opening Role/Artifact cannot collapse roster');
 }
 await gm('/start',{matchId:match});
 await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'});
 await gm('/gallows',{command:'open'});
 for(const {page,s} of opened){
  await page.frameLocator('#gmwwVillageFrame').locator('#gmwwPirateNominate').waitFor({state:'visible',timeout:20000});
  assert.equal((await roster(page)).length,2,s.name+' roster intact during nomination');
 }
 const first=opened[0].page;
 await first.frameLocator('#gmwwVillageFrame').locator('#gmwwPirateNominate').press('Enter');
 await first.locator('#gmwwGallowsPlayer [data-gallows-nominee="'+sessions[1].loginId+'"]').click();
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
  await page.locator('#gmwwPlayerMiniCards [data-mini="role"]').waitFor({state:'visible',timeout:22000});
  await expectTeam(page,s.name+' reload',22000);
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
