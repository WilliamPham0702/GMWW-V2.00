import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectLegacyV350RuntimeDelta as select} from '../src/gmww-ota-delta.js';
const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.51/';
const SHA='e'.repeat(64);
const names=['GMWW.html','app.js','style.css'];
const create=()=>({
  releaseVersion:'3.51',runtimeVersion:'3.51',shellVersion:'3.17',releaseType:'runtime',
  delete:[],runtime:{files:[
    ...names.map(path=>({path,url:base+path,sha256:SHA})),
    ...Array.from({length:180},(_,i)=>({path:'assets/role-artwork-v251/original/'+i+'.webp',url:base+i+'.webp',sha256:SHA}))
  ]},releaseNotes:['Chỉ thay đổi phiên bản mới']
});
test('V3.50 IPA gets exactly the 3 changed UI files instead of 183 downloads',()=>{
  const original=create(),out=select(original,'3.50');
  assert.equal(out.releaseType,'runtime');
  assert.equal(out.runtimeVersion,'3.51');
  assert.equal(out.optimizedFromVersion,'3.50');
  assert.deepEqual(out.runtime.files.map(f=>f.path),names);
  assert.equal(out.runtime.files.length,3);
  assert.equal(original.runtime.files.length,183);
  assert.deepEqual(out.delete,[]);
  assert.deepEqual(out.releaseNotes,original.releaseNotes);
});
test('Other base runtimes and future releases keep the full manifest',()=>{
  for(const version of ['3.49','3.48','3.51','3.52','',null])assert.equal(select(create(),version),null);
  for(const field of ['releaseVersion','runtimeVersion']){
    const manifest=create();manifest[field]='3.52';assert.equal(select(manifest,'3.50'),null);
  }
  const wrongShell=create();wrongShell.shellVersion='3.19';assert.equal(select(wrongShell,'3.50'),null);
});
test('Missing required UI files, mismatched SHA/URL, deletion, and duplicates fail closed',()=>{
  for(const path of names){
    const miss=create();miss.runtime.files=miss.runtime.files.filter(f=>f.path!==path);assert.equal(select(miss,'3.50'),null);
  }
  const hash=create();hash.runtime.files[0].sha256='fake';assert.equal(select(hash,'3.50'),null);
  const url=create();url.runtime.files[0].url='https://evil.invalid/app.js';assert.equal(select(url,'3.50'),null);
  const versionPath=create();versionPath.runtime.files[0].url=base.replace('V3.51','V3.50')+'GMWW.html';assert.equal(select(versionPath,'3.50'),null);
  const deletion=create();deletion.delete=['old-important.js'];assert.equal(select(deletion,'3.50'),null);
  const duplicate=create();duplicate.runtime.files.push({...duplicate.runtime.files[0]});assert.equal(select(duplicate,'3.50'),null);
});
test('Worker applies the slim overlay to both versioned and latest manifest paths',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  const matches=worker.match(/selectLegacyV350RuntimeDelta\((?:versioned|manifest),url\.searchParams\.get\("current"\)\)/g)||[];
  assert.equal(matches.length,2);
  const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
  assert.match(swift,/copyItem\(at: active, to: temp\)/);
  assert.match(swift,/for item in runtime\.files/);
  assert.match(swift,/sha256\(fileData\)\.lowercased\(\) == item\.sha256\.lowercased\(\)/);
  assert.match(swift,/UserDefaults\.standard\.set\(version, forKey: activeRuntimeKey\)/);
});
