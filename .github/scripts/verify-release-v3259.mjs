#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const rd=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(rd('package.json')),lock=JSON.parse(rd('package-lock.json'));
const app=rd('server-game/current/app.js'),part=rd('server-game/src/40-battle-and-timeline.part'),css=rd('server-game/current/style.css');
const worker=rd('src/index.js'),html=rd('server-game/current/GMWW.html');
const joined=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'].map(n=>rd('server-game/src/'+n+'.part')).join('');
assert.equal(pkg.version,'3.259.0');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
assert.ok(app.includes("const VERSION='3.259'"));assert.equal(app,joined,'GM bundle matches six modules');
assert.ok(html.includes('<title>GMWW V3.259</title>'));
assert.ok(worker.includes('VERSION="V3.259"')&&worker.includes('UPDATE_CHANNEL_REV="runtime-3259"')&&worker.includes('NATIVE_SHELL_VERSION="3.257"'));
assert.ok(app.includes('function battleFindAudioCandidates(')&&app.includes('function battleQueueDayAudio(')&&app.includes('async function audioBindingStatus('),'Audio V3.258');
assert.ok(!app.includes('🐺 VẾT CẮN · PHÙ THỦY')&&!part.includes('battleShowWitchIntel('));
assert.ok(part.includes('const intel=playSceneRuntime.nightIntel;')&&part.includes('battle-target-mark')&&part.includes('nominationTotals'));
assert.ok(css.includes('gmwwNominationVoteBounce')&&css.includes('data-gmww-perf-reduced="true"')&&css.includes('.battle-gallows-vote-mark'));
assert.ok(rd('.github/scripts/prepare-update-channel.mjs').includes('V3.259 PR565:'));
assert.ok(rd('docs/releases/GMWW-GM-VOTE-BADGES-2026-10-27.md').includes('V3.259'));
console.log('GMWW V3.259 PR565 release: VERIFIED');
