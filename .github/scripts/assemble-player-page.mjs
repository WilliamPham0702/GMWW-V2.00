#!/usr/bin/env node
// G3.10: deterministic player HTML module compiler. Never alter original inline artwork.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sources=[
  '00-head-and-style.part',
  '10-body-and-roles.part',
  '20-inline-scripts-and-export.part'
];
const images=['image-0.data','image-1.data','image-2.data','image-3.data',
  'image-2.data','image-5.data','image-6.data'];
const src=path.join(root,'src/player-page-src');
let output=sources.map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('');
for(const [index,filename] of images.entries()){
  const marker='__GMWW_EMBED_IMAGE_'+index+'__';
  const asset=fs.readFileSync(path.join(src,'embedded',filename),'utf8');
  const count=output.split(marker).length-1;
  if(count>1||!/^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(asset)){
    console.error('Invalid embedded media marker or payload: '+marker);
    process.exit(1);
  }
  if(count===1)output=output.replace(marker,asset);
}
if(output.includes('__GMWW_EMBED_IMAGE_'))throw new Error('Unresolved image marker');
const target=path.join(root,'src/gmww-members-page.js');
const sha=t=>createHash('sha256').update(t).digest('hex');
const mode=process.argv[2]||'--verify';
if(mode==='--verify'){
  const compiled=fs.readFileSync(target,'utf8');
  if(output!==compiled){
    console.error('Player HTML source differs: source='+sha(output)+' packaged='+sha(compiled));
    process.exit(1);
  }
  console.log('Player page source matches packaged module: 3 parts, 6 preserved media sources, '+Buffer.byteLength(output)+' bytes, sha256 '+sha(output));
}else if(mode==='--write'){
  fs.writeFileSync(target,output);
  console.log('Player page rebuilt: '+Buffer.byteLength(output)+' bytes, sha256 '+sha(output));
}else{
  console.error('Usage: node .github/scripts/assemble-player-page.mjs [--verify|--write]');
  process.exit(2);
}
