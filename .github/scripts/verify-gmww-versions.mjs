#!/usr/bin/env node
// Reject mismatched or older Runtime versions before deploying to Production.
// IPA shell version is independent; it must never silently become the Runtime version.
import fs from 'node:fs';

function parseVersion(raw) {
  const value=String(raw??'').trim().replace(/^V/i,'');
  if(!/^\d+\.\d+(?:\.\d+)?$/.test(value))throw new Error('Invalid GMWW version: '+value);
  return value.split('.').map(Number);
}
function compareVersions(a,b) {
  const aa=parseVersion(a),bb=parseVersion(b);
  for(let i=0;i<Math.max(aa.length,bb.length);i++){
    const d=(aa[i]||0)-(bb[i]||0);
    if(d)return Math.sign(d);
  }
  return 0;
}
function requireMatch(value,label) {
  if(!value)throw new Error('Missing '+label);
  return value;
}
try {
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  const worker=fs.readFileSync('src/index.js','utf8');
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const runtime=requireMatch(worker.match(/\bVERSION="V([0-9.]+)"/)?.[1],'Worker VERSION');
  const shell=requireMatch(worker.match(/NATIVE_SHELL_VERSION="([0-9.]+)"/)?.[1],'IPA shell version');
  const checks={
    'package.json':pkg.version,
    'package-lock.json':lock.version,
    'package-lock root':lock.packages?.['']?.version,
    'GM app.js':requireMatch(app.match(/const VERSION='([0-9.]+)'/)?.[1],'GM app runtime version'),
    'GM HTML':requireMatch(html.match(/<title>GMWW V([0-9.]+)<\/title>/)?.[1],'GM HTML runtime version')
  };
  for(const [name,value] of Object.entries(checks)){
    if(compareVersions(runtime,value)!==0)throw new Error(name+' reports '+value+' but Worker reports '+runtime);
  }
  if(compareVersions(runtime,shell)<0)throw new Error('Runtime V'+runtime+' is older than IPA shell V'+shell);
  if(process.argv[2]){
    const live=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
    if(live.project!=='GMWW-V2.00'||live.status!=='online')throw new Error('Unverified GMWW Production health response');
    const liveVersion=requireMatch(live.version,'Production version');
    if(compareVersions(runtime,liveVersion)<0)throw new Error('ROLLBACK BLOCKED: candidate V'+runtime+' is older than Production '+liveVersion);
    console.log('Release guard OK: candidate V'+runtime+' >= Production '+liveVersion+'; IPA shell V'+shell);
  }else console.log('Release versions synchronized: Runtime V'+runtime+', IPA shell V'+shell);
}catch(error){
  console.error('GMWW version guard failed:',error.message);
  process.exitCode=1;
}
