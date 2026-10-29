import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('src/index.js','utf8');
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const events=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');

test('PR367/369 reconciliation uses existing members, never fabricated account identifiers',()=>{
  assert.doesNotMatch(setup,/demoPopulateExistingMembers/);
  assert.match(events,/async function openPlayRosterSheet/);
  assert.match(events,/async function savePlayRosterIds/);
  assert.match(events,/const chosen=source\.filter/);
  assert.doesNotMatch(worker,/import\s*\{[^}]*makeDemoPlayers/);
  assert.doesNotMatch(setup,/dm\s*\+\s*roomCode/);
  assert.match(worker,/DEMO_LOGIN_REQUIRED/);
});

test('Hybrid DEMO appears to members but retains trial-only data',()=>{
  assert.doesNotMatch(worker,/if\(r\?\.demo===true\)continue/);
  assert.match(worker,/DEMO_LOGIN_REQUIRED/);
  assert.match(worker,/if\(data\?\.room\?\.demo===true\)\{await syncRoomDirectory/);
  assert.match(html,/id="playCreatedRoomList"/);
  assert.match(html,/<button id="playRoomModeToggle"/);
  assert.doesNotMatch(html,/id="playDemoRoomChoice"/);
});

test('Reconciled runner retains authoritative phases, resumable playback and lease',()=>{
  assert.match(battle,/demoRunner\.paused/);
  assert.match(battle,/demoRunner\.running\?'↻':'Ⅱ'/);
  assert.match(battle,/chạm để tiếp tục/);
  assert.match(battle,/async function demoActionNight/);
  assert.match(battle,/async function demoActionDay/);
  assert.match(worker,/runServerDemo/);
  assert.match(worker,/nextServerDemoDue/);
  assert.match(worker,/DEMO_LEASE_OWNED/);
  assert.match(worker,/x-gmww-demo-owner/);
});

test('Reconciled game retains V3.165 day-menu and match-specific Artifact settings',()=>{
  assert.match(html,/id="battleDayActionFloat"/);
  assert.match(html,/id="battleDayActionToggle"/);
  assert.match(html,/id="playTemplatePlaySummary"/);
  assert.match(battle,/playRememberMatchArtifacts/);
  assert.match(battle,/playMatchArtifactConfig/);
});
