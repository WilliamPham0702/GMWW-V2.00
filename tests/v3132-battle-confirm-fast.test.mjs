import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const runtimeVersion=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
const part=read('server-game/src/40-battle-and-timeline.part');
const app=read('server-game/current/app.js');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const worker=read('src/index.js');

function harness(result={ok:true,undoToken:'undo-1',label:'Bảo Vệ',serverProcessingMs:45}){
  let requests=0,syncCalls=0,renders=0,syncResolve;
  const sync=new Promise(resolve=>{syncResolve=resolve});
  const errors=[],title={textContent:''},logs=[];
  const battleState={key:'m1:night:1:role:guard',busy:false,syncPending:false,
    actionId:'protect',targets:['alice'],nonce:'',impacts:new Map()};
  const room={room:{matchId:'m1',cycleKey:'night-1'},assignments:[],battleUndo:null};
  const action={name:'Bảo Vệ',actionId:'action_protect',type:'effect_notice',
    actorIds:['guard'],targetCount:1,effectIds:[],unavailable:false};
  const context={battleState,playSceneRuntime:room,playSceneState:{phase:'night',night:1},
    battleAction:()=>action,battleIsTransfer:()=>false,battlePlayConfiguredAudio:()=>Promise.resolve(true),battleTurn:()=>({id:'role:guard'}),
    battleMember:id=>({displayName:id}),playRoomApi:async()=>{requests++;return result},
    playSyncRoom:()=>{syncCalls++;return sync},playFlashError:msg=>errors.push(msg),
    renderPlayBattle:()=>{renders++},battleVisualType:()=> 'protected',
    battleClear:()=>{battleState.targets=[];battleState.actionId='';battleState.nonce=''},
    document:{getElementById:id=>id==='playPhaseTitle'?title:null},
    state:{cards:[]},confirm:()=>true,console:{info:(...v)=>logs.push(v)},Date};
  const start=part.indexOf('async function battleConfirm(confirmed=false){');
  const end=part.indexOf('function battleToggleDetails(',start);
  assert.ok(start>0&&end>start,'production confirmation function found');
  vm.runInNewContext(part.slice(start,end)+'\n globalThis.runBattleConfirm=battleConfirm;',context);
  return {context,action,battleState,room,title,errors,logs,resolve:syncResolve,
    get requests(){return requests},get syncCalls(){return syncCalls},get renders(){return renders}};
}
test('V3.132: server ACK unlocks immediate recorded feedback, without waiting for room sync',async()=>{
  const h=harness();
  await h.context.runBattleConfirm(true);
  assert.equal(h.requests,1);
  assert.equal(h.syncCalls,1);
  assert.equal(h.battleState.busy,false);
  assert.equal(h.battleState.syncPending,true,'do not submit against stale role ledger');
  assert.equal(h.title.textContent,'✓ ĐÃ GHI NHẬN');
  assert.equal(h.room.battleUndo.token,'undo-1');
  assert.equal(h.battleState.impacts.has('alice'),false,'legacy expanding impact is retired; confirmed status comes from server');
  assert.equal(h.logs[0][0],'GMWW battle-confirm timing');
  assert.equal(h.logs[0][1].serverProcessingMs,45);
  h.battleState.targets=['alice'];
  await h.context.runBattleConfirm(true);
  assert.equal(h.requests,1,'a second tap while refreshing never double-commits');
  h.resolve({ok:true});
  await Promise.resolve();await Promise.resolve();
  assert.equal(h.battleState.syncPending,false);
  assert.ok(h.renders>0);
});
test('V3.132: rejected action is never shown as recorded or silently resubmitted',async()=>{
  const h=harness({ok:false,error:'STALE_TURN'});
  await h.context.runBattleConfirm(true);
  assert.equal(h.requests,1);
  assert.equal(h.syncCalls,0);
  assert.equal(h.battleState.syncPending,false);
  assert.equal(h.battleState.busy,false);
  assert.notEqual(h.title.textContent,'✓ ĐÃ GHI NHẬN');
  assert.match(h.errors.join(' '),/STALE_TURN/);
});
test('V3.132: compact OK-only panel keeps cancellation while selecting and allows changing target',()=>{
  assert.match(html,/id="battleTargetCancel">HỦY/);
  assert.doesNotMatch(html,/id="battleCancel"/);
  assert.match(part,/function battlePickTarget\(id,actionId\)/);
  assert.match(part,/battleOpenTargetSheet/);
  assert.match(css,/is-confirm-only #battleTargetCancel\{display:none!important\}/);
  assert.match(css,/is-confirm-only #battleTargetConfirm\{/);
  assert.match(css,/width:64px!important/);
  assert.match(part,/pending\.hidden=!action\|\|!battleState\.targets\.length\|\|battleState\.targetSheet/);
  assert.match(part,/battleConfirm\(true\)/);
  assert.ok(app.includes("const VERSION='"+runtimeVersion+"'"));
});
test('V3.132: batch reuses only authenticated request; undo, receipt and action rules remain',()=>{
  assert.match(worker,/async gmBattleAction\(request,body\)\{\s*const actionStartedAt=Date\.now\(\);\s*const auth=await this\.gmAuthorized\(request\)/);
  assert.match(worker,/const response=await this\.executeGmInteraction\(request,action,auth\)/);
  assert.match(worker,/async executeGmInteraction\(request,body,verifiedAuth=null\)/);
  assert.match(worker,/const auth=verifiedAuth\|\|await this\.gmAuthorized\(request\)/);
  assert.match(worker,/serverProcessingMs:Date\.now\(\)-actionStartedAt/);
  assert.match(worker,/await this\.ctx\.storage\.put\(undoKey,record\)/);
  assert.match(worker,/await this\.ctx\.storage\.put\(receiptKey,\{fingerprint,result\}\)/);
  assert.match(worker,/isBattleActorBlocked/);
  assert.match(worker,/checkBattleRoleActionUsage/);
  assert.match(worker,/await restore\(before\)/);
  assert.ok(worker.includes('VERSION="V'+runtimeVersion+'"'));
});
