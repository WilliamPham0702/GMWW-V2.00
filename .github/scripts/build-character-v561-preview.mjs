// Build the smallest stand-alone static 3D lab. Only approved-to-preview
// Three.js modules and their required source imports; no game or personal data.
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
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

if(files.length!==10)throw new Error('Unexpected preview source count');

// iOS in-app browsers may fail to fetch/execute a tree of native ES modules.
// Bundle the same verified Three.js 3D source into a single classic IIFE SCRIPT
// without changing the checked-in, separately testable ES-module lab source.
const htmlSource='assets/characters/v5/test-skin-v562.html';
const html=fs.readFileSync(htmlSource,'utf8');
const inlineModule=html.match(/<script type="module">([\s\S]*?)<\/script>/);
if(!inlineModule)throw new Error('V5.62 HTML missing 3D ES module');
const bundleName='gmww-character-v562.bundle.js';
const bundleTarget=path.join(root,'characters/v5',bundleName);
await build({
 stdin:{contents:inlineModule[1],resolveDir:path.resolve('assets/characters/v5'),
  sourcefile:'gmww-character-v562-entry.mjs',loader:'js'},
 bundle:true,write:true,format:'iife',platform:'browser',
 target:['safari15','chrome100'],
 outfile:bundleTarget,logLevel:'warning'
});
if(!fs.existsSync(bundleTarget)||fs.statSync(bundleTarget).size<10000)
 throw new Error('V5.62 iOS 3D bundle missing or unexpectedly empty');
const deploymentHtml=html.replace(inlineModule[0],
 '<script defer src="./'+bundleName+'"></script>');
if(deploymentHtml===html || deploymentHtml.includes('<script type="module">'))
 throw new Error('V5.62 preview still has a network module dependency');
fs.writeFileSync(path.join(root,'characters/v5/test-skin-v562.html'),deploymentHtml);
if(!deploymentHtml.includes('window.__gmwwV562ReportError=report;'))
 throw new Error('Classic Safari startup watchdog not deployed');
if(!deploymentHtml.includes('<script defer src="./'+bundleName+'"></script>'))
 throw new Error('Safari-compatible IIFE is not linked');
console.log('Character V5.62 iPhone test: Safari-compatible classic IIFE bundle',fs.statSync(bundleTarget).size,'bytes.');
console.log('Character V5.62 independent preview contains only',files.length+1,'files');

