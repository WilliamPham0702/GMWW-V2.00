#!/usr/bin/env node
import fs from 'node:fs';

const changed = (process.env.GMWW_CHANGED_FILES || process.argv.slice(2).join('\n'))
  .split(/\r?\n/)
  .map(s=>s.trim())
  .filter(Boolean);

const nativePatterns = [
  /^server-game\/GMWW-Server\//,
  /^server-game\/GMWW-Server\.xcodeproj\//,
  /\.swift$/,
  /Info\.plist$/,
  /\.entitlements$/,
  /Assets\.xcassets\//
];

const runtimePatterns = [
  /^server-game\/current\//,
  /^server-game\/shared\//,
  /^assets\/backgrounds\//,
  /^assets\/characters\//,
  /^assets\/village\//,
  /^update-system\//,
  /^\.github\/scripts\/prepare-update-channel\.mjs$/
];

const serverPatterns = [
  /^src\//,
  /^wrangler\.jsonc$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^tests\//
];

const hit = (patterns,p)=>patterns.some(r=>r.test(p));
let releaseType='server_only';
if(changed.some(p=>hit(nativePatterns,p))) releaseType='native';
else if(changed.some(p=>hit(runtimePatterns,p))) releaseType='runtime';
else if(changed.some(p=>hit(serverPatterns,p))) releaseType='server_only';

const result={releaseType,changedFiles:changed};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(process.env.GITHUB_OUTPUT){
  fs.appendFileSync(process.env.GITHUB_OUTPUT,`release_type=${releaseType}\n`);
}
