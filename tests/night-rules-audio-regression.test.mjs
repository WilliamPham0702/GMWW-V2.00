import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as nightRules from '../src/gmww-wolf-night-resolution.js';
import * as policy from '../src/gmww-battle-action-policy.js';
import {isBattleActorBlocked} from '../src/gmww-battle-actor-eligibility.js';
const read=p=>fs.readFileSync(p,'utf8');
const worker=read('src/index.js'),audio=read('server-game/src/30-village-and-setup.part'),battle=read('server-game/src/40-battle-and-timeline.part'),core=read('server-game/src/00-core-and-library.part');
function cut(s,a,b){return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));}
function harness(actionId='action_seer',roleId='role_seer'){
 const meta={matchId:'m',cycleKey:'n1',cycleNight:1,cyclePhase:'night',phase:'running'};
 const ids=['seer','wolf','immune','villager'];
 const assignments=ids.map(loginId=>({loginId,matchId:'m',roleId:loginId==='seer'?roleId:'role_'+loginId,roleName:loginId}));
 const data=new Map([['assignments',assignments],['players',Object.fromEntries(ids.map((loginId,i)=>['member:'+loginId,{loginId,seatId:i+1}]))],['interactions',[]]]);
 for(const a of assignments)data.set('role:'+a.loginId,{...a,roleCard:{factionId:a.loginId==='wolf'?'wolf':'village',flags:{nightImmune:a.loginId==='immune'},functions:[{actionId,usageMode:'eachNight',usageCount:1}]}});
 const methods=cut(worker,'  async gmBattleAction(', '  async gmBattleUndo(')+cut(worker,'  async executeGmInteraction(', '  async playerInteractionRespond(');
 const Room=vm.runInNewContext('(class {'+methods+'})',{...nightRules,...policy,isBattleActorBlocked,normalizeLoginId:x=>String(x||'').replace(/^member:/,''),STATUS_DEFS:{},STATUS_VISUAL_IDS:new Set(),pruneInteractions:x=>x,crypto:webcrypto,Response,Date,j:(d,status=200)=>Response.json(d,{status})});
 const room=new Room();room.ctx={storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)}};
 room.gmAuthorized=async()=>({ok:true,meta});room.broadcast=()=>{};
 room.getNightRuntime=async()=>({cursor:0,queue:[{id:'turn',kind:'role',roleId,loginIds:['seer']}]});
 const run=async(extra={})=>(await room.gmBattleAction({}, {clientEventId:'request',turnId:'turn',actorId:'seer',actionId,type:'effect_notice',targetIds:['seer'],revealTargetIds:['wolf'],matchId:'m',cycleKey:'n1',...extra})).json();
 return {run,data,room,meta};
}
for(const [action,role,targets,message] of [['action_seer','role_seer',['wolf'],'CÓ SÓI'],['action_aura_read','role_aura_seer',['wolf'],'wolf'],['action_compare_faction','role_spiritualist',['wolf','villager'],'KHÁC PHE']])test('real battle handler returns '+action+' for inspected targets, using private role data',async()=>{
 const h=harness(action,role),result=await h.run({revealTargetIds:targets});
 assert.equal(result.ok,true);assert.equal(result.revelation?.message,message);
 assert.equal(JSON.stringify(h.data.get('interactions')).includes('CÓ SÓI'),false,'result remains GM-private');
});
test('witch kill consumes action but does not kill night-immune target',async()=>{
 const h=harness('action_witch_kill','role_witch'),r=await h.run({type:'dead',targetIds:['immune'],revealTargetIds:[]});
 assert.equal(r.ok,true);assert.equal(r.results[0].noEffect,true);
 assert.equal(h.data.get('interactions').some(x=>x.type==='dead'),false);
 assert.equal(h.data.get('battleRoleUsage:m').length,1);
});
test('wolf resolution checks immunity at final transferred destination',()=>{
 const h=harness(),assignments=[{loginId:'immune',roleCard:{flags:{nightImmune:true}}}],rows=[{matchId:'m',night:1,type:'effect_notice',actionId:'action_wolf_bite',loginId:'wolf'},{matchId:'m',night:1,type:'effect_notice',actionId:'action_transfer_bite',direction:'left'}];
 const r=nightRules.resolveWolfNight({interactions:rows,players:h.data.get('players'),assignments,matchId:'m',night:1});
 assert.deepEqual(r.victims,[]);assert.deepEqual(r.blocked,['immune']);
});
for(const dead of [0,1,6,30])test('morning audio joins intro, number, noun for '+dead+' deaths',()=>{
 const calls=[],ctx={battleMorningRows:()=>Array.from({length:dead},()=>({kind:'dead'})),playSceneState:{phase:'day'},battlePlayConfiguredAudio:(_kind,id,label,_err,done)=>{calls.push(id);done();}};
 vm.runInNewContext(cut(battle,'function battleMorningPlayAudio(', 'function battleMorningShow(')+';battleMorningPlayAudio()',ctx);
 assert.deepEqual(calls,['audio_system_morning_deaths_intro','audio_system_morning_number_'+dead,'audio_system_morning_dead_noun']);
});
test('audio migration preserves custom system clips and uploaded action blob IDs',()=>{
 const s={cards:[],audio:{cards:[],actions:[{id:'uploaded-exile',targetId:'action_exile',name:'Đuổi Người',url:'https://example.test/exile.mp3',fileName:'chosen.mp3'}],system:[{id:'audio_system_morning_number_6',name:'6',targetId:'audio_system_morning_number_6'},{id:'custom',name:'Custom cue',url:'https://example.test/custom.mp3'},{id:'number-six',name:'6',url:'https://example.test/6.mp3'}]},actions:{role:[]},effects:[]};
 const fn=vm.runInNewContext(cut(core,'function applyV210Rules(', 'function applyV226Catalog(')+';applyV210Rules',{DEFAULT_STATE:{cards:[]},clone:structuredClone});
 fn(s);assert.ok(s.audio.system.some(x=>x.id==='custom'));
 assert.equal(s.audio.actions.find(x=>x.targetId==='action_exile').id,'uploaded-exile');
 assert.equal(s.audio.system.find(x=>x.targetId==='audio_system_morning_number_6')?.url,'https://example.test/6.mp3');
});
test('DEMO observer displays and speaks a new divination once',()=>{
 const heard=[],ctx={demoRunner:{roomCode:'ABCDEF',observedMatch:'m'},playSceneState:{roomCode:'ABCDEF',step:'seats'},playSceneRuntime:{room:{matchId:'m'}},gmHapticFeedback:()=>{},demoConfirmedFeedback:()=>{},battlePresentRevelation:(action,r)=>heard.push([action,r.message])};
 const apply=vm.runInNewContext(cut(battle,'function demoApplyServerControl(', 'function demoHoldForGM(')+';demoApplyServerControl',ctx);
 const control={engine:'server',lastEvent:{id:'one',status:'accepted',actionId:'action_seer',revelation:{actionId:'action_seer',message:'CÓ SÓI'}}};
 apply(control);apply(control);assert.deepEqual(heard,[['action_seer','CÓ SÓI']]);
});
test('a slowly loaded old cue cannot interrupt a newer cue',async()=>{
 let release;const played=[],oldReady=new Promise(r=>{release=r});
 const ctx={playAudioMuted:()=>false,battleFindAudio:(_kind,id)=>({id}),battleAudioReady:new Map(),battleAudioLast:{key:'',at:0},battleAudioRequestId:0,battleActiveAudio:null,battleWarmAudio:(_kind,row)=>row.id==='old'?oldReady:Promise.resolve('new.mp3'),battleSpeakCue:()=>false,battlePlayWebAudioFallback:async()=>false,Audio:class{constructor(src){this.src=src}async play(){played.push(this.src)}pause(){}},Date};
 const play=vm.runInNewContext(cut(audio,'async function battlePlayConfiguredAudio(', 'function battleTurnAudioCue(')+';battlePlayConfiguredAudio',ctx);
 const old=play('cards','old','old');await play('cards','new','new');release('old.mp3');await old;
 assert.deepEqual(played,['new.mp3']);
});
test('an empty seeded slot does not hide an uploaded clip for the same cue',()=>{
 const ctx={state:{audio:{system:[{id:'audio_system_morning_number_6',name:'6'},{id:'custom-six',name:'6',fileName:'6.mp3',url:'https://example.test/6.mp3'}]}}};
 const find=vm.runInNewContext(cut(audio,'function battleFindAudio(', 'async function battleWarmAudio(')+';battleFindAudio',ctx);
 assert.equal(find('system','audio_system_morning_number_6','6').id,'custom-six');
});
test('card transport preserves the night immunity flag through delivery sanitization',async()=>{
 const {sanitizePlayerRoleCard,mergePlayerRoleCard}=await import('../src/gmww-private-card-contract.js');
 const input={name:'Immortal',faction:'Phe Ba',flags:{nightImmune:true,allowMultipleActions:false}};
 assert.equal(sanitizePlayerRoleCard(input).flags.nightImmune,true);
 assert.equal(mergePlayerRoleCard(input,sanitizePlayerRoleCard({flags:{allowMultipleActions:true}})).flags.nightImmune,true);
});

test('night poison is pending and victim remains eligible until dawn',async()=>{
 const h=harness('action_witch_kill','role_witch');
 const r=await h.run({type:'dead',targetIds:['villager'],revealTargetIds:[]});
 assert.equal(r.ok,true);
 const rows=h.data.get('interactions');
 assert.equal(rows.some(x=>x.type==='dead'&&x.effectActive!==false),false);
 assert.equal(rows.some(x=>x.pendingDeath===true),true);
 assert.equal(isBattleActorBlocked(rows,{actorId:'villager',matchId:'m',statusDefs:{}}),false);
});

test('dawn activates pending kills once and leaves other nights and matches untouched',async()=>{
 const h=harness('action_witch_kill','role_witch');
 await h.run({type:'dead',targetIds:['villager'],revealTargetIds:[]});
 const rows=h.data.get('interactions');rows.push({...rows[0],id:'future',night:2},{...rows[0],id:'other',matchId:'other'});h.data.set('interactions',rows);
 const apply=vm.runInNewContext('(class {'+cut(worker,'  async applyCycle(', '  async autoAdvanceDue(')+'})',{...nightRules,Date,STATUS_DEFS:{},expireCycleEffects:()=>[],pruneInteractions:x=>x,publicRoom:x=>x,publicPlayer:x=>x,normalizeLoginId:x=>x}).prototype.applyCycle;
 h.room.ctx.storage.list=async({prefix})=>new Map([...h.data].filter(([k])=>k.startsWith(prefix)));h.room.scheduleRoomAlarm=async()=>{};
 await apply.call(h.room,h.meta,'morning',1,'morning-1');
 const after=h.data.get('interactions');assert.equal(after.filter(x=>x.type==='dead').length,1);
 assert.equal(after[0].loginId,'villager');assert.equal(after[0].effectActive,true);
 assert.equal(after.find(x=>x.id==='future').pendingDeath,true);assert.equal(after.find(x=>x.id==='other').pendingDeath,true);
 const retry=await apply.call(h.room,h.meta,'morning',1,'morning-1');assert.equal(retry.idempotent,true);
 assert.equal(h.data.get('interactions').filter(x=>x.type==='dead').length,1);
});

test('DEMO does not replay divination after an out-of-order observer response',()=>{
 const heard=[],ctx={demoRunner:{roomCode:'ABCDEF',observedMatch:'m'},playSceneState:{roomCode:'ABCDEF',step:'seats'},playSceneRuntime:{room:{matchId:'m'}},gmHapticFeedback:()=>{},demoConfirmedFeedback:()=>{},battlePresentRevelation:(_a,r)=>heard.push(r.message)};
 const apply=vm.runInNewContext(cut(battle,'function demoApplyServerControl(','function demoHoldForGM(')+';demoApplyServerControl',ctx);
 for(const id of ['a','b','a'])apply({engine:'server',lastEvent:{id,status:'accepted',revelation:{actionId:'action_seer',message:id}}});
 assert.deepEqual(heard,['a','b']);
});

test('duplicate cue neither overlaps nor interrupts the already playing clip',async()=>{
 let played=0,paused=0;
 const ctx={playAudioMuted:()=>false,battleFindAudio:()=>({id:'seer'}),battleAudioReady:new Map([['system:seer','seer.mp3']]),battleAudioLast:{key:'',at:0},battleAudioRequestId:0,battleActiveAudio:null,Audio:class{async play(){played++}pause(){paused++}},Date};
 const play=vm.runInNewContext(cut(audio,'async function battlePlayConfiguredAudio(', 'function battleTurnAudioCue(')+';battlePlayConfiguredAudio',ctx);
 await play('system','seer','Sói');await play('system','seer','Sói');
 assert.equal(played,1);assert.equal(paused,0);
});

test('GM cannot revive a living target; a genuine death can still be revived',async()=>{
 const h=harness();
 const request={loginId:'villager',type:'revive'};
 const rejected=await h.room.executeGmInteraction({},request);
 assert.equal(rejected.status,409);
 assert.equal((await rejected.json()).error,'TARGET_NOT_DEAD');
 assert.equal(h.data.get('interactions').length,0);
 h.data.set('interactions',[{id:'death-1',loginId:'villager',matchId:'m',type:'dead',effectActive:true}]);
 const accepted=await h.room.executeGmInteraction({},request);
 assert.equal(accepted.status,200);
 assert.equal((await accepted.json()).revived.length,1);
 assert.equal(h.data.get('interactions')[0].effectActive,false);
});

test('day Artifact cannot consume a resurrection on a living player',async()=>{
 const meta={matchId:'m',cycleKey:'morning-1',cycleNight:1,cyclePhase:'morning',phase:'running'};
 const data=new Map([
  ['players',{'member:seer':{loginId:'seer'},'member:villager':{loginId:'villager'}}],
  ['assignments',[]],
  ['interactions',[]],
  ['artifact:seer',{artifactId:'revive-item',artifactCard:{functions:[{actionId:'action_revive',phase:'day',targetCount:1}]}}]
 ]);
 const getKeys=[];
 const Room=vm.runInNewContext('(class {'+cut(worker,'  async gmDayAction(', '  async gmBattleAction(')+'})',{
  normalizeLoginId:x=>String(x||'').replace(/^member:/,''),Response,
  j:(d,status=200)=>Response.json(d,{status})
 });
 const room=new Room();
 room.gmAuthorized=async()=>({ok:true,meta});
 room.ctx={storage:{get:async key=>{getKeys.push(key);return structuredClone(data.get(key));}}};
 const response=await room.gmDayAction({},{
  actorId:'seer',artifactId:'revive-item',actionId:'action_revive',
  targetIds:['villager'],clientEventId:'revive-1',matchId:'m',cycleKey:'morning-1'
 });
 assert.equal(response.status,409);
 assert.equal((await response.json()).error,'DAY_REVIVE_TARGET_NOT_DEAD');
 assert.equal(getKeys.some(key=>key.startsWith('artifactCycle:')),false,'must reject before reserving quota');
});
