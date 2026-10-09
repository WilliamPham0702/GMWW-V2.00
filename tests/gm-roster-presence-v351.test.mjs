import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const roster=app.split('async function openPlayRosterSheet(){')[1]?.split('function closePlayRosterSheet()')[0]||'';
test('V3.51 roster always requests fresh server member presence and refreshes while open',()=>{
  assert.match(roster,/await playLoadFreshRosterMembers\(\)/);
  assert.match(app,/playRosterPresenceTimer=setInterval/);
  assert.match(app,/dot\.classList\.toggle\('is-online',online\)/);
  assert.match(app,/async function playCallOnlineMembers\(\)[\s\S]*?await playLoadFreshRosterMembers\(\)/);
});
test('V3.51 roster shows avatar, name and green-red signal, hiding login and fixed character',()=>{
  assert.match(roster,/play-roster-presence/);
  assert.doesNotMatch(roster,/Nhân vật cố định|Chưa chọn nhân vật|<small>/);
  assert.match(css,/\.play-roster-presence\.is-online/);
  assert.match(css,/\.play-roster-presence\.is-offline/);
});
