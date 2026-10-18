import test from 'node:test';
import assert from 'node:assert/strict';
import {compareReleaseVersions, verifyOtaVersionAdvance} from '../.github/scripts/verify-ota-version-advance.mjs';

const base='https://gmww-v2-00.williampham0702.workers.dev';
const hashes='a'.repeat(64);
const runtimeFiles=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'].map(path=>({
  path,url:base+'/updates/runtime/V3.107/'+path,sha256:hashes
}));
const manifest=(version, extras={})=>({
  releaseVersion:version,releaseType:'runtime',runtimeVersion:version,shellVersion:'3.17',
  runtime:{files:runtimeFiles.map(file=>({...file,url:file.url.replace('/V3.107/','/V'+version+'/')}))},
  ...extras
});

test('OTA version comparison uses numeric segments rather than lexical ordering',()=>{
  assert.equal(compareReleaseVersions('3.107','3.106'),1);
  assert.equal(compareReleaseVersions('V3.106','3.107'),-1);
  assert.equal(compareReleaseVersions('3.107.0','3.107'),0);
  assert.equal(compareReleaseVersions('invalid','3.107'),null);
});

test('Different Runtime bytes cannot be published under the same installed release version',()=>{
  const changed=manifest('3.106');
  changed.runtime.files[0].sha256='b'.repeat(64);
  assert.throws(()=>verifyOtaVersionAdvance(changed,manifest('3.106'),['server-game/current/app.js']),/does not advance beyond Production/);
  assert.throws(()=>verifyOtaVersionAdvance(manifest('3.106'),manifest('3.107'),['server-game/current/style.css']),/does not advance beyond Production/);
});

test('A new Runtime version with valid manifest paths and SHA-256 passes the release guard',()=>{
  const result=verifyOtaVersionAdvance(manifest('3.107'),manifest('3.106'),['server-game/current/app.js']);
  assert.deepEqual(result,{runtimeChanged:true,candidateVersion:'3.107',deployedVersion:'3.106'});
});

test('Server-only changes do not require a Runtime version bump',()=>{
  const result=verifyOtaVersionAdvance(manifest('3.106'),manifest('3.106'),['src/index.js']);
  assert.equal(result.runtimeChanged,false);
});

test('Malformed runtime assets fail closed before deployment',()=>{
  const missingHash=manifest('3.107');
  missingHash.runtime.files[0].sha256='not-sha';
  assert.throws(()=>verifyOtaVersionAdvance(missingHash,manifest('3.106'),['server-game/current/app.js']),/invalid SHA-256/);
  const wrongUrl=manifest('3.107');
  wrongUrl.runtime.files[0].url='https://example.com/updates/runtime/V3.107/GMWW.html';
  assert.throws(()=>verifyOtaVersionAdvance(wrongUrl,manifest('3.106'),['server-game/current/app.js']),/URL does not match release path/);
  const duplicate=manifest('3.107');
  duplicate.runtime.files.push({...duplicate.runtime.files[0]});
  assert.throws(()=>verifyOtaVersionAdvance(duplicate,manifest('3.106'),['server-game/current/app.js']),/Duplicate Runtime manifest path/);
});

test('release tooling can preserve a fully verified identical OTA package without version churn',()=>{
  const file={path:'app.js',sha256:'a'.repeat(64),url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.121/app.js'};
  const m={releaseVersion:'3.121',runtimeVersion:'3.121',releaseType:'runtime',shellVersion:'3.110',delete:[],runtime:{files:[file,...['GMWW.html','style.css','character-renderer.js','character-renderer.css'].map(path=>({...file,path,url:file.url.replace('app.js',path)}))]}};
  assert.doesNotThrow(()=>verifyOtaVersionAdvance(m,structuredClone(m),['.github/scripts/prepare-update-channel.mjs']));
  const changed=structuredClone(m);changed.runtime.files[0].sha256='b'.repeat(64);
  assert.throws(()=>verifyOtaVersionAdvance(changed,m,['.github/scripts/prepare-update-channel.mjs']),/does not advance/);
  assert.doesNotThrow(()=>verifyOtaVersionAdvance(m,structuredClone(m),['server-game/current/app.js']));
  assert.throws(()=>verifyOtaVersionAdvance(changed,m,['server-game/current/app.js']),/does not advance/);
});

test('Same-version repair rejects unverified inventory and any shell mismatch',()=>{
 const current=manifest('3.143',{minimumShellVersion:'3.110'});
 const deployed=structuredClone(current);
 assert.doesNotThrow(()=>verifyOtaVersionAdvance(current,deployed,['server-game/current/app.js']));
 deployed.minimumShellVersion='3.109';
 assert.throws(()=>verifyOtaVersionAdvance(current,deployed,['server-game/current/app.js']),/does not advance/);
 deployed.minimumShellVersion='3.110';
 deployed.runtime.files[0].sha256='invalid';
 assert.throws(()=>verifyOtaVersionAdvance(current,deployed,['server-game/current/app.js']),/does not advance/);
});
