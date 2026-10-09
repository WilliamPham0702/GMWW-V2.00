import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {selectVerifiedRuntimeV353Delta} from '../src/gmww-ota-delta.js';
const url='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.53/';
const names=['GMWW.html','app.js','style.css','home-art/home-sea-portal-v353.svg','home-art/home-sea-cards-v353.svg','home-art/home-sea-members-v353.svg','home-art/home-sea-templates-v353.svg'];
const fixture={releaseVersion:'3.53',runtimeVersion:'3.53',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:names.map(path=>({path,url:url+path,sha256:'a'.repeat(64)}))}};
const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));
test('V3.53 Trang Chủ dùng bốn artwork riêng, không trùng bảng tên',()=>{
 assert.ok(home.includes('v353-artwork-banners'));
 assert.equal((home.match(/gmww-home-name-v353/g)||[]).length,1);
 assert.ok(!home.includes('aria-label="WilliamPham – Ma Sói Phiên Bản Biển"'));
 for(const name of names.slice(3)){assert.ok(home.includes('src="'+name+'"'),name);assert.ok(fs.existsSync('server-game/current/'+name));}
 assert.equal((home.match(/id="gmwwHomeEnterVillage"/g)||[]).length,1);
 assert.equal((home.match(/data-home-destination=/g)||[]).length,3);
 assert.match(css,/scroll-padding-bottom/);assert.match(css,/padding-bottom:calc\(188px/);
});
test('V3.52 -> V3.53 verified seven-file OTA',()=>{
 const delta=selectVerifiedRuntimeV353Delta(fixture,'3.52');
 assert.deepEqual(delta?.runtime.files.map(x=>x.path),names);
 assert.equal(delta?.optimizedFromVersion,'3.52');
 assert.equal(selectVerifiedRuntimeV353Delta(fixture,'3.51'),null);
 assert.equal(selectVerifiedRuntimeV353Delta({...fixture,delete:['anything']},'3.52'),null);
 assert.equal(selectVerifiedRuntimeV353Delta({...fixture,runtime:{files:fixture.runtime.files.slice(1)}},'3.52'),null);
 assert.equal(selectVerifiedRuntimeV353Delta({...fixture,runtime:{files:[...fixture.runtime.files,fixture.runtime.files[0]]}},'3.52'),null);
});
test('Artwork SVG uses valid viewBox and contains no raster-embedded fake statistics',()=>{
 for(const name of names.slice(3)){
   const s=fs.readFileSync('server-game/current/'+name,'utf8');
   assert.match(s,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
   assert.match(s,/viewBox=/);assert.ok(s.trimEnd().endsWith('</svg>'));
   assert.ok(!s.includes('32 Thành viên'));
 }
});
