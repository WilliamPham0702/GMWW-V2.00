import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {publicRoom} from '../src/gmww-public-room-contract.js';

const gm=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const client=gm.slice(gm.indexOf('/* Match completion is shared'),gm.indexOf('async function openPlayEndSheet(){'));
const worker=fs.readFileSync('src/index.js','utf8');
const config=worker.slice(worker.indexOf('  async gmConfig(request,body){'),worker.indexOf('  async gmDayClock(request,body){'));
assert.ok(client.includes('function playCompletionIsCurrentResult('));
assert.ok(config.startsWith('  async gmConfig('));

function browser(room){
  const elements=new Map(),calls=[];
  const el=id=>{
    if(!elements.has(id)){
      const node={hidden:true,textContent:'',disabled:false,dataset:{},
        classList:{add(c){if(c==='hidden')node.hidden=true},remove(c){if(c==='hidden')node.hidden=false}},
        setAttribute(){}};
      elements.set(id,node);
    }
    return elements.get(id);
  };
  const scene={roomCode:'ROOMAA',step:'deal',gameTemplateId:'sample'};
  const runtime={room,winProposal:null,gameConfig:{id:'sample'}};
  const ctx={document:{getElementById:el,querySelectorAll:()=>[]},
    playSceneState:scene,playSceneRuntime:runtime,demoRunner:{running:false},
    isLivePlayRoom:()=>true,openPlayEndSheet:async()=>calls.push('forced-end'),
    globalThis:{}};
  vm.createContext(ctx);
  vm.runInContext(client+';globalThis.check={openPlayCompletionSheet,playWatchCompletion,playCompletionState}',ctx);
  return {room,scene,runtime,calls,el,check:ctx.globalThis.check};
}

test('Old completed result never opens when GM reenters role assignment or deal',async()=>{
  for(const phase of ['role_delivery','lobby']){
    const room={phase,gmStage:'deal',matchId:'new-match',lastEndedMatchId:'old-match',
      endedAt:'old-date',winnerFaction:'Phe Dân'};
    const b=browser(room);
    await b.check.playWatchCompletion({room,winProposal:null});
    assert.equal(b.el('playMatchCompletionSheet').hidden,true,phase);
    await b.check.openPlayCompletionSheet();
    assert.deepEqual(b.calls,['forced-end']);
    assert.equal(b.el('playMatchCompletionSheet').hidden,true);
  }
});

test('A genuine completed match is still visible; stale result is hidden on next match',async()=>{
  const room={phase:'lobby',gmStage:'seats',matchId:'old-match',lastEndedMatchId:'old-match',
    endedAt:'old-date',winnerFaction:'Phe Dân'};
  const b=browser(room);
  await b.check.playWatchCompletion({room});
  assert.equal(b.el('playMatchCompletionSheet').hidden,true,'Returning to a finished room must not reopen the old result');
  await b.check.openPlayCompletionSheet(); // GM can still review an authentic confirmed result.
  assert.equal(b.el('playMatchCompletionSheet').hidden,false);
  assert.equal(b.check.playCompletionState.completed,true);
  assert.match(b.el('playCompletionTitle').textContent,/PHE DÂN THẮNG/);
  const fresh={...room,phase:'role_delivery',gmStage:'deal',matchId:'new-match'};
  b.runtime.room=fresh;
  await b.check.playWatchCompletion({room:fresh});
  assert.equal(b.el('playMatchCompletionSheet').hidden,true);
});

test('A new running match can announce its own win proposal',async()=>{
  const room={phase:'running',gmStage:'battle',matchId:'new-match'};
  const b=browser(room);
  b.scene.step='battle';
  b.runtime.winProposal={winnerFaction:'Phe Sói'};
  await b.check.playWatchCompletion({room,winProposal:b.runtime.winProposal});
  assert.equal(b.el('playMatchCompletionSheet').hidden,false);
  assert.equal(b.check.playCompletionState.matchId,'new-match');
  assert.equal(b.check.playCompletionState.winner,'Phe Sói');
});

test('Configuring a distinct new match clears only live winner metadata, not roster/history',async()=>{
  const lastResult={matchId:'old-match',winnerFaction:'Phe Dân'};
  const players={'member:alice':{loginId:'alice',kind:'member'}};
  const meta={phase:'lobby',matchId:'old-match',lastEndedMatchId:'old-match',
    endedAt:'old-date',winnerFaction:'Phe Dân',winnerLabel:'Phe Dân',
    reopenAt:'old-date',resultVersion:1,matchRevision:1};
  const entries=new Map([['meta',meta],['players',players],['matchCompletion:old-match',lastResult]]);
  const Room=vm.runInNewContext('(class {'+config+'})',{
    j:(body,status=200)=>Response.json(body,{status}),
    sanitizeGameConfig:x=>x,validImageDataUrl:()=>false,publicRoom,publicPlayer:x=>({...x})
  });
  const instance=new Room();
  instance.gmAuthorized=async()=>({ok:true,meta:entries.get('meta')});
  instance.ctx={storage:{
    get:async key=>entries.get(key),
    put:async(key,value)=>entries.set(key,value)
  }};
  instance.scheduleRoomAlarm=async()=>{};
  instance.broadcast=()=>{};
  const res=await instance.gmConfig({},{
    gameConfig:{name:'New',playerCount:1},matchId:'new-match',matchRevision:2
  });
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.room.matchId,'new-match');
  for(const key of ['endedAt','winnerFaction','winnerLabel','reopenAt','lastEndedMatchId'])
    assert.equal(data.room[key],null,key);
  assert.equal(data.room.resultVersion,0);
  assert.deepEqual(entries.get('matchCompletion:old-match'),lastResult);
  assert.deepEqual(entries.get('players'),players);
});
