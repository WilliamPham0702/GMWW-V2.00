#!/usr/bin/env node
// Isolated GMWW V6.05 Character21 game staging: copies current GM web into staging assets ONLY.
// Never edits the canonical Production GM app or Runtime/OTA manifests.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const source=path.join(root,'server-game/current');
const target=path.join(root,'assets/character-v605-gm');
const approvedHost='gmww-character21-v605-game-staging.williampham0702.workers.dev';
const approvedUrl='https://'+approvedHost;
if(!fs.existsSync(path.join(source,'GMWW.html')))throw Error('MISSING_CANONICAL_GM_HTML');
fs.rmSync(target,{recursive:true,force:true});
fs.mkdirSync(target,{recursive:true});
fs.cpSync(source,target,{recursive:true,force:true});
const appFile=path.join(target,'app.js');
const js=fs.readFileSync(appFile,'utf8');
const base="const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';";
if(!js.includes(base))throw Error('STAGE_BASE_GUARD_FAILED — never deploy source with Production server origin');
let staged=js.replace(base,"const GMWW_SERVER_BASE=location.origin;");
staged=staged.replace("GMWW_SERVER_BASE+'/'","GMWW_SERVER_BASE+'/?characterV605=1'");
if(staged.includes(base))throw Error('PRODUCTION_BASE_STILL_PRESENT');
fs.writeFileSync(appFile,staged);
const hFile=path.join(target,'GMWW.html');
let html=fs.readFileSync(hFile,'utf8');
const stageBanner='<aside id="gmww-v605-stage-banner" style="position:fixed;top:env(safe-area-inset-top,0px);right:3px;z-index:999999;background:#052e3c;color:#c4f6fa;border:1px solid #38a1b1;padding:3px 7px;font-size:10px;border-radius:6px;pointer-events:none">CHARACTER V6.05 · STAGING · DỮ LIỆU THỬ NGHIỆM</aside>';
if(!html.includes('<body>'))throw Error('GM_HTML_BODY_MISSING');
html=html.replace('<body>','<body>'+stageBanner);
fs.writeFileSync(hFile,html);
const sha256=s=>createHash('sha256').update(fs.readFileSync(s)).digest('hex');
const model=path.join(root,'assets/characters/overhaul-v600/character-21/skin.glb'),avatar=path.join(root,'assets/characters/overhaul-v600/character-21/avatar.webp'),renderer=path.join(root,'assets/characters/overhaul-v600/character-21/renderer.html');
for(const file of [model,avatar,renderer])if(!fs.existsSync(file))throw Error('APPROVED_ASSET_NOT_COMMITTED: '+file);
if(sha256(model)!=='ec600c79925b4925eaae010f2067f9e584f9e0282da5ca1f76b173f87783f0e9')throw Error('SKIN_SHA256_MISMATCH');
if(sha256(avatar)!=='b195b8f6090b8ca6e059f756ae604939ba3887ade7d6691d9b4b075a5658c801')throw Error('AVATAR_SHA256_MISMATCH');
const report={mode:'game-staging-only',worker:approvedHost,gmEntry:'/character-v605-gm/GMWW.html?characterV605=1',
 playerEntry:'/?characterV605=1',productionModified:false,assetCounts:3,
 gmHtmlBytes:fs.statSync(hFile).size,gameAppBytes:fs.statSync(appFile).size,modelSha256:sha256(model),avatarSha256:sha256(avatar),
 separateDurableObjectClass:'RoomDurableObject',separateDurableObjectScript:'gmww-character21-v605-game-staging'};
console.log(JSON.stringify(report,null,2));
