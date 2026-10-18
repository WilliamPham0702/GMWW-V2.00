import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {isV562IsolatedPreviewAsset} from '../.github/scripts/character-v562-preview-isolation.mjs';
import {verifyOtaVersionAdvance} from '../.github/scripts/verify-ota-version-advance.mjs';

const classify=paths=>{
 const run=spawnSync(process.execPath,['.github/scripts/classify-update.mjs'],{
  encoding:'utf8',
  env:{...process.env,GMWW_CHANGED_FILES:paths.join('\n')}
 });
 assert.equal(run.status,0,run.stderr);
 return JSON.parse(run.stdout).releaseType;
};
const origin='https://gmww-v2-00.williampham0702.workers.dev';
const manifest=()=>{
 const v='3.122';
 const paths=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'];
 return {releaseVersion:v,runtimeVersion:v,shellVersion:'3.17',releaseType:'runtime',
  runtime:{files:paths.map(path=>({
   path,sha256:'a'.repeat(64),url:origin+'/updates/runtime/V'+v+'/'+path
  }))}};
};
test('exact independent V5.62 lab files do NOT trigger game Runtime/IPA OTA release',()=>{
 const paths=[
  'assets/characters/v5/test-skin-v562.html',
  'assets/characters/v5/skin-v562-original-sleeves.mjs'
 ];
 for(const path of paths)assert.equal(isV562IsolatedPreviewAsset(path),true);
 assert.equal(classify(paths),'server_only');
 const result=verifyOtaVersionAdvance(manifest(),manifest(),paths);
 assert.equal(result.runtimeChanged,false);
});
test('isolation is not a catch-all escape hatch for original game or older assets',()=>{
 const runtime=[
  'assets/characters/v4/character-01.png',
  'assets/characters/v5/character-rig-v510.mjs',
  'assets/characters/v5/skin-v561-original-art-uv.mjs',
  'server-game/current/app.js',
  'update-system/config.json'
 ];
 for(const path of runtime){
  assert.equal(isV562IsolatedPreviewAsset(path),false);
  assert.equal(classify([path]),'runtime');
  const candidate=manifest();candidate.runtime.files[0].sha256='b'.repeat(64);
  assert.throws(()=>verifyOtaVersionAdvance(candidate,manifest(),[path]),/does not advance beyond Production/);
 }
 assert.equal(classify(['server-game/GMWW-Server/App.swift']),'native');
 assert.equal(classify(['src/index.js']),'server_only');
});
test('mixing even one live asset with preview files still BLOCKS same-version OTA',()=>{
 const p=['assets/characters/v5/test-skin-v562.html','server-game/current/app.js'];
 assert.equal(classify(p),'runtime');
 const candidate=manifest();candidate.runtime.files[0].sha256='b'.repeat(64);
 assert.throws(()=>verifyOtaVersionAdvance(candidate,manifest(),p),/does not advance beyond Production/);
});
