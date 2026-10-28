import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolveNightReveal} from '../src/gmww-wolf-night-resolution.js';
import {demoTaskAt} from '../src/gmww-demo-runner.js';

const source=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));

const assignments=[
  {loginId:'alpha',roleId:'role_alpha_wolf',roleName:'Sói Trùm',faction:'wolf'},
  {loginId:'wolf',roleId:'role_wolf',roleName:'Sói',faction:'wolf'},
  {loginId:'villager',roleId:'role_villager',roleName:'Dân Làng',faction:'village'}
];
test('regular Seer receives a neutral not-wolf result and audio message for expelled Alpha',()=>{
  const v=resolveNightReveal({actionId:'action_seer',targetIds:['alpha'],assignments,expelledIds:['alpha']});
  assert.equal(v.wolf,false);
  assert.equal(v.message,'Người bạn soi không phải là Sói');
  assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['wolf'],assignments,expelledIds:['wolf']}).wolf,false);
  assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['wolf'],assignments}).wolf,true);
  assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['alpha','wolf'],assignments,expelledIds:['alpha']}).same,true);
  assert.match(worker,/seerExcluded/);
  assert.match(worker,/expelledIds:revealActionId==='action_seer'/);
});
test('Aura Seer reads the entire returned role name after the prefix',()=>{
 const fn=between(battle,'function battlePresentRevelation(', 'async function battleWakeupToDay(');
 const calls=[],ctx={
   battleShowResultPopup:()=>{},
   battleDivinationSystemAudioCue:()=> 'audio_system_aura_read',
   battleFindAudio:()=>null,
   battleSpeakCue:(_text,_show,onFinished)=>{onFinished?.();return true},
   battlePlayConfiguredAudio:(...args)=>{calls.push(args);return true}
 };
 vm.createContext(ctx);vm.runInContext(fn+';globalThis.play=battlePresentRevelation',ctx);
 ctx.play('action_aura_read',{message:'Sói Trùm',targets:[{roleId:'role_alpha_wolf',roleName:'Sói Trùm'}]});
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'cards');
 assert.equal(calls[0][2],'Sói Trùm');
 assert.equal(calls[0][5],1);
 assert.match(source,/candidates\.sort/);
 assert.match(source,/cutTimer=setTimeout\(stop,/);
 assert.match(source,/if\(Number\(maxSeconds\)>0\)return String\(name\|\|card\?\.name\|\|''\)\.trim/);
});
test('DEMO ballots spread nomination and voting across real x2/x5 clock',()=>{
 const p={tasks:Array.from({length:20},()=>({kind:'nominate'})),cursor:0};
 assert.equal(demoTaskAt(30000,p),3000);
 p.cursor=10;assert.ok(Math.abs(demoTaskAt(30000,p)-13800)<.001);
 p.cursor=19;assert.ok(demoTaskAt(30000,p)<25000);
 const role={tasks:[{id:'role'}],cursor:0};
 assert.equal(demoTaskAt(30000,role),15000);
 assert.match(battle,/Math\.ceil\(30\/demoSpeed\)/);
});
test('DEMO first tap unlocks iPhone audio before asynchronous server call',()=>{
 const fn=between(battle,'async function demoToggle(', 'function demoSchedule(');
 assert.ok(fn.indexOf('battleUnlockAudioFromGesture();')>=0);
 assert.ok(fn.indexOf('battleUnlockAudioFromGesture();')<fn.indexOf("await playRoomApi('/auto'"));
 assert.match(battle,/sameCycle/);
});
test('DEMO stage cues and Audio queue are tied to authoritative ballot stage',()=>{
 const queue=between(battle,'function battleQueueDayAudio(', 'function battleMorningPlayAudio(');
 const stage=between(battle,'function battleGallowsRender(', 'async function battleGallowsCommand(');
 assert.match(queue,/playSceneRuntime\.gallows\?\.stage/);
 assert.match(queue,/15000\/speed/);
 assert.doesNotMatch(queue,/45000/);
 assert.match(stage,/gallowsStageAudioKey/);
 assert.match(stage,/audio_system_gallows_day_long/);
 assert.match(stage,/audio_system_gallows_open_nomination/);
 assert.match(stage,/audio_system_gallows_open_vote/);
});
