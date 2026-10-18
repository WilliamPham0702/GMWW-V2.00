import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {selectBuildVerifiedManifest,selectCatalogDelta} from '../src/gmww-release-catalog-policy.js';
import {validateV3140Delta} from '../.github/scripts/verify-ota-v3140-production.mjs';

const baseFile='update-system/verified-ota-baselines-v3140.json';
const pinned=JSON.parse(fs.readFileSync(baseFile,'utf8'));
const baselines=new Map(pinned.baselines.map(row=>[row.version,row]));
const catalog=manifest=>({schema:1,manifest,sha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')});
const sha=letter=>letter.repeat(64);

function target140(){
  const src=baselines.get('3.139').manifest;
  const m=structuredClone(src);
  m.releaseVersion='3.140';m.runtimeVersion='3.140';m.serverVersion='3.140';m.webVersion='3.140';
  m.runtime.files=m.runtime.files.map(file=>({...file,url:file.url.replace('/V3.139/','/V3.140/')}));
  m.runtime.files.find(file=>file.path==='GMWW.html').sha256=sha('a');
  m.runtime.files.find(file=>file.path==='app.js').sha256=sha('b');
  return m;
}

test('V3.137 / V3.138 source manifests have audited Production provenance and complete immutable inventories',async()=>{
  assert.equal(pinned.schema,1);
  assert.equal(pinned.baselines.length,3);
  const evidence=[['3.137',39096250345,'38eb1446082f105c71e84fa7dc76b286da34f6c5'],
                  ['3.138',39104239730,'212bb552ef577cba424e8177f916ec9a38c967a0'],
                  ['3.139',39109032855,'4eff650a4dc55b3b222b0ab4f661cb05707d09ff']];
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

test('iPhone IPA V3.110 V3.137 -> V3.140 gets only verified SHA-256 changed files',()=>{
  const target=target140();
  for(const version of ['3.137','3.138','3.139']){
    const source=baselines.get(version).manifest;
    const delta=selectCatalogDelta(target,source,version);
    const expected=target.runtime.files.filter(f=>source.runtime.files.find(b=>b.path===f.path)?.sha256!==f.sha256);
    assert.equal(delta.deltaFrom,version);
    assert.deepEqual(delta.runtime.files,expected);
    assert.equal(delta.delete.length,0);
    assert.equal(validateV3140Delta({ok:true,...delta},target,source,version),true);
    assert.ok(delta.runtime.files.length<10,'never return 138-file package for audited base');
  }
});

test('unknown / tampered inventories safely return full Runtime',async()=>{
  const target=target140();
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
  assert.ok(Number(JSON.parse(fs.readFileSync('package.json','utf8')).version.split('.')[1])>=140,'native V3.110 OTA guard must survive version advancement');
});

test('real V3.140 package builder embeds only the two audited iPhone OTA base catalogs',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gmww-ota-v3140-'));
  const put=(name,bytes)=>{
    const target=path.join(root,name);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,bytes);
  };
  try{
    put('server-game/current/app.js',"const VERSION='3.140';");
    put('server-game/current/GMWW.html','<title>GMWW V3.140</title><script src="app.js"></script>');
    for(const file of ['style.css','character-renderer.js','character-renderer.css'])
      put('server-game/current/'+file,'fixture '+file);
    for(const file of ['home-fantasy-hero-v337.webp','home-v1-book.webp','home-v1-members.webp','home-v1-action.webp'])
      put('server-game/current/home-art/'+file,'fixture artwork');
    put('assets/gm/gm-white-wolf.webp','fixture GM');
    put('server-game/shared/artwork.js','// fixture artwork');
    put('src/index.js','const NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-3140";');
    put('server-game/GMWW-Server.xcodeproj/project.pbxproj','MARKETING_VERSION = 3.110;');
    put(baseFile,fs.readFileSync(baseFile));
    const roles={};
    for(let i=0;i<63;i++){
      const id='fixture-role-'+i;
      roles[id]={};
      put('server-game/legacy-assets/v252/assets/role-artwork-v251/original/'+id+'.webp','fixture role '+i);
    }
    put('server-game/legacy-assets/v252/role-artwork-v251.js','window.GMWW_BUILTIN_ROLE_ARTWORK='+JSON.stringify(roles));
    const script=path.resolve('.github/scripts/prepare-update-channel.mjs');
    const build=spawnSync(process.execPath,[script,'runtime'],{cwd:root,encoding:'utf8'});
    assert.equal(build.status,0,build.stderr||build.stdout.slice(-2000));
    const generated=fs.readFileSync(path.join(root,'src/gmww-release-bases.js'),'utf8');
    const {releaseBases}=await import('data:text/javascript;base64,'+Buffer.from(generated).toString('base64'));
    assert.deepEqual(releaseBases.map(x=>x.manifest.releaseVersion),['3.139','3.138','3.137']);
    for(const row of releaseBases){
      assert.ok(await selectBuildVerifiedManifest(row,row.manifest.releaseVersion,'3.110'));
      assert.equal(row.manifest.runtime.files.length,138);
    }
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
