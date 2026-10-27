#!/usr/bin/env node
// Fail-closed V3.255: Drunk private draw, Spiritualist neutral observation only.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const base=process.env.GMWW_V3255_BASE||'HEAD^1';
if(base!=='HEAD^1'&&!/^[a-f0-9]{40}$/i.test(base))throw Error('Unverified V3.255 comparison commit');
const changed=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const allow=new Set([
 '.github/scripts/ci-browser-scope.mjs','.github/scripts/prepare-update-channel.mjs',
 '.github/scripts/verify-release-v3255.mjs','.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/check-drunk-spiritualist.yml',
 'docs/releases/GMWW-V3.255-drunk-draw-spiritualist-20261027.md',
 'package.json','package-lock.json','src/index.js','src/gmww-drunk-draw-rules.js',
 'src/gmww-role-inheritance-rules.js','src/gmww-members-live.js',
 'src/player-web-src/30-rooms-and-realtime.part','server-game/current/GMWW.html',
 'server-game/current/app.js','server-game/src/00-core-and-library.part',
 'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
 'tests/v389-night-runtime-integration.test.mjs',
 'tests/drunk-draw-spiritualist-expelled-20261027.test.mjs',
 'tests/witch-drunk-clone-20261027.test.mjs'
]);
const bad=changed.filter(p=>!allow.has(p));
if(bad.length)throw Error('Unreviewed V3.255 changes: '+bad.join(', '));
const required=['src/index.js','src/gmww-drunk-draw-rules.js',
 'src/player-web-src/30-rooms-and-realtime.part','src/gmww-members-live.js',
 'src/gmww-role-inheritance-rules.js','server-game/current/app.js',
 'server-game/src/40-battle-and-timeline.part','tests/drunk-draw-spiritualist-expelled-20261027.test.mjs'];
for(const path of required)if(!changed.includes(path))throw Error('Missing reviewed role flow file: '+path);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),
 worker=fs.readFileSync('src/index.js','utf8'),
 gm=fs.readFileSync('server-game/current/app.js','utf8'),
 web=fs.readFileSync('src/gmww-members-live.js','utf8'),
 html=fs.readFileSync('server-game/current/GMWW.html','utf8'),
 prep=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
if(pkg.version!=='3.255.0'||!worker.includes('VERSION="V3.255"')||
 !worker.includes('UPDATE_CHANNEL_REV="runtime-3255"')||
 !gm.includes("const VERSION='3.255'")||!html.includes('<title>GMWW V3.255</title>')||
 !worker.includes('DRUNK_ALREADY_CHOSEN')||!worker.includes('isFactionCompare?targets:')||
 !web.includes('gmwwDrunkDraw')||!gm.includes('gmwwGmDrunkDeck')||
 !prep.includes('V3.255: Say Rượu bốc trực tiếp'))
 throw Error('V3.255 Worker/GM/Player/private draw/OTA versions are incomplete');
if(!fs.existsSync('docs/releases/GMWW-V3.255-drunk-draw-spiritualist-20261027.md'))
 throw Error('Vietnamese V3.255 release notes absent');
console.log('V3.255 exact private card selection release verified: '+changed.length+' files');
