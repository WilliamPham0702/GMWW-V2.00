import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV367Delta} from '../src/gmww-ota-delta.js';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const art=fs.readFileSync('server-game/current/home-art/home-reef-stats-v367.svg','utf8');
const section=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));

test('V3.67 home replaces four generic tiles with an illustrated real-data atlas',()=>{
 assert.match(section,/gmww-home-aesthetic-v367/);
 assert.match(section,/gmww-home-atlas-main-v367/);
 assert.match(section,/gmww-home-atlas-leader-v367/);
 assert.match(section,/gmww-home-logbook-v367/);
 for(const slot of ['members','online','games','wins'])assert.ok(section.includes('data-stat="'+slot+'"'));
 for(const id of ['gmwwHomeMemberCount','gmwwHomeOnlineCount','gmwwHomePlaysCount','gmwwHomeLeaderWins','gmwwHomeLeaderboard','gmwwHomeRecentRows','gmwwHomeRecentResult','gmwwHomeRefresh','gmwwHomeOpenRanking'])assert.equal((section.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'live binding: '+id);
 assert.match(section,/home-art\/home-reef-stats-v367.svg/);
 assert.match(art,/viewBox="0 0 480 300"/);
 assert.match(art,/<radialGradient id="pearl"/);
 assert.match(css,/gmww-home-atlas-main-v367/);
 assert.match(css,/gmww-home-logbook-body-v367/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(app,/button\.append\(marker,avatar,name,action,time,arrow\)/);
 assert.match(app,/gmwwHomeText\('gmwwHomeOnlineCount',rows\.filter/);
 assert.match(app,/gmwwHomeNavigate\('members'\)/);
 assert.equal((section.match(/data-home-destination=/g)||[]).length,3,'explore links remain');
});
test('V3.67 direct OTA downloads the four changed UI and artwork files only',()=>{
 const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.67/';
 const files=['GMWW.html','app.js','style.css','home-art/home-reef-stats-v367.svg'];
 const make=()=>({releaseVersion:'3.67',runtimeVersion:'3.67',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:files.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}});
 const result=selectVerifiedRuntimeV367Delta(make(),'3.66');
 assert.deepEqual(result?.runtime?.files?.map(f=>f.path),files);
 assert.deepEqual(result?.delete,[]);
 assert.equal(result?.upgradeMode,'verified-overlay');
 for(const from of ['3.65','3.67','3.17',''])assert.equal(selectVerifiedRuntimeV367Delta(make(),from),null);
 const bad=make();bad.runtime.files[3].sha256='unverified';assert.equal(selectVerifiedRuntimeV367Delta(bad,'3.66'),null);
 const deleted=make();deleted.delete=['storage'];assert.equal(selectVerifiedRuntimeV367Delta(deleted,'3.66'),null);
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const route of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV367Delta('+route+',url.searchParams.get("current"))'));
});
