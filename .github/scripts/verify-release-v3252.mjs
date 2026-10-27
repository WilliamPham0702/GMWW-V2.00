#!/usr/bin/env node
// Fail-closed V3.252: only Runtime version, maintenance HTML flattening, scoped CSS,
// localized release notes and release CI are authorized; all 16 handlers remain intact.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const base=process.env.GMWW_V3252_BASE||'HEAD^1';
const get=p=>fs.readFileSync(p,'utf8');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024});
const old=p=>git('show',base+':'+p);
const ok=(condition,message)=>{if(!condition)throw new Error(message)};
const paths=[
 'package.json','package-lock.json','src/index.js','server-game/src/00-core-and-library.part',
 'server-game/current/app.js','server-game/current/GMWW.html','server-game/current/style.css',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/scripts/verify-release-v3252.mjs','.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-production.yml',
 'docs/releases/GMWW-V3.252-uniform-maintenance-boxes-20261027.md',
 'tests/gmww-v3252-uniform-maintenance-boxes.test.mjs'
];
const changed=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
const pairs=changed.map(row=>row.split('\t'));
ok(pairs.length===paths.length&&pairs.every(([status,p])=>paths.includes(p)&&['A','M'].includes(status))&&paths.every(p=>pairs.some(row=>row[1]===p)),'Unknown scope/number of release files');
const checks=[
 ['package.json',s=>s.replace('"version": "3.252.0"','"version": "3.251.0"')],
 ['package-lock.json',s=>s.replaceAll('"version": "3.252.0"','"version": "3.251.0"')],
 ['src/index.js',s=>s.replace('VERSION="V3.252",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-3252"','VERSION="V3.251",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-3251"')],
 ['server-game/src/00-core-and-library.part',s=>s.replace("const VERSION='3.252';","const VERSION='3.251';")],
 ['server-game/current/app.js',s=>s.replace("const VERSION='3.252';","const VERSION='3.251';")]
];
for(const [p,undo] of checks)ok(undo(get(p))===old(p),'Unexpected app/game/server change: '+p);
const mark1='<div class="settings-operations-tools" id="settingsToolsRail"',mark2='<section class="settings-notice-panel" id="settingsNoticePanel"';
const withoutGrid=html=>{
 const start=html.indexOf(mark1),end=html.indexOf(mark2,start);
 ok(start>=0&&end>start,'Tool/notification section lost');
 return {head:html.slice(0,start),block:html.slice(start,end),tail:html.slice(end)};
};
const source=withoutGrid(old('server-game/current/GMWW.html'));
const now=withoutGrid(get('server-game/current/GMWW.html').replace('<title>GMWW V3.252</title>','<title>GMWW V3.251</title>').replace('style.css?v=gmww-v3252-compact-tools','style.css?v=gmww-v3251-cloudflare-tiles'));
ok(now.head===source.head&&now.tail===source.tail,'HTML changed outside tools');
const buttons=block=>[...block.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>|<label\b[^>]*class="ops-auto"[\s\S]*?<\/label>/g)].map(x=>x[0]);
const sourceButtons=buttons(source.block),newButtons=buttons(now.block);
ok(sourceButtons.length===17&&newButtons.length===17&&sourceButtons.every((x,i)=>x===newButtons[i]),'Existing tool button/handlers were changed');
ok(!now.block.includes('settings-tool-inner')&&!now.block.includes('health-v236-actions'),'Still nesting iOS grid cells');
ok((now.block.match(/<\/div>/g)||[]).length===1,'Tool grid must have exactly one container');
const cssBefore=old('server-game/current/style.css'),cssAfter=get('server-game/current/style.css');
const appended=cssAfter.slice(cssBefore.length);
ok(cssAfter.startsWith(cssBefore)&&appended.length>900&&appended.length<5500&&appended.includes('grid-auto-rows:76px!important')&&appended.includes('> :is(button.settings-action,label.ops-auto)'),'Unexpected stylesheet changes');
const notesOld=old('.github/scripts/prepare-update-channel.mjs'),notesNow=get('.github/scripts/prepare-update-channel.mjs');
ok(notesNow.replace(/"V3[.]252: Chuẩn hóa toàn bộ 16 nút[^"]+","V3[.]251:/,'"V3.251:')===notesOld,'OTA notes modified outside release');
const ids=['settingsRunHealth','settingsOptimizeDO','auditLocalData','clearRuntimeCache','reloadApp','gmwwCloudflareOpen','gmwwServerTrashOpen','opsRunFullAudit','opsCheckRoom','opsCheckRelease','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];
const app=get('server-game/current/app.js');
ok(ids.length===16&&ids.every(id=>newButtons.filter(s=>s.includes('id="'+id+'"')).length===1&&app.includes(id+':')),'Missing maintenance ID/notice');
ok(newButtons.some(x=>x.includes('id="opsAutoCheck"')),'Auto-monitor switch missing');
ok(get('docs/releases/GMWW-V3.252-uniform-maintenance-boxes-20261027.md').includes('rollback V3.251'),'Rollback documentation missing');
console.log('PASS V3.252: 14 exact files, 16 original controls and 2-minute toggle retained, one-level iOS grid 76px, no gameplay/IPA edits.');
