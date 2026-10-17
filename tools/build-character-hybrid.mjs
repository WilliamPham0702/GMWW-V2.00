import {readFileSync,writeFileSync} from 'node:fs';
import {build} from 'esbuild';
const result=await build({entryPoints:['assets/characters/v5/hybrid-entry.mjs'],bundle:true,write:false,format:'iife',minify:true,legalComments:'inline'});
let template=readFileSync('assets/characters/v5/hybrid-shell.html','utf8');
const image=readFileSync('assets/characters/v5/hybrid/approved-front.jpeg').toString('base64');
template=template.replace('/*BUNDLE*/',result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')).replaceAll('APPROVED_IMAGE_DATA','data:image/jpeg;base64,'+image);
writeFileSync('assets/characters/v5/test-skin-v570.html',template);
console.log('single HTML bytes',Buffer.byteLength(template));
