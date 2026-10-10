import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {selectVerifiedRuntimeV354Delta} from '../src/gmww-ota-delta.js';
const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.54/';
const paths=['GMWW.html','app.js','style.css','home-art/home-sea-portal-v354.svg','home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg'];
const oldPortal='home-art/home-sea-portal-v352.svg';
const fixture={releaseVersion:'3.54',runtimeVersion:'3.54',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:[...paths,oldPortal].map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}};
test('V3.53 installs verified seven-file V3.54 homepage update',()=>{
 const delta=selectVerifiedRuntimeV354Delta(fixture,'3.53');assert.equal(delta.optimizedFromVersion,'3.53');
 assert.deepEqual(delta.runtime.files.map(x=>x.path),paths);assert.equal(delta.upgradeMode,'verified-overlay');
 assert.deepEqual(selectVerifiedRuntimeV354Delta(fixture,'3.52').runtime.files.map(x=>x.path),paths);
 assert.deepEqual(selectVerifiedRuntimeV354Delta(fixture,'3.51').runtime.files.map(x=>x.path),[...paths.slice(0,3),oldPortal,...paths.slice(3)]);
 for(const v of ['3.50','3.54',''])assert.equal(selectVerifiedRuntimeV354Delta(fixture,v),null);
 assert.equal(selectVerifiedRuntimeV354Delta({...fixture,delete:['settings']},'3.53'),null);
 assert.equal(selectVerifiedRuntimeV354Delta({...fixture,runtime:{files:fixture.runtime.files.slice(1)}},'3.53'),null);
 assert.equal(selectVerifiedRuntimeV354Delta({...fixture,runtime:{files:[...fixture.runtime.files,fixture.runtime.files[0]]}},'3.53'),null);
});
test('Four independent artwork files, one hero name, functional links, no hidden stats',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
 const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));
 assert.ok(home.includes('data-home-build="v354-artwork-banners"'));assert.ok(home.includes('gmww-home-hero-artboard-v351'));assert.ok(home.includes('home-art/home-fantasy-hero-v337.webp'));
 assert.ok(!home.includes('aria-label="WilliamPham – Ma Sói Phiên Bản Biển"'));
 assert.equal((home.match(/id="gmwwHomeEnterVillage"/g)||[]).length,1);
 assert.equal((home.match(/data-home-destination=/g)||[]).length,3);
 for(const path of paths.slice(3)){assert.ok(home.includes('src="'+path+'"'));const s=fs.readFileSync('server-game/current/'+path,'utf8');assert.match(s,/viewBox=/);assert.ok(s.includes('</svg>'));}
 assert.ok(css.includes('scroll-padding-bottom'));assert.ok(css.includes('padding-bottom:calc(188px'));
});
