#!/usr/bin/env node
// Reproducible GM UI app assembler (G3.8). Source changes must preserve bytes
// until the standard GMWW Runtime/OTA version release process is used.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {GM_SOURCE_DIR,GM_GROUPS,groupBuffer,assertNoStrayGroups} from './source-groups.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const parts=GM_GROUPS;
assertNoStrayGroups(GM_SOURCE_DIR,parts);
const target=path.join(root,'server-game/current/app.js');
const assembled=Buffer.concat(parts.map(group=>groupBuffer(GM_SOURCE_DIR,group)));
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
