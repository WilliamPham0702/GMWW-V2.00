#!/usr/bin/env node
// Strict V3.249 same-SHA release guard: only the approved Witch, Drunk,
// Clone, role-card, private delivery, GM and OTA files may change.
// This is used by the mandatory Production workflow, not a blanket CI bypass.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
if(version!=='3.249.0')throw Error('Invalid scoped release version: '+version);
const allowed=new Set([
 '.github/scripts/prepare-update-channel.mjs',
 '.github/scripts/verify-release-v3249.mjs',
 '.github/workflows/check-witch-drunk-clone.yml',
 '.github/workflows/deploy-production.yml',
 'docs/releases/GMWW-RULE-WITCH-DRUNK-CLONE-20261027.md',
 'docs/releases/GMWW-V3.249-witch-drunk-clone-20261027.md',
 'package.json','package-lock.json','src/index.js',
 'src/gmww-pack-night-rules.js','src/gmww-role-inheritance-rules.js',
 'src/gmww-witch-drunk-clone-rules.js',
 'server-game/src/00-core-and-library.part',
 'server-game/src/40-battle-and-timeline.part',
 'server-game/current/app.js','server-game/current/GMWW.html',
 'tests/witch-drunk-clone-20261027.test.mjs',
 'tests/v389-night-runtime-integration.test.mjs'
]);
const raw=execFileSync('git',['diff','--name-only','HEAD^1','HEAD'],{encoding:'utf8'});
const changed=raw.trim().split('\n').filter(Boolean);
const required=['package.json','src/index.js','server-game/current/app.js',
 'src/gmww-role-inheritance-rules.js','src/gmww-witch-drunk-clone-rules.js',
 'server-game/src/40-battle-and-timeline.part'];
if(changed.some(path=>!allowed.has(path)))throw Error('Unexpected V3.249 path: '+changed.filter(p=>!allowed.has(p)).join(', '));
if(required.some(path=>!changed.includes(path)))throw Error('Missing V3.249 changed scope: '+required.filter(p=>!changed.includes(p)).join(', '));
const worker=fs.readFileSync('src/index.js','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const release=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
if(!worker.includes('VERSION="V3.249"')||!worker.includes('WITCH_SAVE_TARGET_INVALID')||
 !app.includes("const VERSION='3.249'")||!app.includes('battleShowWitchIntel(t)')||
 !html.includes('<title>GMWW V3.249</title>')||!release.includes('V3.249: Phù Thuỷ'))
  throw Error('V3.249 Worker, GM, HTML or Vietnamese OTA notes missing');
if(!fs.existsSync('docs/releases/GMWW-V3.249-witch-drunk-clone-20261027.md'))
 throw Error('Vietnamese release notes required');
console.log('PASS V3.249 focused Worker/GM/OTA source whitelist: '+changed.length+' files');
