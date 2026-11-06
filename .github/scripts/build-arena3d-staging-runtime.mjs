#!/usr/bin/env node
// PR #581 — Arena 3D STAGING Runtime flavor (manual .gmwwupdate only).
// Input : a runtime folder prepared by prepare-update-channel.mjs (manual-manifest.json).
// Output: GMWW-Runtime-V<ver>.gmwwupdate (+ .sha256) whose GM app talks ONLY to the
//         isolated STAGING Worker, and whose VÀO LÀNG opens the same-origin Arena 3D
//         in live Core mode so the GM/3D bridge can work. Production files are untouched.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {writeManualPackage} from './build-manual-runtime.mjs';

export const PRODUCTION_BASE='https://gmww-v2-00.williampham0702.workers.dev';
export const STAGING_BASE='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
const STAGING_ARENA=STAGING_BASE+'/village/arena-3d/live.html';

function replaceOnce(text,from,to,label){
  const n=text.split(from).length-1;
  if(n!==1)throw Error(label+': expected exactly 1 match, found '+n);
  return text.replace(from,to);
}
export function stagingAppJs(app,version){
  app=replaceOnce(app,"const GMWW_SERVER_BASE='"+PRODUCTION_BASE+"'",
    "const GMWW_SERVER_BASE='"+STAGING_BASE+"'",'server base');
  return app.replace(/const VERSION='[^']+'/,"const VERSION='"+version+"'");
}
export function stagingHtml(html){
  html=replaceOnce(html,"const arenaUrl='"+STAGING_ARENA+"';",
    "const arenaUrl='"+STAGING_ARENA+"?coreMode=live';",'arena url');
  const badge='<div id="gmwwArena3dStagingBadge" aria-label="Runtime thử nghiệm 3D STAGING" '+
    'style="position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 2px);'+
    'z-index:2147483001;pointer-events:none;font:700 10px system-ui,-apple-system,sans-serif;letter-spacing:.06em;'+
    'color:#082633;background:#7ee8d8;border-radius:999px;padding:2px 9px;opacity:.92">3D · STAGING</div>';
  html=html.replace(/(<script src="app\.js(?:\?v=[^"]*)?"><\/script>)/,'$1\n<script src="gmww-play3d.js"></script>');
  if(!html.includes('gmww-play3d.js'))throw Error('play3d script tag: app.js script not found');
  return replaceOnce(html,'</body>',badge+'\n</body>','body end');
}
export function buildStagingRuntime(srcDir,outDir,version){
  const manifest=JSON.parse(fs.readFileSync(path.join(srcDir,'manual-manifest.json'),'utf8'));
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Staging version must be x.y.z');
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.cpSync(srcDir,outDir,{recursive:true});
  const patch=(rel,fn)=>{const f=path.join(outDir,rel);fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')))};
  patch('app.js',a=>stagingAppJs(a,version));
  patch('GMWW.html',stagingHtml);
  const play3d=path.join(path.dirname(fileURLToPath(import.meta.url)),'../runtime-staging/gmww-play3d.js');
  fs.copyFileSync(play3d,path.join(outDir,'gmww-play3d.js'));
  manifest.runtime.files.push({...manifest.runtime.files.find(f=>f.path==='app.js'),path:'gmww-play3d.js'});
  const sha=rel=>createHash('sha256').update(fs.readFileSync(path.join(outDir,rel))).digest('hex');
  // Same nominal URL scheme the native verifier expects (bytes come from the package itself).
  manifest.runtime.files=manifest.runtime.files.map(f=>({...f,
    url:PRODUCTION_BASE+'/updates/runtime/V'+version+'/'+f.path.split('/').map(encodeURIComponent).join('/'),
    sha256:sha(f.path)}));
  manifest.runtimeVersion=version;
  if('releaseVersion' in manifest)manifest.releaseVersion=version;
  manifest.channel='arena3d-staging';
  manifest.releaseNotes=['Arena 3D STAGING – VÀO LÀNG mở làng 3D cùng phòng GM; Player Web STAGING tự vào làng 3D. Chỉ máy chủ STAGING, không đụng Production.'];
  fs.writeFileSync(path.join(outDir,'manual-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const out=path.join(outDir,'GMWW-Runtime-V'+version+'.gmwwupdate');
  writeManualPackage(manifest,outDir,out);
  return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [src,out,version]=process.argv.slice(2);
  if(!src||!out||!version)throw Error('Usage: build-arena3d-staging-runtime.mjs <preparedRuntimeDir> <outDir> <x.y.z>');
  console.log('Created '+buildStagingRuntime(src,out,version));
}
