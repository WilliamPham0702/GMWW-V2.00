// Build a self-contained HTML prototype. Nothing is deployed or injected into Production.
// Dependencies are already transitively available through the repository's Wrangler install.
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';

const root=process.cwd();
const source=path.join(root,'assets/village/rig-skin-demo.html');
const output=path.join(root,'rig-skin-character01-offline.html');
const html=await fs.readFile(source,'utf8');
const regex=/<script type="module">([\s\S]*?)<\/script>/;
const match=html.match(regex);
if(!match)throw new Error('RIG_SKIN_DEMO_MODULE_NOT_FOUND');
const bundle=await build({
  stdin:{contents:match[1],resolveDir:path.join(root,'assets/village'),sourcefile:'rig-skin-offline-entry.mjs',loader:'js'},
  bundle:true,write:false,format:'iife',platform:'browser',target:['safari16','chrome109'],minify:false
});
const js=bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const artwork=await fs.readFile(path.join(root,'assets/characters/v253/chibi-01.webp'));
const final=html.replace(regex,'<script>'+js+'</script>').replace('../characters/v253/chibi-01.webp','data:image/webp;base64,'+artwork.toString('base64'));

if(!final.includes('data-leg-l') || !final.includes('data:image/webp;base64,') || final.includes("from './rig-skin-core.mjs'"))throw new Error('BUNDLE_INVALID');
await fs.writeFile(output,final);
console.log('RIG_SKIN_OFFLINE_READY',path.basename(output),(await fs.stat(output)).size);
