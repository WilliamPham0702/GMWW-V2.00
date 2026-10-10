import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {selectVerifiedRuntimeV368Delta} from '../src/gmww-ota-delta.js';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const artwork=fs.readFileSync('server-game/current/home-art/home-reef-stats-v367.svg','utf8');

test('V3.68 replaces flat homepage stats and activity with original reef atlas and living history',()=>{
 const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));
 assert.match(home,/gmww-home-aesthetic-v367/);
 assert.match(home,/gmww-home-atlas-main-v367/);
 assert.match(home,/gmww-home-atlas-leader-v367/);
 assert.match(home,/gmww-home-logbook-v367/);
 assert.match(artwork,/<radialGradient id="pearl"/);
 assert.match(css,/Illustrated atlas \+ pearl logbook/);
 assert.match(app,/button\.append\(marker,avatar,name,action,time,arrow\)/);
 for(const id of ['gmwwHomeMemberCount','gmwwHomeOnlineCount','gmwwHomePlaysCount','gmwwHomeLeaderWins','gmwwHomeLeaderboard','gmwwHomeRecentRows','gmwwHomeRecentResult','gmwwHomeRefresh','gmwwHomeOpenRanking'])
  assert.equal((home.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.equal((home.match(/data-home-destination=/g)||[]).length,3,'Khám Phá retains navigation');
 assert.ok(app.includes('gmwwHomeText(\'gmwwHomeOnlineCount\',rows.filter'));
 assert.ok(app.includes("gmwwHomeNavigate('members')"));
});
test('V3.68 only installs verified changed UI/illustration over V3.67 game chooser',()=>{
 const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.68/';
 const files=['GMWW.html','app.js','style.css','home-art/home-reef-stats-v367.svg'];
 const make=()=>({releaseVersion:'3.68',runtimeVersion:'3.68',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:files.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}});
 const valid=selectVerifiedRuntimeV368Delta(make(),'3.67');
 assert.deepEqual(valid?.runtime?.files?.map(f=>f.path),files);
 assert.deepEqual(valid?.delete,[]);
 assert.equal(valid?.upgradeMode,'verified-overlay');
 for(const from of ['3.66','3.68','3.17',''])assert.equal(selectVerifiedRuntimeV368Delta(make(),from),null);
 const tampered=make();tampered.runtime.files[3].sha256='bad';assert.equal(selectVerifiedRuntimeV368Delta(tampered,'3.67'),null);
 const deleted=make();deleted.delete=['data'];assert.equal(selectVerifiedRuntimeV368Delta(deleted,'3.67'),null);
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const route of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV368Delta('+route+',url.searchParams.get("current"))'));
});
