import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
test('All Artifact controls belong to match setup, never the template editor',()=>{
 const editor=between(html,'<div class="play-template-editor-only">','<div class="play-template-play-review">');
 const match=between(html,'<div class="play-template-play-review">','<div class="button-row play-roster-actions">');
 for(const id of ['playArtifactsEnabled','playArtifactLimitPerCycle','playArtifactActionSec','playEarlyArtifactSec','playGameArtifactPicker']){
  assert.ok(!editor.includes('id="'+id+'"'),id+' leaked into template');
  assert.ok(match.includes('id="'+id+'"'),id+' missing from match');
 }
});
test('Match Artifact settings use selected cards and limits, including zero, without mutating templates',()=>{
 const source=between(app,'function playMatchArtifactConfig(){','function updatePlayArtifactToggle(){');
 assert.ok(source.startsWith('function playMatchArtifactConfig(){'));
 const state={artifactsEnabled:true,artifactIds:['a','b'],artifactLimitPerCycle:0};
 const ctx={playSceneState:state,playTemplateSelectedArtifacts:()=>[{id:'a'},{id:'b'}]};
 const config=vm.runInNewContext(source+';playMatchArtifactConfig()',ctx);
 assert.equal(config.artifactLimitPerCycle,0);
 assert.equal(config.artifactsEnabled,true);
 assert.equal(config.artifacts.map(a=>a.artifactId).join(','),'a,b');
 state.artifactsEnabled=false;
 assert.equal(vm.runInNewContext('playMatchArtifactConfig()',ctx).artifacts.length,0);
 state.artifactLimitPerCycle=99;
 assert.equal(vm.runInNewContext('playMatchArtifactConfig()',ctx).artifactLimitPerCycle,30);
});
test('One tap opens the daytime action picker; a second tap closes it',()=>{
 const binding=between(app,"  document.getElementById('battleDayActionToggle')?.addEventListener",'  battleBindAuxiliaryDrag(\'battleGallowsPanel\'');
 assert.ok(binding.includes("'click'"));
 let click;
 const ctx={document:{getElementById:()=>({addEventListener:(_,fn)=>{click=fn}})},playSceneState:{phase:'day'},battleState:{dayActionsOpen:false},battleActions:()=>[{id:'role:prince'}],renderPlayBattle:()=>{}};
 vm.runInNewContext(binding,ctx);click();assert.equal(ctx.battleState.dayActionsOpen,true);click();assert.equal(ctx.battleState.dayActionsOpen,false);
 ctx.playSceneState.phase='night';click();assert.equal(ctx.battleState.dayActionsOpen,false);
});
test('Switching role templates preserves per-match Artifact settings and custom timings',async()=>{
 const source=between(app,'async function applyPlayGameTemplate(id){','async function openPlayGameSheet()');
 const cfg={name:'Role template',roles:[{roleId:'wolf',count:1}],artifacts:[{artifactId:'legacy'}],artifactLimitPerCycle:3,timing:{artifactActionSec:30}};
 const settings={enabled:true,ids:['chosen'],limit:0,seconds:42,earlySeconds:17};
 const ctx={playSceneState:{matchArtifactSettings:settings},playSceneRuntime:{},gmApi:async()=>({template:{compiledConfig:cfg}}),
 document:{querySelector:()=>({dataset:{mode:'play'}}),getElementById:()=>null},playFavoriteArtifacts:()=>[{id:'favorite'}],savePlayScene:()=>{},updatePlayArtifactToggle:()=>{},renderPlayGameRoles:async()=>{},renderPlayGameRoleTimings:()=>{},updatePlayGameRoleCount:()=>{},playFlashError:e=>{throw Error(e)}};
 await vm.runInNewContext(source+';applyPlayGameTemplate("first")',ctx);
 cfg.artifacts=[];cfg.artifactLimitPerCycle=8;
 await vm.runInNewContext('applyPlayGameTemplate("second")',ctx);
 assert.equal(ctx.playSceneState.artifactIds.join(','),'chosen');
 assert.equal(ctx.playSceneState.artifactLimitPerCycle,0);
 assert.equal(ctx.playSceneState.gameTiming.artifactActionSec,42);
 assert.equal(ctx.playSceneState.gameTiming.earlyArtifactSec,17);
 assert.equal(cfg.artifacts.length,0);
});
