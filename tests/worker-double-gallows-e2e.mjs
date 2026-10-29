import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
async function req(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,...await r.json()}}
const ok=d=>{assert.equal(d.ok,true,JSON.stringify(d));return d};
for(const [artifact,demo] of [[false,false],[true,false],[false,true]]){
 const serial=Date.now().toString(36)+(demo?'c':artifact?'b':'a'),ids=[],tokens=[];
 const room=ok(await req('/api/rooms',{roomName:'Double Gallows '+serial,seatCount:8}));
 const gm=(p,b)=>req('/api/gm/rooms/'+room.roomCode+p,b,room.gmToken),matchId='double-'+serial;
 try{
  if(demo)ok(await gm('/room-settings',{demo:true,roomMode:'offline'}));
  for(let i=0;i<6;i++){
   const loginId='d'+i+serial;ids.push(loginId);
   ok(await req('/api/members/register',{loginId,displayName:'D'+i+serial,gameCharacterId:'character-01'}));
   const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);
   ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));ok(await gm('/seat',{loginId,seatId:i+1}));
  }
  const assignments=ids.map((loginId,i)=>{
   const roleId=i===0&&!artifact?'role_judge':i>=4?'role_wolf':'role_villager',card=cards.find(x=>x.id===roleId),art=cards.find(x=>x.id==='artifact_41');
   return {loginId,roleId,roleName:card.name,faction:i>=4?'wolf':'village',roleCard:card,...(i===0&&artifact?{artifact:{artifactId:art.id,artifactName:art.name,singleUse:true,artifactCard:art}}:{})};
  });
  ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));if(demo)ok(await gm('/demo',{command:'stop'}));ok(await gm('/auto',{enabled:false}));
  ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
  const payload={actorId:ids[0],matchId,cycleKey:'morning-1',roleId:artifact?'':'role_judge',artifactId:artifact?'artifact_41':'',actionId:'action-judge-double',targetIds:[],clientEventId:'double-arm'};
  const offered=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[0]));
  assert.ok((demo?offered.demoActions:offered.onlineActions).some(x=>x.actionId==='action-judge-double'));
  ok(await gm('/day-action',payload));assert.equal(ok(await gm('/day-action',payload)).idempotent,true);
  assert.equal((await gm('/cycle',{phase:'night',night:2,cycleKey:'night-2'})).error,'DOUBLE_GALLOWS_PENDING');
  ok(await gm('/gallows',{command:'mode',mode:'gm'}));
  ok(await gm('/gallows',{command:'hang',targetId:ids[1]}));
  const first=ok(await gm('/gallows',{command:'resolve',targetId:ids[1],outcome:'dead'})).gallows;
  const next=ok(await gm('/gallows',{command:'acknowledge',ballotId:first.id})).gallows;
  assert.equal(next.round,2);assert.equal(next.stage,'ready');assert.notEqual(next.id,first.id);
  const retry=ok(await gm('/gallows',{command:'acknowledge',ballotId:first.id}));
  assert.equal(retry.idempotent,true);assert.equal(retry.gallows.id,next.id);
  const restored=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[0]));
  assert.equal(restored.gallows.id,next.id);assert.equal(restored.gallows.eligible.includes(ids[1]),false);
  assert.ok(ok(await gm('')).activeEffects.some(x=>x.loginId===ids[1]&&x.type==='dead'));
  assert.equal((await gm('/cycle',{phase:'night',night:2,cycleKey:'night-2'})).error,'DOUBLE_GALLOWS_PENDING');
  const exhausted=await gm('/day-action',{...payload,clientEventId:'double-again'});
  assert.equal(exhausted.error,artifact?'DAY_ARTIFACT_SINGLE_USE_EXHAUSTED':'DAY_ROLE_QUOTA_REACHED');
  let second;
  if(artifact||demo){
   ok(await gm('/gallows',{command:'mode',mode:'auto'}));
   ok(await gm('/gallows',{command:'set_duration',kind:'both',seconds:1}));
   if(demo)ok(await gm('/demo',{command:'start',speed:2}));else ok(await gm('/auto',{enabled:true}));
   const waitStage=async stage=>{for(let i=0;i<80;i++){const b=ok(await gm('')).gallows;if(b?.stage===stage)return b;await new Promise(r=>setTimeout(r,100))}const state=ok(await gm('')),lease=demo?await gm('/demo',{command:'status'}):{};assert.fail('Second ballot '+JSON.stringify({demo,artifact,expected:stage,actual:state.gallows?.stage,phase:state.room.cyclePhase,clock:lease.clock,reason:lease.reason,error:lease.error}))};
   await waitStage('nominating');
   for(const i of demo?[0,3,4]:[0])ok(await req('/api/rooms/'+room.roomCode+'/gallows',{command:'nominate',targetId:ids[2]},tokens[i]));
   await waitStage('voting');
   for(const i of demo?[0,3,4]:[0])ok(await req('/api/rooms/'+room.roomCode+'/gallows',{command:'vote',choice:'👍'},tokens[i]));
   if(demo){
    let nextNight=false;for(let i=0;i<80;i++){const st=ok(await gm(''));if(st.room.cyclePhase==='night'&&st.room.cycleNight===2){nextNight=true;break}await new Promise(r=>setTimeout(r,100))}
    assert.equal(nextNight,true,'DEMO must complete second vote before advancing Night');
   }else{second=await waitStage('resolved');assert.equal(second.outcome,'alive')}
   if(demo)ok(await gm('/demo',{command:'stop'}));else ok(await gm('/auto',{enabled:false}));
  }else{
   ok(await gm('/gallows',{command:'hang',targetId:ids[2]}));
   second=ok(await gm('/gallows',{command:'resolve',targetId:ids[2],outcome:'alive'})).gallows;
  }
  if(!demo){ok(await gm('/gallows',{command:'acknowledge',ballotId:second.id}));ok(await gm('/cycle',{phase:'night',night:2,cycleKey:'night-2'}))}
 }finally{await gm('/end',{force:true}).catch(()=>{})}
}
console.log('PASS: Judge and Calamity execute two independent Gallows rounds, preserve first death, retry and reconnect safely, enforce quota and block early Night');
