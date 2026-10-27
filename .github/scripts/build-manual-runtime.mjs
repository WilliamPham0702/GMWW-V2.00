import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function buildManualPackage(manifest,root){
 const entries=manifest?.runtime?.files;
 if(!/^\d+\.\d+(?:\.\d+)?$/.test(manifest?.runtimeVersion||'')||!Array.isArray(entries)||!entries.length)throw Error('Invalid runtime manifest');
 const paths=entries.map(f=>f.path);
 if(!['GMWW.html','app.js','style.css'].every(p=>paths.includes(p)))throw Error('Missing runtime entry points');
 const lengths=Object.create(null);let size=0;
 for(const f of entries){
  if(typeof f.path!=='string'||f.path.includes('\\')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||Object.hasOwn(lengths,f.path))throw Error('Invalid or duplicate path');
  const data=fs.readFileSync(path.join(root,f.path));size+=data.length;
  if(data.length>16*1024*1024||size>512*1024*1024)throw Error('Runtime package too large');
  if(createHash('sha256').update(data).digest('hex')!==f.sha256)throw Error('SHA-256 mismatch: '+f.path);
  lengths[f.path]=data.length;
 }
 return {format:'gmww-runtime-2',manifest,lengths};
}
export function writeManualPackage(manifest,root,output){
 const header=Buffer.from(JSON.stringify(buildManualPackage(manifest,root)));
 if(header.length>2*1024*1024)throw Error('Header too large');
 const size=Buffer.alloc(4);size.writeUInt32BE(header.length);
 const fd=fs.openSync(output,'w'),hash=createHash('sha256');
 const write=bytes=>{let offset=0;while(offset<bytes.length)offset+=fs.writeSync(fd,bytes,offset);hash.update(bytes)};
 try{
  write(Buffer.from('GMWWRUNTIME2\n'));write(size);write(header);
  for(const item of manifest.runtime.files){
   const data=fs.readFileSync(path.join(root,item.path));
   if(createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('SHA-256 changed while packaging');
   write(data);
  }
 }finally{fs.closeSync(fd)}
 fs.writeFileSync(output+'.sha256',hash.digest('hex')+'  '+path.basename(output)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [manifestPath,output]=process.argv.slice(2);
 if(!manifestPath||!output)throw Error('Usage: build-manual-runtime.mjs manifest.json output.gmwwupdate');
 writeManualPackage(JSON.parse(fs.readFileSync(manifestPath,'utf8')),path.dirname(manifestPath),output);
 console.log('Created '+output);
}
