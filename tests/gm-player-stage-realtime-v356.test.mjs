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
  for(const stage of ['seats','game','roles','deal','battle'])
    assert.ok(gm.includes("playPublishStage('"+stage+"')"),stage+' published');
  assert.match(gm,/playSceneState\.step=room\.gmStage/);
});
test('Player top menu matches GM timeline stages',()=>{
  const start=player.indexOf('function playerTopMenuStatus()');
  const end=player.indexOf('function updatePlayerTopMenu()',start);
  assert.ok(start>0&&end>start);
  const segment=player.slice(start,end);
  for(const [step,label] of Object.entries({room:'TẠO PHÒNG',seats:'TẬP HỢP DÂN LÀNG',game:'CHỌN VÁN MẪU',roles:'PHÂN VAI',deal:'PHÁT VAI',battle:'VÀO TRẬN'})){
    const ctx={state:{roomCode:'ABCDEF',room:{phase:'lobby',gmStage:step},villageCycle:{}}};
    assert.equal(vm.runInNewContext(segment+'\nplayerTopMenuStatus()',ctx),label);
  }
  assert.match(player,/gmStage:String\(room\.gmStage\|\|''\)/);
  assert.match(player,/state\.ws\.onmessage=e=>/);
});
