#!/usr/bin/env node
/**
 * GMWW preparation audit. Read-only: no network, credentials, builds or deploys.
 * Run: node scripts/check-auto-gm-readiness.mjs [--json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'server-game/current/GMWW.html',
  'server-game/current/app.js',
  'server-game/current/style.css',
  'server-game/GMWW-Server.xcodeproj/project.pbxproj',
  'server-game/GMWW-Server/GameView.swift',
  'src/index.js',
  'src/gmww-members-live.js',
  'wrangler.jsonc',
  'package.json',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-player-web.yml',
];
const checks = [];
let version = '';
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });
const get = (path) => readFileSync(resolve(root, path), 'utf8');
for (const path of required) check('file: ' + path, existsSync(resolve(root, path)));
if (required.some(path => !existsSync(resolve(root, path)))) {
  report();
  process.exit(1);
}

const app = get('server-game/current/app.js');
const project = get('server-game/GMWW-Server.xcodeproj/project.pbxproj');
const worker = get('src/index.js');
const wrangler = get('wrangler.jsonc');
const ipaWorkflow = get('.github/workflows/build-server-game-ipa.yml');
const playerWorkflow = get('.github/workflows/check-player-web.yml');
version = app.match(/const VERSION='([0-9]+\.[0-9]+)'/)?.[1] || '';
const build = project.match(/CURRENT_PROJECT_VERSION = ([0-9]+);/)?.[1] || '';
const marketing = project.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim() || '';
check('IPA version found', Boolean(version), version);
check('IPA version matches Xcode', Boolean(version) && marketing === version && build === version.replaceAll('.', ''), 'app=' + version + ', marketing=' + marketing + ', build=' + build);
check('Current local state keys', Boolean(version) && app.includes('GMWW_V' + build + '_STATE') && app.includes('GMWW_V' + build + '_PREFS'));
check('Legacy local migration present', app.includes('OLD_STATE_KEYS') && app.includes('OLD_PREF_KEYS'));
check('Theme IndexedDB present', app.includes('indexedDB.open('));
check('Role + Artifact catalog present', app.includes('artifacts:') && app.includes('cards:'));
check('Durable Object room binding', /"name"\s*:\s*"ROOMS"/.test(wrangler) && /"class_name"\s*:\s*"RoomDurableObject"/.test(wrangler));
check('SQLite Durable Object configured', /"storage"\s*:\s*"sqlite"/.test(wrangler));
check('WebSocket room support', worker.includes('getWebSockets') || worker.includes('acceptWebSocket'));
check('Durable Object alarm support', worker.includes('setAlarm('));
check('IPA build is manual only', /workflow_dispatch\s*:/.test(ipaWorkflow) && !/^\s*push\s*:/m.test(ipaWorkflow));
check('Player Web CI dry run', playerWorkflow.includes('npm run check'));
check('iOS wrapper present', get('server-game/GMWW-Server/GameView.swift').includes('WKWebView'));

report();
if (checks.some(c => !c.ok)) process.exitCode = 1;

function report() {
  const output = { kind: 'GMWW_PREPARATION_AUDIT', checkedAt: new Date().toISOString(), version: version || null, passed: checks.filter(c => c.ok).length, total: checks.length, checks };
  if (process.argv.includes('--json')) console.log(JSON.stringify(output, null, 2));
  else {
    for (const c of checks) console.log((c.ok ? 'PASS' : 'FAIL') + ' ' + c.name + (c.detail ? ': ' + c.detail : ''));
    console.log(output.passed + '/' + output.total + ' checks passed');
  }
}
