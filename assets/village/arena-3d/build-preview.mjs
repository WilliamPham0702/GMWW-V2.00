// Build only a fixed, reviewed file allowlist. Never copy Production room assets/data.
import {mkdir,copyFile,rm,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const destination='.arena3d-preview-assets';
const files=[
  ['assets/village/arena-3d/index.html','village/arena-3d/index.html'],
  ['assets/village/arena-3d/main.mjs','village/arena-3d/main.mjs'],
  ['assets/village/dual-renderer-core.mjs','village/dual-renderer-core.mjs'],
  ['assets/characters/v5/vendor/three.module.min.js','characters/v5/vendor/three.module.min.js'],
  ['assets/characters/v5/vendor/three.core.min.js','characters/v5/vendor/three.core.min.js']
];
await rm(destination,{recursive:true,force:true});
for(const [source,target] of files){
  const path=join(destination,target);
  await mkdir(dirname(path),{recursive:true});
  await copyFile(source,path);
}
await writeFile(join(destination,'arena-manifest.json'),JSON.stringify({isolated:true,syntheticOnly:true,assetPaths:files.map(x=>x[1])})+'\n');
console.log('Arena 3D isolated asset staging completed:',files.length,'files.');
