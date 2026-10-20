import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const setup=readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const worker=readFileSync('src/index.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const events=readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const between=(source,a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+1);
  assert.ok(start>=0&&end>start,'Function extraction failed: '+a);
  return source.slice(start,end);
};

test('Demo is one room card inside the room list, never a separate fake member entry',()=>{
  const listStart=html.indexOf('id="playCreatedRoomList"'),card=html.indexOf('id="playDemoRoomChoice"');
  assert.ok(listStart>=0&&card>listStart);
  assert.match(setup,/list\.replaceChildren\(demoButton\)/);
  assert.match(setup,/openPlayGameSheet\(\)/);
  assert.match(events,/playDemoRoomChoice/);
  assert.match(worker,/if\(body\.demo===true&&bearer\(request\)!==GM_SYNC_TOKEN\)/);
});

function seededHarness(total=10){
  const directory=Array.from({length:total},(_,i)=>({
    loginId:'member'+String(i+1).padStart(2,'0'),
    displayName:'Người '+(i+1),gameCharacterId:'character-'+String(i+1).padStart(2,'0')
  }));
  const calls=[],state={room:{demo:true,phase:'lobby',seatsLocked:false,seatCount:24},players:[]},
    scene={selectedMemberIds:[]};
  const ctx={
    playSceneRuntime:state,playSceneState:scene,
    gmApi:async path=>{assert.equal(path,'/api/gm/members');return{ok:true,members:directory}},
    playShuffle:xs=>[...xs],
    playRoomApi:async(path,opts)=>{
      const body=JSON.parse(opts.body);calls.push({path,body});
      if(path==='/participants'){
        const players=body.members.map(m=>({...m,kind:'member',participantId:'member:'+m.loginId}));
        return{ok:true,selectedCount:players.length,players,room:state.room}
      }
      if(path==='/seat-lock')return{ok:true,seatsLocked:body.locked===true,room:{...state.room,seatsLocked:body.locked===true}};
      return{ok:true,room:state.room}
    },
    savePlayScene:()=>{},
    globalThis:{GMWW_VILLAGE_LAYOUT:{recommendedSeatShape:()=> 'ring'}},
    Error,Number,String,Set,Map,Array
  };
  const src=between(setup,'async function demoPopulateExistingMembers(count){','function openPlayRoomEditor(');
  const seed=vm.runInNewContext(src+';demoPopulateExistingMembers',ctx);
  return{seed,state,scene,calls}
}

test('Demo seeds exactly the sample-game count from existing members with no account creations',async()=>{
  const h=seededHarness(13);
  const players=await h.seed(8);
  assert.equal(players.length,8);
  assert.equal(h.state.players.length,8);
  assert.equal(h.scene.selectedMemberIds.length,8);
  assert.deepEqual(h.calls.map(c=>c.path),['/room-settings','/participants','/seat-lock','/stage']);
  assert.deepEqual([...h.calls.find(x=>x.path==='/participants').body.members].map(x=>x.seatId),[1,2,3,4,5,6,7,8]);
  assert.equal(h.calls.find(x=>x.path==='/participants').body.replace,true);
  assert.ok(!h.calls.some(x=>x.path.includes('/join')||x.path.includes('/members/create')));
});

test('Demo refuses insufficient members, ordinary rooms, and invalid party sizes',async()=>{
  const h=seededHarness(5);
  await assert.rejects(()=>h.seed(8),/chỉ có 5/);
  assert.equal(h.calls.length,0);
  await assert.rejects(()=>h.seed(31),/1 đến 30/);
  h.state.room.demo=false;
  await assert.rejects(()=>h.seed(4),/phòng thật/);
  assert.equal(h.calls.length,0);
});

test('Demo night reads authoritative turn, picks a legal other-player target, confirms then advances once',async()=>{
  const action={id:'role:wolf:bite',actionId:'action_wolf_bite',name:'Cắn',type:'effect_notice',
    effectIds:[],actorIds:['alice'],targetCount:1,noSelf:true};
  const calls=[],runner={running:true,epoch:2,pending:new Set(),completed:new Set()};
  const ctx={
    demoRunner:runner,
    demoPick:items=>items[0],
    battleActions:()=>[action],battleRules:()=>({targetAllowed:()=>true}),
    playLiveMembers:()=>[{loginId:'alice'},{loginId:'bob'}],
    playPlayerEffect:()=> 'alive',
    playSceneRuntime:{room:{matchId:'test-match',cycleKey:'night-1'},activeEffects:[],battleUndo:null},
    playSceneState:{night:1},
    playRoomApi:async(path,opt)=>{calls.push({path,body:JSON.parse(opt.body)});return{ok:true}},
    battleShowResultPopup:()=>{},document:{getElementById:()=>({setAttribute:()=>{}})},
    Math:{random:()=>0.2,floor:Math.floor,max:Math.max,min:Math.min,round:Math.round},
    String,Number,Set,Array,Error
  };
  const src=between(battle,'async function demoActionNight(t,epoch){','async function demoActionDay(epoch){');
  const run=vm.runInNewContext(src+';demoActionNight',ctx);
  await run({id:'role:role_wolf'},2);
  assert.deepEqual(calls.map(x=>x.path),['/battle-action','/turn']);
  assert.deepEqual([...calls[0].body.targetIds],['bob']);
  assert.equal(calls[0].body.turnId,'role:role_wolf');
  assert.equal(calls[1].body.expectedTurnId,'role:role_wolf');
  assert.equal(runner.pending.size,0);
});

test('Demo uses the actual server cycles, ordered role/Artifact queue, and day ballot commands',()=>{
  assert.match(battle,/battleTurn\(\)/);
  assert.match(battle,/await playSetServerCycle\('day',/);
  assert.match(battle,/await playSetServerCycle\('night',/);
  assert.match(battle,/demoActionNight\(t,epoch\)/);
  assert.match(battle,/demoActionDay\(epoch\)/);
  for(const phase of ['ready','nominating','selecting','voting','closed','resolved'])assert.ok(battle.includes("stage==='"+phase+"'"));
  for(const endpoint of ['/battle-action','/day-action','/gallows','/turn','/cycle'])assert.ok(battle.includes("'"+endpoint+"'"));
  assert.match(battle,/TẠM DỪNG/);
  assert.match(battle,/TIẾP TỤC/);
  assert.match(battle,/reason==='manual'&&active/);
});
