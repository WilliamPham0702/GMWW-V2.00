import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {verifyOtaVersionAdvance,compareReleaseVersions} from '../.github/scripts/verify-ota-version-advance.mjs';

const read=path=>readFileSync(path,'utf8');
const version='3.196';
const worker=read('src/index.js'),app=read('server-game/current/app.js');
const html=read('server-game/current/GMWW.html'),notes=read('.github/scripts/prepare-update-channel.mjs');
const packageJson=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));

test('V3.196: package, lockfile, Worker, native HTML and app.js all report the same new Runtime',()=>{
  assert.equal(packageJson.version,version+'.0');
  assert.equal(lock.version,version+'.0');
  assert.equal(lock.packages[''].version,version+'.0');
  assert.match(worker,/\bVERSION="V3\.196",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3196"/);
  assert.match(app,/const VERSION='3\.196';/);
  assert.match(html,/<title>GMWW V3\.196<\/title>/);
  assert.match(html,/style\.css\?v=3\.196-/);
  assert.match(html,/app\.js\?v=3\.196-/);
  assert.match(html,/village-layout\.js\?v=3\.196-/);
  assert.equal(compareReleaseVersions(version,'3.193'),1);
  assert.match(notes,/releaseNotes:\["V3\.196:/);
  assert.match(notes,/"V3\.195:/);
  assert.match(notes,/"V3\.194:/);
});

test('V3.196: OTA guard passes only a new version and still blocks overwriting V3.193',()=>{
  const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V';
  const files=v=>['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'].map(name=>({path:name,sha256:'a'.repeat(64),url:base+v+'/'+name}));
  const manifest=v=>({releaseType:'runtime',releaseVersion:v,runtimeVersion:v,shellVersion:'3.110',minimumShellVersion:'3.110',delete:[],runtime:{files:files(v)}});
  const old=manifest('3.193'),next=manifest(version),changed=['server-game/current/GMWW.html','server-game/current/app.js'];
  assert.deepEqual(verifyOtaVersionAdvance(next,old,changed),{runtimeChanged:true,candidateVersion:version,deployedVersion:'3.193'});
  const invalid=manifest('3.193');
  invalid.runtime.files[0].sha256='b'.repeat(64);
  assert.throws(()=>verifyOtaVersionAdvance(invalid,old,changed),/does not advance beyond Production/);
});

test('V3.196: normal release version guard remains enabled and passes',()=>{
  assert.doesNotThrow(()=>execFileSync(process.execPath,['.github/scripts/verify-gmww-versions.mjs'],{stdio:'pipe'}));
});
