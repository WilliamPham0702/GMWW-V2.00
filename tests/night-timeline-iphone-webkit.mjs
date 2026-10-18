// Real battle handlers + markup in iPhone-sized WebKit, isolated mock room.
// No Production requests and no physical-device acceptance claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webkit} from 'playwright';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const handlers=app.slice(app.indexOf('/* Dedicated battle mode:'),app.indexOf('\nfunction renderPlayScene(){'));
const browser=await webkit.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await context.route('**/*',route=>route.abort());
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><body class="play-immersive"><section id="start"></section></body></html>');
 await page.evaluate(source=>{
   const parsed=new DOMParser().parseFromString(source,'text/html');
   document.getElementById('start').append(parsed.getElementById('playShell'));
   const root=document.getElementById('playShell');root.dataset.step='battle';root.dataset.phase='night';
 },html);
 await page.addStyleTag({content:fs.readFileSync('server-game/current/style.css','utf8')});
 await page.addStyleTag({content:'#start{display:block!important}.play-shell{width:100%;height:100vh}'});
 await page.addScriptTag({content:fs.readFileSync('server-game/current/battle-controls.js','utf8')});
 await page.addScriptTag({content:`
 const state={cards:[{id:'seer',name:'Tiên Tri',functions:[{id:'vision',actionId:'inspect',targetCount:1}]}],
 artifacts:[{id:'stone',name:'Đá Đổi Vai Trò',functions:[{id:'swap',actionId:'swap',targetCount:2}]}],
 actions:{role:[{id:'inspect',name:'Soi'}],artifacts:[{id:'swap',name:'Đổi Vai Trò'}]}};
 const owner={artifactId:'stone',artifactName:'Đá Đổi Vai Trò',loginId:'alice',playerId:'member:alice'};
 const playSceneState={step:'battle',phase:'night',night:1,autoGM:false};
 const queue=[{id:'wolf',kind:'wolf-introduction',label:'Bầy Sói'},
 {id:'early',kind:'early-artifact-window',label:'Artifact đầu ván',actions:[owner]},
 {id:'seer',kind:'role',label:'Tiên Tri',roleId:'seer',loginIds:['alice'],artifacts:[owner],durationSec:45},
 {id:'wake',kind:'village-wakeup',label:'Làng ơi dậy đi'}];
 const playSceneRuntime={room:{matchId:'isolated-test',cycleKey:'night-1'},artifactCycle:{accepted:[]},nightRuntime:{queue,cursor:2,currentId:'seer',completed:false,autoAdvance:false,autoPausedRemainingMs:45000}};
 const members=[{loginId:'alice',displayName:'An'},{loginId:'bob',displayName:'Bình'},{loginId:'carol',displayName:'Chi'}];
 const calls=[];
 const playLiveMembers=()=>members,playPlayerEffect=()=>'',playPlayerBlocked=()=>false,playAudioMuted=()=>false;
 const playEsc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const playFlashError=x=>{throw new Error(x)};
 const exitPlayImmersive=()=>{},openPlayEndSheet=()=>{},advancePlayPhase=()=>{},togglePlayAutoGM=()=>{},togglePlayAudio=()=>{};
 // This isolated test extracts only the battle handlers. Audio playback is
 // integration-tested separately with the actual media/IndexedDB helper.
 const battleAudioForTurn=()=>{},battleTurnAudioCue=()=>({kind:'system',targetId:'audio_system_day_wakeup',name:'Làng ơi dậy đi'}),battlePlayConfiguredAudio=async()=>false,battleReplayAudio=()=>{},battleUnlockAudioFromGesture=()=>{};
 const playRoomApi=async(path,options)=>{
  const body=JSON.parse(options.body);calls.push({path,body});
  if(path==='/turn'){const rt=playSceneRuntime.nightRuntime;rt.cursor=body.targetIndex;rt.currentId=rt.queue[rt.cursor].id;return {runtime:rt}}
  if(path==='/battle-action'){
    playSceneRuntime.artifactCycle.accepted=[{artifactId:body.artifactId,playerId:'member:'+body.actorId}];
    playSceneRuntime.battleUndo={token:'undo-last',label:body.effectName,turnId:body.turnId};
    return {ok:true,undoToken:'undo-last',targets:body.targetIds};
  }
  if(path==='/battle-undo'){
    playSceneRuntime.artifactCycle.accepted=[];playSceneRuntime.battleUndo=null;return {ok:true,undone:true};
  }
  throw new Error('unexpected path');
 };
 const playSyncRoom=async()=>{renderPlayBattle();return {}};
 window.confirm=()=>true;
 ${handlers}
 initBattleControls();renderPlayBattle();
 `});
 assert.equal(await page.locator('[data-battle-action]').count(),2);
 assert.equal(await page.locator('#battleCountdown').textContent(),'00:45');
 assert.equal(await page.locator('[data-battle-index="3"]').count(),1,'wake step is selectable exactly once');
 const artifact=page.locator('[data-battle-action]').filter({hasText:'Đá Đổi Vai Trò'});
 assert.match(await artifact.textContent(),/Đổi Vai Trò.*An/);
 // V3.99: actions are always visible in the scrollable tray, not in the wolf Info panel.
 assert.equal(await artifact.isVisible(),true);
 assert.equal(await page.locator('#battleTargetSheet').isVisible(),false);
 await artifact.dblclick();
 assert.equal(await page.locator('#battleTargetSheet').isVisible(),true);
 await page.locator('[data-battle-candidate="bob"]').click();
 await page.locator('[data-battle-candidate="carol"]').click();
  assert.equal((await page.locator('#battleTargetPrompt').textContent()).trim(),'','selected targets hide prompt text in the compact confirmation state');
  assert.equal(await page.locator('#battleTargetCandidates').isVisible(),false,'candidate list is hidden once target selection is complete');
  assert.equal(await page.locator('#battleTargetCancel').textContent(),'HỦY');
  assert.equal(await page.locator('#battleTargetConfirm').textContent(),'OK');
 await page.locator('#battleTargetConfirm').click();
 const sent=await page.evaluate(()=>calls.filter(x=>x.path==='/battle-action').map(x=>x.body));
 assert.equal(sent.length,1);assert.equal(sent[0].artifactId,'stone');
 assert.equal(sent[0].actorId,'alice');assert.equal(sent[0].actionId,'swap');
 assert.deepEqual(sent[0].targetIds,['bob','carol']);
 assert.equal(await page.locator('#battleTargetSheet').isVisible(),false);
 // V3.142: OK advances to the next role automatically, here the wake-up turn.
 await page.waitForFunction(()=>playSceneRuntime.nightRuntime.currentId==='wake');
 assert.equal(await page.locator('[data-battle-action]').count(),0);
 // Undo is still available on the next turn and restores Artifact use.
 await page.locator('#battleUndoButton').click();
 assert.equal(await page.evaluate(()=>calls.filter(x=>x.path==='/battle-undo').length),1);
 await page.locator('[data-battle-index="2"]').click();
 assert.equal(await page.locator('[data-battle-action]').count(),2);
 await page.locator('[data-battle-index="1"]').click();
 assert.equal(await page.evaluate(()=>playSceneRuntime.nightRuntime.currentId),'early');
 // Verify an actual finger-scroll inside Timeline submits exactly one move.
 // The click above must never be mistaken for a swipe caused by scrollIntoView.
 const swipeTurn=await page.evaluate(async()=>{
   const el=document.getElementById('battleTimeline');
   const gesture=(name,key,x)=>{
     const e=new Event(name,{bubbles:true});Object.defineProperty(e,key,{value:[{clientX:x,clientY:185}]});
     el.dispatchEvent(e);
   };
   gesture('touchstart','touches',340);
   gesture('touchmove','touches',120);
   el.scrollLeft+=Math.max(50,el.clientWidth/2);
   el.dispatchEvent(new Event('scroll'));
   gesture('touchend','changedTouches',120);
   await new Promise(resolve=>setTimeout(resolve,330));
   return playSceneRuntime.nightRuntime.currentId;
 });
 assert.equal(swipeTurn,'seer','Horizontal swipe should advance one confirmed server turn');
 await page.locator('[data-battle-index="1"]').click();
 assert.equal(await page.evaluate(()=>playSceneRuntime.nightRuntime.currentId),'early','Tapping a turn never silently navigates again');
 const shell=page.locator('#playShell');
 await shell.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:1,clientX:350,clientY:430});
 await new Promise(resolve=>setTimeout(resolve,120));
 await shell.dispatchEvent('pointerup',{pointerType:'touch',pointerId:1,clientX:110,clientY:430});
 assert.equal(await page.evaluate(()=>playSceneRuntime.nightRuntime.currentId),'seer');
 await page.locator('[data-battle-index="3"]').click();
 assert.equal(await page.evaluate(()=>playSceneRuntime.nightRuntime.currentId),'wake');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/gmww-night-timeline-iphone-webkit.png',fullPage:true});
 console.log('iPhone-sized WebKit: scrolling actions, double-tap targets, atomic confirmation, undo, countdown and timeline PASS');
 await context.close();
}finally{await browser.close()}
