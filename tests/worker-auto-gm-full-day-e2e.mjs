// Actual workerd / Durable Object alarms + public WebSocket acceptance.
// Hard-deny non-loopback hosts; never mutates Production, IPA or real data.
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'LOCAL ONLY');
const t=Date.now().toString(36),events=[];
async function req(path,body,token){
  const resp=await fetch(base+path,{method:body?'POST':'GET',
    headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  const j=await resp.json();assert.equal(j.ok,true,JSON.stringify({path,status:resp.status,data:j}));
  return j;
}
const room=await req('/api/rooms',{roomName:'P0 Auto GM Gallows '+t,roomMode:'online',seatCount:8,
  gameConfig:{name:'P0 Day Sequencer',artifactsEnabled:false,
    roles:[{roleId:'role_seer',order:1},{roleId:'role_guard',order:2},{roleId:'role_villager',order:3}],
    timing:{villageDiscussionSec:2,defaultActionSec:30}}});
const code=room.roomCode,token=room.gmToken,gm=(path,body)=>req('/api/gm/rooms/'+code+path,body,token);
const people=[],firstName=['one','two','three'];
let ws;
async function waitFor(predicate,label,ms=12000){
  const deadline=Date.now()+ms;
  while(Date.now()<deadline){
    const item=events.find(predicate);
    if(item)return item;
    await sleep(50);
  }
  assert.fail('Timed out: '+label+'. stages='+events.filter(x=>x.type==='gallows_updated').map(x=>x.gallows?.stage).join('>'));
}
async function publicRoom(){return(await req('/api/rooms/'+code)).room}
try{
  for(let i=0;i<3;i++){
    const loginId='ag'+i+t;
    await req('/api/members/register',{loginId,displayName:firstName[i]+t,gameCharacterId:'character-01'});
    const member=await req('/api/members/login',{loginId});
    await req('/api/rooms/'+code+'/join',{token:member.token});
    await gm('/seat',{loginId,seatId:i+1});
    people.push({loginId,token:member.token});
  }
  const matchId='p0g-'+t;
  await gm('/assignments',{matchId,deliveryVersion:1,assignments:people.map((p,i)=>({
    loginId:p.loginId,roleId:['role_seer','role_guard','role_villager'][i],
    roleName:firstName[i],roleCard:{name:firstName[i],faction:'Phe Dân',
      functions:[{actionId:i===0?'action_seer':i===1?'action_protect':'inspect',
        usageMode:'eachNight',usageCount:1}]}
  }))});
  await gm('/start',{matchId});
  ws=new WebSocket(base.replace(/^http/,'ws')+'/ws/'+code);
  ws.addEventListener('message',e=>{try{events.push(JSON.parse(String(e.data)))}catch{}});
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('WebSocket open timeout')),8000);
    ws.addEventListener('open',()=>{clearTimeout(timeout);resolve()},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('WebSocket failed'))},{once:true});
  });
  await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'});
  await gm('/gallows',{command:'set_duration',kind:'both',seconds:1});
  await gm('/auto',{enabled:true});
  await waitFor(e=>e.type==='gallows_updated'&&e.gallows?.stage==='nominating','open nominations');
  assert.equal((await publicRoom()).cyclePhase,'morning');
  await req('/api/rooms/'+code+'/gallows',{command:'nominate',targetId:people[1].loginId},people[0].token);
  const selecting=await waitFor(e=>e.type==='gallows_updated'&&e.gallows?.stage==='selecting','close nominations',6000);
  assert.equal(selecting.gallows.candidateId,people[1].loginId,'Unique top nominee');
  assert.equal((await publicRoom()).cyclePhase,'morning','Not allowed to jump to night after nominations');
  const voting=await waitFor(e=>e.type==='gallows_updated'&&e.gallows?.stage==='voting','open voting after selection',7000);
  assert.equal(voting.gallows.candidateId,people[1].loginId);
  assert.equal((await publicRoom()).cyclePhase,'morning');
  await req('/api/rooms/'+code+'/gallows',{command:'vote',choice:'👎'},people[0].token);
  const resolved=await waitFor(e=>e.type==='gallows_updated'&&e.gallows?.stage==='resolved','close voting and verdict',6500);
  assert.equal(resolved.gallows.outcome,'dead');
  assert.equal((await publicRoom()).cyclePhase,'morning','Verdict requires display hold');
  await sleep(1200);
  assert.equal((await publicRoom()).cyclePhase,'morning','Must not skip 30s verdict announcement');
  const until=Date.now()+37000;
  while(Date.now()<until){
    if((await publicRoom()).cyclePhase==='night')break;
    await sleep(300);
  }
  const night=await publicRoom();
  assert.equal(night.cyclePhase,'night','Auto GM advances only AFTER full gallows verdict');
  assert.equal(night.cycleNight,2);
  const stages=events.filter(e=>e.type==='gallows_updated').map(e=>e.gallows?.stage).filter(Boolean);
  const first=stage=>stages.indexOf(stage);
  assert.ok(first('nominating')>=0&&first('selecting')>first('nominating')&&
    first('voting')>first('selecting')&&first('resolved')>first('voting'),
    'Gallows websocket sequence out of order: '+stages.join('>'));
  assert.ok(events.some(e=>e.type==='room_cycle'&&e.phase==='night'&&e.night===2),'Missing night broadcast');
  console.log('PASS P0: discussion > nominations > selection > voting > verdict (30s) > next night, real DO alarm + WebSocket',stages.join('>'));
}finally{
  try{ws?.close()}catch{}
  await gm('/end',{force:true}).catch(()=>{});
}
