// Actual workerd + SQLite Durable Object HTTP/WebSocket acceptance. Local only.
// No VM-extracted methods, storage doubles, synthetic rule oracle or production writes.
import assert from 'node:assert/strict';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
const origin=new URL(base);
assert.ok(['127.0.0.1','localhost','[::1]'].includes(origin.hostname),'Engine acceptance may only mutate a local Worker');
const serial=Date.now().toString(36),checks=[],sockets=[];
async function req(path,{method='GET',body,token}={}){
 const r=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const d=await r.json();return {status:r.status,...d};
}
function ok(d){assert.equal(d.ok,true,JSON.stringify(d));return d;}
const people=['seer','guard','fairy','wolf','witch','alpha','victim'];
const sessions={};let code,gmToken,sequence=0;
const gm=(path,body)=>req('/api/gm/rooms/'+code+path,{method:body?'POST':'GET',body,token:gmToken});
const state=async()=>ok(await gm(''));
const me=async name=>ok(await req('/api/rooms/'+code+'/me',{token:sessions[name].token}));
const id=name=>sessions[name].loginId;
const active=(s,name,type)=>s.activeEffects.filter(x=>x.loginId===id(name)&&x.type===type);
async function cycle(phase,night){return ok(await gm('/cycle',{phase,night,cycleKey:phase+'-'+night}));}
async function jump(name){const s=await state(),targetIndex=s.nightRuntime.queue.findIndex(x=>(x.loginIds||[x.loginId]).includes(id(name)));assert.ok(targetIndex>=0,name+' scheduled');ok(await gm('/turn',{action:'jump',targetIndex}));}
async function action(name,type,actionId,targets,extra={}){
 const s=await state();return gm('/battle-action',{turnId:s.nightRuntime.currentId,actorId:id(name),type,actionId,targetIds:targets.map(id),matchId:s.room.matchId,cycleKey:s.room.cycleKey,night:s.room.cycleNight,clientEventId:'engine-'+(++sequence),...extra});
}
async function manual(name,type,extra={}){return ok(await gm('/interaction',{loginId:id(name),type,...extra}));}
async function connect(participantId){
 const ws=new WebSocket(base.replace(/^http/,'ws')+'/ws/'+code+(participantId?'?participantId='+encodeURIComponent(participantId):''));
 const events=[];ws.addEventListener('message',e=>events.push(JSON.parse(e.data)));sockets.push(ws);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('WebSocket open timeout')),10000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket error'));},{once:true});});
 return events;
}
async function observed(events,predicate){
 const until=Date.now()+10000;
 while(Date.now()<until){if(events.some(predicate))return;await new Promise(r=>setTimeout(r,25));}
 assert.fail('Missing realtime event');
}
try{
 const roles=people.map((name,index)=>({roleId:'test-'+name,order:name==='alpha'?4:index+1}));
 const room=ok(await req('/api/rooms',{method:'POST',body:{roomName:'FAST engine '+serial,seatCount:8,gameConfig:{roles,artifactLimitPerCycle:1,timing:{defaultActionSec:600,wolfDiscussionSec:600,earlyArtifactSec:600}}}}));
 code=room.roomCode;gmToken=room.gmToken;
 for(const [index,name] of people.entries()){
  const loginId='e'+index+serial;
  ok(await req('/api/members/register',{method:'POST',body:{loginId,displayName:name+serial,gameCharacterId:'character-01'}}));
  sessions[name]={loginId,...ok(await req('/api/members/login',{method:'POST',body:{loginId}}))};
  ok(await req('/api/rooms/'+code+'/join',{method:'POST',body:{token:sessions[name].token}}));
  ok(await gm('/seat',{loginId,seatId:index+1}));
 }
 const card=(name)=>({name,flags:{allowMultipleActions:name!=='witch'},functions:[
  {id:'inspect',actionId:'inspect',usageMode:'eachNight',usageCount:1},
  {id:'bite',actionId:'action_wolf_bite',usageMode:'eachNight',usageCount:1},
  {id:'protect',actionId:'action_protect',usageMode:'eachNight',usageCount:1},
  {id:'transfer',actionId:'action_transfer_bite',usageMode:'eachNight',usageCount:1},
  {id:'kill',actionId:'action_witch_kill',usageMode:'eachNight',usageCount:1},
  {id:'revive',actionId:'action_revive',usageMode:'onceGame',usageCount:1}
 ]});
 const assignments=people.map(name=>({loginId:id(name),roleId:'test-'+name,roleName:name,roleCard:card(name),...(name==='seer'?{artifact:{artifactId:'test-mirror',artifactName:'Tráng Gương',priorityFirst:true,singleUse:true,artifactCard:{name:'Tráng Gương',singleUse:true,priorityFirst:true,actions:[{id:'copy',name:'Tráng Gương',targetCount:1,noSelf:true,allowDead:false}]}}}:{})}));
 ok(await gm('/assignments',{assignments,matchId:'engine-'+serial,deliveryVersion:1}));
 const before=await state(),privateBefore=await me('seer');
 ok(await gm('/start',{matchId:'engine-'+serial}));ok(await gm('/auto',{enabled:false}));
 const gmEvents=await connect(),playerEvents=await connect('member:'+id('seer'));
 await cycle('night',1);
 let s=await state();
 const grouped=s.nightRuntime.queue.find(x=>x.kind==='role-group');
 assert.deepEqual([...grouped.loginIds].sort(),[id('wolf'),id('alpha')].sort());
 assert.equal(s.nightRuntime.queue.filter(x=>x.kind==='wolf-introduction').length,1);
 checks.push('same-order roles share actual DO turn');
 // Artifact quota, exact retry, rollback and persisted ownership restoration.
 ok(await gm('/turn',{action:'jump',targetIndex:s.nightRuntime.queue.findIndex(x=>x.kind==='early-artifact-window')}));
 const art=ok(await action('seer','frozen','copy',['victim'],{artifactId:'test-mirror'}));
 assert.equal((await state()).artifactCycle.count,1);
 assert.equal((await me('victim')).effects.some(x=>x.type==='frozen'),true);
 ok(await gm('/battle-undo',{undoToken:art.undoToken}));
 assert.equal((await state()).artifactCycle.count,0);
 assert.equal((await me('victim')).effects.some(x=>x.type==='frozen'),false);
 assert.equal(ok(await gm('/battle-undo',{undoToken:art.undoToken})).idempotent,true);
 ok(await action('seer','frozen','copy',['victim'],{artifactId:'test-mirror'}));
 assert.equal((await action('seer','frozen','copy',['victim'],{artifactId:'test-mirror'})).ok,false);
 assert.equal((await state()).artifactCycle.count,1);
 checks.push('Artifact stock/quota, undo twice and reuse rejection through SQLite');
 await manual('seer','frozen');await jump('seer');
 assert.equal((await action('seer','effect_notice','inspect',['guard'])).error,'ACTOR_CANNOT_ACT');
 await manual('seer','clear_state');
 ok(await action('seer','effect_notice','inspect',['guard'],{clientEventId:'inspect-retry'}));
 assert.equal(ok(await action('seer','effect_notice','inspect',['guard'],{clientEventId:'inspect-retry'})).idempotent,true);
 assert.equal((await action('seer','effect_notice','inspect',['fairy'],{clientEventId:'inspect-retry'})).error,'REQUEST_ID_CONFLICT');
 assert.equal((await action('seer','effect_notice','inspect',['guard'])).error,'ACTION_NIGHT_LIMIT_REACHED');
 await jump('guard');ok(await action('guard','effect_notice','action_protect',['witch']));
 await manual('guard','status',{statusId:'disabled_2n'});
 await jump('wolf');ok(await action('wolf','effect_notice','action_wolf_bite',['witch']));
 await jump('fairy');ok(await action('fairy','effect_notice','action_transfer_bite',['witch'],{direction:'left'}));
 await manual('seer','expelled');await jump('seer');
 // Expulsion does not bypass the action's normal nightly usage limit.
 assert.equal((await action('seer','effect_notice','inspect',['guard'])).error,'ACTION_NIGHT_LIMIT_REACHED');
 const dawn=await cycle('morning',1);
 // Seat 5 (witch) -> seat 6 (alpha) via visual LEFT, after inverted arrow correction; Guard on old target does not prevent death.
 s=await state();assert.equal(active(s,'alpha','dead').length,1);assert.equal(active(s,'witch','dead').length,0);
 assert.equal(active(s,'victim','frozen').length,0);
 assert.equal(ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'})).idempotent,true);
 assert.equal(active(await state(),'alpha','dead').length,1);
 await observed(gmEvents,x=>x.type==='room_cycle'&&x.night===1&&x.phase==='morning');
 await observed(playerEvents,x=>x.type==='room_cycle'&&x.night===1&&x.phase==='morning');
 assert.equal((await me('alpha')).effects.filter(x=>x.type==='dead').length,1);
 checks.push('freeze blocks, expulsion retains quotas; Guard-Wolf-Fairy precedence; dawn idempotency; GM/Player realtime');
 await cycle('night',2);s=await state();
 assert.equal(s.nightRuntime.queue.some(x=>x.kind==='wolf-introduction'),false);
 assert.equal(s.nightRuntime.queue.find(x=>x.kind==='early-artifact-window').actions.length,0,'single-use Artifact removed next night');
 assert.equal(active(s,'seer','expelled').length,0);assert.equal(active(s,'alpha','dead').length,1);
 await jump('alpha');assert.equal((await action('alpha','effect_notice','inspect',['guard'])).error,'ACTOR_CANNOT_ACT');
 await jump('guard');assert.equal((await action('guard','effect_notice','inspect',['seer'])).error,'ACTOR_CANNOT_ACT');
 await jump('seer');ok(await action('seer','effect_notice','inspect',['guard']));
 // Direct kill + revive, only one witch action per night, undo restores that limit.
 await jump('witch');const killed=ok(await action('witch','dead','action_witch_kill',['victim']));
 assert.equal((await me('victim')).effects.some(x=>x.type==='dead'),true);
 assert.equal((await action('witch','revive','action_revive',['alpha'])).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
 ok(await gm('/battle-undo',{undoToken:killed.undoToken}));
 assert.equal((await me('victim')).effects.some(x=>x.type==='dead'),false);
 const revived=ok(await action('witch','revive','action_revive',['alpha']));
 assert.equal((await me('alpha')).effects.some(x=>x.type==='dead'),false);
 // Third night: onceGame revive rejected, nightly kill reset, protection expires across nights.
 await cycle('morning',2);await cycle('night',3);await jump('guard');
 ok(await action('guard','effect_notice','inspect',['seer']));
 await jump('witch');
 assert.equal((await action('witch','revive','action_revive',['victim'])).error,'ACTION_GAME_LIMIT_REACHED');
 ok(await action('witch','dead','action_witch_kill',['victim']));
 await jump('wolf');ok(await action('wolf','effect_notice','action_wolf_bite',['witch']));
 await cycle('morning',3);s=await state();
 assert.equal(active(s,'witch','dead').length,1,'night-one protection cannot leak to night three');
 assert.equal(active(s,'victim','dead').length,1,'direct kill persists at dawn');
 checks.push('three nights: death/expel expiry, kill/revive, per-night and once-game limits, undo ledger');
 assert.deepEqual(s.gameConfig,before.gameConfig);assert.deepEqual(s.assignments.map(x=>[x.loginId,x.roleId]),before.assignments.map(x=>[x.loginId,x.roleId]));
 assert.deepEqual(s.players.map(x=>[x.loginId,x.seatId]),before.players.map(x=>[x.loginId,x.seatId]));
 assert.equal((await me('seer')).deliveryManifest.deliveryId,privateBefore.deliveryManifest.deliveryId);
 // Reconnect sees persisted effects and owns its original private role/Artifact only.
 const reconnect=await connect('member:'+id('victim'));
 await observed(reconnect,x=>x.type==='room_state'&&x.room.cycleNight===3);
 assert.equal((await me('seer')).role.roleId,'test-seer');
 assert.equal((await me('victim')).effects.filter(x=>x.type==='dead').length,1);
 const publicState=ok(await req('/api/rooms/'+code));assert.equal(JSON.stringify(publicState).includes('test-mirror'),false);
 checks.push('reconnect, private receipt and seats/config preserved, public privacy');
 console.log(JSON.stringify({ok:true,runtime:'workerd/SQLite Durable Object',nights:3,checks}));
}finally{for(const ws of sockets)ws.close();}
