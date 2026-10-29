import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveDayArtifactInspection as inspect} from '../src/gmww-day-artifact-inspection.js';
const assignments=[
 {loginId:'villager',roleId:'role_villager',roleName:'Dân Làng',factionId:'village'},
 {loginId:'wolf',roleId:'role_alpha_wolf',roleName:'Sói Trùm',factionId:'wolf'},
 {loginId:'third',roleId:'role_vampire',roleName:'Vampire',factionId:'third'}];
const run=(artifactId,actionId,targetId)=>inspect({artifactId,actionId,targetId,assignments});
test('Vạc Ma Thuật verifies exactly ordinary Villager, not every village faction role',()=>{
 assert.equal(run('artifact_09','artifact_action_check_villager','villager').confirmed,true);
 assert.equal(run('artifact_09','artifact_action_check_villager','wolf').confirmed,false);
});
test('Sương Hào Quang verifies faction three from Server',()=>{
 assert.equal(run('artifact_24','artifact_action_check_third_faction','third').confirmed,true);
 assert.equal(run('artifact_24','artifact_action_check_third_faction','villager').confirmed,false);
});
test('Nhẫn Sự Thật recognizes Alpha Wolf; Trượng Tiên Tri privately reads exact role',()=>{
 assert.equal(run('artifact_29','action_seer','wolf').confirmed,true);
 assert.equal(run('artifact_39','action_destroyer_scry','wolf').roleName,'Sói Trùm');
 assert.equal(run('artifact_39','action_destroyer_scry','wolf').private,true);
});
test('Mismatched action or invented Player target is rejected',()=>{
 assert.equal(run('artifact_09','action_seer','villager'),null);
 assert.equal(run('artifact_29','action_seer','unknown'),null);
});
test('GM day handler uses private Server-authoritative inspection, no public result broadcast',()=>{
 const server=fs.readFileSync('src/index.js','utf8');
 assert.match(server,/resolveDayArtifactInspection\(\{artifactId:linked\?\.sourceArtifactId\|\|artifactId,actionId,/);
 assert.ok(server.includes('linkedArtifactAction({link,actorId,actionId,matchId,'));
 assert.ok(server.includes('DAY_ARTIFACT_INSPECTION_INVALID'));
});
