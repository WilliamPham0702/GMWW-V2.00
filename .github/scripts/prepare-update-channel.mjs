#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const releaseType=(process.argv[2]||process.env.GMWW_RELEASE_TYPE||'server_only').trim();
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
copy('server-game/current/gmww-village-coast.svg','gmww-village-coast.svg');
copy('assets/village/village-layout.js','village-layout.js');
copy('assets/backgrounds/gmww-village-day-v260.webp','gmww-village-day-v260.webp');
copy('assets/backgrounds/gmww-village-night-v260.webp','gmww-village-night-v260.webp');
copyDir('assets/characters/v253','game-characters');

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

const shell=(fs.readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8').match(/MARKETING_VERSION = ([^;]+);/)?.[1]||version).trim();
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
  ipa:isNative?{
    fileName:`GMWW-V${version}.ipa`,
    url:`https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v${version}/GMWW-V${version}.ipa`
  }:null
};
fs.mkdirSync(path.join('assets','updates'),{recursive:true});
fs.writeFileSync(path.join('assets','updates','latest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({version,releaseType,files:files.length,manifest},null,2));
