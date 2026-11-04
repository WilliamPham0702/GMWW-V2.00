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
 await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body class="play-immersive"><section id="start"></section></body></html>');
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
 const exitPlayImmersive=()=>{},openPlayEndSheet=()=>{},openPlayCompletionSheet=()=>{},initDemoPanel=()=>{},demoRenderObserver=()=>{},demoRenderVisual=()=>{},demoVisualCurrent=()=>null,demoObserve=()=>{},advancePlayPhase=()=>{},togglePlayAutoGM=()=>{},togglePlayAudio=()=>{};
 // Overlay positioning is tested independently; isolate it from timeline controls.
 const gmwwRestoreDock=()=>false,gmwwPlaceWolfMenuAtFire=()=>{};
 // Module 30 and 45 are not extracted into this isolated legacy timeline harness.
 const gmwwSetupFreeBattleIcons=()=>{},gmwwGMChatMount=()=>{};
 // This isolated test extracts only the battle handlers. Audio playback is
 // integration-tested separately with the actual media/IndexedDB helper.
 const battleAudioForTurn=()=>{},battleTurnAudioCue=()=>({kind:'system',targetId:'audio_system_day_wakeup',name:'Làng ơi dậy đi'}),battleFindAudio=()=>null,battleWarmAudio=async()=>null,battlePlayConfiguredAudio=async()=>false,battleReplayAudio=()=>{},battleUnlockAudioFromGesture=()=>{};
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
 const artifact=page.locator('[data-battle-action][data-battle-kind="artifact"]');
 assert.equal((await artifact.textContent()).trim(),'Đổi Vai Trò','Artifact button displays only the human-readable action name');
 // V3.99: actions are always visible in the scrollable tray, not in the wolf Info panel.
 assert.equal(await artifact.isVisible(),true);
 assert.equal(await page.locator('#battleTargetSheet').isVisible(),false);
 await page.evaluate(()=>{demoRunner.running=true}); // GM actions stay enabled while DEMO is running.
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
 // A prior index click commits asynchronously; don't start a second gesture before
 // its server-authoritative transition has settled (especially on narrow iPhone).
 await page.waitForFunction(()=>playSceneRuntime.nightRuntime.currentId==='early'&&!battleState.busy&&!battleState.syncPending);
 // Verify an actual finger-scroll inside Timeline submits exactly one move.
 // The click above must never be mistaken for a swipe caused by scrollIntoView.
 const swipeTurn=await page.evaluate(async()=>{
   const el=document.getElementById('battleTimeline');
    // The standardized wider GM rail can fit every chip: constrain this test to ensure overflow.
    el.style.width='175px';el.style.maxWidth='175px';el.style.overflowX='auto';
   [...el.children].forEach(child=>{child.style.flex='0 0 112px';child.style.minWidth='112px'});
   const gesture=(name,key,x)=>{
     const e=new Event(name,{bubbles:true});Object.defineProperty(e,key,{value:[{clientX:x,clientY:185}]});
     el.dispatchEvent(e);
   };
   gesture('touchstart','touches',340);
   gesture('touchmove','touches',120);
   el.scrollLeft+=Math.max(50,el.clientWidth/2);
   el.dispatchEvent(new Event('scroll'));
   gesture('touchend','changedTouches',120);
   await new Promise(resolve=>setTimeout(resolve,650));
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

 // Day selector: actual handlers and responsive CSS, with legal role + Artifact actions.
 await page.evaluate(()=>{
   playSceneState.phase='day';
   state.cards[0].functions=[{id:'day-vision',actionId:'inspect',phase:'day',targetCount:1}];
   state.actions.role[0].name='Quan sát người chơi và công bố kết quả ban ngày';
   state.artifacts[0].functions=[{id:'swap',actionId:'swap',phase:'day',targetCount:2}];
   playSceneRuntime.assignments=[{loginId:'alice',roleId:'seer',artifactId:'stone'}];
   playSceneRuntime.activeEffects=[];playSceneRuntime.recentInteractions=[];
   renderPlayBattle();
 });
 for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>innerWidth),width,'WebKit layout viewport must match the requested iPhone width');
   assert.equal(await page.locator('#battleActionTray').isVisible(),false,'Day must not show the cramped inline list');
   await page.locator('#battleDayActionToggle').click();
   assert.equal(await page.locator('#battleDayActionMenu').isVisible(),true,'A single tap opens the picker');
   assert.equal(await page.locator('#battleDayActionList button').count(),2);
   const layout=await page.evaluate(()=>{
     const ids=['playBattleClockFloat','battleDayNoticeFloat','battleDayActionFloat','battleDayGallowsFloat','battleUndoFloat'];
     const boxes=ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}});
     const labels=[...document.querySelectorAll('#battleDayActionList button span')];
     return {boxes,viewport:innerWidth,unclipped:labels.every(el=>el.scrollWidth<=el.clientWidth+1)};
   });
   assert.equal(layout.viewport,width,'iPhone WebKit must honor the configured CSS viewport width');
   assert.ok(layout.unclipped,'Full action names must wrap');
   layout.boxes.forEach((b,i)=>{assert.ok(b.width>30&&b.x>=0&&b.right<=width+1,JSON.stringify(layout));if(i)assert.ok(b.x>=layout.boxes[i-1].right-1,'Dock controls overlap')});
   await page.locator('#battleDayActionToggle').click();
   assert.equal(await page.locator('#battleDayActionMenu').isVisible(),false);
 }
 await page.locator('#battleDayActionToggle').click();
 await page.locator('#battleDayActionList button').first().click();
 assert.equal(await page.locator('#battleTargetSheet').isVisible(),true,'Picking a role opens its existing target chooser');
 await page.locator('#battleTargetCancel').click();
 await page.evaluate(()=>{playSceneRuntime.assignments=[];renderPlayBattle()});
 assert.equal(await page.locator('#battleDayActionToggle').isDisabled(),true);
 assert.equal(await page.locator('#battleDayActionMenu').isVisible(),false);
 await page.evaluate(()=>{playSceneState.phase='night';renderPlayBattle()});
 assert.equal(await page.locator('#battleDayActionFloat').isVisible(),false);
 assert.equal(await page.locator('#battleActionTray').isVisible(),true);
 assert.deepEqual(errors,[]);
 console.log('Day action selector: single tap, role/Artifact choices, targets and 320/390/430px dock PASS');
 await context.close();
}finally{await browser.close()}
