import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const worker=readFileSync('src/index.js','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const live=readFileSync('src/gmww-members-live.js','utf8');
const start=worker.indexOf('  async gmReset(request,body){');
const end=worker.indexOf('  async gmEnd(request,body)',start);
assert.ok(start>=0&&end>start,'reset endpoint must be present');

function makeRoom(phase){
  const meta={code:'ABC234',phase,status:'playing',locked:true,seatsLocked:true,
    matchId:'match-1',matchRevision:4,gameName:'Test Match',playerCount:1,enabled:true,
    cyclePhase:'night',cycleNight:3,cycleStartedAt:new Date().toISOString(),
    currentNightTurnId:'turn-5',autoPausedRemainingMs:800,resetVersion:3};
  const records=new Map([
    ['meta',meta],['players',{'member:alice':{participantId:'member:alice',loginId:'alice',seatId:7,ready:true}}],
    ['assignments',[{loginId:'alice',roleId:'wolf'}]],['interactions',[{type:'frozen'}]],
    ['seatSwaps',[{id:'swap-1'}]],['gameConfig',{name:'Test'}],['cardBackImage','old'],
    ['role:alice',{roleId:'wolf'}],['roles:alice',[{roleId:'wolf'}]],
    ['artifact:alice',{artifactId:'mirror'}],['nightRuntime:match-1:3',{cursor:1}],
    ['artworkAsset:old','old data']
  ]);
  const events=[],closed=[];
  const storage={
    async get(key){return records.get(key)},
    async put(key,value){records.set(key,value)},
    async delete(key){records.delete(key)},
    async list({prefix}){return new Map([...records].filter(([k])=>k.startsWith(prefix)))},
    async setAlarm(){return true}
  };
  const methods=vm.runInNewContext('({'+worker.slice(start,end)+'})',{
    j:(obj,status=200)=>({...obj,httpStatus:status}),
    publicRoom:x=>({...x}),publicPlayer:x=>({...x}),
    ROOM_IDLE_TTL:60*60*1000
  });
  const instance={
    ...methods,ctx:{storage,getWebSockets:()=>[{close(_code,reason){closed.push(reason)}}]},
    async gmAuthorized(){return {ok:true,meta}},
    broadcast:event=>events.push(event)
  };
  return {meta,records,events,closed,instance};
}

for(const phase of ['lobby','role_delivery','running','ended']){
  test('GM forced End resets all match data and ejects players from '+phase,async()=>{
    const {meta,records,events,closed,instance}=makeRoom(phase);
    const result=await instance.gmReset({},{
      forceEnd:true,postGame:false,preserveParticipants:false,
      transactionId:'force-1',expectedResetVersion:3
    });
    assert.equal(result.ok,true);
    assert.equal(result.hardReset,true);
    assert.equal(result.forcedEnd,true);
    assert.equal(result.playersCount,0);
    assert.equal(meta.phase,'lobby');
    assert.equal(meta.status,'waiting');
    assert.equal(meta.seatsLocked,false);
    assert.equal(meta.locked,false);
    assert.equal(meta.matchId,null);
    assert.equal(meta.cyclePhase,null);
    assert.equal(meta.cycleNight,0);
    assert.equal(meta.cycleStartedAt,null);
    assert.equal(meta.currentNightTurnId,null);
    assert.equal(meta.autoPausedRemainingMs,null);
    assert.equal(meta.gameName,'');
    assert.equal(meta.enabled,true);
    assert.equal(records.get('meta').resetVersion,4);
    assert.equal(Object.keys(records.get('players')).length,0);
    assert.equal(records.get('assignments').length,0);
    assert.equal(records.get('interactions').length,0);
    assert.equal(records.get('seatSwaps').length,0);
    for(const key of ['gameConfig','cardBackImage','role:alice','roles:alice','artifact:alice','nightRuntime:match-1:3','artworkAsset:old'])
      assert.equal(records.has(key),false,key);
    assert.ok(events.some(e=>e.type==='room_hard_reset'&&e.forcedEnd===true&&e.players.length===0));
    assert.deepEqual(closed,['ROOM_HARD_RESET']);
    const retry=await instance.gmReset({},{forceEnd:true,transactionId:'force-1',expectedResetVersion:3});
    assert.equal(retry.idempotent,true);
    assert.equal(records.get('meta').resetVersion,4);
  });
}

test('forced End UI requires a confirmation sheet but no winner or running phase',()=>{
  const open=app.slice(app.indexOf('async function openPlayEndSheet(){'),app.indexOf('function closePlayEndSheet()'));
  const action=app.slice(app.indexOf('async function confirmPlayEndGame(){'),app.indexOf('function playRosterSelectedIds()'));
  assert.match(html,/id="playEndSheet"/);
  assert.match(html,/XÁC NHẬN KẾT THÚC VÁN/);
  assert.match(html,/Không thể hoàn tác/);
  assert.match(html,/id="playEndCancel"/);
  assert.match(html,/id="playEndConfirm"/);
  assert.doesNotMatch(html,/id="playWinnerGrid"/);
  assert.doesNotMatch(open,/running.*started.*game.*playing/);
  assert.doesNotMatch(action,/winnerFaction:|winnerLabel:|selectedWinnerFaction\|\|/);
  assert.match(action,/playRoomApi\('\/reset'/);
  assert.match(action,/forceEnd:true,postGame:false,preserveParticipants:false/);
  assert.match(action,/playSceneRuntime\.players=\[\]/);
  assert.match(live,/d\.forcedEnd\?'Quản Trò đã kết thúc cưỡng ép/);
  const wrapper=worker.slice(worker.indexOf('async function gmRoomReset('),worker.indexOf('async function gmRoomEnd('));
  assert.match(wrapper,/removedPlayers/);
  assert.match(wrapper,/roomCode:null,ready:true/);
});

test('GM returns to first lobby step after force ending a match',()=>{const part=app.slice(app.indexOf('async function confirmPlayEndGame(){'),app.indexOf('function playRosterSelectedIds()'));assert.match(part,/playSceneState\.step='lobby'/);assert.match(part,/disconnectPlaySocket\(\)/)});
