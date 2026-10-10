import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultPriorityFirst, artifactPriorityFirst, buildNightQueue, reserveArtifactActivation } from '../src/gmww-game-scene-rules.js';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const gm=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('priority-first Artifact option is editable, visible, persisted and sent in shared card reference',()=>{
  assert.match(html,/id="artifactPriorityFirst"/);
  assert.match(html,/Ưu tiên sử dụng đầu tiên/);
  assert.match(gm,/\$\('#artifactPriorityFirst'\)\.checked=!!a\.priorityFirst/);
  assert.match(gm,/\['artifactPriorityFirst','priorityFirst'\]/);
  assert.match(gm,/priorityFirst:artifact\?\.artifact\?\.priorityFirst===true/);
  assert.match(worker,/priorityFirst:typeof \(x\.priorityFirst/);
  assert.match(worker,/artifactPriorityFirst:artifact\?artifact\.priorityFirst===true:null/);
  assert.match(worker,/priorityFirst:artifactCard\.priorityFirst===true/);
});

test('three familiar Artifacts default on, other Artifacts default off, explicit false overrides name',()=>{
  for(const name of ['Đá Đổi Vai Trò','Đá Hoán Đổi','Tráng Gương','Mắt Tiên Tri'])assert.equal(defaultPriorityFirst(name),true,name);
  for(const name of ['Bùa Hộ Mệnh','Thức Cùng Tiên Tri','Bảo Vệ'])assert.equal(defaultPriorityFirst(name),false,name);
  assert.equal(artifactPriorityFirst({artifactName:'Tráng Gương',priorityFirst:false}),false);
  assert.equal(artifactPriorityFirst({artifactName:'Bùa Hộ Mệnh',priorityFirst:true}),true);
});

test('early priority schedules before normal roles but does not consume an unused Artifact',()=>{
  const owners=[{playerId:'member:p1',artifactId:'a',artifactName:'Tráng Gương',priorityFirst:true},{playerId:'member:p2',artifactId:'b',artifactName:'Mắt Tiên Tri',priorityFirst:false}];
  const normalTurns=[{kind:'role',playerId:'member:p3'},{kind:'artifact-main',playerId:'member:p1',artifactId:'a'},{kind:'artifact-main',playerId:'member:p2',artifactId:'b'}];
  assert.deepEqual(buildNightQueue({night:1,normalTurns,artifactOwners:owners}).map(x=>x.kind),['wolf-introduction','early-artifact','role','artifact-main','artifact-main']);
  assert.deepEqual(buildNightQueue({night:2,normalTurns,artifactOwners:owners}).map(x=>x.kind),['early-artifact','role','artifact-main','artifact-main']);
  assert.deepEqual(buildNightQueue({night:2,normalTurns,artifactOwners:owners.map(x=>x.artifactId==='a'?{...x,used:true}:x)}).map(x=>x.kind),['role','artifact-main']);
});

test('usage ledger refuses duplicate activation and maintains retry idempotency',()=>{
  const cycleKey='game:night:1',base={cycleKey,accepted:[]};
  const first=reserveArtifactActivation(base,{requestId:'req1',playerId:'member:1',artifactId:'a',cycleKey,eligible:true,limit:3});
  assert.equal(first.ok,true);
  const second=reserveArtifactActivation(first.state,{requestId:'req2',playerId:'member:1',artifactId:'a',cycleKey,eligible:true,limit:3});
  assert.equal(second.error,'ARTIFACT_ALREADY_USED');
  assert.equal(reserveArtifactActivation(first.state,{requestId:'req1',playerId:'member:1',artifactId:'a',cycleKey,eligible:true,limit:3}).idempotent,true);
  assert.match(worker,/skipIfEarlyUsed:row\._priorityFirst===true/);
  assert.match(worker,/EARLY_ARTIFACT_USED/);
  assert.match(worker,/requestId:"gm:"\+String\(meta\.matchId\|\|"match"\)/);
  assert.match(worker,/artifactUse:/);
});
