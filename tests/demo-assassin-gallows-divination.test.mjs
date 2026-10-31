import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gallowsCast,gallowsManualVote,gallowsVoteTotals,gallowsSnapshot,gallowsRosterStats} from '../src/gmww-gallows-rules.js';
import {resolveNightReveal} from '../src/gmww-wolf-night-resolution.js';
import {demoDivinationTargetCount,pendingDemoAssassinResponses} from '../src/gmww-demo-runner.js';

const ballot=(extra={})=>({id:'g',matchId:'m',cycleKey:'morning-1',day:1,mode:'auto',
 stage:'voting',deadlineAt:Date.now()+60000,candidateId:'alice',
 eligible:['alice','bob','charlie'],votes:{},nominations:{},blockedVotes:[],blockedNomination:[],...extra});

test('on the gallows: candidate cannot save or kill themselves, even in GM manual mode',()=>{
 const b=ballot();
 assert.equal(gallowsCast(b,'alice','👍').error,'GALLOWS_CANDIDATE_CANNOT_VOTE');
 assert.equal(gallowsCast(b,'alice','👎').error,'GALLOWS_CANDIDATE_CANNOT_VOTE');
 assert.equal(gallowsCast(b,'bob','👍').ok,true);
 assert.equal(gallowsManualVote(ballot({mode:'gm'}),'alice','👎').error,'GALLOWS_CANDIDATE_CANNOT_VOTE');
});
test('legacy self-votes cannot influence display, counts, or result denominators',()=>{
 const b=ballot({votes:{alice:'👎',bob:'👍'}});
 assert.deepEqual(gallowsVoteTotals(b),{save:1,kill:0,cast:1,eligible:2});
 const view=gallowsSnapshot(b,{matchId:'m',cycleKey:'morning-1'});
 assert.deepEqual(view.votes,{bob:'👍'});
 assert.equal(gallowsRosterStats(b).find(row=>row.id==='alice').kill,0);
});
test('DEMO observes exact scan target counts even if a stored card says one',()=>{
 assert.equal(demoDivinationTargetCount({actionId:'action_compare_faction',targetCount:1}),2);
 assert.equal(demoDivinationTargetCount({actionId:'action_bear_scan',targetCount:1}),2);
 assert.equal(demoDivinationTargetCount({actionId:'action_fox_scan',targetCount:1}),3);
 assert.equal(demoDivinationTargetCount({actionId:'action_scan_three',targetCount:1}),3);
 assert.equal(demoDivinationTargetCount({actionId:'action_seer',targetCount:1}),1);
});
test('the Spiritualist reveals two distinct roles and faction verdict only to GM result',()=>{
 const assignments=[
  {loginId:'a',roleId:'role_wolf',roleName:'Sói',roleCard:{factionId:'wolf'}},
  {loginId:'b',roleId:'role_alpha_wolf',roleName:'Sói Trùm',roleCard:{factionId:'wolf'}},
  {loginId:'c',roleId:'role_villager',roleName:'Dân Làng',roleCard:{factionId:'village'}}];
 const same=resolveNightReveal({actionId:'action_compare_faction',targetIds:['a','b'],assignments});
 assert.equal(same.message,'CÙNG PHE');
 assert.deepEqual(same.targets.map(x=>x.roleId),['role_wolf','role_alpha_wolf']);
 assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['a','c'],assignments}).message,'KHÁC PHE');
 assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['a'],assignments}),null);
});
test('DEMO prepares one dawn response per eligible, unanswered Assassin mark only',()=>{
 const rows=[
  {id:'good',loginId:'alice',type:'assassin_mark',status:'pending',night:1,matchId:'m'},
  {id:'past',loginId:'bob',type:'assassin_mark',status:'pending',night:0,matchId:'m'},
  {id:'answered',loginId:'charlie',type:'assassin_mark',status:'responded',night:1,matchId:'m'},
  {id:'dead-mark',loginId:'dave',type:'assassin_mark',status:'pending',night:1,matchId:'m'},
  {id:'dead',loginId:'dave',type:'dead',effectActive:true,matchId:'m'},
  {id:'other',loginId:'bob',type:'assassin_mark',status:'pending',night:1,matchId:'other'}];
 const players=Object.fromEntries(['alice','bob','charlie','dave'].map(id=>['member:'+id,{loginId:id}]));
 assert.deepEqual(pendingDemoAssassinResponses({rows,players},{matchId:'m',cycleNight:1}).map(x=>x.interactionId),['good']);
});
test('GM Aura audio plays its independent role name, never a cropped wake-up clip',async()=>{
 const audio=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
 const start=audio.indexOf('async function battlePlayConfiguredAudio('),end=audio.indexOf('function battleTurnAudioCue(',start);
 assert.ok(start>=0&&end>start);
 let calls=0,last,tts=0;
 const ready=new Map([['cards:clip','full-role.m4a'],['cards-name:clip','name-only.m4a']]);
 const ctx={battleState:{key:''},battleUnlockedAudioContext:null,playSceneRuntime:{room:{demo:false}},state:{cards:[]},
  setTimeout:()=>1,clearTimeout:()=>{},playAudioMuted:()=>false,battleFindAudio:()=>({id:'clip',roleNameStart:0,roleNameEnd:4}),
  battleAudioLast:{key:'',at:0},battleAudioReady:ready,
  battleAudioRequestId:0,battleActiveAudio:null,battleWarmAudio:async()=>null,
  battlePlayWebAudioFallback:async()=>false,battleSpeakCue:()=>{tts++;return false},Date,
  Audio:class{constructor(src){this.src=src;this.readyState=0;last=this}addEventListener(){}async play(){return true}pause(){this.paused=true}}};
 const play=vm.runInNewContext(audio.slice(start,end)+';battlePlayConfiguredAudio',ctx);
 await play('cards','role_wolf','Sói',false,()=>calls++,1);
 assert.equal(last.src,'name-only.m4a');
 assert.notEqual(last.src,'full-role.m4a');
 assert.equal(last.paused,undefined,'No segment seek or forced cut is allowed');
 last.onended?.();assert.equal(calls,1);
 ready.delete('cards-name:clip');last=null;
 await play('cards','role_wolf','Sói',true,null,1);
 assert.equal(last,null,'Missing name audio must not play the full role clip');
 assert.equal(tts,1,'Missing name audio falls back to the exact spoken role name');
});
test('the real battle handler rejects incomplete multi-target scans before state writes',()=>{
 const src=fs.readFileSync('src/index.js','utf8');
 const validate=src.indexOf('const expectedInspectCount='),write=src.indexOf('const usageKey="battleRoleUsage:"+matchId;');
 assert.ok(validate>0&&write>validate);
 const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 assert.match(player,/canVote=eligible\.includes\(me\)&&me!==String\(g\.candidateId/);
});
