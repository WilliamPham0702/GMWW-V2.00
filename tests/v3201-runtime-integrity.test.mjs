import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareReleaseVersions,verifyOtaVersionAdvance} from '../.github/scripts/verify-ota-version-advance.mjs';
const read=p=>fs.readFileSync(p,'utf8');

test('V3.202 nhất quán phiên bản, shell và release notes tiếng Việt',()=>{
  const worker=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html');
  const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
  const prep=read('.github/scripts/prepare-update-channel.mjs');
  assert.match(worker,/VERSION="V3\.201",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3202"/);
  assert.match(app,/const VERSION='3\.201';/);
  assert.match(html,/<title>GMWW V3\.201<\/title>/);
  assert.equal(pkg.version,'3.202.0');
  assert.equal(lock.version,'3.202.0');
  assert.equal(lock.packages[''].version,'3.202.0');
  assert.match(prep,/releaseNotes:\["V3\.201:/);
  for(const pr of ['#443','#445','#447','#449'])assert.ok(prep.includes(pr),'Thiếu ghi chú PR '+pr);
  assert.equal(compareReleaseVersions('3.202','3.200'),1);
});

test('Chặn byte Runtime chưa tăng version dù PR cuối chỉ sửa CI',()=>{
  const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V';
  const paths=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'];
  const make=(v,hash)=>({releaseVersion:v,runtimeVersion:v,releaseType:'runtime',shellVersion:'3.110',
    runtime:{files:paths.map(path=>({path,sha256:hash,url:origin+v+'/'+path}))}});
  const deployed=make('3.200','a'.repeat(64)),changed=make('3.200','b'.repeat(64));
  assert.throws(()=>verifyOtaVersionAdvance(changed,deployed,['tests/ci-browser-scope.test.mjs']),/does not advance beyond Production/);
  assert.equal(verifyOtaVersionAdvance(make('3.202','b'.repeat(64)),deployed,['tests/ci-browser-scope.test.mjs']).runtimeChanged,true);
});
