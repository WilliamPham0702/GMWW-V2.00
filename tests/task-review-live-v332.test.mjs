// Historical V3.32 task-review UI was retired by owner request in Runtime V3.144.
// Guard against bringing stale task status controls back into the GM Server.
import {assertCurrentRelease} from './release-metadata-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const native=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');

test('Retired task-review UI and background refresh never appear in GM Runtime',()=>{
 assertCurrentRelease();
 for(const marker of ['settingsGroupTasks','gmwwTasksReload','gmwwTasksSummary','gmwwTasksOpenList','gmwwTaskReviewHealth']) {
  assert.ok(!html.includes(marker),marker+' must not remain visible');
 }
 for(const marker of ['function gmwwTaskReviewLink(','function gmwwTasksRefresh(','gmwwTaskReviewReturn']) {
  assert.ok(!app.includes(marker),marker+' must not run');
 }
});

test('Cloudflare console uses in-frame HTTPS navigation supported by native iOS delegate',()=>{
 assert.match(html,/id="gmwwCloudflareOpen"/);
 assert.match(html,/window\.location\.assign\('https:\/\/gmww-cloudflare-admin\.williampham0702\.workers\.dev\/'\)/);
 assert.doesNotMatch(html,/window\.open\('https:\/\/gmww-cloudflare-admin/);
 assert.match(native,/UIApplication\.shared\.open\(url\)/);
 assert.match(app,/setTimeout\(\(\)=>\{if\(!gmwwNativePost\('restartRuntime'\)\)window\.location\.reload\(\)\},300\)/);
});
