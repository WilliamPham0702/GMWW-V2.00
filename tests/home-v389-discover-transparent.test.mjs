import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV389Delta} from '../src/gmww-ota-delta.js';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));
const patch=css.slice(css.indexOf('/* V3.89 — transparent Khám Phá'));

test('Khám Phá outer wrapper is transparent with no frame, while cards stay intact',()=>{
 assert.ok(patch.startsWith('/* V3.89 — transparent Khám Phá'));
 assert.match(patch,/#home \.gmww-home-premium-v366 > \.gmww-home-discover-banner-v352\{/);
 for(const decl of ['background:transparent!important','background-image:none!important','border:0!important','border-radius:0!important','box-shadow:none!important','backdrop-filter:none!important','-webkit-backdrop-filter:none!important','padding:0!important'])
   assert.ok(patch.includes(decl),decl);
 assert.doesNotMatch(patch,/\.gmww-home-tiles-v350 (?:button|img|b|small)\{/);
 assert.equal((home.match(/data-home-destination=/g)||[]).length,3);
 for(const name of ['Bộ Bài','Thành Viên','Ván Mẫu'])assert.ok(home.includes(name),name);
 assert.match(css,/#home \.gmww-home-discover-banner-v352 \.gmww-home-tiles-v350 button\{/);
});

test('V3.89 installs from V3.87 via three verified UI files; deletion forbidden',()=>{
 const files=['GMWW.html','app.js','style.css'].map(path=>({
   path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.89/'+path,sha256:'a'.repeat(64)
 }));
 const m={releaseVersion:'3.89',runtimeVersion:'3.89',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files}};
 const result=selectVerifiedRuntimeV389Delta(m,'3.88');
 assert.equal(result?.upgradeMode,'verified-overlay');
 assert.deepEqual(result?.runtime.files.map(f=>f.path),['GMWW.html','app.js','style.css']);
 assert.deepEqual(result?.delete,[]);
 for(const from of ['3.86','3.89',''])assert.equal(selectVerifiedRuntimeV389Delta(m,from),null);
 for(const mutate of [x=>{x.delete=['artwork']},x=>{x.runtime.files[0].sha256='bad'},x=>{x.runtime.files[1].url='https://unsafe.invalid/app.js'},x=>{x.runtime.files.push({...x.runtime.files[0]})}]){
   const corrupted=structuredClone(m);mutate(corrupted);
   assert.equal(selectVerifiedRuntimeV389Delta(corrupted,'3.88'),null);
 }
 assert.match(app,/const VERSION='3\.102'/);
 assert.match(html,/<title>GMWW V3\.102<\/title>/);
});
