import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const demo=fs.readFileSync('src/gmww-demo-runner.js','utf8');
const server=fs.readFileSync('src/index.js','utf8');
const section=(source,start,end)=>{
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'missing implementation section: '+start);
 return source.slice(i,j);
};

test('Player Web presents private inspection once and refresh reuses owner-only receipt',()=>{
 const nodes=new Map(),toasts=[];
 const document={
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>({tagName:tag,style:{},setAttribute(){},
    remove(){nodes.delete(this.id)}}),
  body:{appendChild(node){nodes.set(node.id,node)}}
 };
 const ctx=vm.createContext({document,toast:value=>toasts.push(value),
  setTimeout:()=>1,clearTimeout(){}});
 vm.runInContext(section(player,"// Server-authoritative day Artifact results","async function pollRoomState(){"),ctx);
 const room={matchId:'m1',phase:'running'};
 const rows=[{id:'receipt-a',matchId:'m1',result:{private:true,kind:'role',roleName:'Tiên Tri'}}];
 ctx.room=room;ctx.rows=rows;
 vm.runInContext('gmwwShowDayInspection(rows,room)',ctx);
 assert.match(nodes.get('gmwwPrivateArtifactResult').textContent,/Vai trò thật: Tiên Tri/);
 assert.equal(toasts.length,1);
 vm.runInContext('gmwwShowDayInspection(rows,room)',ctx);
 assert.equal(toasts.length,1,'idempotent reconnect does not replay toast');
 ctx.room={matchId:'m2',phase:'running'};ctx.rows=[];
 vm.runInContext('gmwwShowDayInspection(rows,room)',ctx);
 assert.equal(nodes.has('gmwwPrivateArtifactResult'),false,'match change clears private popup');
 assert.match(player,/gmwwShowDayInspection\(d\?\.dayArtifactInspections,d\?\.room\|\|state\.room\)/);
});

test('GM audio speaks correct YES/NO and actual role; day action keeps popup private',()=>{
 const calls=[],ctx=vm.createContext({
  battleShowResultPopup:(...args)=>calls.push(['popup',...args]),
  battleDivinationSystemAudioCue:(id)=>id==='action_seer'?'audio_system_seer_wolf':'',
  battleSpeakCue:(...args)=>calls.push(['speak',...args]),
  battlePlayConfiguredAudio:(...args)=>{
    calls.push(['audio',args[0],args[1]]);
    if(typeof args[4]==='function')args[4]();
  }
 });
 vm.runInContext(section(gm,'function battlePresentRevelation(actionId,revelation){','async function battleWakeupToDay('),ctx);
 ctx.revelation={message:'ĐÚNG',private:true,confirmed:true};
 vm.runInContext("battlePresentRevelation('artifact_action_check_villager',revelation)",ctx);
 assert.ok(calls.some(x=>x[0]==='speak'&&x[1]==='ĐÚNG'));
 calls.length=0;ctx.revelation={message:'KHÔNG ĐÚNG',private:true,confirmed:false};
 vm.runInContext("battlePresentRevelation('artifact_action_check_third_faction',revelation)",ctx);
 assert.ok(calls.some(x=>x[0]==='speak'&&x[1]==='KHÔNG ĐÚNG'));
 calls.length=0;ctx.revelation={message:'ĐÚNG',private:true,confirmed:true};
 vm.runInContext("battlePresentRevelation('action_seer',revelation)",ctx);
 assert.ok(calls.some(x=>x[0]==='audio'&&x[2]==='audio_system_seer_wolf'));
 calls.length=0;ctx.revelation={message:'Tiên Tri',private:true,roleName:'Tiên Tri',roleId:'role_seer'};
 vm.runInContext("battlePresentRevelation('action_destroyer_scry',revelation)",ctx);
 assert.ok(calls.some(x=>x[0]==='audio'&&x[1]==='cards'&&x[2]==='role_seer'));
 assert.match(gm,/battlePresentRevelation\(a\.actionId,response\.result\)/);
 assert.match(gm,/playRoomApi\('\/battle-undo'/);
});

test('DEMO does not execute an already spent Artifact on following day',()=>{
 const ctx=vm.createContext({status:()=>false,rules:{resolvedType:()=> 'effect_notice'}});
 vm.runInContext(section(demo,'function dayActions(ctx,meta,usage,ballot){',
  '// Only the authenticated actor'),ctx);
 const card={id:'artifact_09',functions:[{actionId:'artifact_action_check_villager',phase:'day',
    usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:false}]};
 const data={assignments:[{loginId:'alice',roleId:'role_villager',artifactId:'artifact_09'}],
  cards:[{id:'role_villager',functions:[]}],artifacts:[card],rows:[],cycle:{accepted:[]},
  cfg:{artifactLimitPerCycle:3},spentArtifacts:new Set(['alice:artifact_09'])};
 ctx.data=data;ctx.meta={cycleNight:2};ctx.usage=[];ctx.ballot={};
 assert.equal(vm.runInContext('dayActions(data,meta,usage,ballot).length',ctx),0);
 data.spentArtifacts.clear();
 assert.equal(vm.runInContext('dayActions(data,meta,usage,ballot).length',ctx),1);
 // DEMO revelation stays in the GM event: WebSocket receives ONLY opaque ids.
 assert.match(demo,/demoEvent:\{id:event\.id,matchId:event\.matchId/);
 assert.doesNotMatch(section(demo,'room.broadcast({type:\'demo_event\'','});'),/revelation:/);
});

test('Server persists inspection privately and allows no public result broadcast',()=>{
 assert.match(server,/dayArtifactInspections:\+String\(meta\.matchId\)\+":"\+loginId/);
 assert.match(server,/this\.broadcast\(\{type:"private_notice_tick"/);
 assert.match(server,/dayLastInspection:/);
 assert.match(server,/UNDO_STATE_CHANGED/);
 assert.match(server,/message:inspectionAction\?"Artifact soi đã được xác nhận\.":message/);
});
