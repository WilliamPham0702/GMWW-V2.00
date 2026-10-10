import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPrivateDeliverySnapshot,currentPrivateDeliverySnapshot,privateDeliveryRoles,privateDeliveryArtifact} from '../src/gmww-delivery-snapshot.js';
import {buildPrivateDeliveryManifest,validPrivateDeliveryAcknowledgment} from '../src/gmww-delivery-manifest.js';

const key={matchId:'match-20261010',matchRevision:4,deliveryVersion:9,publishedAt:'2026-10-10T10:05:00.000Z'};
const legacy=[{matchId:key.matchId,assignmentIndex:0,roleId:'wolf',roleName:'Sói Trắng',viewedAt:null,artifact:{matchId:key.matchId,artifactId:'mirror',artifactName:'Tráng gương'}}];
const oldRole=[{...legacy[0],roleName:'Old stale role',matchId:'old-match',viewedAt:'stale-date'}];
const snapshot=buildPrivateDeliverySnapshot({...key,roles:legacy});

test('GM publishes one consistent durable snapshot for both private cards',()=>{
 assert.equal(snapshot.roles.length,1);assert.equal(snapshot.artifact.artifactId,'mirror');
 assert.equal(currentPrivateDeliverySnapshot(snapshot,key),snapshot);
 assert.deepEqual(privateDeliveryRoles(snapshot,oldRole),legacy);
 assert.deepEqual(privateDeliveryArtifact(snapshot,{matchId:'old-match',artifactId:'mirror',usedAt:'wrong'}),snapshot.artifact);
});
test('Role and Artifact viewed/used state overlays exact current assignment only',()=>{
 const roles=privateDeliveryRoles(snapshot,[{...legacy[0],viewedAt:'today',roleName:'changed without republish'}]);
 assert.equal(roles[0].viewedAt,'today');assert.equal(roles[0].roleName,'Sói Trắng');
 const artifact=privateDeliveryArtifact(snapshot,{...snapshot.artifact,viewedAt:'seen',usedAt:'used'});
 assert.equal(artifact.viewedAt,'seen');assert.equal(artifact.usedAt,'used');
 assert.equal(snapshot.artifact.viewedAt,undefined,'immutable published Artifact is not modified by reading');
});
test('A republished match or updated delivery version cannot use stale snapshot',()=>{
 for(const mismatch of [{...key,publishedAt:'later'},{...key,deliveryVersion:10},{...key,matchRevision:5},{...key,matchId:'another-match'}]){
  assert.equal(currentPrivateDeliverySnapshot(snapshot,mismatch),null);
 }
 assert.equal(currentPrivateDeliverySnapshot(null,key),null);
 assert.deepEqual(privateDeliveryRoles(null,legacy),legacy,'existing room data still loads without a snapshot');
 assert.deepEqual(privateDeliveryArtifact(null,snapshot.artifact),snapshot.artifact);
});
test('A real per-player snapshot produces an ACK-verifiable manifest without any artwork dependency',()=>{
 const manifest=buildPrivateDeliveryManifest({roomCode:'AABBCC',loginId:'test',...key,
  assignments:[{loginId:'test',roleId:'wolf',matchId:key.matchId,artifactId:'mirror'}],
  roles:privateDeliveryRoles(snapshot,oldRole),artifact:privateDeliveryArtifact(snapshot,null)});
 assert.equal(manifest.complete,true);assert.equal(manifest.roleCount,1);assert.equal(manifest.artifactExpected,true);
 assert.equal(validPrivateDeliveryAcknowledgment(manifest,{deliveryId:manifest.deliveryId,roleIds:manifest.roleIds,artifactId:'mirror'}),true);
 assert.equal(validPrivateDeliveryAcknowledgment(manifest,{deliveryId:manifest.deliveryId,roleIds:manifest.roleIds,artifactId:null}),false);
 const unavailable=buildPrivateDeliveryManifest({roomCode:'AABBCC',loginId:'test',...key,
  assignments:[{loginId:'test',roleId:'wolf',matchId:key.matchId,artifactId:'mirror'}],
  roles:privateDeliveryRoles(snapshot,oldRole),artifact:null});
 assert.equal(unavailable.complete,false);assert.equal(unavailable.artifactExpected,true);
});
test('Durable Object does not release room before snapshot is persisted and private endpoints read snapshot',()=>{
 const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const assign=source.slice(source.indexOf('async gmAssign(request,body){'),source.indexOf('async gmStart(request,body){'));
 const state=source.slice(source.indexOf('async playerState(body){'),source.indexOf('async playerRoleViewed(body){'));
 assert.match(assign,/storage\.put\("deliverySnapshot:"\+loginId,buildPrivateDeliverySnapshot\(/);
 assert.ok(assign.indexOf('storage.put("deliverySnapshot:"+loginId')<assign.indexOf('meta.roleDeliveredAt=nextPublishedAt'));
 assert.match(state,/currentPrivateDeliverySnapshot\(await this\.ctx\.storage\.get\("deliverySnapshot:"\+loginId\),meta\)/);
 assert.match(state,/privateDeliveryRoles\(activeSnapshot,legacyRows\)/);
 assert.match(state,/privateDeliveryArtifact\(activeSnapshot,storedArtifact\)/);
 assert.match(state,/validPrivateDeliveryAcknowledgment\(manifest,body\)/);
});
