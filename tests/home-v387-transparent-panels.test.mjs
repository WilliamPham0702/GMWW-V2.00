import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV387Delta} from '../src/gmww-ota-delta.js';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));
const patch=css.slice(css.indexOf('/* V3.87 — remove backgrounds'));
test('Only final two Home backgrounds and their headers are made transparent',()=>{
 assert.ok(patch.startsWith('/* V3.87 — remove backgrounds'));
 assert.match(home,/gmww-home-top3-panel-v377/);
 assert.match(home,/gmww-home-activity-v351/);
 assert.match(patch,/\.gmww-home-top3-panel-v377,\.gmww-home-activity-v351/);
 assert.match(patch,/\.gmww-home-top3-heading-v377,\.gmww-home-top3-board-v377,\.gmww-home-activity-heading/);
 assert.ok((patch.match(/background:transparent!important/g)||[]).length>=4);
 assert.match(patch,/\.gmww-home-top3-board-v377::before/);
 assert.match(patch,/\.gmww-home-top3-board-v377::after/);
 assert.doesNotMatch(patch,/gmww-home-hero|gmww-home-discover-banner|gmww-home-enter-banner/);
});
test('Ranking and activity IDs, real data and readable text stay intact',()=>{
 for(const id of ['gmwwHomeTop3','gmwwHomeTop3Status','gmwwHomeTop3Ranking','gmwwHomeRecentRows','gmwwHomeRefresh','gmwwHomeOpenRanking'])
  assert.equal((home.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(app,/gmwwHomeRenderTop3\(rows\)/);
 assert.match(patch,/#eaffff!important/);
 assert.match(patch,/\.gmww-home-recent-row>b/);
});
test('Signed Runtime V3.86 to V3.87 overlay leaves stored data untouched',()=>{
 const paths=['GMWW.html','app.js','style.css'];
 const files=paths.map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.87/'+path,sha256:'a'.repeat(64)}));
 const m={releaseVersion:'3.87',runtimeVersion:'3.87',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files}};
 const result=selectVerifiedRuntimeV387Delta(m,'3.86');
 assert.equal(result?.upgradeMode,'verified-overlay');
 assert.deepEqual(result?.runtime.files.map(f=>f.path),paths);
 assert.deepEqual(result?.delete,[]);
 assert.equal(selectVerifiedRuntimeV387Delta(m,'3.85'),null);
 const invalid={...m,delete:['x']};assert.equal(selectVerifiedRuntimeV387Delta(invalid,'3.86'),null);
});
