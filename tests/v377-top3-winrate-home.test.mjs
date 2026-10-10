import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV377Delta} from '../src/gmww-ota-delta.js';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));

test('Top 3 ranks by exact win rate, then played games; excludes zero-game members',()=>{
 const start=app.indexOf('function gmwwHomeTop3Ranked(rows){');
 const end=app.indexOf('function gmwwHomeRenderTop3(rows){',start);
 assert.ok(start>0&&end>start);
 const rows=[
  {id:'alice',displayName:'Alice',stats:{wins:3,losses:1}},
  {id:'bob',displayName:'Bob',stats:{wins:10,losses:0}},
  {id:'chloe',displayName:'Chloe',stats:{wins:2,losses:0}},
  {id:'david',displayName:'David',stats:{wins:8,losses:2}},
  {id:'empty',displayName:'Empty',stats:{wins:0,losses:0}},
  {id:'frank',displayName:'Frank',stats:{wins:9,losses:1}}
 ];
 const result=vm.runInNewContext(app.slice(start,end)+';gmwwHomeTop3Ranked(rows)',{
  rows,memberStats:m=>{const w=m.stats.wins,l=m.stats.losses;return{w,l,games:w+l,rate:(w+l)?Math.round(w*100/(w+l)):0}}
 });
 assert.deepEqual(Array.from(result,m=>m.id),['bob','chloe','frank']);
});

test('Podium slots and navigation are data-driven and unique; preserve activity and Explore',()=>{
 assert.match(home,/Top 3 Tỷ Lệ Thắng/);
 assert.match(home,/gmww-home-top3-panel-v377/);
 assert.match(home,/id="gmwwHomeTop3"/);
 assert.match(home,/id="gmwwHomeTop3Status"/);
 assert.match(home,/id="gmwwHomeTop3Ranking"/);
 assert.match(css,/gmww-home-top3-card-v377\[data-rank="1"\]/);
 assert.match(css,/gmww-home-top3-card-v377\[data-rank="2"\]/);
 assert.match(css,/gmww-home-top3-card-v377\[data-rank="3"\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(app,/gmwwHomeRenderTop3\(rows\)/);
 assert.match(app,/gmwwHomeRenderTop3\(null\)/);
 assert.match(app,/button\.addEventListener\('click',\(\)=>gmwwHomeOpenMemberRanking\(\)\)/);
 assert.match(app,/marker\.className='gmww-home-recent-marker-v377'/);
 for(const id of ['gmwwHomeTop3','gmwwHomeTop3Status','gmwwHomeTop3Ranking','gmwwHomeRecentRows','gmwwHomeRefresh','gmwwHomeOpenRanking'])
  assert.equal((home.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.equal((home.match(/data-home-destination=/g)||[]).length,3);
 assert.doesNotMatch(home,/id="gmwwHomeTop3"[^>]*>\s*<button/,'Must never show fake winners');
});

test('V3.76 to V3.77 safe three-file OTA upgrades the existing IPA without deleting data',()=>{
 const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.77/';
 const paths=['GMWW.html','app.js','style.css'];
 const m=()=>({releaseVersion:'3.77',runtimeVersion:'3.77',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:paths.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}});
 const patch=selectVerifiedRuntimeV377Delta(m(),'3.76');
 assert.equal(patch?.upgradeMode,'verified-overlay');
 assert.deepEqual(patch?.runtime.files.map(f=>f.path),paths);
 assert.deepEqual(patch?.delete,[]);
 for(const from of ['3.75','3.77','3.17',''])assert.equal(selectVerifiedRuntimeV377Delta(m(),from),null);
 const bad=m();bad.runtime.files[2].sha256='invalid';assert.equal(selectVerifiedRuntimeV377Delta(bad,'3.76'),null);
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const k of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV377Delta('+k+',url.searchParams.get("current"))'));
});
