import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function buildManualPackage(manifest,root){
 const entries=manifest?.runtime?.files;
 if(!/^\d+\.\d+(?:\.\d+)?$/.test(manifest?.runtimeVersion||'')||!Array.isArray(entries)||!entries.length)throw Error('Invalid runtime manifest');
 const paths=entries.map(f=>f.path);
 if(!['GMWW.html','app.js','style.css'].every(p=>paths.includes(p)))throw Error('Missing runtime entry points');
 const files=Object.create(null);let size=0;
 for(const f of entries){
  if(typeof f.path!=='string'||f.path.includes('\\')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||Object.hasOwn(files,f.path))throw Error('Invalid or duplicate path');
  const data=fs.readFileSync(path.join(root,f.path));size+=data.length;
  if(size>120*1024*1024)throw Error('Runtime package too large');
  if(createHash('sha256').update(data).digest('hex')!==f.sha256)throw Error('SHA-256 mismatch: '+f.path);
  files[f.path]=data.toString('base64');
 }
 return {format:'gmww-runtime-1',manifest,files};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [manifestPath,output]=process.argv.slice(2);
 if(!manifestPath||!output)throw Error('Usage: build-manual-runtime.mjs manifest.json output.gmwwupdate');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const data=JSON.stringify(buildManualPackage(manifest,path.dirname(manifestPath)));
 fs.writeFileSync(output,data);
 fs.writeFileSync(output+'.sha256',createHash('sha256').update(data).digest('hex')+'  '+path.basename(output)+'\n');
 console.log('Created '+output);
}
