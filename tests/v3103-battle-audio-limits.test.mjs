import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {sanitizePlayerRoleCard,mergePlayerRoleCard} from '../src/gmww-private-card-contract.js';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const rules=fs.readFileSync('server-game/current/battle-controls.js','utf8');
test('Actual battle action audio is wired to a matching assigned clip, not only Library Preview',async()=>{
  const from=app.indexOf('const battleAudioReady='),to=app.indexOf('function applyPlayAudioState()',from);
  assert.ok(from>0&&to>from,'Battle audio player must be present');
  assert.match(app,/battlePlayConfiguredAudio\('actions',audioAction\.actionId,audioAction\.name\)/);
  assert.match(html,/id="battleAudioReplay"/);
  assert.match(app,/getElementById\('battleAudioReplay'\)\?\.addEventListener\('click',battleReplayAudio\)/);
  const events=[],errors=[],state={audio:{actions:[{id:'exile-audio',targetId:'action_exile',name:'Đuổi',fileName:'exile.mp3'}]}};
  class FakeAudio{constructor(src){this.src=src;this.muted=false}async play(){events.push(this.src)}pause(){}}
  const ctx={state,Blob,Date,Number,String,Map,Math,Array,URL:{createObjectURL:()=> 'blob:gmww-exile'},
    Audio:FakeAudio,playAudioMuted:()=>false,playFlashError:x=>errors.push(x),
    dbGet:async()=>({blob:new Blob(['audio bytes'],{type:'audio/mpeg'})}),
    audioBlobKey:(kind,id)=>'audio|'+kind+'|'+id,bundledAudioBlob:()=>null,
    battleAction:()=>null,battleTurn:()=>null};
  vm.runInNewContext(app.slice(from,to)+'\nglobalThis.playClip=battlePlayConfiguredAudio;',ctx);
  assert.equal(await ctx.playClip('actions','action_exile','Đuổi'),true);
  assert.deepEqual(events,['blob:gmww-exile']);
  assert.equal(errors.length,0);
  assert.equal(await ctx.playClip('actions','action_unmapped','Khác',true),false);
  assert.match(errors[0],/Chưa gán Audio/);
});
test('Role card function limits are serialized for authoritative worker validation',()=>{
  assert.match(app,/flags:\{allowMultipleActions:role\.flags\?\.allowMultipleActions===true,nightImmune:role\.flags\?\.nightImmune===true\}/);
  assert.match(app,/functions:\(role\.functions\|\|\[\]\)\.map/);
  const normalized=sanitizePlayerRoleCard({functions:[{actionId:'action_exile',usageMode:'eachNight',usageCount:1}]});
  assert.equal(normalized.functions[0].actionId,'action_exile');
  assert.equal(normalized.functions[0].usageMode,'eachNight');
  const merged=mergePlayerRoleCard(normalized,{name:'Đổi tên'});
  assert.deepEqual(merged.functions,normalized.functions);
  assert.match(worker,/checkBattleRoleActionUsage\(currentUsage/);
  assert.match(worker,/battleRoleUsage:/);
  assert.match(worker,/roleUse\?usageKey:null/);
  assert.match(worker,/appendBattleRoleActionUsage\(roleUse\.currentUsage,roleUse\)/);
});
test('Confirmed Phù Thuỷ Già action dims the other option immediately, while other actors remain eligible',()=>{
  const from=app.indexOf('const battleActions=()=>{'),to=app.indexOf('const battleAction=()=>',from);
  assert.ok(from>0&&to>from);
  const turn={id:'old-witch',kind:'role',roleId:'role_old_witch',loginIds:['old']};
  const actions=['action_exile','action_revive'].map((actionId,i)=>({
    id:'fn'+i,actionId,name:actionId,actorIds:['old'],targetCount:1}));
  const role={id:'role_old_witch',flags:{allowMultipleActions:false},functions:[
    {actionId:'action_exile',usageMode:'eachNight',usageCount:1},
    {actionId:'action_revive',usageMode:'onceGame',usageCount:1}]};
  const ctx={battleTurn:()=>turn,
    battleRules:()=>({artifactUsed:()=>false,actionsForTurn:()=>actions}),
    playSceneState:{night:2},playSceneRuntime:{room:{matchId:'match-1'},
      artifactCycle:{accepted:[]},battleActionUsage:[
       {matchId:'match-1',night:2,actorId:'old',roleId:'role_old_witch',actionId:'action_exile'}]},
    state:{cards:[role]},playPlayerEffect:()=>'',playPlayerBlocked:()=>false,String,Array,Set,Math,Number};
  vm.runInNewContext(app.slice(from,to)+'\nglobalThis.result=battleActions();',ctx);
  assert.equal(ctx.result.length,2);
  assert.equal(ctx.result[0].unavailable,true);
  assert.equal(ctx.result[1].unavailable,true);
  assert.match(ctx.result[1].unavailableReason,/đêm/);
  const other={...ctx.playSceneRuntime,battleActionUsage:[]};
  ctx.playSceneRuntime=other;
  vm.runInNewContext('globalThis.available=battleActions();',ctx);
  assert.equal(ctx.available[0].unavailable,false);
  assert.equal(ctx.available[1].unavailable,false);
});
test('Runtime recovery never deletes data; a role action is undoable with usage ledger restored',()=>{
  assert.match(worker,/for\(const row of record\.before\)/);
  assert.match(worker,/battle_action_undone/);
  assert.match(worker,/if\(roleUse\)await this\.ctx\.storage\.put\(usageKey/);
  assert.match(worker,/checkBattleRoleActionUsage/);
  assert.match(rules,/actionsForTurn/);
});
