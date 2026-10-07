#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const classifiedReleaseType=(process.argv[2]||process.env.GMWW_RELEASE_TYPE||'server_only').trim();
const typeRank={server_only:0,runtime:1,native:2};
let previousManifest=null;
try{previousManifest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'))}catch{}
let releaseType=classifiedReleaseType;
const worker='https://gmww-v2-00.williampham0702.workers.dev';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const version=(app.match(/const VERSION='([^']+)'/)?.[1]||'').replace(/^V/i,'');
if(!version) throw new Error('Cannot resolve GMWW runtime version');

const outRoot=path.join('assets','updates','runtime','V'+version);
fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const copied=[];
function copy(src,dst){
  if(!fs.existsSync(src))return;
  const target=path.join(outRoot,dst);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(src,target);
  copied.push(dst.replaceAll('\\','/'));
}
function copyDir(src,dst){
  if(!fs.existsSync(src))return;
  for(const name of fs.readdirSync(src)){
    const a=path.join(src,name),b=path.join(dst,name);
    const st=fs.statSync(a);
    if(st.isDirectory())copyDir(a,b); else copy(a,b);
  }
}

copy('server-game/current/GMWW.html','GMWW.html');
copy('server-game/current/app.js','app.js');
copy('server-game/current/style.css','style.css');
copy('server-game/current/character-renderer.js','character-renderer.js');
copy('server-game/current/character-renderer.css','character-renderer.css');
copy('server-game/current/gmww-village-coast.svg','gmww-village-coast.svg');
copy('assets/village/village-layout.js','village-layout.js');
copy('assets/backgrounds/gmww-village-day-v260.webp','gmww-village-day-v260.webp');
copy('assets/backgrounds/gmww-village-night-v260.webp','gmww-village-night-v260.webp');
copyDir('assets/characters/v253','game-characters');
copyDir('assets/gm','gm');

// Canonical clean role artwork (63 originals, no old delivery/thumb variants).
// deploy-production.yml restores this source from the pinned V2.52 release archive
// before this script runs.
{
  const sourceRoot=path.join('server-game','legacy-assets','v252');
  const sourceManifest=path.join(sourceRoot,'role-artwork-v251.js');
  const originalRoot=path.join(sourceRoot,'assets','role-artwork-v251','original');
  if(!fs.existsSync(sourceManifest)||!fs.existsSync(originalRoot)){
    throw new Error('Canonical clean role artwork source is missing');
  }
  const ctx={window:{}};vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(sourceManifest,'utf8'),ctx,{filename:'role-artwork-v251.js'});
  const source=ctx.window.GMWW_BUILTIN_ROLE_ARTWORK||{},out={};
  const entries=Object.entries(source);
  if(entries.length!==63)throw new Error('Expected 63 canonical role mappings, found '+entries.length);
  for(const [id,row] of entries){
    const sourceFile=path.join(originalRoot,id+'.webp');
    if(!fs.existsSync(sourceFile))throw new Error('Missing clean role artwork '+id);
    const rel='assets/role-artwork-v251/original/'+id+'.webp';
    copy(sourceFile,rel);
    out[id]={...row,display:rel,delivery:rel,thumb:rel,width:3072,height:2560,deliveryWidth:3072,deliveryHeight:2560};
  }
  const manifestRel='role-artwork-v251.js';
  fs.writeFileSync(path.join(outRoot,manifestRel),'window.GMWW_BUILTIN_ROLE_ARTWORK='+JSON.stringify(out)+';\n');
  copied.push(manifestRel);

  const htmlFile=path.join(outRoot,'GMWW.html');
  let html=fs.readFileSync(htmlFile,'utf8');
  if(!html.includes('role-artwork-v251.js')){
    const appScript=html.match(new RegExp('<script src="app\\.js(?:\\?v=[^"]+)?"><\\/script>'))?.[0]||'';
    if(appScript)html=html.replace(appScript,'<script src="role-artwork-v251.js"></script>\n'+appScript);
    fs.writeFileSync(htmlFile,html);
  }
  if(!html.includes('role-artwork-v251.js'))throw new Error('Runtime HTML did not load canonical role artwork manifest');
}

const artwork=fs.readFileSync('server-game/shared/artwork.js','utf8');
const m=artwork.match(/data:image\/webp;base64,([^']+)/);
if(m){
  fs.writeFileSync(path.join(outRoot,'default-artwork.webp'),Buffer.from(m[1],'base64'));
  copied.push('default-artwork.webp');
}

function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
const files=[...new Set(copied)].sort().map(rel=>({
  path:rel,
  url:`${worker}/updates/runtime/V${version}/${rel.split('/').map(encodeURIComponent).join('/')}`,
  sha256:sha(path.join(outRoot,rel))
}));

if(previousManifest?.releaseVersion===version){
  const previousType=String(previousManifest.releaseType||'server_only');
  if((typeRank[previousType]??0)>(typeRank[releaseType]??0)) releaseType=previousType;
}
const shell=(fs.readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8').match(/MARKETING_VERSION = ([^;]+);/)?.[1]||version).trim();
// Build-trigger/follow-up commits can be server-only even though a new native shell
// was just released. When the advertised version changed and the shell matches it,
// keep the channel native so older installs are told to download the new IPA.
const versionChanged=String(previousManifest?.releaseVersion||'')!==version;
if(releaseType==='server_only'&&versionChanged&&shell===version) releaseType='native';
// A newer runtime running on an older native shell must stay a runtime update even
// when the latest commit only touches tests/server files. Otherwise an incidental
// follow-up commit would hide the downloadable runtime package from installed apps.
if(releaseType==='server_only'&&version!==shell) releaseType='runtime';
const isNative=releaseType==='native';
const manifest={
  schema:1,
  releaseVersion:version,
  releaseType,
  shellVersion:shell,
  minimumShellVersion:isNative?version:shell,
  runtimeVersion:version,
  webVersion:version,
  serverVersion:version,
  required:false,
  restartRequired:releaseType==='runtime',
  message:isNative?`GMWW V${version} yêu cầu cài IPA mới.`:releaseType==='runtime'?`Có GMWW V${version}. Có thể cập nhật trực tiếp.`:'Server/Player Web đã cập nhật.',
  runtime:{files:releaseType==='runtime'?files:[]},
  delete:[],
  ipa:{
    version:isNative?version:shell,
    fileName:`GMWW-V${isNative?version:shell}.ipa`,
    url:`https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v${isNative?version:shell}/GMWW-V${isNative?version:shell}.ipa`
  }
};
fs.mkdirSync(path.join('assets','updates'),{recursive:true});
fs.writeFileSync(path.join('assets','updates','latest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(outRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const workerSource=fs.readFileSync('src/index.js','utf8');
const updateChannelRev=workerSource.match(/UPDATE_CHANNEL_REV="([^"]+)"/)?.[1]||'runtime';
const revisionedManifest=path.join(outRoot,'manifest-'+updateChannelRev+'.json');
fs.writeFileSync(revisionedManifest,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({version,classifiedReleaseType,releaseType,files:files.length,manifest},null,2));
