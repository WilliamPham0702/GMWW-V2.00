// GĐ16: real Core STAGING accepts a CUSTOM role and its assigned Artifact.
// This test creates its OWN isolated room and player records in Stage14 Worker ONLY.
// Never executes against Production. Player viewer cannot read private action/target details.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
assert.equal(new URL(base).hostname,'gmww-arena3d-stage14-staging.williampham0702.workers.dev');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
try{
 const gm=await ctx.newPage(),viewer=await ctx.newPage(),errors=[];
 for(const page of [gm,viewer])page.on('pageerror',e=>errors.push(String(e.message)));
 await gm.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:60000});
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null,{timeout:45000});
 await gm.locator('#create').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='authorized',null,{timeout:35000});
 const room=await gm.locator('#room').inputValue();
 await viewer.goto(base+'/village/arena-3d/live.html?room='+room,{waitUntil:'domcontentloaded',timeout:60000});
 await viewer.waitForFunction(room=>window.__GMWW_ARENA_STAGE_READONLY?.().room===room,room,{timeout:25000});
 const denied=await viewer.evaluate(async room=>(await fetch('/api/arena-staging/rooms/'+room+'/gm-visuals')).status,room);
 assert.equal(denied,401);
 await gm.locator('#seed').click();
 await gm.waitForFunction(()=>document.getElementById('log')?.textContent?.includes('Đã bổ sung'),null,{timeout:60000});
 await gm.locator('#lock').click();
 await gm.waitForFunction(()=>document.getElementById('log')?.textContent?.includes('Đã khóa Seat'),null,{timeout:20000});
 const result=await gm.evaluate(async room=>{
  const token=document.getElementById('gm-key').value;
  const headers={Authorization:'Bearer '+token,'content-type':'application/json'};
  const people=(await (await fetch('/api/rooms/'+room,{cache:'no-store'})).json()).players
    .filter(x=>String(x.id||x.participantId||'').startsWith('member:'))
    .sort((a,b)=>a.seatId-b.seatId);
  if(people.length!==6)throw Error('INVALID_STAGING_ROSTER:'+people.length);
  const ids=people.map(x=>String(x.id||x.participantId).slice(7));
  const matchId='arena-'+crypto.randomUUID(),roleId='role_arena_tide',actionId='action_arena_tide_barrier',
    artifactId='artifact_arena_pearl',artifactAction='action_arena_pearl_bloom';
  const call=async(path,body)=>{
   const res=await fetch('/api/gm/rooms/'+room+'/'+path,{method:'POST',headers,body:JSON.stringify(body)});
   const data=await res.json();if(!res.ok||!data.ok)throw Error(path+':'+JSON.stringify({status:res.status,error:data.error,message:data.message}));
   return data;
  };
  const config={id:'arena-custom-e2e',name:'Arena 3D thử vai trò tùy chỉnh',
   playerCount:6,artifactsEnabled:true,
   roles:[{roleId,roleName:'Pháp Sư Thủy Triều',faction:'village',order:1,count:1,actionDurationSec:55},
    {roleId:'role_villager',roleName:'Dân Làng',faction:'village',order:2,count:5,actionDurationSec:0}],
   artifacts:[{artifactId,artifactName:'Ngọc Trai',order:1,count:1}],
   timing:{autoAdvance:false,defaultActionSec:55,wolfDiscussionSec:0,
    gallowsNominationSec:45,gallowsVoteSec:45}};
  const fn={id:'fn_arena_tide_barrier',actionId,phase:'night',usageMode:'eachNight',usageCount:1,
   targetCount:2,noSelf:true,passive:false,effectIds:['effect_protected']};
  const afn={id:artifactAction,actionId:artifactAction,phase:'night',targetCount:1,
   noSelf:true,passive:false,effectIds:['effect_revive']};
  const assignment=ids.map((loginId,i)=>({
   loginId,roleId:i===0?roleId:'role_villager',roleName:i===0?'Pháp Sư Thủy Triều':'Dân Làng',
   faction:'village',order:i===0?1:2,roleCard:i===0?
     {name:'Pháp Sư Thủy Triều',faction:'village',functions:[fn],actions:[fn]}:
     {name:'Dân Làng',faction:'village',functions:[],actions:[]},
   ...(i===0?{artifact:{artifactId,artifactName:'Ngọc Trai',artifactCard:{
      name:'Ngọc Trai',functions:[afn],actions:[afn],singleUse:false,priorityFirst:false
   }}}:{})
  }));
  await call('config',{gameConfig:config,matchId,matchRevision:1});
  await call('assignments',{assignments:assignment,matchId,matchRevision:1});
  await call('start',{matchId,matchRevision:1});
  await call('cycle',{phase:'night',night:1,cycleKey:'night-1',source:'gm'});
  const getVisual=async()=>{
   const res=await fetch('/api/arena-staging/rooms/'+room+'/gm-visuals',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(!res.ok)throw Error('private-'+res.status);return res.json();
  };
  let visual=await getVisual(),turns=0;
  while(turns<12&&!(visual.nightControl?.actorIds||[]).includes('member:'+ids[0])){
   if(!visual.nightControl?.turnId)throw Error('CUSTOM_CORE_TURN_NOT_FOUND');
   await call('turn',{action:'next',source:'gm',expectedTurnId:visual.nightControl.turnId});
   visual=await getVisual();turns++;
  }
  if(!(visual.nightControl?.actorIds||[]).includes('member:'+ids[0]))throw Error('CUSTOM_CORE_TURN_NOT_REACHED');
  const turnId=visual.nightControl.turnId;
  const roleAck=await call('battle-action',{
   matchId,cycleKey:'night-1',turnId,actorId:ids[0],targetIds:[ids[1],ids[2]],
   type:'effect_notice',actionId,clientEventId:'arena-role-'+crypto.randomUUID()
  });
  const roleCast=(await getVisual()).casting?.cast||null;
  let artifactAck=null,artifactCast=null,artifactError=null;
  try{
   artifactAck=await call('battle-action',{
    matchId,cycleKey:'night-1',turnId,actorId:ids[0],targetIds:[ids[3]],
    type:'effect_notice',actionId:artifactAction,artifactId,
    clientEventId:'arena-artifact-'+crypto.randomUUID()
   });
   artifactCast=(await getVisual()).casting?.cast||null;
  }catch(error){artifactError=String(error.message||error)}
  await call('end',{matchId,winnerFaction:'village',winner:'Dân Làng'});
  return {ids,turns,roleAck:roleAck.ok,roleCast,artifactAck:artifactAck?.ok||false,artifactCast,artifactError};
 },room);
 assert.equal(result.roleAck,true);
 assert.deepEqual(result.roleCast?.targetIds?.length,2);
 assert.equal(result.roleCast?.actionId,'action_arena_tide_barrier');
 assert.equal(result.roleCast?.visualFamily,'shield');
 assert.equal(result.roleCast?.roleId,'role_arena_tide');
 assert.equal(result.artifactAck,true,result.artifactError||'Core must accept assigned custom Artifact');
 assert.equal(result.artifactCast?.actionId,'action_arena_pearl_bloom');
 assert.equal(result.artifactCast?.visualFamily,'heal');
 assert.equal(result.artifactCast?.targetIds?.length,1);
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 assert.deepEqual(errors,[]);
 console.log('STAGE16_DYNAMIC_CORE_PASS',JSON.stringify({room,
  role:result.roleCast?.actionId,roleFamily:result.roleCast?.visualFamily,
  artifact:result.artifactCast?.actionId,artifactFamily:result.artifactCast?.visualFamily,
  targetsRole:result.roleCast?.targetIds?.length,targetsArtifact:result.artifactCast?.targetIds?.length,
  viewerDenied:denied,production:false,physicalIphone:false}));
}finally{await ctx.close();await browser.close()}
