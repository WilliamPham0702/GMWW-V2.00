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

test('Runtime source changes cannot be published under the same installed release version',()=>{
  assert.throws(()=>verifyOtaVersionAdvance(manifest('3.106'),manifest('3.106'),['server-game/current/app.js']),/does not advance beyond Production/);
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
