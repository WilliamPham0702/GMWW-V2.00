import test from 'node:test';
import assert from 'node:assert/strict';
import * as policy from '../src/gmww-release-catalog-policy.js';
const origin='https://gmww-v2-00.williampham0702.workers.dev';
const core=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css','gm/gm-white-wolf.webp','home-art/home-fantasy-hero-v337.webp','home-art/home-v1-book.webp','home-art/home-v1-members.webp','home-art/home-v1-action.webp'];
function manifest(version){return {schema:1,releaseType:'runtime',releaseVersion:version,runtimeVersion:version,shellVersion:'3.110',minimumShellVersion:'3.110',delete:[],runtime:{files:core.map(path=>({path,url:origin+'/updates/runtime/V'+version+'/'+path,sha256:'a'.repeat(64)}))}}}
test('generic future release selects changed checksums without a version-specific mapping',async()=>{
  assert.equal(typeof policy.selectCatalogDelta,'function');
  const base=manifest('3.998'),target=manifest('3.999');
  target.runtime.files[1].sha256='b'.repeat(64);
  const selected=policy.selectCatalogDelta(target,base,'3.998');
  assert.deepEqual(selected.runtime.files,[target.runtime.files[1]]);
  assert.equal(selected.deltaFrom,'3.998');
  assert.equal(target.runtime.files.length,10);
});
test('unknown, equal, newer, incompatible and unsafe bases keep full package',()=>{
  assert.equal(typeof policy.selectCatalogDelta,'function');
  const target=manifest('3.999');
  for(const [base,current] of [[null,'3.998'],[manifest('3.998'),'3.997'],[target,'3.999'],[manifest('4.0'),'4.0']])
    assert.equal(policy.selectCatalogDelta(target,base,current),target);
  for(const change of [m=>m.shellVersion='3.17',m=>m.runtime.files.pop(),m=>m.runtime.files.push({...m.runtime.files[0]}),m=>m.runtime.files[0].url='https://evil.example/app.js',m=>m.delete.push('saved.json')]){
    const base=manifest('3.998');change(base);
    assert.equal(policy.selectCatalogDelta(target,base,'3.998'),target);
  }
});
test('no changed bytes or removed paths never produce an empty or destructive delta',()=>{
  assert.equal(typeof policy.selectCatalogDelta,'function');
  const base=manifest('3.998'),target=manifest('3.999');
  assert.equal(policy.selectCatalogDelta(target,base,'3.998'),target);
  base.runtime.files.push({path:'old.js',url:origin+'/updates/runtime/V3.998/old.js',sha256:'a'.repeat(64)});
  target.runtime.files[1].sha256='b'.repeat(64);
  assert.equal(policy.selectCatalogDelta(target,base,'3.998'),target);
});
