import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
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
test('rebuilding the motion bundle preserves the reviewed renderer adapter',()=>{
 const bundle=fs.readFileSync('assets/characters/gmww40/runtime.js','utf8');
 const adapter=fs.readFileSync('server-game/shared/character40-adapter.js','utf8');
 assert.ok(bundle.includes(adapter),'authored adapter must match the deployed bundle');
});
