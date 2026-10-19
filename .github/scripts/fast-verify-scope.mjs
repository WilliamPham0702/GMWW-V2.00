#!/usr/bin/env node
// Fail-closed isolation guard for expensive Character V4/V5 laboratory assets.
// Active game, Player Web, native/OTA, runtime SHA and data checks are unconditional.
import fs from 'node:fs';

const relevant=[
  /^assets\/characters\/v[45]\//,
  /^src\/index\.js$/,
  /^src\/gmww-character-v4\.js$/,
  /^wrangler\.jsonc$/,
  /^\.github\/workflows\/deploy-production\.yml$/,
  /^\.github\/scripts\/fast-verify-scope\.mjs$/,
  /^\.github\/scripts\/verify-isolated-character-labs\.sh$/
];

export function requiresIsolatedCharacterLabVerification(paths,{manual=false}={}){
  // Missing change metadata means unknown impact: never silently skip verification.
  if(manual||!Array.isArray(paths)||paths.length===0)return true;
  return paths.some(path=>relevant.some(pattern=>pattern.test(String(path).trim())));
}

if(process.argv[1]?.endsWith('/fast-verify-scope.mjs')){
  const [file,event=process.env.GITHUB_EVENT_NAME]=process.argv.slice(2);
  if(!file)throw Error('Missing changed-files path');
  const changed=fs.readFileSync(file,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const verify=requiresIsolatedCharacterLabVerification(changed,{manual:event==='workflow_dispatch'});
  process.stdout.write('verify_character_labs='+(verify?'true':'false')+'\n');
}
