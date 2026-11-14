import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=playerWebSource('20-village-and-profile');
const body=name=>source.slice(source.indexOf('async function '+name+'('),source.indexOf('\n}',source.indexOf('async function '+name+'('))+2);
test('manual destination can replace an active walk without bypassing locked seats',async()=>{
 let posted=null;const ctx={state:{roomCode:'ROOM',room:{},players:[]},currentRoomPlayer:()=>({movementStatus:'moving'}),movementViewerPosition:()=>({x:40,y:50}),auth:()=>({}),api:async(url,opts)=>{posted=JSON.parse(opts.body);return{}},renderRoomSetup(){},syncVillageFrame(){},scheduleMovementCompletion(){},toast(){}};
 vm.createContext(ctx);vm.runInContext(body('startVillageMove')+';globalThis.move=startVillageMove',ctx);
 await ctx.move({x:60,y:70});assert.equal(posted?.x,60);assert.equal(posted?.y,70);
 posted=null;ctx.state.room.seatsLocked=true;await ctx.move({x:70,y:80});assert.equal(posted,null);
});
test('manual lobby command suspends automatic requests temporarily',async()=>{
 let scheduled=0,cleared=false;const ctx={state:{member:{},lobbyPlayers:[]},auth:()=>({}),api:async()=>({players:[]}),syncVillageFrame(){},toast(){},clearLobbyMotionTimer(){cleared=true},resetLobbyMotionPlan(){},scheduleLobbyMotion(ms){scheduled=ms},Date};
 vm.createContext(ctx);const helper=source.match(/function holdLobbyMotionForManualWalk\([^]*?\n}/)?.[0]||'';
 vm.runInContext(helper+'\n'+source.match(/async function walkInVillage[^\n]+/)[0]+'\nglobalThis.walk=walkInVillage',ctx);
 await ctx.walk(60,70);assert.equal(cleared,true);assert.ok(scheduled>=30000);assert.ok(ctx.state.lobbyManualUntil>Date.now());
});
test('rebuilding the Character-40 catalog preserves both optimized renderers and their live API',()=>{
 const playerPath='assets/characters/gmww40/runtime.js';
 const gmPath='server-game/current/gmww-shared-motion.js';
 const player=fs.readFileSync(playerPath,'utf8');
 const gm=fs.readFileSync(gmPath,'utf8');
 const adapter=fs.readFileSync('server-game/shared/character40-adapter.js','utf8');
 assert.notEqual(player,gm,'GM low-power and Player idle loops intentionally differ');

 // Both variants retain the reviewed common controller API and authored core functions.
 for(const [label,source] of [['Player Web',player],['GM Server',gm]]){
   for(const name of ['supports','visualId','actionFor','apply','paint','mount','update'])
     assert.ok(source.includes('function '+name+'('),label+' missing '+name);
   const sandbox={};vm.runInNewContext(source,sandbox,{timeout:1000});
   const api=sandbox.GMWW_SHARED_MOTION;
   assert.equal(api.version,'c40-1',label);
   for(const method of ['supports','visualId','mount','update'])assert.equal(typeof api[method],'function',label+' '+method);
   assert.deepEqual(Array.from(api.actions),['idle','walk','run','turn']);
   assert.equal(api.supports('character-01'),true,label+' catalog must load');
   assert.equal(api.update(null,{state:'idle'}),false,label+' safe empty host');
 }
 assert.ok(adapter.includes('function apply('),'original authored adapter remains available');
 assert.match(gm,/GMWW_PERFORMANCE/,'GM low power policy must not be lost');
 assert.match(gm,/_gmwwLowPower/,'GM static actors must not consume idle frames');
 assert.match(player,/syncMotionLoop/,'Player idle loop must be suspended when no motion');
 assert.match(player,/hasActiveMotion/,'Player render scheduling requires active movement');

 // Execute generator's read-only verification; it must not mutate packaged Runtime.
 const result=execFileSync('python3',['tools/build-character40-live.py','--verify'],{encoding:'utf8'});
 assert.match(result,/PASS: independently optimized Character-40 renderers and catalog preserved/);
 assert.equal(fs.readFileSync(playerPath,'utf8'),player);
 assert.equal(fs.readFileSync(gmPath,'utf8'),gm);
});
