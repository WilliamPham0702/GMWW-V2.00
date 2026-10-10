import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const worker=fs.readFileSync('src/index.js','utf8');
const gm=fs.readFileSync('server-game/current/app.js','utf8');
const raw=fs.readFileSync('src/gmww-members-live.js','utf8');
const player=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,''));

test('GM stage is authorized, broadcast and present in room snapshots',()=>{
  assert.match(worker,/async gmStage\(request,body\)/);
  assert.match(worker,/meta\.gmStageRevision=Number\(meta\.gmStageRevision\|\|0\)\+1/);
  assert.match(worker,/stageChanged:true/);
  assert.match(worker,/gmStage:roomUiStage\(m\)/);
  assert.match(worker,/const gmStageRoute=url\.pathname\.match/);
});
test('GM publishes timeline and setup transitions',()=>{
  assert.match(gm,/function playPublishStage\(step\)/);
  assert.match(gm,/playStagePublishQueue=playStagePublishQueue\.then\(write,write\)/);
  for(const stage of ['seats','game','roles','deal'])
    assert.ok(gm.includes("playPublishStage('"+stage+"')"),stage+' published');
  assert.match(gm,/playSceneState\.step=room\.gmStage/);
});
test('Player pregame top menu stays in lobby through all GM setup stages',()=>{
  const start=player.indexOf('function playerScenePolicy(room={})');
  const end=player.indexOf('function updatePlayerTopMenu()',start);
  assert.ok(start>0&&end>start);
  const segment=player.slice(start,end);
  for(const gmStage of ['room','seats','game','roles','deal','battle']){
    const ctx={state:{roomCode:'ABCDEF',room:{phase:'lobby',gmStage},villageCycle:{}},currentRoomPlayer:()=>null};
    assert.equal(vm.runInNewContext(segment+'\nplayerTopMenuStatus()',ctx),'PHÒNG CHỜ · CHỜ GM');
  }
  const seated={state:{roomCode:'ABCDEF',room:{phase:'lobby',gmStage:'roles'},villageCycle:{}},currentRoomPlayer:()=>({seatId:5})};
  assert.equal(vm.runInNewContext(segment+'\nplayerTopMenuStatus()',seated),'PHÒNG CHỜ · ĐÃ XẾP VỊ TRÍ');
  const deal={state:{roomCode:'ABCDEF',room:{phase:'role_delivery',gmStage:'deal'},villageCycle:{}},currentRoomPlayer:()=>({seatId:5})};
  assert.equal(vm.runInNewContext(segment+'\nplayerTopMenuStatus()',deal),'PHÒNG CHỜ · ĐÃ PHÁT VAI');
  const battle={state:{roomCode:'ABCDEF',room:{phase:'running',gmStage:'battle'},villageCycle:{phase:'night',night:2}},currentRoomPlayer:()=>({seatId:5})};
  assert.equal(vm.runInNewContext(segment+'\nplayerTopMenuStatus()',battle),'ĐÊM 2');
  assert.match(player,/gmStage:String\(room\.gmStage\|\|''\)/);
  assert.match(player,/state\.ws\.onmessage=e=>/);
});
