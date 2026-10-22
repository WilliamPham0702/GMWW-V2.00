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
