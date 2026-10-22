import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const compiled=patchPrivatePlayerCards(gmwwMembersLiveScript);
test('Approved Role and Artifact card backs are distinct for every Player Web use',()=>{
 assert.doesNotThrow(()=>new vm.Script(compiled));
 const role='/card-backs/role-card-back-v1.png';
 const artifact='/card-backs/artifact-card-back-v1.png';
 assert.match(compiled,/function applyRoleCardBack\(\)[\s\S]{0,180}const src='\/card-backs\/role-card-back-v1\.png'/);
 assert.match(compiled,/const img=dock\.querySelector\('\[data-private-card="role"\] \.mini-card img'\),back='\/card-backs\/role-card-back-v1\.png'/);
 assert.match(compiled,/const artifactBack=artifact\.querySelector\('\.mini-card img'\),artifactBackSrc='\/card-backs\/artifact-card-back-v1\.png'/);
 assert.match(compiled,/#game #artifactCard \.gmww-art-back\{background:#2e130d url\('\/card-backs\/artifact-card-back-v1\.png'\)/);
 assert.match(compiled,/#game #gmwwPlayerPrivateDock \.mini-label\{display:none!important\}/);
 assert.notEqual(role,artifact);
 assert.doesNotMatch(compiled,/artifactBack\.src=back/);
});

test('Approved transparent card backs are shipped as independent PNG assets',()=>{
 const role=fs.readFileSync(new URL('../assets/card-backs/role-card-back-v1.png',import.meta.url));
 const artifact=fs.readFileSync(new URL('../assets/card-backs/artifact-card-back-v1.png',import.meta.url));
 for(const bytes of [role,artifact]){
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','expected PNG signature');
  assert.ok(bytes.readUInt32BE(16)>=120);
  assert.ok(bytes.readUInt32BE(20)>=180);
  assert.ok(bytes.length>30000);
 }
 assert.notDeepEqual(role,artifact,'Role and Artifact must use different artwork');
});
