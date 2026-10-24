import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareReleaseVersions,verifyOtaVersionAdvance} from '../.github/scripts/verify-ota-version-advance.mjs';

const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
const worker=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html');
const pipeline=read('.github/scripts/prepare-update-channel.mjs'),nativeCi=read('.github/workflows/build-server-game-ipa.yml');

test('Runtime V3.202 is synchronized across Worker, GM, npm and cache keys; native shell stays V3.110',()=>{
 assert.equal(pkg.version,'3.202.0');
 assert.equal(lock.version,'3.202.0');
 assert.equal(lock.packages[''].version,'3.202.0');
 assert.match(worker,/VERSION="V3\.201",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3202"/);
 assert.match(app,/const VERSION='3\.201';/);
 assert.match(html,/<title>GMWW V3\.201<\/title>/);
 for(const file of ['style.css','app.js','village-layout.js']){
   const re=new RegExp(file.replace('.','\\.')+'\\?v=3\\.201-');
   assert.match(html,re);
 }
 assert.equal(compareReleaseVersions('3.202','3.196'),1);
});

test('native IPA changes cannot suppress older-shell Runtime updates',()=>{
 assert.match(pipeline,/if\(version!==shell&&\(releaseType==='server_only'\|\|releaseType==='native'\)\) releaseType='runtime'/);
 assert.match(pipeline,/const isNative=releaseType==='native'/);
 assert.match(pipeline,/if\(version!==shell\)\s*\{\s*if\(releaseType!=='runtime'\)throw new Error/);
 assert.match(pipeline,/releaseNotes:\["V3\.201:/);
 assert.match(pipeline,/"V3\.195:/);
 assert.match(pipeline,/"V3\.194:/);
});

test('macOS official IPA CI installs pinned dependencies before testing',()=>{
 const install=nativeCi.indexOf('run: npm ci'),testPos=nativeCi.indexOf('          npm test');
 assert.ok(install>=0&&testPos>install,'native job must npm ci before npm test (fake-indexeddb)');
 assert.match(pkg.devDependencies.fake_indexeddb||pkg.devDependencies['fake-indexeddb'],/\d/);
});

test('V3.202 OTA guard advances over V3.196 and rejects same-version changed package',()=>{
 const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V';
 const names=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'];
 const manifest=v=>({releaseVersion:v,runtimeVersion:v,shellVersion:'3.110',minimumShellVersion:'3.110',releaseType:'runtime',delete:[],runtime:{files:names.map(name=>({path:name,sha256:'a'.repeat(64),url:origin+v+'/'+name}))}});
 const candidate=manifest('3.202'),live=manifest('3.197');
 assert.equal(verifyOtaVersionAdvance(candidate,live,['server-game/current/app.js']).runtimeChanged,true);
 candidate.runtime.files[0].sha256='b'.repeat(64);
 assert.throws(()=>verifyOtaVersionAdvance(candidate,manifest('3.202'),['server-game/current/app.js']),/does not advance beyond Production/);
});
