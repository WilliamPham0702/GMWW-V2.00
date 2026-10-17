#!/usr/bin/env node
import fs from 'node:fs';
import {isV562IsolatedPreviewAsset} from './character-v562-preview-isolation.mjs';

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

// Never require an IPA/OTA bump for the two stand-alone V5.62 lab files.
const releaseInputs=changed.filter(path=>!isV562IsolatedPreviewAsset(path));
const hit = (patterns,p)=>patterns.some(r=>r.test(p));
let releaseType='server_only';
if(releaseInputs.some(p=>hit(nativePatterns,p))) releaseType='native';
else if(releaseInputs.some(p=>hit(runtimePatterns,p))) releaseType='runtime';
else if(releaseInputs.some(p=>hit(serverPatterns,p))) releaseType='server_only';

const result={releaseType,changedFiles:changed};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(process.env.GITHUB_OUTPUT){
  fs.appendFileSync(process.env.GITHUB_OUTPUT,`release_type=${releaseType}\n`);
}
