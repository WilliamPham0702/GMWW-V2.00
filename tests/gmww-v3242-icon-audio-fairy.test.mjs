import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const built=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const server=fs.readFileSync('src/index.js','utf8');
test('Icon tap invokes the configured action audio before opening either picker',()=>{
 const pointer=source.slice(source.indexOf('function battleIconBind(){'),source.indexOf('// Repaint the current GM turn',source.indexOf('function battleIconBind(){')));
 assert.match(pointer,/if\(!moved\)\{[\s\S]*?battlePlayConfiguredAudio\('actions',a\.actionId,a\.name\);[\s\S]*?if\(battleIsTransfer\(a\)\)/);
 assert.match(pointer,/if\(!playAudioMuted\(\)\)/);
 assert.ok(built.includes(pointer));
});
test('Yêu Tinh picker has exactly three illustrated directions and click confirmation',()=>{
 const panel=source.slice(source.indexOf('function battleRenderTransferPanel(){'),source.indexOf('function battleUpdateActionNavigation()',source.indexOf('function battleRenderTransferPanel(){')));
 for(const v of ["['left','11_dich_trai.webp','Dịch trái']","['none','50_yeu_tinh_xoay.webp','Không dịch']","['right','12_dich_phai.webp','Dịch phải']"])assert.ok(panel.includes(v));
 assert.match(panel,/battleState\.transferDir=button\.dataset\.transfer;void battleConfirm\(true\)/);
 assert.doesNotMatch(panel,/\[\['left','↩️'/);
 assert.match(css,/\.gmww-transfer-art>img/);
});
test('Both successful Fairy direction decisions and explicit no-op submit the actor to Server',async()=>{
 const start=source.indexOf('async function battleConfirm(confirmed=false){');
 const end=source.indexOf('\nfunction battleToggleDetails',start);
 assert.ok(start>0&&end>start);
 const snippet=source.slice(start,end);
 for(const direction of ['left','none','right']){
  let called=0,payload=null;
  const action={id:'fairy',actionId:'action_transfer_bite',name:'Dịch vết cắn',type:'effect_notice',targetCount:1,actorIds:['fairy1'],effectIds:[],unavailable:false};
  const state={busy:false,syncPending:false,actionId:'fairy',targets:[],transferDir:direction,nonce:'',key:'match1:night:1:turn1'};
  const c={battleConfirmAudioGate:false,battleState:state,playSceneState:{phase:'night',night:1},
   playSceneRuntime:{room:{matchId:'match1',cycleKey:'night1'}},battleAction:()=>action,
   battleTurn:()=>({id:'turn1'}),battleIsTransfer:a=>a.actionId==='action_transfer_bite',
   battleClear:()=>{state.actionId='';state.targets=[];state.transferDir=''},renderPlayBattle(){},
   playRoomApi:async(path,options)=>{assert.equal(path,'/battle-action');called++;payload=JSON.parse(options.body);return {ok:true,undoToken:'u1'}},
   gmHapticFeedback(){},battlePlayConfiguredAudio:async()=>false,battleAdvanceConfirmedTurn(){},
   playSyncRoom:async()=>true,playFlashError:msg=>{throw Error(msg)},
   document:{getElementById:()=>null},globalThis:{crypto:{randomUUID:()=> 'nonce1'},performance:{now:()=>100}},
   console:{info(){}},Date,Math,Promise,confirm:()=>true};
  vm.createContext(c);vm.runInContext(snippet,c);
  await vm.runInContext('battleConfirm(true)',c);
  assert.equal(called,1,direction);assert.equal(payload.direction,direction);assert.equal(payload.type,'effect_notice');
  assert.deepEqual(payload.targetIds,['fairy1']);
 }
});
test('Server rejects malformed Fairy direction and actor/target mismatches before writing',()=>{
 assert.match(server,/INVALID_FAIRY_DIRECTION/);
 assert.match(server,/\["left","none","right"\]\.includes\(String\(body\?\.direction\|\|""\)\)/);
 assert.match(server,/targets\.length!==1\|\|targets\[0\]!==actorId/);
});
