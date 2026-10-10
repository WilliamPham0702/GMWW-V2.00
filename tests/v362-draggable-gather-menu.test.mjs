import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV362Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('Tập hợp dân làng menu has a touch drag handle, keeps functional buttons and keyboard support',()=>{
 assert.match(html,/class="play-gather-toolbar-head"[^>]*title="Giữ và kéo/);
 assert.match(html,/class="play-gather-drag-grip"/);
 for(const id of ['playGatherCall','playGatherRandom','playGatherManual','playGatherConfirm','playGatherDisband']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(app,/function initDraggablePlayGatherToolbar\(\)/);
 assert.match(app,/initDraggablePlaySheets\(\);\s*initDraggablePlayGatherToolbar\(\)/);
 assert.match(app,/handle\.addEventListener\('pointerdown'/);
 assert.match(app,/handle\.addEventListener\('pointermove'/);
 assert.match(app,/handle\.addEventListener\('pointerup'/);
 assert.match(app,/handle\.addEventListener\('pointercancel'/);
 assert.match(app,/handle\.addEventListener\('dblclick'/);
 assert.match(app,/handle\.addEventListener\('keydown'/);
 assert.match(app,/handle\.setPointerCapture\(e\.pointerId\)/);
 assert.match(app,/handle\.style\.touchAction='none'/);
 assert.match(app,/localStorage\.setItem\(GMWW_GATHER_DRAG_KEY/);
 assert.match(app,/window\.visualViewport\?\.addEventListener\('resize',clampOnscreen/);
});
test('Drag offsets stay within iPhone viewport between timeline and lower menu',()=>{
 const start=app.indexOf('function playGatherBoundCorrection(rect,bounds){');
 const end=app.indexOf('function initDraggablePlayGatherToolbar(){',start);
 assert.ok(start>=0&&end>start);
 const ctx={};
 vm.runInNewContext(app.slice(start,end)+'\nthis.clamp=playGatherBoundCorrection;',ctx);
 const correct=ctx.clamp;
 const bounds={left:7,right:393,top:110,bottom:730};
 assert.deepEqual(JSON.parse(JSON.stringify(correct({left:35,right:320,top:200,bottom:310},bounds))),{x:0,y:0});
 assert.deepEqual(JSON.parse(JSON.stringify(correct({left:-10,right:280,top:86,bottom:190},bounds))),{x:17,y:24});
 assert.deepEqual(JSON.parse(JSON.stringify(correct({left:318,right:430,top:680,bottom:751},bounds))),{x:-37,y:-21});
 assert.match(app,/getElementById\('playSetupStrip'\)/);
 assert.match(app,/getElementById\('gmTopMenu'\)/);
 assert.match(css,/#playShell\[data-step="seats"\] #playGatherToolbar\.play-gather-toolbar\{/);
 assert.match(css,/translate3d\(var\(--gmww-gather-drag-x,0px\),var\(--gmww-gather-drag-y,0px\),0\)!important/);
 assert.match(css,/\.play-gather-toolbar-head\{[\s\S]*?touch-action:none!important/);
 assert.match(app,/bar\.gmwwGatherClampOnscreen=clampOnscreen/);
});
test('V3.62 updates IPA V3.61 using only signed GM UI assets; no deletion or media overwrite',()=>{
 const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.62/';
 const paths=['GMWW.html','app.js','style.css'];
 const fresh=()=>({releaseVersion:'3.62',runtimeVersion:'3.62',shellVersion:'3.17',releaseType:'runtime',delete:[],
 runtime:{files:[...paths.map(path=>({path,url:base+path,sha256:'a'.repeat(64)})),
 {path:'game-characters/character-01.webp',url:base+'game-characters/character-01.webp',sha256:'b'.repeat(64)}]}});
 const got=selectVerifiedRuntimeV362Delta(fresh(),'3.61');
 assert.equal(got.upgradeMode,'verified-overlay');
 assert.equal(got.optimizedFromVersion,'3.61');
 assert.deepEqual(got.runtime.files.map(x=>x.path),paths);
 assert.deepEqual(got.delete,[]);
 for(const from of ['3.59','3.60','3.62','3.17'])assert.equal(selectVerifiedRuntimeV362Delta(fresh(),from),null);
 const badHash=fresh();badHash.runtime.files[0].sha256='bad';assert.equal(selectVerifiedRuntimeV362Delta(badHash,'3.61'),null);
 const badUrl=fresh();badUrl.runtime.files[0].url='https://invalid.example/GMWW.html';assert.equal(selectVerifiedRuntimeV362Delta(badUrl,'3.61'),null);
 const deleted=fresh();deleted.delete=['storage'];assert.equal(selectVerifiedRuntimeV362Delta(deleted,'3.61'),null);
 assert.match(worker,/VERSION="V3\.67",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-367"/);
 assert.match(worker,/selectVerifiedRuntimeV362Delta\(versioned,url\.searchParams\.get\("current"\)\)/);
 assert.match(worker,/selectVerifiedRuntimeV362Delta\(manifest,url\.searchParams\.get\("current"\)\)/);
});
