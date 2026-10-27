#!/usr/bin/env node
// Build Safari GM review assets and stage-only credentials. Never commit outputs.
// A different secret and Worker DO namespace keep real GM sessions and rooms isolated.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const root=process.cwd();
const stageDir=path.join(root,'assets','gm-turn-stage');
const srcDir=path.join(root,'server-game','current');
const workerPath=path.join(root,'src','index.js');
const serverOriginal=fs.readFileSync(workerPath,'utf8');
const oldToken=serverOriginal.match(/const GM_SYNC_TOKEN=(['"])([^'"]+)\1;/)?.[2];
if(!oldToken||oldToken.length<20)throw Error('Could not identify source-only GM auth constant');
const origin="https://gmww-gm-turn-motion-staging.williampham0702.workers.dev";
const token=randomBytes(36).toString('base64url');
fs.rmSync(stageDir,{recursive:true,force:true});
fs.cpSync(srcDir,stageDir,{recursive:true});
const layout=path.join(root,'assets','village','village-layout.js');
if(!fs.existsSync(layout))throw Error('Village layout source missing');
fs.copyFileSync(layout,path.join(stageDir,'village-layout.js'));
const appPath=path.join(stageDir,'app.js');
let app=fs.readFileSync(appPath,'utf8');
if(!app.includes("const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';"))
 throw Error('Production-origin constant changed unexpectedly: abort');
if(!app.includes("const GMWW_GM_AUTH="+JSON.stringify(oldToken)+";"))
 throw Error('GM/Worker credentials out of sync: abort');
app=app.replace("const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';",
  "const GMWW_SERVER_BASE=window.location.origin;");
app=app.replace("const GMWW_GM_AUTH="+JSON.stringify(oldToken)+";",
  "const GMWW_GM_AUTH="+JSON.stringify(token)+";");
if(app.includes(oldToken)||app.includes('gmww-v2-00.williampham0702.workers.dev'))
 throw Error('Production credentials/origin remain in staging GM');
fs.writeFileSync(appPath,app);
let worker=serverOriginal.replace("const GM_SYNC_TOKEN="+JSON.stringify(oldToken)+";",
  "const GM_SYNC_TOKEN="+JSON.stringify(token)+";");
if(worker===serverOriginal||worker.includes("const GM_SYNC_TOKEN="+JSON.stringify(oldToken)+";"))
 throw Error('Stage Worker token substitution failed');
fs.writeFileSync(workerPath,worker);
const htmlPath=path.join(stageDir,'GMWW.html');
let html=fs.readFileSync(htmlPath,'utf8');
html=html.replace('</head>', '<meta name="robots" content="noindex,nofollow">\n</head>');
html=html.replace(/<title>[^<]*<\/title>/,'<title>GMWW STAGING GM TURN MOTION · iPhone</title>');
fs.writeFileSync(htmlPath,html);
// Deliberately do not expose stage credentials in CI output or job summary.
fs.writeFileSync('/tmp/gmww-gm-turn-staging-gm-token',token,{mode:0o600});
console.log('PASS: isolated GM Safari assets created and Production credentials removed; '+origin+'/gm-turn-stage/GMWW.html');
