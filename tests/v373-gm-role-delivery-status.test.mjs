import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
function block(from,to){
  const start=app.indexOf(from),end=app.indexOf(to,start);
  assert.ok(start>=0&&end>start,'Missing runtime block: '+from);
  return app.slice(start,end);
}
function progress(room,assignments,preview=[{loginId:'safari'},{loginId:'chrome'},{loginId:'edge'}]){
  const source=block('function playDeliveryProgress(){','async function applyPlayPlayerState(type){');
  const ctx={playSceneRuntime:{room,assignments},playSceneState:{assignmentsPreview:preview},
    playLiveMembers:()=>preview,document:{getElementById:()=>null}};
  return vm.runInNewContext(source+';playDeliveryProgress()',ctx);
}

test('GM displays server-confirmed role delivery and separate player view count',()=>{
  const room={phase:'role_delivery',roleDeliveredAt:'2026-10-10T05:06:00Z'};
  const rows=['safari','chrome','edge'].map(loginId=>({loginId,roleId:'role_demo',deliveredAt:'2026-10-10T05:06:00Z',viewedAt:null}));
  let p=progress(room,rows);
  assert.equal(p.total,3);assert.equal(p.delivered,3);assert.equal(p.viewed,0);assert.equal(p.success,true);
  rows[0].viewedAt='2026-10-10T05:07:00Z';
  p=progress(room,rows);assert.equal(p.viewed,1);assert.equal(p.success,true);
  rows[1].viewedAt=rows[2].viewedAt='2026-10-10T05:08:00Z';
  assert.equal(progress(room,rows).viewed,3);
});
test('An unconfirmed or partial delivery must never show successful 3/3',()=>{
  const room={phase:'role_delivery',roleDeliveredAt:'2026-10-10T05:06:00Z'};
  const rows=['safari','chrome'].map(loginId=>({loginId,roleId:'role_demo',deliveredAt:'2026-10-10T05:06:00Z'}));
  assert.equal(progress(room,rows).success,false);
  assert.equal(progress(room,rows).delivered,2);
  const complete=[...rows,{loginId:'edge',roleId:'role_demo',deliveredAt:'2026-10-10T05:06:00Z'}];
  assert.equal(progress({phase:'lobby'},complete).success,false);
  const duplicated=[...rows,rows[0]];
  assert.equal(progress(room,duplicated).delivered,2);
});
test('Delivery remains at step 6 until GM chooses Vào Trận, and cannot republish accidentally',()=>{
  const deliver=block('async function playDealRoles(){','function selectPlayWinner(faction){');
  assert.match(deliver,/if\(playDeliveryProgress\(\)\.success\)\{setPlayStep\('battle'\);return\}/);
  assert.match(deliver,/data\?\.room\?\.roleDeliveredAt/);
  assert.match(deliver,/playSceneState\.step='deal'/);
  assert.doesNotMatch(deliver,/playSceneState\.step='battle'/);
  assert.doesNotMatch(deliver,/playPublishStage\('battle'\)/);
  assert.match(app,/playSceneState\.step==='deal'&&playDeliveryProgress\(\)\.success\?'VÀO TRẬN'/);
  assert.match(app,/d\.type==='role_progress'\|\|d\.type==='artifact_progress'/);
  assert.match(html,/id="playPhaseHint"/);
  assert.doesNotMatch(html,/id="playDeliveryStatus"/);
  assert.doesNotMatch(css,/\.play-delivery-status/);
  assert.match(css,/\.is-delivery-confirmed/);
  assert.match(app,/title\.textContent='✓ ĐÃ PHÁT VAI THÀNH CÔNG '/);
  assert.match(app,/hint\.textContent='Đã xem Vai Trò: '/);
});
test('Artifact-free games show exactly one GM role card',()=>{
  const render=block('async function renderPlayCards(){','function bindPlayRoomModeButtons(){');
  assert.match(render,/playSceneState\.artifactsEnabled!==false/);
  assert.match(render,/playArtifactCard/);
  assert.match(render,/artifactCard\?\.classList\.toggle\('hidden',!useArtifact\)/);
  assert.match(render,/fan\?\.classList\.toggle\('is-role-only',!useArtifact\)/);
  assert.match(css,/\.play-card-fan\.is-role-only \.artifact-card\{display:none!important\}/);
});
