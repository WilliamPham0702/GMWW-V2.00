// Build the smallest stand-alone static 3D lab. Only approved-to-preview
// Three.js modules and their required source imports; no game or personal data.
import fs from 'node:fs';
import path from 'node:path';
const root='.character-v561-preview-assets';
fs.rmSync(root,{recursive:true,force:true});
const files=[
 'assets/characters/v5/test-skin-v561.html',
 'assets/characters/v5/test-skin-v562.html',
 'assets/characters/v5/skin-v562-original-sleeves.mjs',
 'assets/characters/v5/skin-v561-original-art-uv.mjs',
 'assets/characters/v5/skin-v561-original-swatch.mjs',
 'assets/characters/v5/skin-v560-weighted-surface.mjs',
 'assets/characters/v5/character-rig-v510.mjs',
 'assets/characters/v5/character-motion-v500.mjs',
 'assets/characters/v5/vendor/three.module.min.js',
 'assets/characters/v4/skin-v414.mjs'
];
for(const src of files){
 if(!fs.existsSync(src))throw new Error('Missing Character preview source: '+src);
 const dst=path.join(root,src.replace(/^assets\//,''));
 fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.copyFileSync(src,dst);
 console.log(src,fs.statSync(dst).size,'bytes');
}
if(files.length!==10)throw new Error('Unexpected preview file count');
console.log('Character V5.62 independent preview contains only',files.length,'files');
