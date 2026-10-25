#!/usr/bin/env node
// PR #501 isolated staging: do not ship staging assets/keys to Production.
// Derived from validated GMWW PR475 staging mechanism, Worker and DO must be separate.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';

const root=process.cwd();
const sourceDir=path.join(root,'server-game/current');
const stageDir=path.join(root,'assets/gm-pr501');
const serverPath=path.join(root,'src/index.js');
const worker=fs.readFileSync(serverPath,'utf8');
const tokenMatch=worker.match(/const GM_SYNC_TOKEN=(['"])([^'"]+)\1;/);
const sourceToken=tokenMatch?.[2];
if(!sourceToken||sourceToken.length<20)throw Error('Cannot safely read source GM authentication constant');
const base='https://gmww-pr501-icons-staging.williampham0702.workers.dev';
const stageToken=randomBytes(36).toString('base64url');
fs.rmSync(stageDir,{recursive:true,force:true});
fs.cpSync(sourceDir,stageDir,{recursive:true});
const layout=path.join(root,'assets/village/village-layout.js');
if(!fs.existsSync(layout))throw Error('Missing scene layout source');
fs.copyFileSync(layout,path.join(stageDir,'village-layout.js'));

const appPath=path.join(stageDir,'app.js');
let app=fs.readFileSync(appPath,'utf8');
const oldOrigin="const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';";
const oldAuth='const GMWW_GM_AUTH='+JSON.stringify(sourceToken)+';';
if(!app.includes(oldOrigin)||!app.includes(oldAuth))
  throw Error('GM app origin/auth contract changed; refusing unsafe deploy');
app=app.replace(oldOrigin,'const GMWW_SERVER_BASE=window.location.origin;');
app=app.replace(oldAuth,'const GMWW_GM_AUTH='+JSON.stringify(stageToken)+';');
if(app.includes(sourceToken)||app.includes('gmww-v2-00.williampham0702.workers.dev'))
  throw Error('Production auth or origin leaked into staging GM');
if(!app.includes('gmwwSetupFreeBattleIcons();')||!app.includes("gmww_battle_free_icons_v1"))
  throw Error('PR501 GM icon changes missing');
fs.writeFileSync(appPath,app);

let workerStage=worker.replace('const GM_SYNC_TOKEN='+JSON.stringify(sourceToken)+';',
  'const GM_SYNC_TOKEN='+JSON.stringify(stageToken)+';');
if(workerStage===worker||workerStage.includes('const GM_SYNC_TOKEN='+JSON.stringify(sourceToken)+';'))
  throw Error('Worker staging authentication substitution failed');
fs.writeFileSync(serverPath,workerStage);

const htmlPath=path.join(stageDir,'GMWW.html');
let html=fs.readFileSync(htmlPath,'utf8');
for(const icon of ['🐦‍🔥','🌈','🏖️','⛱️'])
  if(!html.includes(icon))throw Error('Missing PR501 icon '+icon);
html=html.replace('</head>','<meta name="robots" content="noindex,nofollow">\n</head>');
html=html.replace(/<title>[^<]*<\/title>/,'<title>GMWW PR #501 STAGING · iPhone</title>');
fs.writeFileSync(htmlPath,html);
fs.writeFileSync('/tmp/gmww-pr501-staging-gm-token',stageToken,{mode:0o600});
console.log('PASS: isolated STAGING Worker/GM authentication prepared; no Production secret or origin in GM asset.');
console.log('STAGING GM URL: '+base+'/gm-pr501/GMWW.html');
console.log('STAGING Player Web URL: '+base+'/');
