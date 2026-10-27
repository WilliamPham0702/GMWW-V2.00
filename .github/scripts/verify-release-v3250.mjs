#!/usr/bin/env node
// Fail-closed Runtime V3.250 focused release contract.
// Only the approved role-card settings, version / OTA and CI policy may differ.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const base=process.env.GMWW_V3250_BASE||'HEAD^1';
if(base!=='HEAD^1'&&!/^[a-f0-9]{40}$/i.test(base))
 throw Error('Unverified V3.250 base commit');
const changes=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'})
 .trim().split('\n').filter(Boolean);
const allowed=new Set([
 '.github/scripts/ci-browser-scope.mjs','.github/scripts/prepare-update-channel.mjs',
 '.github/scripts/verify-release-v3250.mjs','.github/workflows/check-approved-role-settings.yml',
 '.github/workflows/check-player-web.yml','.github/workflows/deploy-production.yml',
 'docs/releases/GMWW-V3.250-approved-role-card-settings-20261027.md',
 'package.json','package-lock.json','src/index.js',
 'server-game/src/00-core-and-library.part','server-game/current/app.js',
 'server-game/current/GMWW.html',
 'tests/approved-role-card-settings-20261027.test.mjs',
 'tests/witch01-old-witch-rules.test.mjs'
]);
const unknown=changes.filter(p=>!allowed.has(p));
if(unknown.length)throw Error('Unapproved changes in V3.250: '+unknown.join(', '));
for(const path of ['src/index.js','server-game/src/00-core-and-library.part',
 'server-game/current/app.js','tests/approved-role-card-settings-20261027.test.mjs'])
 if(!changes.includes(path))throw Error('Missing rule-card release file: '+path);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),
 worker=fs.readFileSync('src/index.js','utf8'),
 gm=fs.readFileSync('server-game/current/app.js','utf8'),
 source=fs.readFileSync('server-game/src/00-core-and-library.part','utf8'),
 html=fs.readFileSync('server-game/current/GMWW.html','utf8'),
 notes=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
if(pkg.version!=='3.250.0'||!worker.includes('VERSION="V3.250"')||
 !worker.includes('UPDATE_CHANNEL_REV="runtime-3250"')||
 !gm.includes("const VERSION='3.250'")||
 !html.includes('<title>GMWW V3.250</title>')||
 !source.includes('function applyApprovedRoleSettings(s){')||
 !source.includes('return applyApprovedRoleSettings(applyV226Catalog(')||
 !notes.includes('V3.250: Đồng bộ luật đã chốt'))
 throw Error('Incorrect V3.250 role card migration, Runtime or OTA version');
if(!fs.existsSync('docs/releases/GMWW-V3.250-approved-role-card-settings-20261027.md'))
 throw Error('Vietnamese release note missing');
console.log('V3.250 approved role settings release scope: PASS ('+changes.length+' files)');
