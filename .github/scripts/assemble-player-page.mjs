#!/usr/bin/env node
// G3.10: deterministic player HTML module compiler. Never alter original inline artwork.
// Modes:
//   --verify  source parts + embedded artwork must rebuild src/gmww-members-page.js byte-for-byte
//   --write   rebuild src/gmww-members-page.js from the source parts
//   --split   regenerate the source parts from src/gmww-members-page.js (use when the
//             packaged module was edited directly, so the editable sources never drift)
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
const src=path.join(root,'src/player-page-src');
const embedded=path.join(src,'embedded');
const manifestPath=path.join(embedded,'manifest.json');
const target=path.join(root,'src/gmww-members-page.js');
const MEDIA=/data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+/g;
const MEDIA_ONLY=/^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/;
const sha=t=>createHash('sha256').update(t).digest('hex');
const marker=i=>'__GMWW_EMBED_IMAGE_'+i+'__';

export function readManifest(){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(!Array.isArray(manifest.images))throw new Error('manifest.images must be an array');
  return manifest.images;
}

export function assemble(){
  const images=readManifest();
  let output=sources.map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('');
  for(const [index,filename] of images.entries()){
    const asset=fs.readFileSync(path.join(embedded,filename),'utf8');
    if(output.split(marker(index)).length!==2||!MEDIA_ONLY.test(asset))
      throw new Error('Invalid embedded media marker or payload: '+marker(index));
    output=output.replace(marker(index),asset);
  }
  if(output.includes('__GMWW_EMBED_IMAGE_'))throw new Error('Unresolved image marker');
  return {output,images};
}

function split(){
  const packaged=fs.readFileSync(target,'utf8');
  const headEnd=packaged.indexOf('</head>\n');
  const scripts=packaged.indexOf('<script src="/gmww-members-live.js');
  if(headEnd<0||scripts<0||scripts<headEnd)throw new Error('Cannot find </head> and live-script boundaries');
  const cuts=[0,headEnd+'</head>\n'.length,scripts,packaged.length];
  const byPayload=new Map(),images=[];
  const parts=[];
  for(let i=0;i<sources.length;i++){
    parts.push(packaged.slice(cuts[i],cuts[i+1]).replace(MEDIA,payload=>{
      if(!byPayload.has(payload)){
        const file='image-'+byPayload.size+'.data';
        byPayload.set(payload,file);
      }
      images.push(byPayload.get(payload));
      return marker(images.length-1);
    }));
  }
  fs.mkdirSync(embedded,{recursive:true});
  for(const f of fs.readdirSync(embedded))if(f.endsWith('.data'))fs.rmSync(path.join(embedded,f));
  for(const [payload,file] of byPayload)fs.writeFileSync(path.join(embedded,file),payload);
  fs.writeFileSync(manifestPath,JSON.stringify({images},null,2)+'\n');
  parts.forEach((p,i)=>fs.writeFileSync(path.join(src,sources[i]),p));
  console.log('Player page split: 3 parts, '+byPayload.size+' unique images, '+images.length+' references');
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const mode=process.argv[2]||'--verify';
  try{
    if(mode==='--split'){split();}
    else if(mode==='--verify'){
      const {output,images}=assemble();
      const compiled=fs.readFileSync(target,'utf8');
      if(output!==compiled){
        console.error('Player HTML source differs: source='+sha(output)+' packaged='+sha(compiled));
        console.error('If src/gmww-members-page.js was edited directly, run: node .github/scripts/assemble-player-page.mjs --split');
        process.exit(1);
      }
      console.log('Player page source matches packaged module: 3 parts, '+new Set(images).size+' unique images, '+Buffer.byteLength(output)+' bytes, sha256 '+sha(output));
    }else if(mode==='--write'){
      const {output}=assemble();
      fs.writeFileSync(target,output);
      console.log('Player page rebuilt: '+Buffer.byteLength(output)+' bytes, sha256 '+sha(output));
    }else{
      console.error('Usage: node .github/scripts/assemble-player-page.mjs [--verify|--write|--split]');
      process.exit(2);
    }
  }catch(e){console.error(e.message);process.exit(1);}
}
