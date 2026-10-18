import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {selectBuildVerifiedManifest,selectCatalogDelta} from '../src/gmww-release-catalog-policy.js';
import {validateV3139Delta} from '../.github/scripts/verify-ota-v3139-production.mjs';

const baseFile='update-system/verified-ota-baselines-v3139.json';
const pinned=JSON.parse(fs.readFileSync(baseFile,'utf8'));
const baselines=new Map(pinned.baselines.map(row=>[row.version,row]));
const catalog=manifest=>({schema:1,manifest,sha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')});
const sha=letter=>letter.repeat(64);

function target139(){
  const src=baselines.get('3.138').manifest;
  const m=structuredClone(src);
  m.releaseVersion='3.139';m.runtimeVersion='3.139';m.serverVersion='3.139';m.webVersion='3.139';
  m.runtime.files=m.runtime.files.map(file=>({...file,url:file.url.replace('/V3.138/','/V3.139/')}));
  m.runtime.files.find(file=>file.path==='GMWW.html').sha256=sha('a');
  m.runtime.files.find(file=>file.path==='app.js').sha256=sha('b');
  return m;
}

test('V3.137 / V3.138 source manifests have audited Production provenance and complete immutable inventories',async()=>{
  assert.equal(pinned.schema,1);
  assert.equal(pinned.baselines.length,2);
  const evidence=[['3.137',39096250345,'38eb1446082f105c71e84fa7dc76b286da34f6c5'],
                  ['3.138',39104239730,'212bb552ef577cba424e8177f916ec9a38c967a0']];
  for(const [version,run,commit] of evidence){
    const row=baselines.get(version);
    assert.equal(row.workflowRun,run);
    assert.equal(row.sourceCommit,commit);
    assert.equal(row.manifest.releaseType,'runtime');
    assert.equal(row.manifest.shellVersion,'3.110');
    assert.equal(row.manifest.runtime.files.length,138);
    assert.deepEqual(row.manifest.delete,[]);
    assert.ok(await selectBuildVerifiedManifest(catalog(row.manifest),version,'3.110'));
    for(const f of row.manifest.runtime.files)
      assert.match(f.sha256,/^[a-f0-9]{64}$/);
  }
  const before=new Map(baselines.get('3.137').manifest.runtime.files.map(f=>[f.path,f.sha256]));
  const changed=baselines.get('3.138').manifest.runtime.files.filter(f=>before.get(f.path)!==f.sha256).map(f=>f.path).sort();
  assert.deepEqual(changed,['GMWW.html','app.js','status-visuals.css','status-visuals.js','style.css']);
});

test('iPhone IPA V3.110 V3.137 -> V3.139 gets only verified SHA-256 changed files',()=>{
  const target=target139();
  for(const version of ['3.137','3.138']){
    const source=baselines.get(version).manifest;
    const delta=selectCatalogDelta(target,source,version);
    const expected=target.runtime.files.filter(f=>source.runtime.files.find(b=>b.path===f.path)?.sha256!==f.sha256);
    assert.equal(delta.deltaFrom,version);
    assert.deepEqual(delta.runtime.files,expected);
    assert.equal(delta.delete.length,0);
    assert.equal(validateV3139Delta({ok:true,...delta},target,source,version),true);
    assert.ok(delta.runtime.files.length<10,'never return 138-file package for audited base');
  }
});

test('unknown / tampered inventories safely return full Runtime',async()=>{
  const target=target139();
  assert.equal(selectCatalogDelta(target,null,'3.137'),target);
  assert.equal(selectCatalogDelta(target,baselines.get('3.137').manifest,'3.136'),target);
  const tampered=structuredClone(baselines.get('3.137').manifest);
  tampered.runtime.files[0].sha256='invalid';
  assert.equal(await selectBuildVerifiedManifest(catalog(tampered),'3.137','3.110'),null);
  assert.equal(selectCatalogDelta(target,tampered,'3.137'),target);
  const missing=structuredClone(baselines.get('3.137').manifest);
  missing.runtime.files=missing.runtime.files.filter(file=>file.path!=='GMWW.html');
  assert.equal(selectCatalogDelta(target,missing,'3.137'),target);
});

test('legacy iPhone V3.110 native SHA-256 staging and rollback remain unchanged; slow UI has no fabricated percent',()=>{
  const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  const part=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
  assert.match(swift,/allowedRuntimeURL\(remote\)/);
  assert.match(swift,/sha256\(fileData\)\.lowercased\(\) == item\.sha256\.lowercased\(\)/);
  assert.match(swift,/copyItem\(at: active, to: temp\)/);
  assert.match(swift,/case "rollbackRuntime":/);
  assert.match(swift,/UserDefaults\.standard\.set\(version, forKey: activeRuntimeKey\)/);
  assert.match(app,/gmwwUpdateSlowTimer=setTimeout/);
  assert.match(part,/gmwwUpdateSlowTimer=setTimeout/);
  assert.match(app,/gmwwSetUpdateProgress\('running',null,'Đang tải chậm/);
  assert.match(app,/if\(gmwwUpdateSlowTimer\)clearTimeout\(gmwwUpdateSlowTimer\)/);
  assert.match(app,/Đã giữ nguyên phiên bản hiện tại/);
  assert.doesNotMatch(app,/gmwwSetUpdateProgress\('running',0,'Đang tải Runtime/);
  assert.equal(JSON.parse(fs.readFileSync('package.json','utf8')).version,'3.139.0');
});
