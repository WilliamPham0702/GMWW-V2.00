// Actual cross-origin browser fetches to local workerd/SQLite. No Production writes.
import assert from 'node:assert/strict';import fs from 'node:fs';import http from 'node:http';import {webkit} from 'playwright';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8'),battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8'),completionSource=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8'),membersSource=fs.readFileSync('server-game/src/20-members-and-roster.part','utf8'),worker=fs.readFileSync('src/index.js','utf8');
const auth=worker.match(/const GM_SYNC_TOKEN="([^"]+)"/)[1],serial=Date.now().toString(36);
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return s.slice(i,j)};
const req=async(path,body,token=auth)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert.equal(r.ok,true,path+': '+JSON.stringify(d));return d};
const people=Array.from({length:8},(_,i)=>({loginId:'demo'+i+serial,displayName:'Demo Test '+i+' '+serial,seatId:i+1}));
for(const person of people)await req('/api/members/register',{...person,gameCharacterId:'character-01'});
// Directory rendering projects clock-driven idle movement and online TTL. Compare
// stored account fields, including presence timestamps/room/readiness and history.
const accountSnapshot=members=>members.filter(m=>people.some(p=>p.loginId===m.loginId)).map(m=>Object.fromEntries(
 ['loginId','displayName','avatarId','gameCharacterId','source','createdAt','updatedAt','lastSeenAt','currentRoomCode','ready','resetRequestedAt','passwordResetAt','stats','history'].map(k=>[k,m[k]])));
const before=accountSnapshot((await req('/api/gm/members')).members);
const pageServer=http.createServer((_q,r)=>{r.writeHead(200,{'content-type':'text/html'});r.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body></body></html>')});await new Promise(r=>pageServer.listen(0,'127.0.0.1',r));
const browser=await webkit.launch({headless:true});
const fn={id:'bite',actionId:'action_wolf_bite',name:'Cắn',phase:'night',targetCount:1,noSelf:true,usageMode:'eachNight',usageCount:1};
const cards=[{id:'role_werewolf',name:'Sói',faction:'Phe Sói',functions:[fn]},{id:'role_villager',name:'Dân',faction:'Phe Dân',functions:[]},...[["role_seer","Tiên Tri","action_seer","Soi"],["role_guard","Bảo Vệ","action_protect","Bảo Vệ"],["role_witch","Phù Thuỷ","action_witch_kill","Giết"]].map(([id,name,actionId,actionName])=>({id,name,faction:'Phe Dân',functions:[{...fn,id:actionId,actionId,name:actionName,usageMode:id==='role_witch'?'onceGame':'eachNight'}]}))];const rosterCards=people.map((_,i)=>cards[i===0?0:i<5?1:i-3]);
for(const card of cards)card.actions=card.functions.map(fn=>({id:fn.actionId,name:fn.name}));
let code;
try{
 for(const mode of ['online','offline']){
  const gameConfig={id:'demo-test',name:'Demo test',playerCount:8,roles:cards.map((r,i)=>({roleId:r.id,roleName:r.name,faction:r.faction,count:i===1?4:1,order:i+1,actionDurationSec:8})),artifactsEnabled:false,timing:{autoAdvance:false,villageDiscussionSec:1,wolfDiscussionSec:1,gallowsNominationSec:10,gallowsVoteSec:10,defaultActionSec:1}};
  const created=await req('/api/rooms',{demo:true,roomName:'Demo browser '+mode,roomMode:mode,seatCount:8,gameConfig});code=created.roomCode;
  const gm=(path,body)=>req('/api/gm/rooms/'+code+path,body);
  await gm('/participants',{members:people,replace:true});await gm('/seat-lock',{locked:true});
  await gm('/assignments',{matchId:'demo-'+serial+mode,assignments:people.map((p,i)=>({...p,roleId:rosterCards[i].id,roleName:rosterCards[i].name,faction:rosterCards[i].faction,roleCard:rosterCards[i]}))});
  await gm('/start',{matchId:'demo-'+serial+mode});await gm('/cycle',{phase:'night',night:1,cycleKey:'night-1'});
  assert.equal((await gm('')).room.roomMode,mode);assert.ok((await req('/api/rooms')).rooms.some(r=>r.code===code&&r.demo===true));
  const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+pageServer.address().port);
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  await page.evaluate(html=>{const parsed=new DOMParser().parseFromString(html,'text/html');document.body.className='play-immersive';const start=document.createElement('section');start.id='start';start.className='page active';start.innerHTML='<div id="playShell" data-step="battle"><section id="playBattleDock" class="play-battle-dock battle-float-v396"></section></div>';start.querySelector('#playBattleDock').append(parsed.getElementById('battleDemoObserver'),parsed.getElementById('battleWolfMenu'));const home=document.createElement('section');home.id='home';home.className='page';document.body.append(home);document.body.append(start);document.body.append(parsed.getElementById('playMatchCompletionSheet'));},html);
  await page.addStyleTag({content:fs.readFileSync('server-game/current/style.css','utf8')});
  // E2E fixture does not install the GM campfire opener; expose the nested menu explicitly.
  await page.addStyleTag({content:'#battleWolfMenu{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;pointer-events:auto!important}'});
  await page.addScriptTag({content:fs.readFileSync('server-game/current/battle-controls.js','utf8')});
  const boot=`const GMWW_SERVER_BASE=${JSON.stringify(base)},GMWW_GM_AUTH=${JSON.stringify(auth)};const state=${JSON.stringify({cards,artifacts:[],actions:{role:[{id:'action_wolf_bite',name:'Cắn'}]}})};
const playSceneState={roomCode:${JSON.stringify(code)},step:'battle',phase:'night',night:1},playSceneRuntime={room:{demo:true},syncSerial:0,busy:false};
const battleState={busy:false,syncPending:false,targets:[],impacts:new Map()};const ring=document.createElement('div');ring.id='playPlayerRing';for(const p of ${JSON.stringify(people)}){const el=document.createElement('div');el.dataset.playPlayerId=p.loginId;el.innerHTML='<div class="play-player-over"></div>';ring.append(el)}document.getElementById('playShell').append(ring);const actionBar=document.createElement('div');actionBar.id='battleActionBar';document.body.append(actionBar);let playStagePublishPending=0;const visuals=[];const observed=[];new MutationObserver(()=>{observed.push(document.getElementById('battleDemoObserver').textContent);visuals.push({action:[...document.querySelectorAll('[data-battle-action].demo-action-active')].map(el=>el.dataset.battleAction),targets:[...document.querySelectorAll('#playPlayerRing .is-battle-target')].map(el=>el.dataset.playPlayerId),badges:[...document.querySelectorAll('#playPlayerRing .battle-target-mark')].map(el=>el.textContent)})}).observe(document.getElementById('battleDemoObserver'),{subtree:true,childList:true,characterData:true});const calls=[];const nativeFetch=fetch;globalThis.fetch=async(...args)=>{const response=await nativeFetch(...args);calls.push({url:String(args[0]),status:response.status,body:args[1]?.body||''});return response};
const isLivePlayRoom=()=>true,savePlayScene=()=>{},connectPlaySocket=()=>{},ensurePlayRealtimePoll=()=>{},playSyncStatusDisplayDraft=async()=>{},playFlashError=message=>{globalThis.lastDemoError=message},clearStalePlayRoom=()=>{},forgetPlayRoom=()=>{};
const playLiveMembers=()=>playSceneRuntime.players||[],playPlayerEffect=id=>playSceneRuntime.activeEffects?.some(x=>x.loginId===id&&x.type==='dead')?'dead':'alive',playPlayerBlocked=id=>playPlayerEffect(id)==='dead',playBlockReason=()=>'',battleShowResultPopup=()=>{};
const battleUsed=()=>false,battleUnlockAudioFromGesture=()=>{},battleTurnAudioCue=()=>null,playAudioMuted=()=>false,battlePlayConfiguredAudio=async()=>true,battleClear=()=>{battleState.targets=[]};const renderPlayBattle=()=>{actionBar.replaceChildren(...battleActions().map(a=>{const b=document.createElement('button');b.dataset.battleAction=a.id;b.textContent=a.name;return b}));demoRenderControls();battleMarkPlayers()},renderPlayScene=renderPlayBattle;Math.random=()=>0.2;
`;
  await page.addScriptTag({content:boot+between(setup,'/* Demo controls now live at the top','function openPlayRoomEditor(')+between(setup,'function disconnectPlaySocket(','function stopPlayGlobalVillagePoll(')+between(completionSource,'function exitPlayImmersive(','async function openPlayCreateRoomSheet(')+between(completionSource,'/* Match completion is shared','async function openPlayEndSheet(){')+between(membersSource,'function gmHeaders(','const MEMBER_CHARACTER_COUNT=')+between(setup,'async function playRoomApi(','function disconnectPlaySocket(')+between(setup,'async function playSyncRoom(','function playMovementPoint(')+between(battle,'async function playSetServerCycle(','function syncPlayAutoAdvance(')+between(battle,'const demoRunner=','const battleState=')+between(battle,'const battleRules=','const battleAction=')+between(battle,'async function battleNavigateIndex(index){','function battleNavigateRelative(delta){')+between(battle,'function battleMarkPlayers(){','function battleGallowsTick(){')+between(battle,'function gmwwMenuSnap(','/* V3.135:')+between(battle,'function battleTargetClampPosition(','function battlePlaceTargetSheet(')+`
${between(battle,"  document.getElementById('battleDemoToggle')?.addEventListener", "  document.getElementById('battleGMAudio')?.addEventListener")}
initPlayCompletion();battleBindAuxiliaryDrag('battleDemoObserver','header');globalThis.inspectDemo=()=>({running:demoRunner.running,steps:demoRunner.steps,error:demoRunner.error,phase:playSceneState.phase,room:playSceneRuntime.room,completion:playCompletionState,event:demoRunner.lastEvent,visuals,observed,calls});globalThis.readyDemo=playSyncRoom(true);`});
  await page.evaluate(()=>readyDemo);for(const speed of [2,5,10]){
    await page.evaluate(()=>document.getElementById('battleDemoSpeed').click());
    await page.waitForFunction(rate=>playSceneRuntime.demoControl?.speed===rate,speed,{timeout:12000});
  }
  assert.equal(await page.locator('#battleWolfMenu #battleDemoPanel').count(),1);
  // V3.172 keeps the controls inside Menu GM. Only the observer floats/drags.
  await page.evaluate(()=>{document.getElementById('battleWolfMenu').hidden=false});
  assert.equal(await page.locator('#battleDemoToggle').isVisible(),true);
  assert.match(await page.locator('#battleDemoTurn').innerText(),/Đêm 1.*Lượt/);
  const info=await page.locator('#battleDemoObserver').boundingBox(),handle=await page.locator('#battleDemoObserver header').boundingBox();
  await page.mouse.move(handle.x+30,handle.y+10);await page.mouse.down();await page.mouse.move(handle.x+50,handle.y+75,{steps:5});await page.mouse.up();
  assert.ok(Math.abs((await page.locator('#battleDemoObserver').boundingBox()).y-info.y)>20,'Observation panel must drag');
  assert.equal(await page.locator('#battleGMAuto').getAttribute('hidden'),null);assert.equal(await page.locator('#battleGMAudio').getAttribute('hidden'),null);
  // Server starts with the match. Button pauses; a fresh viewer must not restart it.
  await page.waitForFunction(()=>inspectDemo().running);await page.evaluate(()=>document.getElementById('battleDemoToggle').click());
  const paused=await page.evaluate(()=>inspectDemo());assert.equal(paused.running,false);await page.waitForTimeout(500);
  assert.equal((await page.evaluate(()=>inspectDemo())).steps,paused.steps);assert.match(await page.locator('#battleDemoToggle').getAttribute('aria-label'),/tiếp tục/i);
  await page.evaluate(()=>document.getElementById('battleDemoToggle').click());await page.waitForFunction(()=>inspectDemo().running);
  await page.waitForFunction(()=>inspectDemo().observed.some(t=>t.includes('đã thực hiện hành động')&&t.includes('Cắn')&&t.includes('Demo Test')&&t.includes(' đến '))||inspectDemo().error,null,{timeout:20000});
  let snapshot=await page.evaluate(()=>inspectDemo());assert.equal(snapshot.error,'');
  // A Server-owned DEMO can advance before a client polls its transient effect.
  // Pause the real demo, then project the current match/turn into the same
  // action/target rendering path; this tests the visuals without a timing race.
  await page.evaluate(()=>document.getElementById('battleDemoToggle').click());
  await page.waitForFunction(()=>!inspectDemo().running,null,{timeout:10000});
  await page.evaluate(()=>{
    const bar=document.getElementById('battleActionBar');
    let action=bar.querySelector('[data-battle-action]');
    if(!action){action=document.createElement('button');action.dataset.battleAction='action_wolf_bite';action.textContent='Cắn';bar.append(action)}
    const tokens=[...document.querySelectorAll('#playPlayerRing [data-play-player-id]')];
    if(!tokens.length)throw Error('Missing player tokens for visual projection');
    const room=playSceneRuntime.room;
    demoRunner.visual={
      matchId:String(room.matchId||''),cycleKey:String(room.cycleKey||''),
      turnId:String(battleTurn()?.id||playSceneState.phase),
      actionId:action.dataset.battleAction,actorId:tokens[0].dataset.playPlayerId,
      targetIds:[tokens[tokens.length-1].dataset.playPlayerId]
    };
    battleState.targets=[];
    demoRenderVisual();battleMarkPlayers();
  });
  await page.waitForFunction(()=>document.querySelector('[data-battle-action].demo-action-active')&&
    document.querySelector('#playPlayerRing .is-battle-target .battle-target-mark')?.textContent.includes('MỤC TIÊU'),null,{timeout:3000});
  await page.evaluate(()=>document.getElementById('battleDemoToggle').click());
  await page.waitForFunction(()=>inspectDemo().running,null,{timeout:10000});
  // All automatic gameplay is server-side: this browser only requests state/control.
  assert.ok(!snapshot.calls.some(x=>/\/(battle-action|day-action|turn|cycle|gallows)$/.test(x.url)&&x.body),'viewer never submits automatic gameplay');
  await page.waitForFunction(()=>inspectDemo().completion.winner||inspectDemo().error,null,{timeout:60000});snapshot=await page.evaluate(()=>inspectDemo());assert.equal(snapshot.error,'');assert.equal(snapshot.room.phase,'running','Winner announcement must wait for GM');assert.equal(snapshot.running,false);await page.locator('#playCompletionConfirm').waitFor({state:'visible'});await page.click('#playCompletionConfirm');await page.waitForFunction(()=>inspectDemo().completion.completed,null,{timeout:15000});snapshot=await page.evaluate(()=>inspectDemo());assert.equal(snapshot.room.phase,'lobby');await page.locator('#playCompletionChoices').waitFor({state:'visible'});const surface=await page.locator('.play-completion-card').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,columns:getComputedStyle(document.getElementById('playCompletionChoices')).gridTemplateColumns}));assert.match(surface.bg,/linear-gradient/);assert.equal(surface.columns.split(' ').length,2);await page.click('[data-completion-next="exit"]');await page.waitForFunction(()=>document.getElementById('home').classList.contains('active')&&!document.body.classList.contains('play-immersive'));assert.equal(await page.locator('#playMatchCompletionSheet').isVisible(),false);assert.deepEqual(errors,[]);
  await context.close();console.log('PASS cross-origin iPhone WebKit Demo '+mode+': CORS, drag, start/pause/resume, actual night actions, day votes, finish');
 }
 const after=accountSnapshot((await req('/api/gm/members')).members);assert.deepEqual(after,before,'Demo must not write real member presence/history/statistics');console.log('PASS Demo existing-member snapshots remain unchanged in both modes');
 const regular=await req('/api/rooms',{roomName:'Ordinary completion test',roomMode:'offline',seatCount:8});
 const gmRegular=(path,body)=>req('/api/gm/rooms/'+regular.roomCode+path,body);
 await gmRegular('/participants',{members:people.slice(0,2),replace:true});await gmRegular('/seat-lock',{locked:true});
 await gmRegular('/assignments',{matchId:'ordinary-'+serial,assignments:people.slice(0,2).map((p,i)=>({...p,roleId:cards[i].id,roleName:cards[i].name,faction:cards[i].faction,roleCard:cards[i]}))});await gmRegular('/start',{matchId:'ordinary-'+serial});
 const completed=await gmRegular('/end',{matchId:'ordinary-'+serial,winnerFaction:'Phe Sói'});assert.equal((await gmRegular('/end',{matchId:'ordinary-'+serial,winnerFaction:'Phe Sói'})).idempotent,true);
 const ordinaryMembers=(await req('/api/gm/members')).members;
 for(const [i,p] of people.slice(0,2).entries()){const m=ordinaryMembers.find(m=>m.loginId===p.loginId);assert.equal(m.history.filter(h=>h.matchId==='ordinary-'+serial).length,1);assert.equal(i===0?m.stats.wins:m.stats.losses,1)}
 const prepared=await gmRegular('/reset',{postGame:true,preserveParticipants:true,transactionId:'replay-'+serial,expectedResetVersion:completed.room.resetVersion||0});assert.equal(prepared.players.length,2);assert.equal(prepared.room.seatsLocked,true);assert.equal(prepared.room.cycleNight,0);assert.equal((await gmRegular('/reset',{postGame:true,preserveParticipants:true,transactionId:'replay-'+serial})).idempotent,true);
 console.log('PASS ordinary room completion, winner histories recorded exactly once, replay retains participants/seats');

}finally{await browser.close();await new Promise(r=>pageServer.close(r));}
