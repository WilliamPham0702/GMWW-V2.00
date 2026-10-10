import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVerifiedRuntimeV363Delta} from '../src/gmww-ota-delta.js';

const origin='https://gmww-v2-00.williampham0702.workers.dev';
const basic=['GMWW.html','app.js','style.css'];
const hash='a'.repeat(64);
const manifest=()=>({
  releaseVersion:'3.63',runtimeVersion:'3.63',shellVersion:'3.17',
  releaseType:'runtime',delete:[],
  runtime:{files:[...basic,'role-artwork-v251.js','gm/gm-white-wolf.webp'].map(path=>({
    path,url:origin+'/updates/runtime/V3.63/'+path,sha256:hash
  }))}
});

test('Installed Runtime V3.60, V3.61 and V3.62 receive only three changed UI files',()=>{
  for(const from of ['3.60','3.61','3.62']){
    const release=selectVerifiedRuntimeV363Delta(manifest(),from);
    assert.ok(release,'Expected direct V'+from+' upgrade to V3.63');
    assert.equal(release.releaseVersion,'3.63');
    assert.equal(release.optimizedFromVersion,from);
    assert.equal(release.upgradeMode,'verified-overlay');
    assert.deepEqual(release.runtime.files.map(x=>x.path),basic);
    assert.deepEqual(release.delete,[]);
    assert.ok(release.runtime.files.every(x=>x.url.startsWith(origin+'/updates/runtime/V3.63/')));
  }
});

test('Unknown installed versions and invalid source must not receive lightweight overlay',()=>{
  for(const from of ['3.17','3.39','3.59','3.63','3.64','']){
    assert.equal(selectVerifiedRuntimeV363Delta(manifest(),from),null);
  }
  const badVersion=manifest();badVersion.releaseVersion='3.62';
  const invalidHash=manifest();invalidHash.runtime.files[1].sha256='bad';
  const otherOrigin=manifest();otherOrigin.runtime.files[0].url='https://example.org/file';
  const duplicate=manifest();duplicate.runtime.files.push({...duplicate.runtime.files[0]});
  const missing=manifest();missing.runtime.files=missing.runtime.files.filter(x=>x.path!=='style.css');
  const deleteFiles=manifest();deleteFiles.delete=['any-file'];
  const badShell=manifest();badShell.shellVersion='3.16';
  for(const candidate of [badVersion,invalidHash,otherOrigin,duplicate,missing,deleteFiles,badShell]){
    assert.equal(selectVerifiedRuntimeV363Delta(candidate,'3.60'),null);
  }
});
