#!/usr/bin/env node
// GMWW V3.251: scoped UI/CSS-only release; fail closed for unknown runtime edits.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const base=process.env.GMWW_V3251_BASE||'HEAD^1';
const get=p=>fs.readFileSync(p,'utf8');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
const old=p=>git('show',base+':'+p);
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const paths=[
  'package.json','package-lock.json','src/index.js','server-game/src/00-core-and-library.part',
  'server-game/current/app.js','server-game/current/GMWW.html','server-game/current/style.css',
  '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
  '.github/scripts/verify-release-v3251.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  'docs/releases/GMWW-V3.251-cloudflare-tiles-20261027.md',
  'tests/gmww-v3251-cloudflare-tiles.test.mjs'
];
const changed=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
assert(changed.length===paths.length,'Unexpected number of changed files');
const all=new Map(changed.map(line=>{const [status,path]=line.split('\t');return[path,status]}));
assert(paths.every(path=>all.has(path)),'Not all expected files changed');
assert([...all].every(([path,status])=>paths.includes(path)&&['A','M'].includes(status)),'Out-of-scope path/change');
const checks=[
 ['package.json',s=>s.replace('"version": "3.251.0"','"version": "3.250.0"')],
 ['package-lock.json',s=>s.replaceAll('"version": "3.251.0"','"version": "3.250.0"')],
 ['src/index.js',s=>s.replace('VERSION="V3.251",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-3251"','VERSION="V3.250",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-3250"')],
 ['server-game/src/00-core-and-library.part',s=>s.replace("const VERSION='3.251';","const VERSION='3.250';")],
 ['server-game/current/app.js',s=>s.replace("const VERSION='3.251';","const VERSION='3.250';")],
 ['server-game/current/GMWW.html',s=>s.replace('<title>GMWW V3.251</title>','<title>GMWW V3.250</title>').replace('style.css?v=gmww-v3251-cloudflare-tiles','style.css?v=gmww-v3250-approved-card-settings')]
];
for(const [p,undo] of checks)assert(undo(get(p))===old(p),'Non-version change: '+p);
const oldCss=old('server-game/current/style.css');
const nextCss=get('server-game/current/style.css');
assert(nextCss.startsWith(oldCss),'Existing CSS changed');
const tail=nextCss.slice(oldCss.length);
assert(tail.length>100&&tail.length<1100&&tail.includes('grid-auto-rows:82px!important')&&tail.includes('#gmwwCloudflareOpen>span'),'Invalid isolated CSS');
const oldPrep=old('.github/scripts/prepare-update-channel.mjs');
const nextPrep=get('.github/scripts/prepare-update-channel.mjs');
assert(nextPrep.replace(/"V3[.]251: Cân bằng chiều cao[^"]+","V3[.]250:/,'"V3.250:')===oldPrep,'OTA notes changed beyond approved scope');
assert(JSON.parse(get('package.json')).version==='3.251.0','Incorrect version');
const ids=['settingsRunHealth','settingsOptimizeDO','auditLocalData','clearRuntimeCache','reloadApp','gmwwCloudflareOpen','gmwwServerTrashOpen','opsRunFullAudit','opsCheckRoom','opsCheckRelease','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];
const html=get('server-game/current/GMWW.html'),app=get('server-game/current/app.js');
assert(ids.length===16&&ids.every(id=>html.split('id="'+id+'"').length===2&&app.includes(id+':')),'Maintenance handlers or buttons changed');
assert(get('docs/releases/GMWW-V3.251-cloudflare-tiles-20261027.md').includes('rollback V3.250'),'Missing rollback notes');
assert(get('tests/gmww-v3251-cloudflare-tiles.test.mjs').includes('16 công cụ'),'Missing focused test');
console.log('PASS V3.251: 14 whitelisted files, version/CSS-only GM, 16 original tools, release notes and rollback.');
