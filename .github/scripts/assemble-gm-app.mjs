#!/usr/bin/env node
// Reproducible GM UI app assembler (G3.8). Source changes must preserve bytes
// until the standard GMWW Runtime/OTA version release process is used.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const parts=[
  '00-core-and-library.part',
  '10-library-and-settings.part',
  '20-members-and-roster.part',
  '30-village-and-setup.part',
  '40-battle-and-timeline.part',
  '45-online-chat.part',
  '50-roles-and-artifacts.part'
];
const target=path.join(root,'server-game/current/app.js');
const assembled=Buffer.concat(parts.map(n=>fs.readFileSync(path.join(root,'server-game/src',n))));
const sha=b=>createHash('sha256').update(b).digest('hex');
const mode=process.argv[2]||'--verify';
if(mode==='--write'){
  fs.writeFileSync(target,assembled);
  console.log('GM app rebuilt from '+parts.length+' source modules (sha256 '+sha(assembled)+')');
}else if(mode==='--verify'){
  const shipped=fs.readFileSync(target);
  if(!assembled.equals(shipped)){
    console.error('GM app source differs from packaged app! assembled='+sha(assembled)+' packaged='+sha(shipped));
    process.exit(1);
  }
  console.log('GM app source matches packaged app: '+parts.length+' modules, '+assembled.length+' bytes, sha256 '+sha(assembled));
}else{
  console.error('Usage: node .github/scripts/assemble-gm-app.mjs [--verify|--write]');
  process.exit(2);
}
