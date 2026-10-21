// Actual cross-origin browser fetches to local workerd/SQLite. No Production writes.
import assert from 'node:assert/strict';import fs from 'node:fs';import http from 'node:http';import {webkit} from 'playwright';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8'),battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8'),membersSource=fs.readFileSync('server-game/src/20-members-and-roster.part','utf8'),worker=fs.readFileSync('src/index.js','utf8');
const auth=worker.match(/const GM_SYNC_TOKEN="([^"]+)"/)[1],serial=Date.now().toString(36);
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return s.slice(i,j)};
const req=async(path,body,token=auth)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert.equal(r.ok,true,path+': '+JSON.stringify(d));return d};
const people=Array.from({length:8},(_,i)=>({loginId:'demo'+i+serial,displayName:'Demo Test '+i,seatId:i+1}));
for(const person of people)await req('/api/members/register',{...person,gameCharacterId:'character-01'});
const before=(await req('/api/gm/members')).members.filter(m=>people.some(p=>p.loginId===m.loginId));
const pageServer=http.createServer((_q,r)=>{r.writeHead(200,{'content-type':'text/html'});r.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body></body></html>')});await new Promise(r=>pageServer.listen(0,'127.0.0.1',r));
const browser=await webkit.launch({headless:true});
const fn={id:'bite',actionId:'action_wolf_bite',name:'Cắn',phase:'night',targetCount:1,noSelf:true,usageMode:'eachNight',usageCount:1};
const cards=[{id:'role_werewolf',name:'Sói',faction:'Phe Sói',functions:[fn]},{id:'role_villager',name:'Dân',faction:'Phe Dân',functions:[]}];
let code;
try{
 for(const mode of ['online','offline']){
  const gameConfig={id:'demo-test',name:'Demo test',playerCount:8,roles:cards.map((r,i)=>({roleId:r.id,roleName:r.name,faction:r.faction,count:i?7:1,order:i+1})),artifactsEnabled:false,timing:{autoAdvance:false,gallowsNominationSec:1,gallowsVoteSec:1,defaultActionSec:30}};
  const created=await req('/api/rooms',{demo:true,roomName:'Demo browser '+mode,roomMode:mode,seatCount:8,gameConfig});code=created.roomCode;
  const gm=(path,body)=>req('/api/gm/rooms/'+code+path,body);
  await gm('/participants',{members:people,replace:true});await gm('/seat-lock',{locked:true});
  await gm('/assignments',{matchId:'demo-'+serial+mode,assignments:people.map((p,i)=>({...p,roleId:cards[i?1:0].id,roleName:cards[i?1:0].name,faction:cards[i?1:0].faction,roleCard:cards[i?1:0]}))});
  await gm('/start',{matchId:'demo-'+serial+mode});await gm('/cycle',{phase:'night',night:1,cycleKey:'night-1'});
  assert.equal((await gm('')).room.roomMode,mode);assert.ok(!(await req('/api/rooms')).rooms.some(r=>r.code===code));
  const context=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+pageServer.address().port);
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  await page.evaluate(html=>{const parsed=new DOMParser().parseFromString(html,'text/html');document.body.className='play-immersive';const start=document.createElement('section');start.id='start';start.innerHTML='<div id="playShell" data-step="battle"><section id="playBattleDock" class="play-battle-dock battle-float-v396"></section></div>';start.querySelector('#playBattleDock').append(parsed.getElementById('battleDemoPanel'));document.body.append(start);},html);
  await page.addStyleTag({content:fs.readFileSync('server-game/current/style.css','utf8')});await page.addScriptTag({content:fs.readFileSync('server-game/current/battle-controls.js','utf8')});
  const boot=`const GMWW_SERVER_BASE=${JSON.stringify(base)},GMWW_GM_AUTH=${JSON.stringify(auth)};const state=${JSON.stringify({cards,artifacts:[],actions:{role:[{id:'action_wolf_bite',name:'Cắn'}]}})};
const playSceneState={roomCode:${JSON.stringify(code)},step:'battle',phase:'night',night:1},playSceneRuntime={room:{demo:true},syncSerial:0,busy:false};
let playStagePublishPending=0;const calls=[];const nativeFetch=fetch;globalThis.fetch=async(...args)=>{const response=await nativeFetch(...args);calls.push({url:String(args[0]),status:response.status,body:args[1]?.body||''});return response};
const isLivePlayRoom=()=>true,savePlayScene=()=>{},connectPlaySocket=()=>{},ensurePlayRealtimePoll=()=>{},playSyncStatusDisplayDraft=async()=>{},playFlashError=message=>{globalThis.lastDemoError=message},clearStalePlayRoom=()=>{},forgetPlayRoom=()=>{};
const playLiveMembers=()=>playSceneRuntime.players||[],playPlayerEffect=id=>playSceneRuntime.activeEffects?.some(x=>x.loginId===id&&x.type==='dead')?'dead':'alive',playPlayerBlocked=id=>playPlayerEffect(id)==='dead',playBlockReason=()=>'',battleShowResultPopup=()=>{};
const renderPlayBattle=()=>demoRenderControls(),renderPlayScene=()=>demoRenderControls();Math.random=()=>0.2;
`;
  await page.addScriptTag({content:boot+between(membersSource,'function gmHeaders(','const MEMBER_CHARACTER_COUNT=')+between(setup,'async function playRoomApi(','function disconnectPlaySocket(')+between(setup,'async function playSyncRoom(','function playMovementPoint(')+between(battle,'async function playSetServerCycle(','function syncPlayAutoAdvance(')+between(battle,'const demoRunner=','const battleState=')+between(battle,'const battleRules=','const battleAction=')+between(battle,'function battleBindAuxiliaryDrag(','/* V3.135:')+between(battle,'function battleTargetClampPosition(','function battlePlaceTargetSheet(')+`
${between(battle,"  document.getElementById('battleDemoToggle')?.addEventListener", "  document.getElementById('battleGMAudio')?.addEventListener")}
battleBindAuxiliaryDrag('battleDemoPanel','header');globalThis.inspectDemo=()=>({running:demoRunner.running,steps:demoRunner.steps,error:demoRunner.error,phase:playSceneState.phase,room:playSceneRuntime.room,calls});globalThis.readyDemo=playSyncRoom(true);`});
  await page.evaluate(()=>readyDemo);await page.selectOption('#battleDemoSpeed','10');
  const rect=await page.locator('#battleDemoPanel').boundingBox();await page.mouse.move(rect.x+80,rect.y+12);await page.mouse.down();await page.mouse.move(rect.x-40,rect.y+100,{steps:6});await page.mouse.up();const moved=await page.locator('#battleDemoPanel').boundingBox();assert.ok(Math.abs(moved.y-rect.y)>20,'Demo panel must move independently');
  await page.click('#battleDemoToggle');await page.waitForFunction(()=>inspectDemo().steps>=2||inspectDemo().error,{timeout:15000});assert.equal((await page.evaluate(()=>inspectDemo())).error,'');
  await page.click('#battleDemoToggle');const paused=await page.evaluate(()=>inspectDemo());assert.equal(paused.running,false);await page.waitForTimeout(700);assert.equal((await page.evaluate(()=>inspectDemo())).steps,paused.steps);assert.match(await page.locator('#battleDemoToggle').innerText(),/TIẾP TỤC/);
  await page.click('#battleDemoToggle');await page.waitForFunction(()=>inspectDemo().calls.some(x=>x.url.endsWith('/battle-action')&&x.status===200)||inspectDemo().error,{timeout:20000});
  let snapshot=await page.evaluate(()=>inspectDemo());assert.equal(snapshot.error,'');assert.ok(snapshot.calls.some(x=>x.url.endsWith('/battle-action')&&x.status===200),'Real random legal night action must be accepted');
  await page.waitForFunction(()=>inspectDemo().calls.some(x=>x.url.endsWith('/demo')&&x.body.includes('"command":"vote"')&&x.status===200)||inspectDemo().error,{timeout:25000});snapshot=await page.evaluate(()=>inspectDemo());assert.equal(snapshot.error,'');assert.ok(snapshot.calls.some(x=>x.body.includes('"command":"vote"')&&x.status===200),'Real day votes must occur');
  await page.waitForFunction(()=>inspectDemo().room.phase==='lobby'||inspectDemo().error,{timeout:45000});snapshot=await page.evaluate(()=>inspectDemo());assert.equal(snapshot.error,'');assert.equal(snapshot.room.phase,'lobby');assert.equal(snapshot.running,false);assert.deepEqual(errors,[]);
  await context.close();console.log('PASS cross-origin iPhone WebKit Demo '+mode+': CORS, drag, start/pause/resume, actual night actions, day votes, finish');
 }
 const after=(await req('/api/gm/members')).members.filter(m=>people.some(p=>p.loginId===m.loginId));assert.deepEqual(after,before,'Demo must not write real member presence/history/statistics');console.log('PASS Demo existing-member snapshots remain unchanged in both modes');
}finally{await browser.close();await new Promise(r=>pageServer.close(r));}
