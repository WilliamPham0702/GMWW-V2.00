// Real local workerd/SQLite regression; refuses all non-loopback servers.
import assert from 'node:assert/strict';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
async function req(path,body,token){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
 const data=await response.json();assert.equal(data.ok,true,JSON.stringify(data));return data;
}
const people=[['seer','role_seer','action_seer'],['aura','role_aura_seer','action_aura_read'],['spirit','role_spiritualist','action_compare_faction'],['witch','role_witch','action_witch_kill'],['wolf','role_wolf','action_wolf_bite'],['immortal','role_destroyer','action_destroyer_scry'],['villager','role_villager','inspect']];
const serial=Date.now().toString(36),ids=Object.fromEntries(people.map(([n])=>[n,'r'+n+serial]));
const room=await req('/api/rooms',{roomName:'Night rule regression',seatCount:8,gameConfig:{roles:people.map(([,roleId],i)=>({roleId,order:i+1})),timing:{defaultActionSec:600,wolfDiscussionSec:600}}});
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
try{
 for(const [i,[name]] of people.entries()){
  const loginId=ids[name];
  await req('/api/members/register',{loginId,displayName:name+serial,gameCharacterId:'character-01'});
  const session=await req('/api/members/login',{loginId});
  await req('/api/rooms/'+room.roomCode+'/join',{token:session.token});
  await gm('/seat',{loginId,seatId:i+1});
 }
 const matchId='rules-'+Date.now();
 await gm('/assignments',{matchId,assignments:people.map(([n,roleId,actionId])=>({loginId:ids[n],roleId,roleName:n,roleCard:{name:n,faction:n==='wolf'?'Phe Sói':n==='immortal'?'Phe Ba':'Phe Dân',flags:{nightImmune:n==='immortal',allowMultipleActions:false},functions:[{actionId,usageMode:'eachNight',usageCount:1}]}}))});
 await gm('/start',{matchId});await gm('/auto',{enabled:false});await gm('/cycle',{phase:'night',night:1,cycleKey:'night-1'});
 async function action(name,type,targets,reveal){
  let s=await gm('');const targetIndex=s.nightRuntime.queue.findIndex(x=>(x.loginIds||[]).includes(ids[name]));assert.ok(targetIndex>=0);
  await gm('/turn',{action:'jump',targetIndex});s=await gm('');
  return gm('/battle-action',{matchId,cycleKey:s.room.cycleKey,night:1,turnId:s.nightRuntime.currentId,actorId:ids[name],actionId:people.find(x=>x[0]===name)[2],type,targetIds:targets.map(x=>ids[x]),...(reveal?{revealTargetIds:reveal.map(x=>ids[x])}:{}),clientEventId:'rules-'+name});
 }
 const seerResult=(await action('seer','effect_notice',['seer'],['wolf'])).revelation;
 assert.equal(seerResult.wolf,true);
 assert.equal(seerResult.message,'Người bạn soi là Sói');
 assert.equal((await action('aura','effect_notice',['aura'],['immortal'])).revelation.message,'immortal');
 assert.equal((await action('spirit','effect_notice',['spirit'],['wolf','villager'])).revelation.message,'KHÁC PHE');
 const kill=await action('witch','dead',['immortal']);assert.equal(kill.results[0].reason,'NIGHT_IMMUNE');
 const bite=await action('wolf','effect_notice',['immortal']);assert.deepEqual(bite.wolfOutcome.victims,[]);
 await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'});
 assert.equal((await gm('')).activeEffects.some(x=>x.loginId===ids.immortal&&x.type==='dead'),false);
 console.log('PASS: real Worker divination, private card immunity, witch kill and wolf dawn resolution');
}finally{await gm('/end',{force:true}).catch(()=>{});}
