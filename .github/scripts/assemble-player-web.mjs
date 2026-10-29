#!/usr/bin/env node
// GMWW FAST G3.9: edit plain Player Web source, then reserialize exact deployed ES module.
// Refuse release if compiled module drifts from current authored sources.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const parts=[
  '00-bootstrap-and-session.part',
  '10-role-card-artwork.part',
  '20-village-and-profile.part',
  '30-rooms-and-realtime.part',
  '35-online-chat.part',
  '40-cards-and-game.part',
  '50-privacy-and-runtime.part'
];
const body=parts.map(file=>fs.readFileSync(path.join(root,'src/player-web-src',file),'utf8')).join('');
const compiled='export const gmwwMembersLiveScript = '+JSON.stringify(body)+';\n';
const target=path.join(root,'src/gmww-members-live.js');
const sha=b=>createHash('sha256').update(b).digest('hex');
const arg=process.argv[2]||'--verify';
if(arg==='--verify'){
  const shipped=fs.readFileSync(target,'utf8');
  if(compiled!==shipped){
    console.error('Player Web source drift; compiled='+sha(compiled)+' packaged='+sha(shipped));
    process.exit(1);
  }
  console.log('Player Web source matches packaged script: '+parts.length+' parts, '+Buffer.byteLength(compiled)+' bytes, sha256 '+sha(compiled));
}else if(arg==='--write'){
  fs.writeFileSync(target,compiled);
  console.log('Player Web script rebuilt from '+parts.length+' source parts, sha256 '+sha(compiled));
}else{
  console.error('Usage: node .github/scripts/assemble-player-web.mjs [--verify|--write]');
  process.exit(2);
}
