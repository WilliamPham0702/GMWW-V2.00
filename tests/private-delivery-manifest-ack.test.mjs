import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrivateDeliveryManifest,validPrivateDeliveryAcknowledgment,PRIVATE_DELIVERY_SCHEMA_VERSION} from '../src/gmww-delivery-manifest.js';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';
import {readFileSync} from 'node:fs';

const base={roomCode:'ABC123',loginId:'player-a',matchId:'match-04',matchRevision:2,deliveryVersion:4,publishedAt:'2026-10-10T09:00:00Z'};
const role={roleId:'role-seer',matchId:base.matchId};
const artifact={artifactId:'artifact-mirror',matchId:base.matchId};
const assign={loginId:base.loginId,matchId:base.matchId,roleId:role.roleId,artifactId:artifact.artifactId};

test('Private delivery has a stable versioned identity, independent of player browser',()=>{
 const a=buildPrivateDeliveryManifest({...base,assignments:[assign],roles:[role],artifact});
 const b=buildPrivateDeliveryManifest({...base,assignments:[assign],roles:[role],artifact});
 assert.deepEqual(a,b);assert.equal(a.schemaVersion,PRIVATE_DELIVERY_SCHEMA_VERSION);assert.equal(a.complete,true);
 assert.equal(a.roleCount,1);assert.equal(a.artifactExpected,true);assert.equal(a.artifactId,artifact.artifactId);
 assert.ok(validPrivateDeliveryAcknowledgment(a,{deliveryId:a.deliveryId,roleIds:[role.roleId],artifactId:artifact.artifactId}));
 for(const change of [{deliveryId:a.deliveryId+'-stale'},{roleIds:[]},{artifactId:'wrong'}]){
  const attempted={deliveryId:a.deliveryId,roleIds:[role.roleId],artifactId:artifact.artifactId,...change};
  assert.equal(validPrivateDeliveryAcknowledgment(a,attempted),false);
 }
 const afterNewPublish=buildPrivateDeliveryManifest({...base,publishedAt:'2026-10-10T09:02:00Z',assignments:[assign],roles:[role],artifact});
 assert.notEqual(afterNewPublish.deliveryId,a.deliveryId,'republishing same match invalidates old receipt');
});

test('A missing Artifact is not silently treated as no Artifact; receipt must fail closed',()=>{
 const partial=buildPrivateDeliveryManifest({...base,assignments:[assign],roles:[role],artifact:null});
 assert.equal(partial.artifactExpected,true);assert.equal(partial.artifactId,artifact.artifactId);
 assert.equal(partial.complete,false);
 assert.equal(validPrivateDeliveryAcknowledgment(partial,{deliveryId:partial.deliveryId,roleIds:[role.roleId],artifactId:artifact.artifactId}),false);
 const noArtifact=buildPrivateDeliveryManifest({...base,assignments:[{...assign,artifactId:null}],roles:[role],artifact:null});
 assert.equal(noArtifact.artifactExpected,false);assert.equal(noArtifact.complete,true);
 assert.equal(validPrivateDeliveryAcknowledgment(noArtifact,{deliveryId:noArtifact.deliveryId,roleIds:[role.roleId],artifactId:null}),true);
});

test('Multi-role assignments must arrive in full before receipt and preserve original order',()=>{
 const extra={roleId:'wolf',matchId:base.matchId};
 const assignments=[assign,{...assign,roleId:extra.roleId}];
 const partial=buildPrivateDeliveryManifest({...base,assignments,roles:[role],artifact});
 const complete=buildPrivateDeliveryManifest({...base,assignments,roles:[role,extra],artifact});
 assert.equal(partial.roleCount,2);assert.equal(partial.complete,false);
 assert.equal(complete.roleCount,2);assert.equal(complete.complete,true);
 assert.equal(buildPrivateDeliveryManifest({...base,assignments,roles:[extra,role],artifact}).complete,false);
 assert.equal(buildPrivateDeliveryManifest({...base,assignments,roles:[{...role,matchId:'different'},extra],artifact}).complete,false);
});

test('No private delivery acknowledgements leak to public room endpoint or other accounts',()=>{
 const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 assert.match(source,/if\(url.pathname==="\/player\/delivery-received"/);
 assert.match(source,/playerDeliveryReceived\(body\)/);
 assert.match(source,/validPrivateDeliveryAcknowledgment\(manifest,body\)/);
 assert.match(source,/data\.member\.loginId/);
 assert.match(source,/"deliveryAck:"\+loginId/);
 assert.match(source,/row\.receivedAt=receivedAt/);
 assert.doesNotMatch(source,/publicRoom\(meta\)[\s\S]{0,100}deliveryManifest/);
});

test('Player only acknowledges full authenticated Role and Artifact receipt, independently of artwork',()=>{
 const source=patchPrivatePlayerCards(gmwwMembersLiveScript);
 assert.match(source,/function gmwwPrivateDeliveryComplete\(d\)/);
 assert.match(source,/m\.complete!==true/);
 assert.match(source,/roles\.length!==Number\(m\.roleCount\)/);
 assert.match(source,/if\(m\.artifactExpected&&\(!d\.artifact/);
 assert.match(source,/delivery\/received/);
 assert.match(source,/gmwwAcknowledgePrivateDelivery\(d\)/);
 assert.doesNotMatch(source,/img\.onload[\s\S]{0,200}delivery\/received/);
});
