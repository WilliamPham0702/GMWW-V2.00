#!/usr/bin/env node
// Select the smallest SAFE browser scope on PRs. Unknown diffs run the full suite.
// Verified main-push scopes use focused checks; icon policy also isolates legacy gallows/shortcut workflows.
import fs from 'node:fs';
// V3.277 Player lobby release scope checks exact version-only files; unknown diffs still use full CI.
// PR641 is an exact CI-only shell printf correction.
import {playerInteractionsScope} from './player-interactions-scope.mjs';
import {createHash} from 'node:crypto';
import {isRuntimeDriftScope} from './runtime-server-drift-scope.mjs';
import {isIconArtworkScope,isIconArtworkPolicyScope} from './icon-artwork-scope.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scopedMarkers={
  'src/index.js':['  async gmConfig(request,body){','  async gmDayClock(request,body){'],
  'server-game/src/50-roles-and-artifacts.part':['/* Match completion is shared','async function openPlayEndSheet(){'],
  'server-game/current/app.js':['/* Match completion is shared','async function openPlayEndSheet(){']
};

// Pages-only alias: never narrow CI when any gameplay, Worker or Native file changes.
const pagesAliasOnlyPaths=new Set([
  'infra/pages/gamemasoi/_redirects',
  'infra/pages/gamemasoi/index.html',
  'tests/gamemasoi-pages-link.test.mjs',
  'docs/releases/GMWW-GAMEMASOI-PAGES-LINK-20261031.md',
  '.github/workflows/deploy-gamemasoi-pages.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/github-runtime-ota.yml',
  '.github/workflows/check-player-web.yml',
  '.github/scripts/ci-browser-scope.mjs'
]);
function isPagesAliasScope(changes){
  return Array.isArray(changes)&&changes.length>=7&&
    changes.some(c=>c.path==='infra/pages/gamemasoi/_redirects'&&c.status==='A')&&
    changes.some(c=>c.path==='tests/gamemasoi-pages-link.test.mjs'&&c.status==='A')&&
    changes.every(c=>pagesAliasOnlyPaths.has(c.path)&&['M','A'].includes(c.status));
}

const testPath=/^tests\/(?:match-completion(?:-server|-reentry)?|forced-end-game)\.test\.mjs$/;
const notesPath=/^docs\/releases\/[\w.\-]+\.md$/;

function outsideScope(source,startMarker,endMarker){
  if(typeof source!=='string')return null;
  const start=source.indexOf(startMarker);
  if(start<0||source.indexOf(startMarker,start+1)!==-1)return null;
  const end=endMarker?source.indexOf(endMarker,start+startMarker.length):source.length;
  if(end<0||endMarker&&source.indexOf(endMarker,end+1)!==-1)return null;
  return source.slice(0,start)+'\n/* verified scoped change */\n'+source.slice(end);
}

// P0 roster/role release: the ONLY permitted Worker edits are join and movement
// phase handling; Player Web edits must be in the precise delivery recovery block.
// Anything unrecognized, including CI changes, runs the full release suite.
function outsideP0Worker(source){
  let x=outsideScope(source,'  async playerMove(body){','  async playerMoveComplete(body){');
  return x===null?null:outsideScope(x,'  async join(body){','  async ready(body){');
}
function stripP0CardPatch(source){
  if(typeof source!=='string')return null;
  const start=' // Join now returns a public, privacy-safe room snapshot atomically with the';
  const end=' // First click should OPEN the chosen card in Chrome and Edge';
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  return a<0||b<0?null:source.slice(0,a)+source.slice(b);
}
function isP0Scope(changes){
  let containsP0=false;
  for(const {path,before,after,status} of changes){
    if(notesPath.test(path))continue;
    if(path==='src/index.js'&&status==='M'){
      if(outsideP0Worker(before)===null||outsideP0Worker(before)!==outsideP0Worker(after))return false;
      containsP0=true;continue;
    }
    if(path==='src/gmww-player-private-card-patch.js'&&status==='M'){
      if(stripP0CardPatch(after)!==before)return false;
      containsP0=true;continue;
    }
    if(path==='tests/browser-live-realtime-vote.mjs'&&status==='M'){containsP0=true;continue}
    if(path==='tests/player-web-p0-atomic-roster-role-release.test.mjs'&&status==='A'){containsP0=true;continue}
    return false;
  }
  return containsP0;
}

// Isolate Arena research so the PR does not test unrelated cards, seats, DEMO or IPA.
const dualPaths=new Set([
  'assets/village/dual-renderer-core.mjs',
  'assets/village/arena-3d/index.html',
  'assets/village/arena-3d/main.mjs',
  'src/gmww-dual-renderer-projection.js',
  'tests/dual-renderer-contract.test.mjs',
  'docs/plans/GMWW-DUAL-RENDERER-2026-10-24.md',
  'wrangler.arena3d-preview.jsonc',
  'assets/village/arena-3d/preview-worker.mjs',
  'assets/village/arena-3d/build-preview.mjs',
  'tests/arena3d-preview.test.mjs',
  'tests/arena3d-preview-browser.mjs',
  'docs/releases/GMWW-ARENA3D-PREVIEW-2026-10-24.md',
  '.github/workflows/deploy-arena3d-preview.yml',
  'src/arena3d-stage-worker.mjs',
  'wrangler.arena3d-core-stage.jsonc',
  'assets/village/arena-3d/live.html',
  'assets/village/arena-3d/live.mjs',
  'assets/village/arena-3d/room-realtime.mjs',
  'tests/arena3d-phase2-contract.test.mjs',
  'tests/arena3d-stage-http.mjs',
  '.github/workflows/deploy-arena3d-core-stage.yml',
  'docs/releases/GMWW-ARENA3D-PHASE2-2026-10-24.md',
  'assets/village/arena-3d/character-atelier.mjs',
  'src/arena3d-visual-effect-policy.mjs',
  'tests/arena3d-phase3.test.mjs',
  'tests/arena3d-spell-vfx.test.mjs',
  'assets/village/arena-3d/spell-vfx.mjs',
  'docs/releases/GMWW-ARENA3D-SPELL-ART-2026-10-24.md',
  'assets/village/arena-3d/gm-dashboard.mjs',
  'tests/arena3d-phase4.test.mjs',
  'tests/arena3d-role-scenario.test.mjs',
  'assets/village/arena-3d/arena-acceptance-scenario.mjs',
  'docs/releases/GMWW-ARENA3D-BATCH-ACCEPTANCE-2026-10-24.md',
  'tests/arena3d-phase4-browser.mjs',
  'tests/arena3d-casting.test.mjs',
  'assets/village/arena-3d/casting-choreography.mjs',
  'assets/village/arena-3d/coastal-village.mjs',
  'tests/arena3d-coastal-village.test.mjs',
  'tests/arena3d-ritual-walk.test.mjs',
  'docs/releases/GMWW-ARENA3D-RITUAL-WALK-2026-10-24.md',
  'docs/releases/GMWW-ARENA3D-COASTAL-2026-10-24.md',
  'docs/releases/GMWW-ARENA3D-TURN-CAST-2026-10-24.md',
  'docs/releases/GMWW-ARENA3D-PHASE4-2026-10-24.md',
  'tests/arena3d-phase3-webkit.mjs',
  'docs/releases/GMWW-ARENA3D-PHASE3-2026-10-24.md',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-p0-chrome-edge-realtime.yml',
  '.github/scripts/ci-browser-scope.mjs'
]);
function isDualRendererScope(changes){
  return changes.some(c=>c.path==='src/gmww-dual-renderer-projection.js')&&
    changes.every(c=>dualPaths.has(c.path)&&['A','M'].includes(c.status));
}

// PR #475: only DEMO assassin reply, divination, shared gallows eligibility,
// role-name audio, and dedicated staging/CI scaffolding. New unknown files fail closed.
const demo475Paths=new Set([
 'src/gmww-demo-runner.js','src/gmww-wolf-night-resolution.js',
 'src/gmww-gallows-rules.js','src/index.js',
 'server-game/src/30-village-and-setup.part',
 'server-game/src/40-battle-and-timeline.part',
 'server-game/current/app.js',
 'src/player-web-src/30-rooms-and-realtime.part',
 'src/gmww-members-live.js',
 'tests/demo-assassin-gallows-divination.test.mjs',
 'tests/v3189-fire-gallows-voting.test.mjs',
 'docs/CHANGELOG_DEMO_ASSASSIN_GALLOWS_20261024.md',
 'docs/acceptance-pr475-demo-staging.md',
 '.github/workflows/check-gallows-redesign.yml',
 '.github/workflows/check-player-web.yml',
 '.github/scripts/ci-browser-scope.mjs',
 'tests/ci-browser-scope.test.mjs',
 '.github/workflows/deploy-demo-pr475-staging.yml',
 '.github/scripts/build-demo-pr475-staging.mjs',
 'wrangler.demo-pr475-staging.jsonc'
]);
// PR #475 was tested as a PR, then merged at 8772337. A narrow CI/release
// follow-up must remain scoped on main; unknown code paths still fail closed.
const demo475ReleasePaths=new Set([
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-production.yml',
 'tests/ci-browser-scope.test.mjs',
 'docs/releases/GMWW-V3.207-demo475-production-20261025.md'
]);
function isDemo475ReleaseScope(changes){
 const names=new Set(changes.map(x=>x.path));
 return names.has('.github/scripts/ci-browser-scope.mjs')&&
   names.has('.github/workflows/check-player-web.yml')&&
   names.has('.github/workflows/deploy-production.yml')&&
   names.has('tests/ci-browser-scope.test.mjs')&&
   names.has('docs/releases/GMWW-V3.207-demo475-production-20261025.md')&&
   changes.every(x=>demo475ReleasePaths.has(x.path)&&['A','M'].includes(x.status));
}

// Final release-gate correction: GitHub does not run the Gallows workflow
// automatically for CI-only changes, so the owner dispatches it on the exact
// main SHA. This whitelist covers only those CI changes, never gameplay.
const demo475FinalGatePaths=new Set([
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/deploy-production.yml',
 'tests/ci-browser-scope.test.mjs',
 'docs/releases/GMWW-V3.207-demo475-manual-gallows-ci-20261025.md'
]);
function isDemo475FinalGateScope(changes){
 const names=new Set(changes.map(x=>x.path));
 return names.size===demo475FinalGatePaths.size&&
   [...demo475FinalGatePaths].every(x=>names.has(x))&&
   changes.every(x=>demo475FinalGatePaths.has(x.path)&&['A','M'].includes(x.status));
}

// Exact final CI-selector correction after PR #479. A documentation-only
// release marker plus selector/unit tests can safely re-run focused DEMO CI.
const demo475CompletionPaths=new Set([
 '.github/scripts/ci-browser-scope.mjs',
 'tests/ci-browser-scope.test.mjs',
 'docs/releases/GMWW-V3.207-demo475-main-ci-final-20261025.md'
]);
function isDemo475CompletionScope(changes){
 const names=new Set(changes.map(x=>x.path));
 return names.size===demo475CompletionPaths.size&&
   [...demo475CompletionPaths].every(p=>names.has(p))&&
   changes.every(c=>demo475CompletionPaths.has(c.path)&&['A','M'].includes(c.status));
}

function isDemo475Scope(changes){
 const names=new Set(changes.map(x=>x.path));
 return names.has('src/gmww-demo-runner.js')&&
   names.has('src/gmww-gallows-rules.js')&&
   names.has('tests/demo-assassin-gallows-divination.test.mjs')&&
   changes.every(x=>demo475Paths.has(x.path)&&['M','A'].includes(x.status));
}

// PR #463 Lên Giàn has its own mandatory focused workflow.
// Its large GM/Worker bundles must not trigger unrelated Chrome cards/Seats/OTA browser tests.
const gallowsOnlyPaths=new Set([
  '.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/verify-prepared-runtime.mjs',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  'docs/acceptance-pr463-gallows-iphone-playerweb.md',
  'docs/release-notes-gallows-panel-20261024.md',
  'package-lock.json','package.json',
  'server-game/current/GMWW.html',
  'server-game/current/app.js',
  'server-game/current/style.css',
  'server-game/src/00-core-and-library.part',
  'server-game/src/30-village-and-setup.part',
  'server-game/src/40-battle-and-timeline.part',
  '.github/workflows/deploy-production.yml',
  '.github/scripts/ci-browser-scope.mjs',
  'docs/releases/GMWW-V3.204-gallows-unified-20261024.md',
  'tests/v3189-fire-gallows-voting.test.mjs',
  'src/gmww-gallows-rules.js','src/gmww-members-live.js','src/index.js',
  'src/player-web-src/30-rooms-and-realtime.part',
  'tests/demo-server-autonomous-e2e.mjs',
  'tests/gallows-hanging-character.test.mjs',
  'tests/gallows-panel-60s-controls.test.mjs',
  'tests/gallows-redesign-live.test.mjs',
  'tests/native-ipa-release-gate.test.mjs','tests/published-ipa.test.mjs',
  'tests/v3148-gallows-integrity.test.mjs',
  'tests/v3150-gallows-template-timing.test.mjs',
  'tests/v3163-artifact-static-battle-swipe-actions.test.mjs',
  'tests/v3179-demo-observer-bulletin-gallows-haptics.test.mjs',
  'tests/v3192-gallows-dual-mode.test.mjs',
  'tests/v3196-native-runtime-release-gates.test.mjs',
  'tests/v3202-ota-release-gates.test.mjs',
  'tests/v3202-runtime-integrity.test.mjs'
]);
// V3.205: whitelist only the Gallows/red-flag/GM visibility patch and
// essential Runtime version/OTA guards. Any unrelated file falls back to full.
const gallowsVisual205=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  '.github/scripts/prepare-update-channel.mjs',
  'docs/releases/GMWW-V3.205-gallows-pirate-flag-20261024.md',
  'package.json','package-lock.json','src/index.js',
  'server-game/current/GMWW.html','server-game/current/style.css','server-game/current/app.js',
  'server-game/src/00-core-and-library.part','server-game/src/40-battle-and-timeline.part',
  'src/player-web-src/20-village-and-profile.part',
  'src/player-web-src/30-rooms-and-realtime.part','src/gmww-members-live.js',
  'assets/village/village.mjs',
  'assets/village/index.html',
  'docs/releases/GMWW-V3.206-gallows-flag-snap-20261024.md',
  'tests/gallows-pirate-ui-v3205.test.mjs',
  'tests/gallows-flag-snap-v3206.test.mjs',
  'tests/gallows-flag-snap-v3206.test.mjs',
  'tests/v3189-fire-gallows-voting.test.mjs',
  'tests/v3202-runtime-integrity.test.mjs',
  'tests/v3202-ota-release-gates.test.mjs',
  'tests/v3196-native-runtime-release-gates.test.mjs',
  'tests/native-ipa-release-gate.test.mjs',
  'tests/published-ipa.test.mjs',
  'tests/ci-browser-scope.test.mjs'
]);
function isGallowsVisual205Scope(changes){
  const names=new Set(changes.map(x=>x.path));
  return names.has('assets/village/village.mjs')&&
    names.has('src/player-web-src/30-rooms-and-realtime.part')&&
    names.has('tests/gallows-pirate-ui-v3205.test.mjs')&&
    names.has('server-game/current/GMWW.html')&&
    changes.every(x=>gallowsVisual205.has(x.path)&&['M','A'].includes(x.status));
}
function isGallowsScope(changes){
  const names=new Set(changes.map(x=>x.path));
  return names.has('.github/workflows/check-gallows-redesign.yml')&&
    names.has('src/gmww-gallows-rules.js')&&
    names.has('tests/gallows-panel-60s-controls.test.mjs')&&
    changes.every(x=>gallowsOnlyPaths.has(x.path)&&['A','M'].includes(x.status));
}
// Testing changes to the selector itself needs only its dedicated unit tests.
const policyPaths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-card-browsers.yml',
  '.github/workflows/check-dual-renderer.yml',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/deploy-production.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/ci-browser-focused-gallows-20261024.md',
  'docs/releases/GMWW-V3.203-focused-release-gate-20261024.md'
]);
// Stable CI-only contract. Never classify gameplay/Player changes as policy-only.
// Unknown paths and deletions must fall back to the full test suite.
const stableCIPolicyPaths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/ci-policy-gate.yml',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-player-card-browsers.yml',
  '.github/workflows/check-dual-renderer.yml',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-drunk-spiritualist.yml',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/check-gm-free-icons-501.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/github-runtime-ota.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/GMWW-CI-POLICY-GATE-20261029.md',
  'docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md'
]);
function isStableCIPolicyScope(changes){
  if(!Array.isArray(changes)||changes.length===0||
      !changes.some(c=>c?.path?.startsWith('.github/')))return false;
  if(changes.some(c=>!c||!stableCIPolicyPaths.has(c.path)||!['A','M'].includes(c.status)))return false;
  const names=new Set(changes.map(c=>c.path));
  if(!names.has('.github/scripts/ci-browser-scope.mjs')||
     !names.has('tests/ci-browser-scope.test.mjs')||
     !names.has('docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md'))return false;
  const deploy=changes.find(c=>c.path==='.github/workflows/deploy-production.yml');
  if(deploy&&(typeof deploy.after!=='string'||
      !deploy.after.includes('CHỈ CI: BỎ QUA DEPLOY PRODUCTION')||
      !deploy.after.includes("needs.deploy-scope.outputs.should_deploy == 'true'")))return false;
  return true;
}

function isPolicyScope(changes){
  const names=new Set(changes.map(x=>x.path));
  return names.has('.github/scripts/ci-browser-scope.mjs')&&
    names.has('.github/workflows/check-player-card-browsers.yml')&&
    names.has('tests/ci-browser-scope.test.mjs')&&
    changes.every(x=>policyPaths.has(x.path)&&['A','M'].includes(x.status));
}


// V3.208 audio-only release: whitelist the exact GM narration + day bulletin
// files so unrelated Chrome Card/Seat/Character/OTA tests do not block it.
// Unrecognized files or altered version markers always fall back to full.
const audio208Paths=new Set([
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
 '.github/scripts/prepare-update-channel.mjs',
 'docs/releases/GMWW-V3.208-audio-v111-and-release-notes-20261025.md',
 'package.json','package-lock.json',
 'src/index.js','src/gmww-wolf-night-resolution.js','src/gmww-update-release-notes.js',
 'server-game/current/GMWW.html','server-game/current/app.js','server-game/current/style.css',
 'server-game/src/00-core-and-library.part','server-game/src/10-library-and-settings.part',
 'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
 'tests/update-release-notes-range.test.mjs','tests/night-rules-audio-regression.test.mjs',
 'tests/v3133-timeline-audio-role-intel.test.mjs',
 'tests/v3141-fairy-role-scan-day-audio.test.mjs'
]);
function isAudio208Scope(changes){
 const names=new Set(changes.map(c=>c.path));
 if(!names.has('src/gmww-wolf-night-resolution.js')||
    !names.has('server-game/src/10-library-and-settings.part')||
    !names.has('src/gmww-update-release-notes.js')||
    !names.has('server-game/current/app.js')||
    !names.has('.github/scripts/ci-browser-scope.mjs')||
    !names.has('.github/workflows/check-player-web.yml')||
    !names.has('docs/releases/GMWW-V3.208-audio-v111-and-release-notes-20261025.md')||
    !changes.every(c=>audio208Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 const worker=changes.find(c=>c.path==='src/index.js')?.after||'';
 const gm=changes.find(c=>c.path==='server-game/src/00-core-and-library.part')?.after||'';
 const pkg=changes.find(c=>c.path==='package.json')?.after||'';
 return worker.includes('VERSION="V3.208"')&&gm.includes("const VERSION='3.208'")&&pkg.includes('"version": "3.208.0"');
}


// V3.209 audio + public gallows UX + private GM statistics is a bounded release.
// This whitelist does not permit changes to unrelated roles, seats, card delivery or native IPA.
const audioGallows209Paths=new Set([
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/scripts/prepare-update-channel.mjs',
  'docs/releases/GMWW-V3.209-audio-gallows-factions-victory-20261025.md',
  'package.json','package-lock.json','src/index.js','src/gmww-gallows-rules.js',
  'src/player-web-src/20-village-and-profile.part',
  'src/player-web-src/30-rooms-and-realtime.part',
  'src/player-web-src/50-privacy-and-runtime.part','src/gmww-members-live.js',
  'assets/village/village.mjs',
  'server-game/current/GMWW.html','server-game/current/app.js','server-game/current/style.css',
  'server-game/src/00-core-and-library.part',
  'server-game/src/10-library-and-settings.part',
  'server-game/src/30-village-and-setup.part',
  'server-game/src/40-battle-and-timeline.part',
  'server-game/src/50-roles-and-artifacts.part'
]);
function isAudioGallows209Scope(changes){
  const names=new Set(changes.map(x=>x.path));
  for(const required of ['src/index.js','src/gmww-gallows-rules.js',
    'server-game/src/40-battle-and-timeline.part','src/player-web-src/30-rooms-and-realtime.part',
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
    'docs/releases/GMWW-V3.209-audio-gallows-factions-victory-20261025.md'])
    if(!names.has(required))return false;
  if(!changes.every(x=>audioGallows209Paths.has(x.path)&&['M','A'].includes(x.status)))return false;
  const worker=changes.find(x=>x.path==='src/index.js')?.after||'';
  const gm=changes.find(x=>x.path==='server-game/src/00-core-and-library.part')?.after||'';
  const pkg=changes.find(x=>x.path==='package.json')?.after||'';
  return worker.includes('VERSION="V3.209"')&&gm.includes("const VERSION='3.209'")&&
    pkg.includes('"version": "3.209.0"');
}

// Version-scoped Runtime V3.210: production-approved action ICON artwork only.
// Fail closed on unrecognized paths, missing icon assets or mismatched version.
const icon3210Paths=new Set([
 'src/index.js','package.json','package-lock.json',
 'server-game/current/GMWW.html','server-game/current/app.js','server-game/current/action-icon-library.js',
 'server-game/src/00-core-and-library.part',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'tests/action-icon-library.test.mjs',
 'docs/plans/GMWW-ACTION-ICON-LIBRARY-2026-10-25.md',
 'docs/releases/GMWW-PR483-ICON-SEA-V1-2026-10-25.md',
 'docs/releases/GMWW-V3.210-icons-runtime-20261025.md'
]);
function icon3210Asset(path){
 const main='assets/action-icons/sea-v1/';
 const local='server-game/current/action-icons/sea-v1/';
 if(path.startsWith(main))return /^(?:[0-9]{2}_[a-z_]+[.](?:png|svg)|manifest[.]json)$/.test(path.slice(main.length));
 if(path.startsWith(local))return /^[0-9]{2}_[a-z_]+[.]png$/.test(path.slice(local.length));
 return false;
}
function isIconRuntime3210Scope(changes){
 const names=new Set(changes.map(c=>c.path));
 for(const required of ['src/index.js','package.json','server-game/current/app.js',
  'server-game/current/GMWW.html','server-game/current/action-icon-library.js',
  '.github/scripts/prepare-update-channel.mjs','tests/action-icon-library.test.mjs',
  'docs/releases/GMWW-V3.210-icons-runtime-20261025.md'])if(!names.has(required))return false;
 if(!changes.every(x=>(icon3210Paths.has(x.path)||icon3210Asset(x.path))&&['A','M'].includes(x.status)))return false;
 const worker=changes.find(x=>x.path==='src/index.js')?.after||'';
 const gm=changes.find(x=>x.path==='server-game/current/app.js')?.after||'';
 const pkg=changes.find(x=>x.path==='package.json')?.after||'';
 const html=changes.find(x=>x.path==='server-game/current/GMWW.html')?.after||'';
 return worker.includes('VERSION="V3.210"')&&gm.includes("const VERSION='3.210'")&&
  pkg.includes('"version": "3.210.0"')&&html.includes('<title>GMWW V3.210</title>')&&
  html.includes('action-icon-library.js')&&
  changes.filter(x=>x.path.startsWith('assets/action-icons/sea-v1/')&&x.path.endsWith('.png')).length===19&&
  changes.filter(x=>x.path.startsWith('assets/action-icons/sea-v1/')&&x.path.endsWith('.svg')).length===19&&
  changes.filter(x=>x.path.startsWith('server-game/current/action-icons/sea-v1/')&&x.path.endsWith('.png')).length===19;
}

// CI-only correction for the owner-dispatched V3.210 release. No runtime,
// gameplay or assets can be changed in this scope; otherwise run full suite.
function isIcon3210DispatchGateScope(changes){
 const names=new Set(changes.map(c=>c.path));
 if(names.size!==2||!names.has('.github/scripts/ci-browser-scope.mjs')||
   !names.has('.github/workflows/deploy-production.yml'))return false;
 if(!changes.every(x=>x.status==='M'))return false;
 const selector=changes.find(x=>x.path==='.github/scripts/ci-browser-scope.mjs')?.after||'';
 const deploy=changes.find(x=>x.path==='.github/workflows/deploy-production.yml')?.after||'';
 return selector.includes('Owner-initiated V3.210 release on main')&&
  deploy.includes("['push','workflow_dispatch'].includes(x.event)")&&
  deploy.includes('id: icon_release_3210');
}

// V3.211: thay đổi hình ảnh Top 3 ở GM Home, không liên quan Chrome Card/Seat/DEMO.
const homePodium3211Paths=new Set([
 'src/index.js','package.json','package-lock.json',
 'server-game/current/app.js','server-game/current/style.css','server-game/current/GMWW.html',
 'server-game/src/00-core-and-library.part','server-game/src/20-members-and-roster.part',
 'tests/home-top3-podium-v3211.test.mjs',
 'docs/releases/GMWW-V3.211-top3-victory-podium-20261025.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
]);
function isHomePodium3211Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const files=new Map(changes.map(c=>[c.path,c]));
 for(const mandatory of [
   'src/index.js','package.json','package-lock.json',
   'server-game/current/app.js','server-game/current/style.css',
   'server-game/current/GMWW.html','server-game/src/00-core-and-library.part',
   'server-game/src/20-members-and-roster.part','tests/home-top3-podium-v3211.test.mjs',
   'docs/releases/GMWW-V3.211-top3-victory-podium-20261025.md'
 ])if(!files.has(mandatory))return false;
 if(!changes.every(c=>homePodium3211Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 const code=files.get('server-game/current/app.js')?.after||'';
 const style=files.get('server-game/current/style.css')?.after||'';
 const worker=files.get('src/index.js')?.after||'';
 const html=files.get('server-game/current/GMWW.html')?.after||'';
 const pkg=files.get('package.json')?.after||'';
 return worker.includes('VERSION="V3.211"')&&code.includes("const VERSION='3.211'")&&
   code.includes('gmww-home-podium-stage-v3211')&&style.includes('gmwwVictoryDance3211')&&
   html.includes('<title>GMWW V3.211</title>')&&pkg.includes('"version": "3.211.0"');
}

// Only the owner-approved V3.212 ICON tile cleanup and its release machinery.
// Unknown files, different versions and missing release parts fail closed.
const icon3212Paths=new Set([
 'server-game/current/action-icon-library.js','server-game/current/GMWW.html',
 'server-game/current/app.js','server-game/src/00-core-and-library.part','server-game/src/45-online-chat.part',
 'src/index.js','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'tests/action-icon-card-clean.test.mjs',
 'docs/releases/GMWW-V3.212-icon-clean-ui-20261025.md'
]);
function isIconClean3212Scope(changes){
 const found=new Map(changes.map(c=>[c.path,c]));
 for(const p of ['server-game/current/action-icon-library.js','server-game/current/GMWW.html',
 'server-game/current/app.js','src/index.js','package.json',
 'tests/action-icon-card-clean.test.mjs','docs/releases/GMWW-V3.212-icon-clean-ui-20261025.md'])
  if(!found.has(p))return false;
 if(!changes.every(x=>icon3212Paths.has(x.path)&&['A','M'].includes(x.status)))return false;
 const worker=found.get('src/index.js')?.after||'';
 const gm=found.get('server-game/current/app.js')?.after||'';
 const html=found.get('server-game/current/GMWW.html')?.after||'';
 const pkg=found.get('package.json')?.after||'';
 const icon=found.get('server-game/current/action-icon-library.js')?.after||'';
 return worker.includes('VERSION="V3.212"')&&gm.includes("const VERSION='3.212'")&&
  html.includes('<title>GMWW V3.212</title>')&&pkg.includes('"version": "3.212.0"')&&
  icon.includes('box.innerHTML=rows.map')&&!icon.includes('<small class="gmww-icon-actions">');
}

// Strict V3.213 icon wave-3 scope: 10 SVG + 10 PNG + 10 offline PNG.
const wave3213Files=new Set([
 'server-game/current/action-icon-library.js','server-game/current/GMWW.html',
 'server-game/current/app.js','server-game/src/00-core-and-library.part',
 'src/index.js','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'assets/action-icons/sea-v1/manifest.json',
 'tests/action-icon-library.test.mjs',
 'docs/releases/GMWW-V3.213-icons-wave3-20261025.md'
]);
function wave3213Asset(path){
 const a='assets/action-icons/sea-v1/',b='server-game/current/action-icons/sea-v1/';
 if(path.startsWith(a))return /^2[0-9]_[a-z_]+[.](png|svg)$/.test(path.slice(a.length));
 if(path.startsWith(b))return /^2[0-9]_[a-z_]+[.]png$/.test(path.slice(b.length));
 return false;
}
function isIconWave3213Scope(changes){
 const names=new Map(changes.map(x=>[x.path,x]));
 for(const p of ['src/index.js','package.json','server-game/current/app.js','server-game/current/GMWW.html',
  'server-game/current/action-icon-library.js','tests/action-icon-library.test.mjs','assets/action-icons/sea-v1/manifest.json',
  'docs/releases/GMWW-V3.213-icons-wave3-20261025.md'])if(!names.has(p))return false;
 if(!changes.every(x=>['A','M'].includes(x.status)&&(wave3213Files.has(x.path)||wave3213Asset(x.path))))return false;
 if(changes.filter(x=>x.path.startsWith('assets/action-icons/sea-v1/2')&&x.path.endsWith('.png')).length!==10)return false;
 if(changes.filter(x=>x.path.startsWith('assets/action-icons/sea-v1/2')&&x.path.endsWith('.svg')).length!==10)return false;
 if(changes.filter(x=>x.path.startsWith('server-game/current/action-icons/sea-v1/2')&&x.path.endsWith('.png')).length!==10)return false;
 const pkg=names.get('package.json')?.after||'';
 const worker=names.get('src/index.js')?.after||'';
 const gm=names.get('server-game/current/app.js')?.after||'';
 const html=names.get('server-game/current/GMWW.html')?.after||'';
 const icons=names.get('server-game/current/action-icon-library.js')?.after||'';
 return pkg.includes('"version": "3.213.0"')&&worker.includes('VERSION="V3.213"')&&
  gm.includes("const VERSION='3.213'")&&html.includes('<title>GMWW V3.213</title>')&&
  icons.includes('29_thanh_tay')&&icons.includes('mapUnambiguousLocalActions');
}

// GM Home Top 3 V3.214 only; maintain the separate Icon V3.213 release.
const podium3214Paths=new Set([
 'server-game/current/app.js','server-game/src/00-core-and-library.part',
 'server-game/src/20-members-and-roster.part','server-game/current/style.css',
 'server-game/current/GMWW.html','src/index.js','package.json','package-lock.json',
 'tests/home-top3-podium-v3211.test.mjs','tests/home-top3-podium-identity-v3214.test.mjs',
 'docs/releases/GMWW-V3.214-top3-podium-identity-20261025.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
]);
function isHomePodium3214Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const map=new Map(changes.map(x=>[x.path,x]));
 for(const required of [
  'server-game/current/app.js','server-game/src/00-core-and-library.part',
  'server-game/src/20-members-and-roster.part','server-game/current/style.css',
  'server-game/current/GMWW.html','src/index.js','package.json',
  'tests/home-top3-podium-identity-v3214.test.mjs',
  'docs/releases/GMWW-V3.214-top3-podium-identity-20261025.md'
 ])if(!map.has(required))return false;
 if(!changes.every(x=>podium3214Paths.has(x.path)&&['A','M'].includes(x.status)))return false;
 const worker=map.get('src/index.js')?.after||'';
 const gm=map.get('server-game/current/app.js')?.after||'';
 const html=map.get('server-game/current/GMWW.html')?.after||'';
 const pkg=map.get('package.json')?.after||'';
 const top3=gm.slice(gm.indexOf('function gmwwHomeRenderTop3'),gm.indexOf('function gmwwHomeOpenMemberRanking'));
 return worker.includes('VERSION="V3.214"')&&gm.includes("const VERSION='3.214'")&&
  top3.includes('image?rev=c40-4')&&!top3.includes('/originals/')&&
  html.includes('<title>GMWW V3.214</title>')&&pkg.includes('"version": "3.214.0"');
}

// V3.215: exact, fail-closed icon library, game presentation and art asset scope.
const iconGame3215Files=new Set([
 'server-game/current/action-icon-library.js','server-game/current/GMWW.html','server-game/current/style.css',
 'server-game/current/app.js','server-game/src/00-core-and-library.part','server-game/src/40-battle-and-timeline.part',
 'src/index.js','package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
 '.github/workflows/build-server-game-ipa.yml','.github/workflows/deploy-production.yml',
 '.github/workflows/prepare-runtime-v3202-candidate.yml',
 'assets/action-icons/sea-v1/manifest.json',
 'tests/action-icon-library.test.mjs','tests/action-icon-card-clean.test.mjs',
 'docs/plans/GMWW-ACTION-AUDIT-REAL-2026-10-25.json',
 'docs/releases/GMWW-V3.215-action-icons-game-wave4-20261025.md'
]);
function isIconGame3215Scope(changes){
 const entries=new Map(changes.map(x=>[x.path,x]));
 const required=['src/index.js','package.json','server-game/current/app.js',
  'server-game/current/action-icon-library.js','server-game/src/40-battle-and-timeline.part',
  'server-game/current/GMWW.html','server-game/current/style.css',
  'tests/action-icon-library.test.mjs','assets/action-icons/sea-v1/manifest.json',
  'docs/plans/GMWW-ACTION-AUDIT-REAL-2026-10-25.json'];
 if(required.some(x=>!entries.has(x)))return false;
 function art(p){
  if(p.startsWith('assets/action-icons/sea-v1/'))return /^3[0-9]_[a-z_]+[.](png|svg)$/.test(p.slice('assets/action-icons/sea-v1/'.length));
  if(p.startsWith('server-game/current/action-icons/sea-v1/'))return /^3[0-9]_[a-z_]+[.]png$/.test(p.slice('server-game/current/action-icons/sea-v1/'.length));
  return false;
 }
 if(!changes.every(x=>['A','M'].includes(x.status)&&(iconGame3215Files.has(x.path)||art(x.path))))return false;
 for(const [prefix,ext,expected] of [['assets/action-icons/sea-v1/3','.png',10],
  ['assets/action-icons/sea-v1/3','.svg',10],
  ['server-game/current/action-icons/sea-v1/3','.png',10]]){
  if(changes.filter(x=>x.path.startsWith(prefix)&&x.path.endsWith(ext)).length!==expected)return false;
 }
 const worker=entries.get('src/index.js')?.after||'';
 const gm=entries.get('server-game/current/app.js')?.after||'';
 const pkg=entries.get('package.json')?.after||'';
 const html=entries.get('server-game/current/GMWW.html')?.after||'';
 const lib=entries.get('server-game/current/action-icon-library.js')?.after||'';
 const battle=entries.get('server-game/src/40-battle-and-timeline.part')?.after||'';
 return worker.includes('VERSION="V3.215"')&&gm.includes("const VERSION='3.215'")&&
  pkg.includes('"version": "3.215.0"')&&html.includes('<title>GMWW V3.215</title>')&&
  lib.includes('39_cam_noi')&&lib.includes('gmwwIconDelete')&&
  battle.includes('battleIconTargetAt')&&battle.includes('battleConfirm(true)')&&
  battle.includes('battleIconSetOn(!battleIconOn())');
}

// V3.216: narrow GM Home visual podium sea/glass with existing character identity.
const homeSea3216Paths=new Set([
 'server-game/current/app.js','server-game/src/00-core-and-library.part',
 'server-game/src/20-members-and-roster.part','server-game/current/style.css',
 'server-game/current/GMWW.html','src/index.js','package.json','package-lock.json',
 'tests/home-top3-podium-v3211.test.mjs','tests/home-top3-podium-sea-v3216.test.mjs',
 'docs/releases/GMWW-V3.216-top3-sea-glass-20261025.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
]);
function isHomeSea3216Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const map=new Map(changes.map(c=>[c.path,c]));
 for(const need of ['server-game/current/app.js','server-game/src/00-core-and-library.part',
  'server-game/src/20-members-and-roster.part','server-game/current/style.css',
  'server-game/current/GMWW.html','src/index.js','package.json',
  'tests/home-top3-podium-sea-v3216.test.mjs',
  'docs/releases/GMWW-V3.216-top3-sea-glass-20261025.md'])if(!map.has(need))return false;
 if(!changes.every(c=>homeSea3216Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 const app=map.get('server-game/current/app.js')?.after||'';
 const css=map.get('server-game/current/style.css')?.after||'';
 const worker=map.get('src/index.js')?.after||'';
 const pkg=map.get('package.json')?.after||'';
 const html=map.get('server-game/current/GMWW.html')?.after||'';
 const top=app.slice(app.indexOf('function gmwwHomeRenderTop3('),app.indexOf('function gmwwHomeOpenMemberRanking()'));
 return worker.includes('VERSION="V3.216"')&&pkg.includes('"version": "3.216.0"')&&
  html.includes('<title>GMWW V3.216</title>')&&app.includes("const VERSION='3.216'")&&
  top.includes('gmww-home-sea-v3216')&&top.includes('image?rev=c40-4')&&
  !top.includes('/originals/')&&css.includes('gmwwCoastalVictory3216');
}

// V3.217: isolate the three audio defects from Card, Seat, 3D and older release QA.
const audio3217Files=new Set([
  'src/index.js','package.json','package-lock.json',
  'server-game/src/00-core-and-library.part','server-game/src/10-library-and-settings.part',
  'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
  'server-game/current/app.js','server-game/current/GMWW.html','server-game/current/style.css',
  '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  'docs/releases/GMWW-V3.217-fix-role-day-gallows-audio-20261025.md',
  'tests/audio-v3217-role-day-verdict.test.mjs'
]);
function isAudio3217Scope(changes){
  if(!Array.isArray(changes)||!changes.length)return false;
  const files=new Map(changes.map(c=>[c.path,c]));
  for(const required of [
    'src/index.js','package.json','server-game/current/app.js',
    'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
    'server-game/src/10-library-and-settings.part','server-game/current/GMWW.html',
    'tests/audio-v3217-role-day-verdict.test.mjs',
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
    'docs/releases/GMWW-V3.217-fix-role-day-gallows-audio-20261025.md'
  ])if(!files.has(required))return false;
  if(!changes.every(c=>audio3217Files.has(c.path)&&['A','M'].includes(c.status)))return false;
  const worker=files.get('src/index.js')?.after||'';
  const pkg=files.get('package.json')?.after||'';
  const audio=files.get('server-game/src/30-village-and-setup.part')?.after||'';
  const battle=files.get('server-game/src/40-battle-and-timeline.part')?.after||'';
  const library=files.get('server-game/src/10-library-and-settings.part')?.after||'';
  const html=files.get('server-game/current/GMWW.html')?.after||'';
  return worker.includes('VERSION="V3.217"')&&
    pkg.includes('"version": "3.217.0"')&&
    audio.includes("rawTarget==='source-18'")&&
    battle.includes("queue.push(['audio_system_day_wakeup'")&&
    library.includes("replaceAudioItem(item,'system')")&&
    !html.includes('data-gallows-audio-upload');
}

// V3.218 is restricted to 10 new independently authored icon assets and OTA.
const wave3218Files=new Set([
 'src/index.js','package.json','package-lock.json',
 'server-game/src/00-core-and-library.part','server-game/current/app.js',
 'server-game/current/GMWW.html','server-game/current/action-icon-library.js',
 'assets/action-icons/sea-v1/manifest.json','tests/action-icon-library.test.mjs',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'docs/releases/GMWW-V3.218-49-icons-audit-20261025.md'
]);
function isWave3218Asset(path){
 let name='';
 if(path.startsWith('assets/action-icons/sea-v1/'))name=path.slice('assets/action-icons/sea-v1/'.length);
 else if(path.startsWith('server-game/current/action-icons/sea-v1/'))name=path.slice('server-game/current/action-icons/sea-v1/'.length);
 else return false;
 return /^4[0-9]_[a-z_]+[.](png|svg)$/.test(name);
}
function isIconWave3218Scope(changes){
 if(!Array.isArray(changes)||changes.length===0)return false;
 const byPath=new Map(changes.map(x=>[x.path,x]));
 for(const path of ['src/index.js','package.json','server-game/current/app.js','server-game/current/GMWW.html',
  'server-game/current/action-icon-library.js','assets/action-icons/sea-v1/manifest.json',
  'tests/action-icon-library.test.mjs','docs/releases/GMWW-V3.218-49-icons-audit-20261025.md'])
  if(!byPath.has(path))return false;
 if(!changes.every(x=>['A','M'].includes(x.status)&&(wave3218Files.has(x.path)||isWave3218Asset(x.path))))return false;
 const workerFiles=changes.filter(x=>x.path.startsWith('assets/action-icons/sea-v1/4')&&x.path.endsWith('.png'));
 const workerSvgs=changes.filter(x=>x.path.startsWith('assets/action-icons/sea-v1/4')&&x.path.endsWith('.svg'));
 const gmFiles=changes.filter(x=>x.path.startsWith('server-game/current/action-icons/sea-v1/4')&&x.path.endsWith('.png'));
 if(workerFiles.length!==10||workerSvgs.length!==10||gmFiles.length!==10)return false;
 const pkg=byPath.get('package.json')?.after||'';
 const worker=byPath.get('src/index.js')?.after||'';
 const app=byPath.get('server-game/current/app.js')?.after||'';
 const html=byPath.get('server-game/current/GMWW.html')?.after||'';
 const lib=byPath.get('server-game/current/action-icon-library.js')?.after||'';
 return pkg.includes('"version": "3.218.0"')&&worker.includes('VERSION="V3.218"')&&
  app.includes("const VERSION='3.218'")&&html.includes('<title>GMWW V3.218</title>')&&
  lib.includes('49_sang_tao_artifact')&&lib.includes('REASSIGNED_REAL_ACTIONS');
}

/* V3.219 — chỉ phạm vi giao diện Top 3 và chốt phát hành Runtime bắt buộc. */
const homeSea3219Paths=new Set([
  'server-game/src/00-core-and-library.part',
  'server-game/src/20-members-and-roster.part',
  'server-game/current/app.js','server-game/current/GMWW.html',
  'server-game/current/style.css','src/index.js',
  'package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  'tests/home-top3-podium-v3211.test.mjs',
  'tests/home-top3-podium-identity-v3214.test.mjs',
  'tests/home-top3-podium-sea-v3216.test.mjs',
  'docs/releases/GMWW-V3.219-top3-no-podium-frosted-glass-20261025.md'
]);
function isHomeSea3219Scope(changes){
  if(!Array.isArray(changes)||!changes.length)return false;
  const byPath=new Map(changes.map(c=>[c.path,c]));
  for(const p of [
    'server-game/current/app.js','server-game/src/20-members-and-roster.part',
    'server-game/src/00-core-and-library.part','server-game/current/style.css',
    'server-game/current/GMWW.html','src/index.js','package.json',
    'tests/home-top3-podium-sea-v3216.test.mjs',
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
    'docs/releases/GMWW-V3.219-top3-no-podium-frosted-glass-20261025.md'
  ])if(!byPath.has(p))return false;
  if(!changes.every(c=>homeSea3219Paths.has(c.path)&&['M','A'].includes(c.status)))return false;
  const get=p=>byPath.get(p)?.after||'';
  const render=get('server-game/current/app.js');
  const a=render.indexOf('function gmwwHomeRenderTop3(rows){'),b=render.indexOf('function gmwwHomeOpenMemberRanking()',a);
  const top=render.slice(a,b);
  const src=get('server-game/src/20-members-and-roster.part');
  const sa=src.indexOf('function gmwwHomeRenderTop3(rows){'),sb=src.indexOf('function gmwwHomeOpenMemberRanking()',sa);
  if(a<0||b<a||sa<0||sb<sa||src.slice(sa,sb)!==top)return false;
  return get('package.json').includes('"version": "3.219.0"')&&
    get('src/index.js').includes('VERSION="V3.219"')&&
    get('server-game/current/GMWW.html').includes('<title>GMWW V3.219</title>')&&
    render.includes("const VERSION='3.219'")&&
    get('server-game/current/style.css').includes('V3.219 — Top 3 không bục')&&
    get('.github/scripts/prepare-update-channel.mjs').includes('V3.219: Bỏ hoàn toàn 3 bục')&&
    top.includes('button.append(stage,details)')&&top.includes('member.gameCharacterId')&&
    top.includes('image?rev=c40-4')&&!top.includes('podium.append')&&
    !top.includes('button.append(stage,podium')&&!top.includes('/originals/');
}

// V3.221 — phạm vi xếp hạng trong trang GM; không chạy test gameplay ngoài task.
const ranking3221Paths=new Set([
 'server-game/current/app.js','server-game/src/00-core-and-library.part','server-game/src/20-members-and-roster.part',
 'server-game/current/GMWW.html','src/index.js','package.json','package-lock.json',
 'tests/member-ranking-games-first-v3221.test.mjs','tests/home-top3-podium-v3211.test.mjs',
 'docs/releases/GMWW-V3.221-ranking-games-first-20261025.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
]);
function isRanking3221Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const map=new Map(changes.map(x=>[x.path,x]));
 for(const path of ['server-game/current/app.js','server-game/src/20-members-and-roster.part',
  'server-game/src/00-core-and-library.part','server-game/current/GMWW.html','src/index.js','package.json',
  'tests/member-ranking-games-first-v3221.test.mjs','docs/releases/GMWW-V3.221-ranking-games-first-20261025.md'])
  if(!map.has(path))return false;
 if(!changes.every(x=>ranking3221Paths.has(x.path)&&['A','M'].includes(x.status)))return false;
 const after=p=>map.get(p)?.after||'';
 const gm=after('server-game/current/app.js'),src=after('server-game/src/20-members-and-roster.part');
 return gm.includes("const VERSION='3.221'")&&gm.includes('function gmwwRankMembers(a,b)')&&
  src.includes('function gmwwRankMembers(a,b)')&&
  after('src/index.js').includes('VERSION="V3.221"')&&
  after('package.json').includes('"version": "3.221.0"')&&
  after('server-game/current/GMWW.html').includes('<title>GMWW V3.221</title>');
}

// AUTO VÁN owner-approved #504: fail closed on every unrelated change.
const autoVanCIPolicyPaths=new Set([
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-production.yml',
 'tests/ci-browser-scope.test.mjs'
]);
function isAutoVanCIPolicyScope(changes){
 if(!Array.isArray(changes))return false;
 const names=new Set(changes.map(c=>c.path));
 return names.size===autoVanCIPolicyPaths.size&&
   [...autoVanCIPolicyPaths].every(x=>names.has(x))&&
   changes.every(c=>autoVanCIPolicyPaths.has(c.path)&&c.status==='M'&&
     // Reject partial PR550 edits even when they share all four legacy CI paths.
     // Otherwise the historic AUTO VÁN shortcut can hide a RULE change.
     !/PR550|night02-rule-regression-550|isRules550Scope/.test(String(c.after||'')));
}
const autoVanReleasePaths=new Set([
 'package.json','package-lock.json','src/index.js',
 'server-game/src/00-core-and-library.part',
 'server-game/current/app.js','server-game/current/GMWW.html',
 '.github/scripts/prepare-update-channel.mjs',
 'docs/releases/GMWW-V3.222-auto-van-20261025.md'
]);
function isAutoVanReleaseScope(changes){
 if(changes.length!==autoVanReleasePaths.size||
    !changes.every(c=>autoVanReleasePaths.has(c.path)))return false;
 const map=new Map(changes.map(c=>[c.path,c]));
 const versionChange=(path,beforeToken,afterToken,global=false)=>{
   const c=map.get(path);
   if(!c||c.status!=='M'||typeof c.before!=='string'||typeof c.after!=='string'||!c.before.includes(beforeToken))return false;
   const expected=global?c.before.split(beforeToken).join(afterToken):c.before.replace(beforeToken,afterToken);
   return c.after===expected;
 };
 const pkg=versionChange('package.json','"version": "3.221.0"','"version": "3.222.0"');
 const lock=versionChange('package-lock.json','"version": "3.221.0"','"version": "3.222.0"',true);
 const source=versionChange('server-game/src/00-core-and-library.part',"const VERSION='3.221'","const VERSION='3.222'");
 const app=versionChange('server-game/current/app.js',"const VERSION='3.221'","const VERSION='3.222'");
 const html=versionChange('server-game/current/GMWW.html','<title>GMWW V3.221</title>','<title>GMWW V3.222</title>');
 const worker=map.get('src/index.js');
 const workerOK=worker?.status==='M'&&
  worker.after===worker.before.replace('VERSION="V3.221"','VERSION="V3.222"').replace('UPDATE_CHANNEL_REV="runtime-3221"','UPDATE_CHANNEL_REV="runtime-3222"');
 const notes=map.get('docs/releases/GMWW-V3.222-auto-van-20261025.md');
 const notesOK=notes?.status==='A'&&typeof notes.after==='string'&&notes.after.includes('AUTO VÁN')&&notes.after.includes('rollback');
 const channel=map.get('.github/scripts/prepare-update-channel.mjs');
 const noteRegex=/(releaseNotes:\[)"V3\.222:[^"]+",/;
 const channelOK=channel?.status==='M'&&noteRegex.test(channel.after||'')&&
   String(channel.after).replace(noteRegex,'$1')===channel.before;
 return pkg&&lock&&source&&app&&html&&workerOK&&notesOK&&channelOK;
}

// Runtime V3.223 (owner-approved): only the Home "VÀO LÀNG" link opens an
// isolated Arena3D STAGING iframe. This scope is fail-closed against any
// unexpected gameplay/Core/Player/IPA mutation or version mismatch.
function isArenaHome3223Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const allowed=new Set([
  'server-game/current/GMWW.html','server-game/current/app.js',
  'server-game/src/00-core-and-library.part','src/index.js',
  'package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  'tests/arena3d-home-portal-v3223.test.mjs',
  'docs/releases/GMWW-V3.223-arena3d-home-portal-20261025.md'
 ]);
 const needed=[
  'server-game/current/GMWW.html','server-game/current/app.js',
  'server-game/src/00-core-and-library.part','src/index.js',
  'package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
  'tests/arena3d-home-portal-v3223.test.mjs',
  'docs/releases/GMWW-V3.223-arena3d-home-portal-20261025.md'
 ];
 const map=new Map(changes.map(x=>[x.path,x]));
 if(changes.length!==map.size||needed.some(x=>!map.has(x))||
    changes.some(x=>!allowed.has(x.path)||!['A','M'].includes(x.status)))return false;
 function only(p,from,to){
   const x=map.get(p);
   return x?.status==='M'&&typeof x.before==='string'&&
     x.before.includes(from)&&x.after===x.before.replace(from,to);
 }
 if(!only('server-game/src/00-core-and-library.part',"const VERSION='3.222';","const VERSION='3.223';"))return false;
 if(!only('server-game/current/app.js',"const VERSION='3.222';","const VERSION='3.223';"))return false;
 if(!only('src/index.js','VERSION="V3.222"','VERSION="V3.223"'))return false;
 if(!only('package.json','"version": "3.222.0"','"version": "3.223.0"'))return false;
 const lock=map.get('package-lock.json');
 if(lock?.status!=='M'||lock.before.split('"version": "3.222.0"').length!==3||
    lock.after!==lock.before.replaceAll('"version": "3.222.0"','"version": "3.223.0"'))return false;
 const html=map.get('server-game/current/GMWW.html');
 if(html?.status!=='M'||!html.after.includes("gmwwArena3dQaFrame")||
    !html.after.includes('gmww-arena3d-stage14-staging.williampham0702.workers.dev'))return false;
 const stripped=html.after
  .replace(/<!-- Arena 3D GĐ32[\s\S]*?<\/script>\n/,'')
  .replace('<title>GMWW V3.223</title>','<title>GMWW V3.222</title>')
  .replace('Vào Làng và thử nghiệm Arena 3D STAGING','Vào Làng và mở Trang Chơi')
  .replace('<small>THỬ NGHIỆM ARENA 3D</small>','<small>Tạo phòng · Chơi ngay</small>')
  .replace('app.js?v=3.223-arena3d-qa-home-portal',
    'app.js?v=3.221-top3-glass-compact-room-village-gallows-anchor-scene-align-1-gp2');
 if(stripped!==html.before)return false;
 const prep=map.get('.github/scripts/prepare-update-channel.mjs');
 if(prep?.status!=='M'||!prep.after.includes('V3.223: Tạm thời dùng nút VÀO LÀNG')||
    prep.after.replace(/(releaseNotes:\[)"V3\.223:[^"\n]*",/,"$1")!==prep.before)return false;
 const test=map.get('tests/arena3d-home-portal-v3223.test.mjs');
 if(test?.status!=='A'||!test.after.includes('iframe')||!test.after.includes('Chơi 2D'))return false;
 if(map.get('docs/releases/GMWW-V3.223-arena3d-home-portal-20261025.md')?.status!=='A')return false;
 // CI-related workflow edits are allowed solely for this same verified V3.223
 // release. They never authorize any change to production gameplay.
 for(const p of ['.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml']){
   const row=map.get(p);
   if(row&&(!row.after?.includes('3.223')||row.status!=='M'))return false;
 }
 return true;
}

// PR #501: strictly UI-only GM/Player Web icon patch. A release/version change,
// Worker/native file, new gameplay rule or unknown path MUST fall back to full.
// This scope is PR-only; main and owner release builds keep their release gates.
const gm501Paths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  '.github/workflows/check-gm-free-icons-501.yml',
  'server-game/current/GMWW.html',
  'server-game/current/style.css',
  'server-game/current/app.js',
  'server-game/src/30-village-and-setup.part',
  'server-game/src/40-battle-and-timeline.part',
  'assets/village/village.mjs',
  'tests/gallows-pirate-ui-v3205.test.mjs',
  'tests/gallows-flag-snap-v3206.test.mjs',
  'tests/gm-free-floating-shortcuts-20261025.test.mjs',
  'tests/gm-free-floating-shortcuts-iphone-webkit.mjs',
  'tests/v3188-preview-iphone-webkit.mjs',
  'tests/ci-browser-scope.test.mjs',
  'docs/CHANGELOG_GM_FLOATING_ICONS_20261025.md',
  '.github/workflows/check-dual-renderer.yml',
  'docs/acceptance-pr501-iphone-playerweb.md'
]);
function isGMIcons501Scope(changes){
  if(!Array.isArray(changes)||!changes.length)return false;
  const found=new Map(changes.map(c=>[c.path,c]));
  for(const must of [
    'assets/village/village.mjs',
    'server-game/current/GMWW.html',
    'server-game/current/app.js',
    'server-game/current/style.css',
    'server-game/src/30-village-and-setup.part',
    'server-game/src/40-battle-and-timeline.part',
    'tests/gm-free-floating-shortcuts-20261025.test.mjs',
    'tests/gm-free-floating-shortcuts-iphone-webkit.mjs',
    '.github/workflows/check-gm-free-icons-501.yml'
  ])if(!found.has(must))return false;
  if(!changes.every(c=>gm501Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
  const gm=found.get('server-game/current/app.js');
  const html=found.get('server-game/current/GMWW.html');
  const village=found.get('assets/village/village.mjs');
  const ui=found.get('server-game/src/30-village-and-setup.part');
  const css=found.get('server-game/current/style.css');
  if(![gm,html,village,ui,css].every(c=>c?.status==='M'&&typeof c.before==='string'&&typeof c.after==='string'))return false;
  const version=s=>s.match(/const VERSION='([^']+)'/)?.[1]||'';
  if(!version(gm.before)||version(gm.before)!==version(gm.after))return false;
  if(!gm.after.includes("gmwwSetupFreeBattleIcons();")||
     !ui.after.includes("const GMWW_BATTLE_ICON_POSITIONS='gmww_battle_free_icons_v1'")||
     !css.after.includes('#battleFactionStatsFloat.gmww-free-icon')||
     !village.after.includes("flag.textContent='🚩'")||
     !['🌈','🏖️','⛱️','🐦‍🔥'].every(icon=>html.after.includes(icon)))return false;
  // Disallow release title/version changes or a new player/GM API contract.
  if((html.before.match(/<title>[^<]+<\/title>/)||[])[0]!==
     (html.after.match(/<title>[^<]+<\/title>/)||[])[0])return false;
  return true;
}

// V3.223 release gate for approved PR #501. This is NOT a generic version
// exemption: only the exact UI patch, release machinery and version 3.223 -> 3.224
// qualify; unrelated gameplay, native, or Worker changes always select full.
const gm501ReleasePaths=new Set([
  ...gm501Paths,
  'src/index.js',
  'package.json',
  'package-lock.json',
  'server-game/src/00-core-and-library.part',
  '.github/scripts/prepare-update-channel.mjs',
  '.github/workflows/deploy-production.yml',
  'docs/releases/GMWW-V3.224-five-floating-icons-20261025.md'
]);
function isGMIcons501ReleaseScope(changes){
  if(!Array.isArray(changes)||!changes.length)return false;
  if(!changes.every(c=>gm501ReleasePaths.has(c.path)&&['A','M'].includes(c.status)))return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  for(const name of [
    'assets/village/village.mjs','server-game/current/GMWW.html',
    'server-game/current/app.js','server-game/current/style.css',
    'server-game/src/00-core-and-library.part',
    'server-game/src/30-village-and-setup.part',
    'server-game/src/40-battle-and-timeline.part',
    '.github/scripts/prepare-update-channel.mjs',
    'src/index.js','package.json','package-lock.json',
    'tests/gm-free-floating-shortcuts-20261025.test.mjs',
    'tests/gm-free-floating-shortcuts-iphone-webkit.mjs',
    '.github/workflows/check-gm-free-icons-501.yml',
    'docs/releases/GMWW-V3.224-five-floating-icons-20261025.md'
  ])if(!by.has(name))return false;
  const before=(p)=>String(by.get(p)?.before||'');
  const after=(p)=>String(by.get(p)?.after||'');
  if(!before('server-game/current/app.js').includes("const VERSION='3.223'")||
     !after('server-game/current/app.js').includes("const VERSION='3.224'")||
     !before('server-game/src/00-core-and-library.part').includes("const VERSION='3.223'")||
     !after('server-game/src/00-core-and-library.part').includes("const VERSION='3.224'")||
     !before('src/index.js').includes('VERSION="V3.223"')||
     !after('src/index.js').includes('VERSION="V3.224"')||
     !after('src/index.js').includes('UPDATE_CHANNEL_REV="runtime-3224"')||
     !before('package.json').includes('"version": "3.223.0"')||
     !after('package.json').includes('"version": "3.224.0"')||
     !after('package-lock.json').includes('"version": "3.224.0"')||
     !before('server-game/current/GMWW.html').includes('<title>GMWW V3.223</title>')||
     !after('server-game/current/GMWW.html').includes('<title>GMWW V3.224</title>'))return false;
  // These are the only new runtime behavior and OTA manifest notes.
  if(!after('server-game/current/app.js').includes('gmwwSetupFreeBattleIcons();')||
     !after('server-game/src/30-village-and-setup.part').includes("GMWW_BATTLE_ICON_POSITIONS='gmww_battle_free_icons_v1'")||
     !after('assets/village/village.mjs').includes("flag.textContent='🚩'")||
     !['🌈','🏖️','⛱️','🐦‍🔥'].every(e=>after('server-game/current/GMWW.html').includes(e))||
     !after('.github/scripts/prepare-update-channel.mjs').includes('releaseNotes:["V3.224:')||
     !after('docs/releases/GMWW-V3.224-five-floating-icons-20261025.md').includes('Rollback V3.223'))return false;
  return true;
}

// Exact owner-approved V3.225 GM Icon/UI repair. Fail closed on other files.
const actionIcon3225Files=new Set([
 'server-game/current/action-icon-library.js','server-game/current/GMWW.html',
 'server-game/current/style.css','server-game/current/app.js',
 'server-game/src/00-core-and-library.part','server-game/src/40-battle-and-timeline.part',
 'src/index.js','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'tests/gmww-action-icons-in-battle.test.mjs',
 'tests/action-icon-library.test.mjs',
 'docs/releases/GMWW-V3.225-active-icon-drag-20261025.md'
]);
function isActionIcon3225Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const map=new Map(changes.map(x=>[x.path,x]));
 for(const path of ['server-game/current/action-icon-library.js','server-game/current/GMWW.html',
  'server-game/current/style.css','server-game/current/app.js',
  'server-game/src/40-battle-and-timeline.part','src/index.js','package.json',
  'tests/gmww-action-icons-in-battle.test.mjs',
  'docs/releases/GMWW-V3.225-active-icon-drag-20261025.md'])
  if(!map.has(path))return false;
 if(!changes.every(x=>['A','M'].includes(x.status)&&actionIcon3225Files.has(x.path)))return false;
 const pkg=map.get('package.json')?.after||'';
 const worker=map.get('src/index.js')?.after||'';
 const app=map.get('server-game/current/app.js')?.after||'';
 const html=map.get('server-game/current/GMWW.html')?.after||'';
 const icon=map.get('server-game/current/action-icon-library.js')?.after||'';
 const battle=map.get('server-game/src/40-battle-and-timeline.part')?.after||'';
 return pkg.includes('"version": "3.225.0"')&&worker.includes('VERSION="V3.225"')&&
  app.includes("const VERSION='3.225'")&&html.includes('<title>GMWW V3.225</title>')&&
  html.indexOf('src="action-icon-library.js')<html.indexOf('src="app.js')&&
  icon.includes('function resolveActionIcons(actionId)')&&
  battle.includes('const waiting=!!(battleState.busy||battleState.syncPending)')&&
  battle.includes('target=moved&&aAtDrop?.targetCount>0?battleIconTargetAt(e.clientX,e.clientY,aAtDrop):null');
}

// V3.226: production bug fix limited to Icon dock z-index above immersive village.
// Exact version and artifacts required; any unrelated paths fall back to full CI.
const fireIcons3226Files=new Set([
 'server-game/current/style.css','server-game/current/GMWW.html',
 'server-game/current/app.js','server-game/src/00-core-and-library.part',
 'src/index.js','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'tests/gmww-action-icon-stacking.test.mjs','tests/gmww-action-icons-in-battle.test.mjs',
 'docs/releases/GMWW-V3.226-fire-icon-visibility-20261025.md'
]);
function isFireIcons3226Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const map=new Map(changes.map(x=>[x.path,x]));
 for(const name of ['server-game/current/style.css','server-game/current/GMWW.html',
  'src/index.js','package.json','tests/gmww-action-icon-stacking.test.mjs',
  'docs/releases/GMWW-V3.226-fire-icon-visibility-20261025.md'])
  if(!map.has(name))return false;
 if(!changes.every(x=>['A','M'].includes(x.status)&&fireIcons3226Files.has(x.path)))return false;
 const css=map.get('server-game/current/style.css')?.after||'';
 const html=map.get('server-game/current/GMWW.html')?.after||'';
 const pkg=map.get('package.json')?.after||'';
 const worker=map.get('src/index.js')?.after||'';
 return css.includes('z-index:1200;max-width:min(74vw,330px)')&&
  css.includes('body.play-immersive #start.play-page.active')&&
  html.includes('<title>GMWW V3.226</title>')&&
  html.includes('style.css?v=v3226-fire-icons-visible')&&
  worker.includes('VERSION="V3.226"')&&pkg.includes('"version": "3.226.0"');
}

// V3.227: only the owner-approved six Icon Action V2 requirements and 49 independent assets.
// Any game-rule, Player Web, room or native file makes this fall back to the full CI.
const iconV2Files3227=new Set([
 '.github/scripts/prepare-update-channel.mjs',
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/prepare-runtime-v3202-candidate.yml',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml',
 '.github/workflows/build-gmww-icon-action-v2.yml',
 'tools/icons/build-action-v2-assets.py',
 'server-game/current/style.css','server-game/current/action-icon-library.js',
 'server-game/current/GMWW.html','server-game/current/app.js',
 'server-game/src/00-core-and-library.part','server-game/src/40-battle-and-timeline.part',
 'src/index.js','package.json','package-lock.json',
 'tests/gmww-action-icons-in-battle.test.mjs',
 'tests/gmww-action-icon-stacking.test.mjs',
 'tests/action-icon-library.test.mjs',
 'docs/releases/GMWW-V3.227-icon-action-v2-20261025.md'
]);
function isV2Art3227(path){
 if(path==='assets/action-icons/v2/manifest.json')return true;
 if(path.startsWith('assets/action-icons/v2/'))
  return /^[0-9]{2}_[a-z_]+\.(png|svg)$/.test(path.slice('assets/action-icons/v2/'.length));
 if(path.startsWith('server-game/current/action-icons/v2/'))
  return /^[0-9]{2}_[a-z_]+\.png$/.test(path.slice('server-game/current/action-icons/v2/'.length));
 return false;
}
function isIconActionV23227Scope(changes){
 if(!Array.isArray(changes)||changes.length<155)return false;
 const byPath=new Map(changes.map(x=>[x.path,x]));
 const required=['package.json','src/index.js','server-game/current/app.js',
  'server-game/src/40-battle-and-timeline.part','server-game/current/style.css',
  'server-game/current/action-icon-library.js','server-game/current/GMWW.html',
  'assets/action-icons/v2/manifest.json','tests/gmww-action-icons-in-battle.test.mjs',
  'docs/releases/GMWW-V3.227-icon-action-v2-20261025.md'];
 if(!required.every(x=>byPath.has(x)))return false;
 if(!changes.every(x=>['A','M'].includes(x.status)&&(iconV2Files3227.has(x.path)||isV2Art3227(x.path))))return false;
 const arr=changes.map(x=>x.path);
 if(arr.filter(p=>p.startsWith('assets/action-icons/v2/')&&p.endsWith('.png')).length!==49)return false;
 if(arr.filter(p=>p.startsWith('assets/action-icons/v2/')&&p.endsWith('.svg')).length!==49)return false;
 if(arr.filter(p=>p.startsWith('server-game/current/action-icons/v2/')&&p.endsWith('.png')).length!==49)return false;
 const pkg=byPath.get('package.json')?.after||'',worker=byPath.get('src/index.js')?.after||'',
   app=byPath.get('server-game/current/app.js')?.after||'',html=byPath.get('server-game/current/GMWW.html')?.after||'',
   icon=byPath.get('server-game/current/action-icon-library.js')?.after||'',
   css=byPath.get('server-game/current/style.css')?.after||'';
 return pkg.includes('"version": "3.227.0"')&&worker.includes('VERSION="V3.227"')&&
  app.includes("const VERSION='3.227'")&&html.includes('<title>GMWW V3.227</title>')&&
  icon.includes("'action-icons/v2/'")&&css.includes('GMWW Icon Action V2');
}

// The approved 3.227 Runtime is already in Production. This narrowly scoped
// CI repair fixes a stale V2 icon path and harmless source whitespace only.
// Any game code / asset PNG change falls back to complete safety gates.
function isIconV2CIRepairScope(changes){
 const allow=new Set([
  'tests/gmww-action-icons-in-battle.test.mjs',
  'assets/action-icons/v2/01_soi_xet.svg',
  'assets/action-icons/v2/manifest.json',
  'docs/releases/GMWW-V3.227-icon-action-v2-20261025.md',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-dual-renderer.yml'
 ]);
 if(!Array.isArray(changes)||changes.length!==allow.size)return false;
 if(!changes.every(x=>x.status==='M'&&allow.has(x.path)))return false;
 const paths=new Map(changes.map(x=>[x.path,x.after]));
 if(paths.size!==allow.size)return false;
 const t=paths.get('tests/gmww-action-icons-in-battle.test.mjs')||'';
 const svg=paths.get('assets/action-icons/v2/01_soi_xet.svg')||'';
 const notes=paths.get('docs/releases/GMWW-V3.227-icon-action-v2-20261025.md')||'';
 if(!t.includes('action-icons')||!t.includes('v2')||t.includes('sea-v1\\/01_soi_xet'))return false;
 if(svg.split('\n').some(x=>/[ \t]+$/.test(x))||notes.split('\n').some(x=>/[ \t]+$/.test(x)))return false;
 try{
  const m=JSON.parse(paths.get('assets/action-icons/v2/manifest.json')||'null');
  const icon=m?.icons?.find(x=>x.svg==='01_soi_xet.svg');
  if(m?.count!==49||m.icons.length!==49||icon?.sha256_svg!=='3d74accb407aa6344fe787e588e89e4c2da12f88e378a81cd574e8df29d52e29')return false;
 }catch(_){return false}
 return (paths.get('.github/workflows/check-player-web.yml')||'').includes("'icon-v2-ci-fix'") &&
  (paths.get('.github/workflows/deploy-production.yml')||'').includes('ICON_V2_CI_HOTFIX');
}


/* V3.228: chỉ cho phép bộ file chống ghi DO và giao diện công cụ tương ứng. */
function isDOOptimizer3228Scope(changes){
  if(!Array.isArray(changes)||!changes.length)return false;
  const allowed=new Set([
    'src/index.js','src/gmww-do-write-optimizer.js',
    'server-game/src/00-core-and-library.part','server-game/src/20-members-and-roster.part',
    'server-game/current/app.js','server-game/current/GMWW.html',
    'package.json','package-lock.json','tests/do-write-optimizer.test.mjs',
    'docs/releases/GMWW-V3.228-do-write-optimizer-20261026.md',
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
  ]);
  const files=new Map(changes.map(x=>[x.path,x]));
  if(changes.some(x=>!allowed.has(x.path)||!['A','M'].includes(x.status)))return false;
  const required=['src/index.js','src/gmww-do-write-optimizer.js',
    'server-game/current/app.js','server-game/current/GMWW.html','tests/do-write-optimizer.test.mjs'];
  if(!required.every(x=>files.has(x)))return false;
  return (files.get('src/index.js').after||'').includes('shouldSkipMemberHeartbeat')&&
    (files.get('src/index.js').after||'').includes('VERSION="V3.228"')&&
    (files.get('server-game/current/GMWW.html').after||'').includes('id="settingsOptimizeDO"')&&
    (files.get('server-game/current/app.js').after||'').includes("const VERSION='3.228'")&&
    (files.get('tests/do-write-optimizer.test.mjs').after||'').includes('shouldSkipDirectoryHeartbeat');
}

// V3.229: the owner's four corrections to battle icons and fixed bottom rail only.
// Fail closed if anything outside this explicit Runtime/UI/test subset changed.
const gm3229Files=new Set([
 'server-game/current/app.js','server-game/src/30-village-and-setup.part',
 'server-game/src/40-battle-and-timeline.part','server-game/src/00-core-and-library.part',
 'server-game/current/style.css','server-game/current/GMWW.html',
 'src/index.js','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/deploy-production.yml','.github/workflows/prepare-runtime-v3202-candidate.yml',
 'tests/gmww-v3228-battle-icons-footer.test.mjs',
 'tests/gmww-action-icon-stacking.test.mjs',
 'tests/gm-free-floating-shortcuts-20261025.test.mjs',
 'docs/releases/GMWW-V3.229-battle-icon-footer-20261026.md'
]);
function isGMFooter3229Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const map=new Map(changes.map(x=>[x.path,x]));
 for(const path of ['server-game/current/app.js','server-game/current/style.css',
  'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
  'server-game/current/GMWW.html','src/index.js','package.json',
  'tests/gmww-v3228-battle-icons-footer.test.mjs',
  'docs/releases/GMWW-V3.229-battle-icon-footer-20261026.md'])
  if(!map.has(path))return false;
 if(!changes.every(x=>gm3229Files.has(x.path)&&['A','M'].includes(x.status)))return false;
 const pkg=map.get('package.json')?.after||'';
 const worker=map.get('src/index.js')?.after||'';
 const app=map.get('server-game/current/app.js')?.after||'';
 const html=map.get('server-game/current/GMWW.html')?.after||'';
 const css=map.get('server-game/current/style.css')?.after||'';
 return pkg.includes('"version": "3.229.0"')&&worker.includes('VERSION="V3.229"')&&
  app.includes("const VERSION='3.229'")&&html.includes('<title>GMWW V3.229</title>')&&
  app.includes('battleIconSpawnPoint')&&app.includes('battleMainActionSlot')&&
  css.includes('/* GMWW V3.229');
}


/* V3.230: giao diện thông báo bảo trì, chỉ kiểm tra các file có liên quan. */
function isMaintenanceNotice3230Scope(changes){
  if(!Array.isArray(changes)||changes.length===0)return false;
  const allowed=new Set([
    'src/index.js','server-game/current/GMWW.html','server-game/current/app.js',
    'server-game/current/style.css','server-game/src/00-core-and-library.part',
    'server-game/src/10-library-and-settings.part','server-game/src/20-members-and-roster.part',
    'package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
    'docs/releases/GMWW-V3.230-settings-notices-20261026.md',
    'tests/settings-unified-notices-v3230.test.mjs'
  ]);
  if(changes.some(x=>!allowed.has(x.path)||!['A','M'].includes(x.status)))return false;
  const data=new Map(changes.map(x=>[x.path,x.after||'']));
  return ['src/index.js','server-game/current/GMWW.html','server-game/current/app.js',
    'server-game/current/style.css','server-game/src/20-members-and-roster.part',
    'tests/settings-unified-notices-v3230.test.mjs'].every(x=>data.has(x))&&
    data.get('src/index.js').includes('VERSION="V3.230"')&&
    data.get('server-game/current/app.js').includes("const VERSION='3.230'")&&
    data.get('server-game/current/GMWW.html').includes('id="settingsNoticePanel"')&&
    data.get('tests/settings-unified-notices-v3230.test.mjs').includes('Thông báo hiển thị an toàn');
}

// V3.231: small, verified GM-only visual change; exclude unrelated Seat, DEMO, IPA and Card checks.
function isGMEntryIcons3231Scope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const allowed=new Set([
  'server-game/src/40-battle-and-timeline.part','server-game/current/app.js',
  'server-game/current/style.css','server-game/src/00-core-and-library.part',
  'server-game/current/GMWW.html','src/index.js','package.json','package-lock.json',
  '.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  '.github/workflows/check-dual-renderer.yml',
  '.github/workflows/check-gm-free-icons-501.yml',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/build-server-game-ipa.yml',
  'tests/gmww-v3228-battle-icons-footer.test.mjs',
  'tests/gmww-action-icon-stacking.test.mjs',
  'docs/releases/GMWW-V3.231-entrance-icons-20261026.md'
 ]);
 if(changes.some(x=>!allowed.has(x.path)||!['M','A'].includes(x.status)))return false;
 const d=new Map(changes.map(x=>[x.path,x.after||'']));
 const required=['src/index.js','server-game/current/app.js',
   'server-game/src/40-battle-and-timeline.part','server-game/current/style.css',
   'server-game/current/GMWW.html','package.json','package-lock.json',
   'tests/gmww-v3228-battle-icons-footer.test.mjs',
   'docs/releases/GMWW-V3.231-entrance-icons-20261026.md'];
 return required.every(x=>d.has(x))&&
  d.get('src/index.js').includes('VERSION="V3.231"')&&
  d.get('server-game/current/app.js').includes("const VERSION='3.231'")&&
  d.get('package.json').includes('"version": "3.231.0"')&&
  d.get('server-game/current/GMWW.html').includes('<title>GMWW V3.231</title>')&&
  d.get('server-game/current/app.js').includes("const entry=battleIconEntryPoint();")&&
  d.get('server-game/current/style.css').includes('/* V3.231:');
}

/* V3.232: đúng phạm vi Health Check trên iPhone và phát hành Runtime/OTA. */
function isRuntimeWarning3232Scope(changes){
  const allowed=new Set(["server-game/src/10-library-and-settings.part","server-game/src/20-members-and-roster.part","server-game/current/app.js","server-game/src/00-core-and-library.part","server-game/current/GMWW.html","src/index.js","package.json","package-lock.json",".github/scripts/prepare-update-channel.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml","tests/gm-runtime-error-diagnostics.test.mjs","docs/releases/GMWW-V3.232-runtime-warning-20261026.md"]);
  if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
  const by=new Map(changes.map(row=>[row.path,row]));
  if(by.size!==allowed.size||changes.some(row=>!allowed.has(row.path)||!['A','M'].includes(row.status)))return false;
  const required=[
    ['src/index.js','VERSION="V3.232"'],
    ['server-game/current/app.js',"const VERSION='3.232'"],
    ['server-game/current/GMWW.html','<title>GMWW V3.232</title>'],
    ['package.json','"version": "3.232.0"'],
    ['server-game/src/10-library-and-settings.part','GMWW Runtime Warning Diagnostics'],
    ['server-game/src/20-members-and-roster.part','gmwwRecentRuntimeIssues()'],
    ['tests/gm-runtime-error-diagnostics.test.mjs','Tái hiện cảnh báo giả'],
    ['docs/releases/GMWW-V3.232-runtime-warning-20261026.md','Rollback V3.231'],
    ['.github/workflows/check-player-web.yml',"'runtime-warning-3232'"]
  ];
  return required.every(([p,token])=>by.get(p)?.after?.includes(token));
}


/* V3.233 — fail closed on exactly four GM Runtime/UI fixes and safety metadata. */
function isGM3233AudioUICIScope(changes){
 const allowed=new Set([
  'server-game/src/00-core-and-library.part','server-game/src/10-library-and-settings.part',
  'server-game/src/30-village-and-setup.part','server-game/current/app.js',
  'server-game/current/GMWW.html','server-game/current/style.css',
  'src/index.js','package.json','package-lock.json',
  '.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  'tests/gmww-v3233-audio-templates-dock.test.mjs',
  'docs/releases/GMWW-V3.233-audio-templates-footer-20261026.md'
 ]);
 const by=new Map(changes.map(item=>[item.path,item]));
 if(changes.length!==allowed.size||by.size!==allowed.size)return false;
 if(changes.some(item=>!allowed.has(item.path)||!['A','M'].includes(item.status)))return false;
 const required=[
  ['src/index.js','VERSION="V3.233"'],
  ['server-game/current/app.js',"const VERSION='3.233'"],
  ['server-game/src/10-library-and-settings.part',"$('[data-system-sound-slot]').forEach"],
  ['server-game/src/30-village-and-setup.part','V3.233: five exclusive slots'],
  ['server-game/current/GMWW.html','play-template-actions-row'],
  ['server-game/current/style.css','GMWW V3.233: Cloudflare two-line'],
  ['package.json','"version": "3.233.0"'],
  ['tests/gmww-v3233-audio-templates-dock.test.mjs','iPhone: Thư viện Audio'],
  ['docs/releases/GMWW-V3.233-audio-templates-footer-20261026.md','Rollback'],
  ['.github/workflows/check-player-web.yml',"'gm-ui-audio-3233'"],
  ['.github/workflows/deploy-production.yml','gm_ui_audio_3233']
 ];
 return required.every(([p,token])=>by.get(p)?.after?.includes(token));
}

/* V3.234 — fail closed: only phase-specific GM UI, five-row gallows and mandatory OTA metadata. */
function isPhaseDockGallows3234Scope(changes){
 const allowed=new Set(["server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/current/app.js","server-game/current/style.css","server-game/current/GMWW.html","src/index.js","package.json","package-lock.json",".github/scripts/prepare-update-channel.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-gallows-redesign.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/check-gm-free-icons-501.yml","tests/gmww-v3233-audio-templates-dock.test.mjs","tests/gmww-v3234-phase-dock-gallows.test.mjs","docs/releases/GMWW-V3.234-night-day-dock-gallows-20261026.md"]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['A','M'].includes(x.status)))return false;
 const required=[
  ['src/index.js','VERSION="V3.234"'],['server-game/current/app.js',"const VERSION='3.234'"],
  ['server-game/src/40-battle-and-timeline.part','function battleSyncPhaseDock(phase,visible)'],
  ['server-game/current/style.css','V3.234 — Đêm:'],
  ['tests/gmww-v3234-phase-dock-gallows.test.mjs','Gallows keeps all eligible members'],
  ['package.json','"version": "3.234.0"'],
  ['docs/releases/GMWW-V3.234-night-day-dock-gallows-20261026.md','rollback'],
  ['.github/workflows/check-player-web.yml',"'phase-dock-gallows-3234'"]
 ];
 return required.every(([path,token])=>by.get(path)?.after?.includes(token));
}

/* V3.234 post-merge: only repair the main push-scope, with exact four-file CI notes. */
function isGM3234PostMergeReleaseGateScope(changes){
 const allowed=new Set([
  '.github/scripts/ci-browser-scope.mjs','tests/ci-browser-scope.test.mjs',
  '.github/workflows/check-player-web.yml',
  'docs/releases/GMWW-V3.234-night-day-dock-gallows-20261026.md'
 ]);
 if(!Array.isArray(changes)||changes.length!==4)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==4||changes.some(x=>!allowed.has(x.path)||x.status!=='M'))return false;
 if(JSON.parse(fs.readFileSync('package.json','utf8')).version!=='3.234.0')return false;
 if(!fs.readFileSync('server-game/current/app.js','utf8').includes("const VERSION='3.234'"))return false;
 const required=[
  ['.github/scripts/ci-browser-scope.mjs','isGM3234PostMergeReleaseGateScope(changes)'],
  ['tests/ci-browser-scope.test.mjs','V3.234 post-merge push CI is scoped'],
  ['.github/workflows/check-player-web.yml','tests/ci-browser-scope.test.mjs'],
  ['docs/releases/GMWW-V3.234-night-day-dock-gallows-20261026.md','CI hậu merge V3.234']
 ];
 return required.every(([path,token])=>by.get(path)?.after?.includes(token));
}

/* V3.235 — fail-closed, precisely scoped GM presentation-only dock / tools. */
function isGM235GlassDockScope(changes){
 const allowed=new Set([
  '.github/scripts/ci-browser-scope.mjs','.github/scripts/prepare-update-channel.mjs',
  '.github/workflows/check-gallows-redesign.yml','.github/workflows/check-gm-free-icons-501.yml',
  '.github/workflows/check-dual-renderer.yml','.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  '.github/workflows/check-player-web.yml',
  'docs/releases/GMWW-V3.235-ui-glass-dock-20261026.md',
  'package-lock.json','package.json',
  'server-game/current/GMWW.html','server-game/current/app.js','server-game/current/style.css',
  'server-game/src/00-core-and-library.part','server-game/src/20-members-and-roster.part',
  'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
  'src/index.js','tests/ci-browser-scope.test.mjs',
  'tests/gmww-v3233-audio-templates-dock.test.mjs',
  'tests/gmww-v3234-phase-dock-gallows.test.mjs',
  'tests/gmww-v3235-unified-glass-dock.test.mjs'
 ]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['M','A'].includes(x.status)))return false;
 const required=[
  ['src/index.js','VERSION="V3.235"'],
  ['server-game/current/app.js',"const VERSION='3.235'"],
  ['server-game/current/style.css','V3.235 unified GM'],
  ['server-game/current/GMWW.html','gmww-cloudflare-label">CLOUDFLARE</b>'],
  ['tests/gmww-v3235-unified-glass-dock.test.mjs','V3.235: five daytime text controls'],
  ['docs/releases/GMWW-V3.235-ui-glass-dock-20261026.md','Rollback'],
  ['.github/workflows/check-player-web.yml',"'gm-ui-glass-3235'"],
  ['package.json','"version": "3.235.0"']
 ];
 return required.every(([p,token])=>by.get(p)?.after?.includes(token));
}


/* V3.236: fail closed to exactly approved campfire-menu and gallows vote change set. */
function isGM236CampfireGallowsScope(changes){
 const allowed=new Set([".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","docs/releases/GMWW-V3.236-menu-gallows-20261026.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/gmww-gallows-rules.js","src/gmww-members-live.js","src/index.js","src/player-web-src/30-rooms-and-realtime.part","tests/ci-browser-scope.test.mjs","tests/gallows-panel-60s-controls.test.mjs","tests/gmww-v3236-menu-gallows.test.mjs"]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['M','A'].includes(x.status)))return false;
 const expected=[
  ['src/index.js','VERSION="V3.236"'],
  ['server-game/current/app.js',"const VERSION='3.236'"],
  ['server-game/current/GMWW.html','id="battleGMChromeToggle"'],
  ['server-game/current/style.css','GMWW V3.236'],
  ['src/gmww-gallows-rules.js',"outcome:'no_lynch'"],
  ['src/player-web-src/30-rooms-and-realtime.part',"'no_lynch'"],
  ['tests/gmww-v3236-menu-gallows.test.mjs','V3.236 tied nomination'],
  ['docs/releases/GMWW-V3.236-menu-gallows-20261026.md','Rollback'],
  ['package.json','"version": "3.236.0"'],
  ['.github/workflows/check-player-web.yml',"'gm-menu-gallows-3236'"],
  ['.github/workflows/deploy-production.yml',"3.236.0"]
 ];
 return expected.every(([p,token])=>by.get(p)?.after?.includes(token));
}

/* V3.237 — exact UI-only policy, fail-closed on any Core, Player or IPA file. */
function isGM237MenuFooterScope(changes){
 const allowed=new Set([".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/deploy-production.yml","docs/releases/GMWW-V3.237-gm-menu-footer-20261026.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/index.js","tests/ci-browser-scope.test.mjs","tests/gmww-v3237-gm-menu-footer.test.mjs"]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['M','A'].includes(x.status)))return false;
 const required=[
  ['src/index.js','VERSION="V3.237"'],
  ['server-game/current/app.js',"const VERSION='3.237'"],
  ['server-game/current/GMWW.html','id="battleGMChromeToggle"'],
  ['server-game/current/style.css','GMWW V3.237: shared campfire menu'],
  ['tests/gmww-v3237-gm-menu-footer.test.mjs','V3.237 GM hide toggle'],
  ['docs/releases/GMWW-V3.237-gm-menu-footer-20261026.md','Rollback'],
  ['package.json','"version": "3.237.0"'],
  ['.github/workflows/check-player-web.yml',"'gm-ui-menu-3237'"],
  ['.github/workflows/deploy-production.yml',"3.237.0"]
 ];
 return required.every(([p,token])=>by.get(p)?.after?.includes(token));
}


/* V3.238: strictly GM control labels/styles and no Core/IPA/Player Web scope. */
function isGM238UniformMenuScope(changes){
 const allowed=new Set([".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","docs/releases/GMWW-V3.238-uniform-gm-controls-20261026.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/index.js","tests/ci-browser-scope.test.mjs","tests/gmww-v3237-gm-menu-footer.test.mjs","tests/gmww-v3238-uniform-gm-controls.test.mjs"]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['M','A'].includes(x.status)))return false;
 const required=[
  ['src/index.js','VERSION="V3.238"'],
  ['server-game/current/app.js',"const VERSION='3.238'"],
  ['server-game/current/GMWW.html','id="battleGMChromeToggle"'],
  ['server-game/current/style.css','V3.238 — every GM control'],
  ['tests/gmww-v3238-uniform-gm-controls.test.mjs','V3.238 all GM buttons'],
  ['docs/releases/GMWW-V3.238-uniform-gm-controls-20261026.md','Rollback'],
  ['package.json','"version": "3.238.0"'],
  ['.github/workflows/check-player-web.yml',"'gm-ui-controls-3238'"],
  ['.github/workflows/deploy-production.yml',"3.238.0"]
 ];
 return required.every(([p,t])=>by.get(p)?.after?.includes(t));
}

/* V3.238 deploy-only recovery — no Runtime, Player Web, IPA or Core changes. */
function isGM238DeployGateRecovery(changes){
 if(Array.isArray(changes)&&changes.length===3){
  const required=['.github/workflows/deploy-production.yml','.github/scripts/ci-browser-scope.mjs','tests/ci-browser-scope.test.mjs'];
  const by=new Map(changes.map(x=>[x.path,x]));
  if(by.size===3&&required.every(p=>by.get(p)?.status==='M')&&
     by.get('.github/workflows/deploy-production.yml')?.after?.includes('V3.238 recovery:')&&
     by.get('tests/ci-browser-scope.test.mjs')?.after?.includes('V3.238 workflow revalidation'))return true;
 }
 const allowed=new Set(['.github/workflows/deploy-production.yml','.github/workflows/check-player-web.yml','.github/workflows/check-dual-renderer.yml','.github/workflows/build-server-game-ipa.yml','.github/scripts/ci-browser-scope.mjs','tests/ci-browser-scope.test.mjs']);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||x.status!=='M'))return false;
 return by.get('.github/workflows/deploy-production.yml')?.after?.includes('V3.238 emergency:') &&
  by.get('.github/workflows/check-player-web.yml')?.after?.includes("'gm238-deploy-repair'") &&
  by.get('tests/ci-browser-scope.test.mjs')?.after?.includes('V3.238 deployment hotfix');
}
/* ART-01: exact Worker opening-turn contract; unrelated files and gameplay
 * changes fall back to full checks. No Chrome Card/Seat/IPA/3D tests. */
function isART01NightFlowScope(changes){
 const allowed=new Set([
  'src/index.js','src/gmww-game-scene-rules.js','src/gmww-night-turn-rules.js',
  'tests/artifact-priority-first.test.mjs','tests/v389-night-runtime-integration.test.mjs',
  'docs/releases/GMWW-ART-01-early-artifact-night-flow-20261026.md',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
 ]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['M','A'].includes(x.status)))return false;
 const worker=by.get('src/index.js');
 const strippedBefore=outsideScope(worker?.before,'  async buildNightRuntime(meta,night){','  async artifactUsedInNight(meta,step){');
 const strippedAfter=outsideScope(worker?.after,'  async buildNightRuntime(meta,night){','  async artifactUsedInNight(meta,step){');
 if(strippedBefore===null||strippedAfter===null||strippedBefore!==strippedAfter)return false;
 return by.get('src/index.js')?.after?.includes('ART-01: Night 1 always opens the Artifact stage') &&
  by.get('src/gmww-game-scene-rules.js')?.after?.includes('ART-01: Night 1 starts with the Artifact stage') &&
  by.get('src/gmww-night-turn-rules.js')?.after?.includes('ART-01 opening before Wolves') &&
  by.get('tests/artifact-priority-first.test.mjs')?.after?.includes('ART-01 first-night Artifact stage') &&
  by.get('tests/v389-night-runtime-integration.test.mjs')?.after?.includes('ART-01 skip from night two') &&
  by.get('docs/releases/GMWW-ART-01-early-artifact-night-flow-20261026.md')?.after?.includes('Rollback') &&
  by.get('.github/workflows/check-player-web.yml')?.after?.includes("'art01-night-flow'");
}
/* ART-01 server-only deployment gate: exactly scoped release-policy repair.
 * No new gameplay, UI, native, or runtime content is authorized here. */
function isART01DeployGateScope(changes){
 const allowed=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  'tests/art01-deployment-gate.test.mjs'
 ]);
 if(!Array.isArray(changes)||changes.length!==4)return false;
 const by=new Map(changes.map(c=>[c.path,c]));
 if(by.size!==4||changes.some(c=>!allowed.has(c.path)||c.status!==(c.path.startsWith('tests/')?'A':'M')))return false;
 return by.get('.github/workflows/deploy-production.yml')?.after?.includes('ART-01 server-only deployment gate') &&
  by.get('.github/workflows/check-player-web.yml')?.after?.includes("'art01-deploy-gate'") &&
  by.get('tests/art01-deployment-gate.test.mjs')?.after?.includes('ART-01 release gate focused') &&
  by.get('.github/scripts/ci-browser-scope.mjs')?.after?.includes('isART01DeployGateScope');
}
// PR #532: the ONLY gameplay changes permitted here are post-match room reset
// and GM's local selection reconciliation. All unrelated code still runs full CI.
const postMatch532Paths=new Set([
  'src/index.js',
  'server-game/src/30-village-and-setup.part',
  'server-game/src/50-roles-and-artifacts.part',
  'server-game/current/app.js',
  'tests/post-match-room-cleanup.test.mjs',
  'docs/releases/post-match-room-demo-seat-20261026.md'
]);
function isPostMatch532Scope(changes){
  if(!Array.isArray(changes)||changes.length!==postMatch532Paths.size)return false;
  const by=new Map(changes.map(x=>[x.path,x]));
  if(by.size!==postMatch532Paths.size||
     changes.some(x=>!postMatch532Paths.has(x.path)||
        x.status!==(x.path.startsWith('tests/')||x.path.startsWith('docs/')?'A':'M')))return false;
  const boundaries={
    'src/index.js':[
      ['  async gmReset(request,body){','  async gmEnd(request,body){']
    ],
    'server-game/src/30-village-and-setup.part':[
      ['async function selectPlayExistingRoom(r){','function renderPlayCreatedRooms(){'],
      ['async function flushPlayRoomMode(){','function bindPlayRoomModeButtons(){']
    ],
    'server-game/src/50-roles-and-artifacts.part':[
      ['async function playCompletionNext(choice){','function initPlayCompletion(){']
    ],
    'server-game/current/app.js':[
      ['async function selectPlayExistingRoom(r){','function renderPlayCreatedRooms(){'],
      ['async function flushPlayRoomMode(){','function bindPlayRoomModeButtons(){'],
      ['async function playCompletionNext(choice){','function initPlayCompletion(){']
    ]
  };
  for(const [p,sections] of Object.entries(boundaries)){
    let before=by.get(p)?.before,after=by.get(p)?.after;
    if(typeof before!=='string'||typeof after!=='string')return false;
    for(const [a,b] of sections){
      before=outsideScope(before,a,b);after=outsideScope(after,a,b);
      if(before===null||after===null)return false;
    }
    if(before!==after)return false;
  }
  return by.get('src/index.js').after.includes('["demoLease","demoClock","demoPlan"]') &&
    by.get('server-game/src/30-village-and-setup.part').after.includes('ROOM_MODE_REQUIRES_EMPTY_RESET') &&
    by.get('server-game/src/50-roles-and-artifacts.part').after.includes("transactionId:'completed-leave-'") &&
    by.get('tests/post-match-room-cleanup.test.mjs').after.includes('Hard room reset clears DEMO lease');
}
// CI-only followup: separate PR with exact CI files, never gameplay or IPA.
const postMatchCIOnlyPaths=new Set([
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/check-player-card-browsers.yml',
 '.github/workflows/check-gm-free-icons-501.yml',
 '.github/workflows/check-gallows-redesign.yml',
 '.github/workflows/check-dual-renderer.yml',
 '.github/workflows/build-server-game-ipa.yml',
 'tests/ci-browser-scope.test.mjs',
 'docs/releases/post-match-ci-scope-20261026.md'
]);
function isPostMatchCIOnlyScope(changes){
 const by=new Map((changes||[]).map(x=>[x.path,x]));
 return by.size===postMatchCIOnlyPaths.size&&
  changes.length===postMatchCIOnlyPaths.size&&
  changes.every(x=>postMatchCIOnlyPaths.has(x.path)&&
    x.status===(x.path.startsWith('docs/')?'A':'M'))&&
  by.get('tests/ci-browser-scope.test.mjs')?.after?.includes('PR532 scoped CI selector');
}

/* WOLF-01: exact privacy-preserving Wolf recognition and runtime V3.239 scope.
 * Unknown paths fail closed into the standard CI gate. */
function isWOLF01Scope(changes){
 const allowed=new Set([
 'src/index.js','src/gmww-wolf-recognition.js',
 'src/player-web-src/20-village-and-profile.part','src/player-web-src/30-rooms-and-realtime.part',
 'src/gmww-members-live.js','tests/v389-night-runtime-integration.test.mjs',
 'tests/wolf01-private-pack-recognition.test.mjs',
 'server-game/src/00-core-and-library.part','server-game/current/app.js',
 'server-game/current/GMWW.html','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs',
 'docs/releases/GMWW-V3.239-wolf01-recognition-20261026.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
 ]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(c=>[c.path,c]));
 if(by.size!==allowed.size||changes.some(c=>!allowed.has(c.path)||!['M','A'].includes(c.status)))return false;
 const has=(path,needle)=>by.get(path)?.after?.includes(needle);
 return has('src/index.js','WOLF-01: one waking turn only when at least two living wolves') &&
  has('src/gmww-wolf-recognition.js','privateWolfRecognition') &&
  has('src/player-web-src/20-village-and-profile.part','wolfLabel=wolfView') &&
  has('src/player-web-src/30-rooms-and-realtime.part','setPrivateWolfRecognition(null)') &&
  has('src/gmww-members-live.js','wolfRecognition') &&
  has('tests/wolf01-private-pack-recognition.test.mjs','WOLF-01') &&
  has('server-game/src/00-core-and-library.part',"const VERSION='3.239'") &&
  has('server-game/current/app.js',"const VERSION='3.239'") &&
  has('server-game/current/GMWW.html','<title>GMWW V3.239</title>') &&
  has('package.json','"version": "3.239.0"') &&
  has('package-lock.json','"version": "3.239.0"') &&
  has('.github/scripts/prepare-update-channel.mjs','V3.239 WOLF-01:') &&
  has('docs/releases/GMWW-V3.239-wolf01-recognition-20261026.md','Rollback') &&
  has('.github/workflows/check-player-web.yml',"'wolf01-private-pack'");
}
/* WITCH-01: exact approved Old Witch rules, GM runtime & release gates. */
function isWITCH01Scope(changes){
 const allowed=new Set(["src/index.js","src/gmww-old-witch-rules.js","src/gmww-battle-action-policy.js","server-game/current/battle-controls.js","server-game/src/40-battle-and-timeline.part","server-game/src/00-core-and-library.part","server-game/current/app.js","server-game/current/GMWW.html","tests/witch01-old-witch-rules.test.mjs","tests/v389-night-runtime-integration.test.mjs","package.json","package-lock.json",".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-V3.240-witch01-old-witch-20261026.md",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml"]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(row=>[row.path,row]));
 if(by.size!==allowed.size||changes.some(row=>!allowed.has(row.path)||!['A','M'].includes(row.status)))return false;
 const has=(path,token)=>by.get(path)?.after?.includes(token);
 return has('src/index.js','WITCH-01: every Old Witch owner wakes') &&
  has('src/gmww-old-witch-rules.js','oldWitchActionCheck') &&
  has('src/gmww-battle-action-policy.js',"role==='role_old_witch'||") &&
  has('server-game/current/battle-controls.js','oldWitchReviveEligible') &&
  has('server-game/src/40-battle-and-timeline.part','WITCH-01: keep the last confirmed target') &&
  has('server-game/src/00-core-and-library.part',"const VERSION='3.240'") &&
  has('server-game/current/app.js',"const VERSION='3.240'") &&
  has('server-game/current/GMWW.html','<title>GMWW V3.240</title>') &&
  has('tests/witch01-old-witch-rules.test.mjs','WITCH-01') &&
  has('tests/v389-night-runtime-integration.test.mjs','WITCH-01 real Durable Object') &&
  has('package.json','"version": "3.240.0"') &&
  has('package-lock.json','"version": "3.240.0"') &&
  has('.github/scripts/prepare-update-channel.mjs','V3.240 WITCH-01:') &&
  has('docs/releases/GMWW-V3.240-witch01-old-witch-20261026.md','Rollback') &&
  has('.github/workflows/check-player-web.yml',"'witch01-old-witch'") &&
  has('.github/workflows/deploy-production.yml','witch240_release');
}

// Exact immutable blobs from the reviewed V3.242 audio/Fairy PR (#542).
// Unknown paths or altered bytes revert to FULL CI. No gameplay waiver.
const fairy3242Blobs=new Map([["server-game/src/40-battle-and-timeline.part","a092f1a78a687992c4f5bda9e0bd618aece496a0"],["server-game/current/app.js","b59fe8d2426d442a006b907685a199140ca15f9b"],["server-game/current/style.css","7b603f65a2ca6ed4f868461ff49084ae99cd997b"],["server-game/src/00-core-and-library.part","25942d9135bc6de9d015b83a256678333809f210"],["server-game/current/GMWW.html","3bce9dc9ff517094b9944545b8111adc6da00b7f"],["src/index.js","62c230327446f73b93f505ba9d1b3301b695f438"],["package.json","a4a481742934b2e830aecac9fbfbe3deec723913"],["package-lock.json","75efc69df029b15c63d212ef41b9303a55b5dee7"],[".github/scripts/prepare-update-channel.mjs","93223f661faf257ce5c9af04a13d4aed7926fa11"],["docs/releases/GMWW-V3.242-icon-audio-fairy-20261027.md","62c15eedb7b88c65a0c9a389bcf441bbfdb32fb8"],["tests/gmww-v3242-icon-audio-fairy.test.mjs","7bec46528baaa16401dac32ef07c635839e1f358"]]);
const fairy3242PolicyPaths=new Set([".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/deploy-production.yml","tests/ci-v3242-fairy-scope.test.mjs","docs/releases/ci-v3242-fairy-scope-20261027.md"]);
const fairy3242GitBlob=body=>createHash('sha1').update('blob '+Buffer.byteLength(body)+'\0').update(body).digest('hex');
export function isFairy3242Scope(changes){
 if(!Array.isArray(changes)||changes.length!==fairy3242Blobs.size)return false;
 const seen=new Set();
 for(const c of changes){
  if(!fairy3242Blobs.has(c.path)||seen.has(c.path)||!['A','M'].includes(c.status)||
     typeof c.after!=='string'||fairy3242GitBlob(c.after)!==fairy3242Blobs.get(c.path))return false;
  seen.add(c.path);
 }
 return seen.size===fairy3242Blobs.size;
}
const fairy3242PolicyRepairPaths=new Set([
 '.github/scripts/ci-browser-scope.mjs',
 'tests/ci-v3242-fairy-scope.test.mjs',
 'docs/releases/ci-v3242-fairy-scope-20261027.md'
]);
export function isFairy3242PolicyScope(changes){
 if(!Array.isArray(changes))return false;
 const paths=changes.length===fairy3242PolicyPaths.size?fairy3242PolicyPaths:
  changes.length===fairy3242PolicyRepairPaths.size?fairy3242PolicyRepairPaths:null;
 return !!paths&&changes.every(c=>paths.has(c.path)&&['A','M'].includes(c.status))&&
  new Set(changes.map(c=>c.path)).size===paths.size;
}


// V3.244: six equal centered timeline stages, scoped GM Runtime patch only.
const timeline244Paths=new Set([
 'server-game/current/style.css','server-game/current/GMWW.html','server-game/current/app.js',
 'server-game/src/00-core-and-library.part','src/index.js','package.json','package-lock.json',
 'tests/lobby-gather-mode-assassin-20261027.test.mjs',
 'docs/releases/GMWW-V3.244-timeline-center-20261027.md',
 '.github/workflows/deploy-production.yml','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml'
]);
export function isTimeline244Scope(changes){
 if(!Array.isArray(changes)||changes.length!==timeline244Paths.size)return false;
 const seen=new Set();
 for(const c of changes){
  if(!timeline244Paths.has(c.path)||seen.has(c.path)||!['A','M'].includes(c.status))return false;
  seen.add(c.path);
 }
 try{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  const gm=fs.readFileSync('server-game/current/app.js','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  const scoped=css.slice(css.indexOf('/* GMWW lobby stage: compact steps'));
  return pkg.version==='3.244.0'&&lock.version==='3.244.0'&&
   html.includes('<title>GMWW V3.244</title>')&&
   (html.match(/data-play-step="/g)||[]).length===6&&
   gm.includes("const VERSION='3.244'")&&worker.includes('VERSION="V3.244"')&&
   scoped.includes('grid-template-columns:repeat(6,minmax(0,1fr))!important')&&
   !scoped.includes('grid-template-columns:repeat(7,minmax(0,1fr))!important')&&
   fs.existsSync('docs/releases/GMWW-V3.244-timeline-center-20261027.md');
 }catch{return false;}
}

// PR541: reviewed GM-only roomless UI, no DO migration or Native IPA changes.
const lobby541Paths=new Set(["server-game/src/00-core-and-library.part","server-game/src/20-members-and-roster.part","server-game/src/30-village-and-setup.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","server-game/current/app.js","server-game/current/GMWW.html","server-game/current/style.css","src/index.js","package.json","package-lock.json","tests/lobby-gather-mode-assassin-20261027.test.mjs","docs/releases/GMWW-LOBBY-GATHER-ASSASSIN-20261027.md","docs/releases/GMWW-V3.243-lobby-gather-assassin-20261027.md",".github/workflows/check-lobby-gather-assassin.yml",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/deploy-production.yml"]);
export function isLobbyGather541Scope(changes){
 if(!Array.isArray(changes)||changes.length<12)return false;
 const paths=new Set(changes.map(c=>c.path));
 const required=['server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part','server-game/current/app.js','server-game/current/GMWW.html','tests/lobby-gather-mode-assassin-20261027.test.mjs','docs/releases/GMWW-V3.243-lobby-gather-assassin-20261027.md','src/index.js','package.json','package-lock.json'];
 if(paths.size!==changes.length||!required.every(p=>paths.has(p)))return false;
 if(!changes.every(c=>lobby541Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 try{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const gm=fs.readFileSync('server-game/current/app.js','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  return pkg.version==='3.243.0'&&html.includes('<title>GMWW V3.243</title>')&&
   gm.includes("const VERSION='3.243'")&&worker.includes('VERSION="V3.243"')&&
   fs.readFileSync('docs/releases/GMWW-V3.243-lobby-gather-assassin-20261027.md','utf8').includes('PR #541')&&
   html.includes('class="play-gather-mode-row"')&&!html.includes('data-play-step="room"');
 }catch{return false;}
}


const playerReceiptHotfixPaths=new Set([
  'src/gmww-player-private-card-patch.js',
  'tests/player-web-receipt-patch-hotfix.test.mjs',
  'tests/player-web-resume-receipt-runtime.test.mjs',
  'docs/releases/GMWW-PLAYER-WEB-RECEIPT-HOTFIX-20261027.md',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/deploy-player-receipt-hotfix.yml'
]);
export function isPlayerReceiptHotfixScope(changes){
  if(!Array.isArray(changes)||changes.length!==playerReceiptHotfixPaths.size)return false;
  const seen=new Set();
  for(const c of changes){
    if(!playerReceiptHotfixPaths.has(c.path)||seen.has(c.path)||!['M','A'].includes(c.status))return false;
    seen.add(c.path);
    if(c.path.startsWith('src/')&&c.status!=='M')return false;
  }
  const p=changes.find(c=>c.path==='src/gmww-player-private-card-patch.js');
  if(!p||typeof p.before!=='string'||typeof p.after!=='string')return false;
  const oldCall="try{const d=await api('/api/rooms/'+state.roomCode+'/me',{headers:auth()});handleSeatSwapRequests(d?.swapRequests);";
  const newCall="try{const d=await api('/api/rooms/'+state.roomCode+'/me',{headers:auth()});";
  const oldChange='replaceReceipt("'+oldCall+'",'+String.fromCharCode(10)+'   "try{const d=await gmwwReadPrivateReceipt();if(!d)return false;handleSeatSwapRequests(d?.swapRequests);");';
  const newChange='replaceReceipt("'+newCall+'",'+String.fromCharCode(10)+'   "try{const d=await gmwwReadPrivateReceipt();if(!d)return false;");';
  const oldChange2='offlineReplace("try{const d=await gmwwReadPrivateReceipt();if(!d)return false;handleSeatSwapRequests(d?.swapRequests);",'+String.fromCharCode(10)+'   "try{const d=await gmwwReadPrivateReceipt();if(!d)return false;if(d?.room)state.room=d.room;state.gallows=d?.gallows||null;renderGallowsWidget();handleSeatSwapRequests(d?.swapRequests);");';
  const newChange2='offlineReplace("if(wolfWakeEpoch===Number(state.wolfWakeEpoch||0))setPrivateWolfRecognition(d?.wolfRecognition,d?.room||state.room);handleSeatSwapRequests(d?.swapRequests);",'+String.fromCharCode(10)+'   "if(wolfWakeEpoch===Number(state.wolfWakeEpoch||0))setPrivateWolfRecognition(d?.wolfRecognition,d?.room||state.room);if(d?.room)state.room=d.room;state.gallows=d?.gallows||null;renderGallowsWidget();handleSeatSwapRequests(d?.swapRequests);");';
  const oldChange3='offlineReplace("else if(d.type===\'room_cycle\'){state.gallows=null;",'+String.fromCharCode(10)+'   "else if(d.type===\'room_cycle\'){gmwwLastGallowsBroadcastAt=Date.now();state.gallows=null;");';
  const newChange3='offlineReplace("else if(d.type===\'room_cycle\'){state.wolfWakeEpoch=Number(state.wolfWakeEpoch||0)+1;setPrivateWolfRecognition(null);state.gallows=null;",'+String.fromCharCode(10)+'   "else if(d.type===\'room_cycle\'){state.wolfWakeEpoch=Number(state.wolfWakeEpoch||0)+1;setPrivateWolfRecognition(null);gmwwLastGallowsBroadcastAt=Date.now();state.gallows=null;");';
  return p.before.includes(oldChange)&&p.before.includes(oldChange2)&&p.before.includes(oldChange3)&&
    p.after===p.before.replace(oldChange,newChange).replace(oldChange2,newChange2).replace(oldChange3,newChange3);
}

/* NIGHT-02 exact approved Core/GM release. Unexpected changed paths
 * fall back to the normal mandatory CI path (fail closed). */
function isNight02Scope(changes){
 const allowed=new Set(["src/gmww-pack-night-rules.js","src/index.js","src/gmww-wolf-night-resolution.js","src/gmww-battle-action-policy.js","server-game/src/00-core-and-library.part","server-game/src/30-village-and-setup.part","server-game/src/40-battle-and-timeline.part","server-game/current/battle-controls.js","server-game/current/app.js","server-game/current/GMWW.html","tests/v389-night-runtime-integration.test.mjs","tests/night02-pack-snow-guard-fairy.test.mjs","package.json","package-lock.json",".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-V3.245-night02-pack-snow-guard-fairy-20261027.md",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml"]);
 if(!Array.isArray(changes)||changes.length!==allowed.size)return false;
 const by=new Map(changes.map(x=>[x.path,x]));
 if(by.size!==allowed.size||changes.some(x=>!allowed.has(x.path)||!['A','M'].includes(x.status)))return false;
 const has=(p,n)=>by.get(p)?.after?.includes(n);
 return has('src/index.js','NIGHT-02: Snow Wolf')&&
  has('src/gmww-pack-night-rules.js','arrangeNightRoles')&&
  has('src/gmww-wolf-night-resolution.js','ALPHA_FROZEN_OR_EXPELLED')&&
  has('src/gmww-battle-action-policy.js','NIGHT-02: a shared Pack Bite')&&
  has('server-game/src/00-core-and-library.part',"const VERSION='3.245'")&&
  has('server-game/src/30-village-and-setup.part',"turn.kind==='wolf-pack-bite'")&&
  has('server-game/src/40-battle-and-timeline.part',"turn?.kind==='wolf-pack-bite'")&&
  has('server-game/current/battle-controls.js','wolf-pack:action_wolf_bite')&&
  has('server-game/current/app.js',"const VERSION='3.245'")&&
  has('server-game/current/GMWW.html','<title>GMWW V3.245</title>')&&
  has('tests/night02-pack-snow-guard-fairy.test.mjs','NIGHT-02')&&
  has('tests/v389-night-runtime-integration.test.mjs','NIGHT-02 real DO')&&
  has('package.json','"version": "3.245.0"')&&
  has('package-lock.json','"version": "3.245.0"')&&
  has('.github/scripts/prepare-update-channel.mjs','V3.245 NIGHT-02:')&&
  has('docs/releases/GMWW-V3.245-night02-pack-snow-guard-fairy-20261027.md','Rollback')&&
  has('.github/workflows/check-player-web.yml',"'night02-pack-roles'")&&
  has('.github/workflows/deploy-production.yml','night245_release');
}
/* V3.246 — restrict CI to the exact user-approved Fairy triptych + audio patch.
   Unknown or expanded diffs fall back to full checks; never silently waive gates. */
const fairy246Paths=new Set(["server-game/src/40-battle-and-timeline.part","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/current/GMWW.html","src/index.js","package.json","package-lock.json",".github/scripts/prepare-update-channel.mjs","tests/gmww-action-icons-in-battle.test.mjs","docs/releases/GMWW-V3.246-fairy-triptych-audio-20261027.md","tests/gmww-v3246-fairy-triptych.test.mjs","server-game/current/action-icons/v3/51_yeu_tinh_three_way.webp","assets/action-icons/v3/51_yeu_tinh_three_way.webp",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/deploy-production.yml",".github/scripts/verify-fairy-triptych-production.mjs",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/check-dual-renderer.yml"]);
export function isFairy246Scope(changes){
 if(!Array.isArray(changes)||changes.length!==fairy246Paths.size)return false;
 const actual=new Set(changes.map(c=>c.path));
 if(actual.size!==fairy246Paths.size||!changes.every(c=>fairy246Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 try{
  const p=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  const image=fs.readFileSync('assets/action-icons/v3/51_yeu_tinh_three_way.webp');
  return p.version==='3.246.0'&&lock.version==='3.246.0'&&
   gm.includes("assetId:'51_yeu_tinh_three_way.png'")&&
   gm.includes("fairyDirection:battleIsTransfer(action)?")&&
   gm.includes("battlePlayConfiguredAudio('actions',a.actionId,a.name)")&&
   worker.includes("VERSION=\"V3.246\"")&&worker.includes('INVALID_FAIRY_DIRECTION')&&
   createHash('sha256').update(image).digest('hex')==='7e6a3bc3fc63993c4b9ebe0da8bf39099b5a5d8a9f2f4a02dad95778a8320c9a'&&
   fs.existsSync("docs/releases/GMWW-V3.246-fairy-triptych-audio-20261027.md");
 }catch{return false}
}


// Follow-up gate for PR #548 main merge: the original 22-file update was
// already inspected; this recovery changes only the five CI/verifier files.
const fairy246PostMergePaths=new Set([".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml",".github/scripts/verify-fairy-triptych-production.mjs",".github/workflows/check-dual-renderer.yml"]);
export function isFairy246PostMergeScope(changes){
 if(!Array.isArray(changes)||changes.length!==fairy246PostMergePaths.size||
   new Set(changes.map(c=>c.path)).size!==fairy246PostMergePaths.size||
   !changes.every(c=>fairy246PostMergePaths.has(c.path)&&c.status==='M'))return false;
 try{
   const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
   const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
   const worker=fs.readFileSync('src/index.js','utf8');
   const art=fs.readFileSync('assets/action-icons/v3/51_yeu_tinh_three_way.webp');
   return pkg.version==='3.246.0'&&
      gm.includes("assetId:'51_yeu_tinh_three_way.png'")&&
      gm.includes("battlePlayConfiguredAudio('actions',a.actionId,a.name)")&&
      worker.includes('INVALID_FAIRY_DIRECTION')&&
      createHash('sha256').update(art).digest('hex')==='7e6a3bc3fc63993c4b9ebe0da8bf39099b5a5d8a9f2f4a02dad95778a8320c9a'&&
      fs.existsSync('docs/releases/GMWW-V3.246-fairy-triptych-audio-20261027.md');
 }catch{return false}
}

// PR #550: test-only regression and its narrow CI routing. Gameplay/IPA/OTA
// changes are deliberately excluded; any other path falls back to full checks.
function isRules550Scope(changes){
  const allowed=new Map([
    ['tests/gmww-rule-snow-guard-pack-fairy.test.mjs','A'],
    ['tests/ci-browser-scope.test.mjs','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['.github/workflows/deploy-production.yml','M']
  ]);
  if(!Array.isArray(changes)||changes.length!==allowed.size||
    changes.some(c=>allowed.get(c.path)!==c.status))return false;
  const rows=new Map(changes.map(c=>[c.path,c]));
  return rows.get('tests/gmww-rule-snow-guard-pack-fairy.test.mjs')?.after?.includes('Snow Wolf: night N target is barred at N+1')&&
    rows.get('tests/ci-browser-scope.test.mjs')?.after?.includes('PR550 focused rules regression only')&&
    rows.get('.github/scripts/ci-browser-scope.mjs')?.after?.includes('function isRules550Scope(changes)')&&
    rows.get('.github/workflows/check-player-web.yml')?.after?.includes("steps.scope.outputs.mode == 'night02-rule-regression-550'")&&
    rows.get('.github/workflows/deploy-production.yml')?.after?.includes('PR550 test-only rule regression');
}

// V3.247 is an exact GM-only icon-size release. Reject widened scope instead
// of silently running unrelated Chrome/Gallows/legacy test suites.
const icon247Allowed=new Set([".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-V3.247-icon-size-20261027.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/10-library-and-settings.part","server-game/src/40-battle-and-timeline.part","src/index.js","tests/gmww-action-icon-scale-setting.test.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml","tests/ci-v3247-icon-size-scope.test.mjs"]);
export function isIcon247Scope(changes){
 if(!Array.isArray(changes)||changes.length!==icon247Allowed.size||
   new Set(changes.map(c=>c.path)).size!==icon247Allowed.size||
   !changes.every(c=>icon247Allowed.has(c.path)&&['M','A'].includes(c.status)))return false;
 try{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  const style=fs.readFileSync('server-game/current/style.css','utf8');
  const settings=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
  return pkg.version==='3.247.0'&&html.includes('<title>GMWW V3.247</title>')&&
    html.includes('id="actionIconScaleCard"')&&
    settings.includes('initActionIconScaleSetting')&&
    gm.includes('function battleIconScaleRatio()')&&
    style.includes('--gmww-action-icon-scale')&&
    fs.existsSync('docs/releases/GMWW-V3.247-icon-size-20261027.md');
 }catch{return false}
}


// Only allow the V3.247 recovery CI on an exact four-file follow-up to the
// already-tested PR #551. The game source, package and IPA must be unchanged.
const icon247PostMergePaths=new Set([".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","tests/ci-v3247-postmerge.test.mjs"]);
export function isIcon247PostMergeScope(changes){
 // The first recovery (PR #552) was four CI files. After merge it only
 // needs this selector and its regression test corrected: exactly two files.
 const tiny=new Set(['.github/scripts/ci-browser-scope.mjs','tests/ci-v3247-postmerge.test.mjs']);
 const validStatus=Array.isArray(changes)&&changes.every(c=>['A','M'].includes(c.status));
 const four=validStatus&&changes.length===icon247PostMergePaths.size&&
    new Set(changes.map(c=>c.path)).size===icon247PostMergePaths.size&&
    changes.every(c=>icon247PostMergePaths.has(c.path));
 const two=validStatus&&changes.length===tiny.size&&
    new Set(changes.map(c=>c.path)).size===tiny.size&&changes.every(c=>tiny.has(c.path));
 if(!four&&!two)return false;
 try{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  const settings=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  git('merge-base','--is-ancestor','688d348bc690c26060e3b8344b31f738ee9d1ca9','HEAD');
  if(two)git('merge-base','--is-ancestor','a160500980879db81e1a30c1a4b77b929cbdae90','HEAD');
  return pkg.version==='3.247.0'&&html.includes('<title>GMWW V3.247</title>')&&
    html.includes('id="actionIconScaleCard"')&&
    settings.includes('initActionIconScaleSetting')&&
    gm.includes('function battleIconScaleRatio()')&&
    css.includes('--gmww-action-icon-scale')&&
    fs.existsSync('docs/releases/GMWW-V3.247-icon-size-20261027.md');
 }catch{return false}
}


/* V3.248 is a tightly scoped GM UI + setup performance runtime change.
   Fail closed on any unexpected path and version; never run unrelated suites. */
const runtime248Allowed=new Set(["server-game/current/GMWW.html","server-game/src/10-library-and-settings.part","server-game/src/40-battle-and-timeline.part","server-game/src/30-village-and-setup.part","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","src/index.js","package.json","package-lock.json",".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-V3.248-setup-ui-performance-20261027.md","tests/gmww-v3248-setup-ui-perf.test.mjs","tests/gmww-action-icon-scale-setting.test.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml"]);
export function isRuntime248SetupUiScope(changes){
 if(!Array.isArray(changes)||changes.length!==runtime248Allowed.size||
  new Set(changes.map(c=>c.path)).size!==runtime248Allowed.size||
  !changes.every(c=>runtime248Allowed.has(c.path)&&['M','A'].includes(c.status)))return false;
 try{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  const village=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const settings=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  return pkg.version==='3.248.0'&&
     fs.readFileSync('.github/workflows/deploy-production.yml','utf8').includes('test -s docs/releases/GMWW-V3.248-setup-ui-performance-20261027.md')&&
     html.includes('<title>GMWW V3.248</title>')&&
   html.includes('data-action-icon-scale="25"')&&html.includes('data-action-icon-scale="150"')&&
   battle.includes("visibleSteps=steps.map")&&
   village.includes('playSetupSyncFingerprint')&&
   settings.includes('ACTION_ICON_SCALE_OPTIONS=[25,50,75,100,125,150]')&&
   css.includes('#battleDemoPanel[hidden]')&&
   fs.existsSync('tests/gmww-v3248-setup-ui-perf.test.mjs')&&
   fs.existsSync('docs/releases/GMWW-V3.248-setup-ui-performance-20261027.md');
 }catch{return false}
}


// V3.248: only these four CI/release files may change after the already tested
// and merged Runtime PR #555. Any app, rule, asset or IPA diff => full CI.
const runtime248PostMergePaths=new Set([".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","tests/ci-v3248-postmerge.test.mjs"]);
export function isRuntime248PostMergeScope(changes){
 if(!Array.isArray(changes)||changes.length!==runtime248PostMergePaths.size||
   new Set(changes.map(c=>c.path)).size!==runtime248PostMergePaths.size||
   !changes.every(c=>runtime248PostMergePaths.has(c.path)&&['A','M'].includes(c.status)))return false;
 try{
   git('merge-base','--is-ancestor','878e3ae02dd8daba0846aba9d0ee46667944f2d1','HEAD');
   const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
   const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
   const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
   const village=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
   const settings=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
   return pkg.version==='3.248.0'&&
     fs.readFileSync('.github/workflows/deploy-production.yml','utf8').includes('test -s docs/releases/GMWW-V3.248-setup-ui-performance-20261027.md')&&
     html.includes('<title>GMWW V3.248</title>')&&
     html.includes('data-action-icon-scale="25"')&&
     html.includes('data-action-icon-scale="150"')&&
     battle.includes('visibleSteps=steps.map')&&
     village.includes('playSetupSyncFingerprint')&&
     settings.includes('ACTION_ICON_SCALE_OPTIONS=[25,50,75,100,125,150]')&&
     fs.existsSync('docs/releases/GMWW-V3.248-setup-ui-performance-20261027.md');
 }catch{return false}
}

// V3.253 GM-only turn motion, exact-file scope. Unknown changes run full CI.
const gmTurnMotionPaths=new Set([
  'server-game/current/app.js','server-game/current/GMWW.html','server-game/current/style.css',
  'server-game/current/gmww-shared-motion.js','server-game/src/00-core-and-library.part',
  'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
  'src/index.js','package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
  'tests/gm-turn-motion-lowheat.test.mjs','docs/releases/GMWW-GM-TURN-MOTION-20261027.md',
  'docs/releases/GMWW-V3.253-gm-turn-motion-20261027.md','wrangler.gm-turn-motion-staging.jsonc',
  '.github/scripts/build-gm-turn-motion-staging.mjs','.github/workflows/deploy-gm-turn-motion-staging.yml',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml'
]);
function isGMTurnMotionScope(changes){
  const paths=new Set((changes||[]).map(c=>c.path));
  const required=['server-game/current/app.js','server-game/current/gmww-shared-motion.js',
   'server-game/src/00-core-and-library.part','server-game/src/30-village-and-setup.part',
   'server-game/src/40-battle-and-timeline.part','src/index.js','package.json',
   'tests/gm-turn-motion-lowheat.test.mjs','docs/releases/GMWW-V3.253-gm-turn-motion-20261027.md'];
  if(!required.every(p=>paths.has(p))||!changes.every(c=>gmTurnMotionPaths.has(c.path)&&['A','M'].includes(c.status)))return false;
  const content=path=>changes.find(c=>c.path===path)?.after||'';
  return content('server-game/src/00-core-and-library.part').includes("const VERSION='3.253'")&&
    content('src/index.js').includes('VERSION="V3.253"')&&
    content('server-game/current/app.js').includes('GMWW_GM_TURN_MOTION_V1')&&
    content('server-game/current/gmww-shared-motion.js').includes('_gmwwLowPower')&&
    content('package.json').includes('"version": "3.253.0"');
}
function isGMPerformance3254Scope(changes){const allowed=new Set([".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/scripts/verify-release-v3254.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml",".github/workflows/build-server-game-ipa.yml","docs/releases/GMWW-V3.254-performance-thermal-20261027.md","server-game/current/GMWW.html","server-game/current/gmww-performance.js","server-game/current/gmww-shared-motion.js","server-game/current/style.css","server-game/current/app.js","server-game/src/00-core-and-library.part","tests/gmww-performance-thermal.test.mjs","tests/gm-turn-motion-lowheat.test.mjs","package.json","package-lock.json","src/index.js"]);return Array.isArray(changes)&&changes.length>0&&changes.every(c=>allowed.has(c.path)&&['M','A'].includes(c.status))&&["server-game/current/gmww-performance.js","server-game/current/gmww-shared-motion.js","server-game/current/GMWW.html","tests/gmww-performance-thermal.test.mjs","src/index.js","package.json","package-lock.json"].every(p=>changes.some(c=>c.path===p))&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.254.0';}
function isCharacter40V3254PostverifyScope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const allowed=new Set([".github/scripts/verify-character40-production.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml",".github/workflows/build-server-game-ipa.yml","tests/gmww-v3254-character40-postverify.test.mjs","docs/releases/GMWW-V3.254-character40-postverify-20261027.md"]);
 const required=[".github/scripts/verify-character40-production.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","tests/gmww-v3254-character40-postverify.test.mjs","docs/releases/GMWW-V3.254-character40-postverify-20261027.md"];
 return changes.every(c=>allowed.has(c.path)&&['M','A'].includes(c.status)) &&
   required.every(p=>changes.some(c=>c.path===p)) &&
   JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.254.0';
}
const gmFireWalk3256Files=new Set([
  'server-game/src/00-core-and-library.part','server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
  'server-game/current/app.js','server-game/current/GMWW.html','server-game/current/style.css',
  'src/index.js','package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
  'tests/gm-turn-motion-lowheat.test.mjs','docs/releases/GMWW-GM-FIRE-WALK-20261027.md',
  'docs/releases/GMWW-V3.256-gm-fire-walk-20261027.md',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml'
]);
function isGMFireWalk3256Scope(changes){
  if(!Array.isArray(changes)||!changes.length||
    !changes.every(x=>gmFireWalk3256Files.has(x.path)&&['M','A'].includes(x.status)))return false;
  const paths=new Set(changes.map(x=>x.path));
  const required=['server-game/current/app.js','server-game/current/GMWW.html',
    'server-game/current/style.css','server-game/src/00-core-and-library.part',
    'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
    'src/index.js','package.json','package-lock.json','tests/gm-turn-motion-lowheat.test.mjs',
    'docs/releases/GMWW-V3.256-gm-fire-walk-20261027.md'];
  if(!required.every(p=>paths.has(p)))return false;
  try{
    const app=fs.readFileSync('server-game/current/app.js','utf8');
    const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
    const css=fs.readFileSync('server-game/current/style.css','utf8');
    const worker=fs.readFileSync('src/index.js','utf8');
    return JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.256.0'&&
      app.includes("const VERSION='3.256'")&&app.includes('function gmwwFireWalkSync(')&&
      app.includes('gmwwWalkExpired=expired;battleMarkPlayers()')&&
      !app.includes('is-gm-turn-floating')&&html.includes('<title>GMWW V3.256</title>')&&
      html.includes('>Đi bộ</button>')&&css.includes('is-gm-walking-fire')&&
      worker.includes('VERSION="V3.256"');
  }catch{return false}
}
function isNativeManualReleaseVerifyScope(changes){
 const allowed=new Set([".github/scripts/verify-character40-production.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/build-server-game-ipa.yml","tests/native-v3257-release-verify.test.mjs"]);
 return Array.isArray(changes)&&changes.length>0&&changes.every(c=>allowed.has(c.path)&&['A','M'].includes(c.status))&&
   changes.some(c=>c.path==='.github/scripts/verify-character40-production.mjs')&&
   changes.some(c=>c.path==='tests/native-v3257-release-verify.test.mjs');
}
function isManualRuntimeScope(changes){
 const allowed=new Set([".github/scripts/verify-native-web.mjs", "server-game/GMWW-Server.xcodeproj/project.pbxproj", ".github/scripts/prepare-update-channel.mjs", ".github/workflows/deploy-production.yml", "package-lock.json", "package.json", "server-game/GMWW-Server/GameView.swift", "server-game/current/GMWW.html", "server-game/current/app.js", "server-game/current/style.css", "server-game/src/00-core-and-library.part", "server-game/src/10-library-and-settings.part", "src/index.js", ".github/scripts/build-manual-runtime.mjs", "tests/manual-runtime-package.test.mjs", "docs/releases/GMWW-V3.257-manual-runtime.md", ".github/scripts/ci-browser-scope.mjs", ".github/workflows/check-player-web.yml", ".github/workflows/build-server-game-ipa.yml", ".github/workflows/check-dual-renderer.yml", ".github/workflows/check-gm-free-icons-501.yml", ".github/workflows/prepare-runtime-v3202-candidate.yml", ".github/workflows/check-gallows-redesign.yml"]);
 return Array.isArray(changes)&&changes.length>0&&changes.every(c=>allowed.has(c.path)&&['A','M'].includes(c.status))&&changes.some(c=>c.path==='server-game/GMWW-Server/GameView.swift')&&changes.some(c=>c.path==='tests/manual-runtime-package.test.mjs');
}




/* V3.259 postdeploy CI-only guard, no app/Worker/IPA bytes changed. */
function isGMVote3259PostverifyScope(changes){
  const allowed=new Set([".github/scripts/verify-character40-production.mjs",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml",".github/workflows/check-gm-vote-markers-565.yml","tests/character40-native-shell-contract-v3259.test.mjs","docs/releases/GMWW-V3.259-character40-postverify.md"]);
  if(!Array.isArray(changes)||changes.length!==allowed.size||changes.some(c=>!allowed.has(c.path)||!['A','M'].includes(c.status)))return false;
  try{
    const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
    const verifier=fs.readFileSync('.github/scripts/verify-character40-production.mjs','utf8');
    const worker=fs.readFileSync('src/index.js','utf8');
    return pkg.version==='3.259.0'&&verifier.includes('Runtime shell must match the unchanged signed IPA')&&
      !verifier.includes("published.shellVersion,'3.110'")&&
      worker.includes('VERSION="V3.259"')&&worker.includes('NATIVE_SHELL_VERSION="3.257"');
  }catch{return false}
}

function isGMVote3259Scope(changes){
  const allowed=new Set(["package.json","package-lock.json","server-game/current/app.js","server-game/src/00-core-and-library.part","server-game/current/GMWW.html","src/index.js",".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-GM-VOTE-BADGES-2026-10-27.md",".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml",".github/workflows/check-gm-vote-markers-565.yml",".github/scripts/verify-release-v3259.mjs"]);
  if(!Array.isArray(changes)||changes.length!==allowed.size||changes.some(c=>!allowed.has(c.path)||!['A','M'].includes(c.status)))return false;
  try{
    const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
    const app=fs.readFileSync('server-game/current/app.js','utf8'),worker=fs.readFileSync('src/index.js','utf8'),css=fs.readFileSync('server-game/current/style.css','utf8');
    return pkg.version==='3.259.0'&&app.includes("const VERSION='3.259'")&&app.includes('function battleQueueDayAudio(')&&!app.includes('🐺 VẾT CẮN · PHÙ THỦY')&&css.includes('gmwwNominationVoteBounce')&&worker.includes('VERSION="V3.259"')&&worker.includes('NATIVE_SHELL_VERSION="3.257"')&&fs.readFileSync('server-game/current/GMWW.html','utf8').includes('<title>GMWW V3.259</title>');
  }catch{return false}
}

// V3.258: verified narrow release. This classifier rejects ANY extra path
// and requires an exact Runtime identity; no legacy Card/Seat/IPA tests.
function isGMWWAudio3258Scope(changes){
 const allowed=new Set([
   'server-game/src/00-core-and-library.part',
   'server-game/src/10-library-and-settings.part',
   'server-game/src/30-village-and-setup.part',
   'server-game/src/40-battle-and-timeline.part',
   'server-game/current/app.js',
   'server-game/current/GMWW.html',
   'src/index.js','package.json','package-lock.json',
   'tests/audio-role-day-flow-20261027.test.mjs',
   'tests/audio-binding-integrity-20261027.test.mjs',
   '.github/scripts/ci-browser-scope.mjs',
   '.github/scripts/verify-release-v3258.mjs',
   '.github/workflows/check-player-web.yml',
   '.github/workflows/deploy-production.yml',
   '.github/workflows/check-gm-audio-role-day.yml',
   'docs/release-notes/audio-audit-20261027.md',
   'docs/releases/GMWW-V3.258-audio-audit-20261027.md'
 ]);
 const seen=new Set(changes.map(x=>x.path));
 if(seen.size!==allowed.size||changes.some(x=>!allowed.has(x.path)))return false;
 try{
   const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
   const app=fs.readFileSync('server-game/current/app.js','utf8');
   const worker=fs.readFileSync('src/index.js','utf8');
   return pkg.version==='3.258.0'&&
      app.includes("const VERSION='3.258'")&&
      app.includes('function battleFindAudioCandidates(')&&
      app.includes('function battleQueueDayAudio(')&&
      worker.includes('VERSION="V3.258"')&&
      fs.readFileSync('server-game/current/GMWW.html','utf8').includes('<title>GMWW V3.258</title>');
 }catch{return false}
}

// PR #577: exact match-only Say Rượu card/cleanup scope. Unknown diffs
// fail closed to the standard full check; no general bypass is introduced.
function isDrunkCardOverlayScope(changes){
  const expected=new Map([
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/scripts/prepare-update-channel.mjs','M'],
    ['.github/workflows/deploy-production.yml','M'],
    ['package.json','M'],
    ['package-lock.json','M'],
    ['server-game/current/GMWW.html','M'],
    ['server-game/src/00-core-and-library.part','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['.github/workflows/check-drunk-spiritualist.yml','M'],
    ['assets/role-card-back.webp','A'],
    ['docs/releases/GMWW-DRUNK-CARD-OVERLAY-20261028.md','A'],
    ['server-game/current/app.js','M'],
    ['server-game/src/40-battle-and-timeline.part','M'],
    ['src/gmww-members-live.js','M'],
    ['src/index.js','M'],
    ['src/player-web-src/30-rooms-and-realtime.part','M'],
    ['src/player-web-src/50-privacy-and-runtime.part','M'],
    ['tests/drunk-card-overlay-match-cleanup-20261028.test.mjs','A']
  ]);
  if(!Array.isArray(changes)||changes.length!==expected.size||
     changes.some(c=>expected.get(c.path)!==c.status))return false;
  try{
    if(JSON.parse(fs.readFileSync('package.json','utf8')).version!=='3.260.0')return false;
    const back=fs.readFileSync('src/player-web-src/10-role-card-artwork.part','utf8')
      .match(/const src='data:image\/webp;base64,([A-Za-z0-9+/=]+)'/)?.[1];
    if(!back||!fs.readFileSync('assets/role-card-back.webp').equals(Buffer.from(back,'base64')))return false;
    const gmFiles=['00-core-and-library.part','10-library-and-settings.part',
      '20-members-and-roster.part','30-village-and-setup.part',
      '40-battle-and-timeline.part','50-roles-and-artifacts.part'];
    const gm=gmFiles.map(x=>fs.readFileSync('server-game/src/'+x,'utf8')).join('');
    if(gm!==fs.readFileSync('server-game/current/app.js','utf8'))return false;
    const webFiles=['00-bootstrap-and-session.part','10-role-card-artwork.part',
      '20-village-and-profile.part','30-rooms-and-realtime.part',
      '40-cards-and-game.part','50-privacy-and-runtime.part'];
    const web=webFiles.map(x=>fs.readFileSync('src/player-web-src/'+x,'utf8')).join('');
    if('export const gmwwMembersLiveScript = '+JSON.stringify(web)+';\n'!==
       fs.readFileSync('src/gmww-members-live.js','utf8'))return false;
    const worker=fs.readFileSync('src/index.js','utf8');
    const ui=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
    const scene=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
    return worker.includes('VERSION="V3.260"')&&worker.includes('NATIVE_SHELL_VERSION="3.257"')&&
      fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8').includes("copy('assets/role-card-back.webp','role-card-back.webp')")&&
      fs.readFileSync('server-game/current/GMWW.html','utf8').includes('GMWW V3.260')&&
      worker.includes('prefix:"drunkDeck:"+endedMatchId+":"')&&
      ui.includes("document.getElementById('game').appendChild(panel)")&&
      scene.includes("shell.appendChild(deck)")&&
      fs.existsSync('tests/drunk-card-overlay-match-cleanup-20261028.test.mjs');
  }catch{return false}
}

// V3.261: exact-scope GM iPhone walk hotfix; no masking unrelated changes.
const gmFireWalk3261Paths=new Set([
 'server-game/src/00-core-and-library.part','server-game/src/30-village-and-setup.part',
 'server-game/src/40-battle-and-timeline.part','server-game/current/app.js',
 'server-game/current/style.css','server-game/current/GMWW.html',
 'src/index.js','package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
 'tests/gm-fire-walk-position.test.mjs','tests/gm-turn-motion-lowheat.test.mjs',
 'docs/releases/GMWW-V3.261-gm-firewalk-20261028.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-gm-turn-motion-staging.yml','.github/workflows/deploy-production.yml'
]);
function isGMFireWalk3261Scope(changes){
 if(!Array.isArray(changes)||changes.length!==gmFireWalk3261Paths.size)return false;
 const paths=new Set(changes.map(c=>c.path));
 if(![...gmFireWalk3261Paths].every(p=>paths.has(p))||
    !changes.every(c=>gmFireWalk3261Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 const after=p=>changes.find(c=>c.path===p)?.after||'';
 return after('server-game/current/app.js').includes("const VERSION='3.261'")&&
  after('server-game/current/app.js').includes('GMWW_GM_FIRE_WALK_V2')&&
  after('server-game/current/app.js').includes('token.animate([{translate:from},{translate:target}]')&&
  after('server-game/current/app.js').includes('gmwwWalkExpired=expired;battleMarkPlayers()')&&
  after('src/index.js').includes('VERSION="V3.261"')&&
  after('package.json').includes('"version": "3.261.0"');
}

// V3.262: exact GM-only equal-radius patch. Unknown changes fall back to full tests.
const gmFireRadius3262Paths=new Set([
 'server-game/src/00-core-and-library.part',
 'server-game/src/40-battle-and-timeline.part','server-game/current/app.js',
 'server-game/current/GMWW.html','src/index.js','package.json','package-lock.json',
 '.github/scripts/prepare-update-channel.mjs',
 'tests/gm-fire-walk-position.test.mjs',
 'docs/releases/GMWW-V3.262-equal-campfire-radius-20261028.md',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-gm-turn-motion-staging.yml','.github/workflows/deploy-production.yml'
]);
function isGMFireRadius3262Scope(changes){
 if(!Array.isArray(changes)||changes.length!==gmFireRadius3262Paths.size)return false;
 const paths=new Set(changes.map(c=>c.path));
 if(![...gmFireRadius3262Paths].every(p=>paths.has(p))||
    !changes.every(c=>gmFireRadius3262Paths.has(c.path)&&['A','M'].includes(c.status)))return false;
 const after=p=>changes.find(c=>c.path===p)?.after||'';
 return after('server-game/current/app.js').includes("const VERSION='3.262'")&&
   after('server-game/current/app.js').includes('const radius=Math.min(88')&&
   after('server-game/current/app.js').includes('cx+Math.cos(angle)*radius')&&
   after('server-game/current/app.js').includes('cy+Math.sin(angle)*radius')&&
   after('server-game/current/app.js').includes('GMWW_GM_FIRE_WALK_V2')&&
   after('src/index.js').includes('VERSION="V3.262"')&&
   after('package.json').includes('"version": "3.262.0"');
}

// V3.264 native IPA + OTA optimization: fail closed on all unrelated feature changes.
function isLeanPackaging3264Scope(changes){
 const allowed=new Set([
 '.github/scripts/prepare-update-channel.mjs','.github/scripts/verify-native-web.mjs',
 '.github/scripts/ci-browser-scope.mjs','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/check-player-web.yml','package.json','package-lock.json',
 'src/index.js','server-game/current/app.js','server-game/src/00-core-and-library.part',
 'server-game/src/10-library-and-settings.part','server-game/current/GMWW.html',
 'server-game/GMWW-Server.xcodeproj/project.pbxproj',
 'tests/manual-runtime-package.test.mjs','tests/ipa-ota-lean-assets-v3264.test.mjs',
 'docs/releases/GMWW-V3.264-ipa-ota-lean-assets-20261028.md']);
 if(!Array.isArray(changes)||changes.some(c=>!allowed.has(c.path)||!['A','M'].includes(c.status)))return false;
 const map=new Map(changes.map(c=>[c.path,c]));
 const required=['.github/scripts/prepare-update-channel.mjs','.github/workflows/build-server-game-ipa.yml',
  'src/index.js','server-game/current/app.js','server-game/src/00-core-and-library.part',
  'server-game/src/10-library-and-settings.part','server-game/GMWW-Server.xcodeproj/project.pbxproj',
  'tests/ipa-ota-lean-assets-v3264.test.mjs'];
 if(!required.every(x=>map.has(x)))return false;
 const exact=(p,oldText,newText)=>{
  const c=map.get(p);return c?.status==='M'&&typeof c.before==='string'&&
   typeof c.after==='string'&&c.before.includes(oldText)&&
   c.after===c.before.replaceAll(oldText,()=>newText);
 };
 const audioFixed=s=>s.replaceAll("$('[data-audio-id]').forEach",()=> "$$('[data-audio-id]').forEach")
  .replaceAll("$('[data-system-sound-slot]').forEach",()=> "$$('[data-system-sound-slot]').forEach");
 const app=map.get('server-game/current/app.js');
 if(!app?.before||app.after!==audioFixed(app.before.replaceAll("const VERSION='3.263';",()=> "const VERSION='3.264';")))return false;
 const audio=map.get('server-game/src/10-library-and-settings.part');
 if(!audio?.before||audio.after!==audioFixed(audio.before))return false;
 if(!exact('server-game/src/00-core-and-library.part',"const VERSION='3.263';","const VERSION='3.264';"))return false;
 if(!exact('src/index.js','VERSION="V3.263",NATIVE_SHELL_VERSION="3.257",UPDATE_CHANNEL_REV="runtime-3263"',
  'VERSION="V3.264",NATIVE_SHELL_VERSION="3.264",UPDATE_CHANNEL_REV="native-3264-lean-assets"'))return false;
 if(!exact('server-game/current/GMWW.html','<title>GMWW V3.263</title>','<title>GMWW V3.264</title>'))return false;
 const project=map.get('server-game/GMWW-Server.xcodeproj/project.pbxproj');
 if(!project?.before||project.after!==project.before.replaceAll('MARKETING_VERSION = 3.257;',()=> 'MARKETING_VERSION = 3.264;').replaceAll('CURRENT_PROJECT_VERSION = 3110;',()=> 'CURRENT_PROJECT_VERSION = 3264;'))return false;
 const pack=map.get('.github/scripts/prepare-update-channel.mjs')?.after||'';
 const native=map.get('.github/workflows/build-server-game-ipa.yml')?.after||'';
 return pack.includes("copyDir('server-game/current/action-icons/v3','action-icons/v3')")&&
 pack.includes('V3.264: Tối ưu IPA/Runtime OTA')&&
 native.includes('cp -R server-game/current/action-icons/v3 "$APPDIR/Web/action-icons/v3"')&&
 !native.includes('cp -R server-game/current/action-icons "$APPDIR/Web/action-icons"');
}

export // Online Chat/GM monitoring/announcement audio only: no IPA, seat, 3D, card-audit tests.
const onlineChatPaths=new Set([
  'src/index.js','src/gmww-online-chat-policy.js','src/gmww-members-live.js',
  'package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
  'server-game/src/00-core-and-library.part','server-game/current/GMWW.html',
  'src/player-web-src/30-rooms-and-realtime.part',
  'src/player-web-src/35-online-chat.part',
  'src/player-web-src/50-privacy-and-runtime.part',
  'server-game/src/40-battle-and-timeline.part',
  'server-game/src/45-online-chat.part','server-game/current/app.js',
  '.github/scripts/assemble-player-web.mjs','.github/scripts/assemble-gm-app.mjs',
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  'tests/online-chat-authority.test.mjs',
  'tests/audio-role-day-flow-20261027.test.mjs',
  'tests/audio-binding-integrity-20261027.test.mjs',
  'docs/releases/GMWW-ONLINE-CHAT-20261028.md'
]);
function isOnlineChatScope(changes){
  const paths=new Set(changes.map(c=>c.path));
  return paths.has('src/gmww-online-chat-policy.js')&&
    paths.has('tests/online-chat-authority.test.mjs')&&
    paths.has('src/index.js')&&paths.has('src/player-web-src/35-online-chat.part')&&
    changes.every(c=>onlineChatPaths.has(c.path)&&['A','M'].includes(c.status));
}


function isMorningAudio3267Scope(changes){
  // V3.267 is a tiny dawn-only Audio fix. Unknown or expanded changes must
  // NOT inherit this narrow Worker release gate.
  const allowed=new Set([".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/scripts/prepare-update-channel.mjs","docs/releases/GMWW-V3.267-morning-zero-deaths-20261028.md","package.json","package-lock.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","src/index.js","tests/audio-role-day-flow-20261027.test.mjs"]);
  if(changes.length!==allowed.size||changes.some(c=>!allowed.has(c.path)||!['M','A'].includes(c.status)))return false;
  try{
    const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
    const app=fs.readFileSync('server-game/current/app.js','utf8');
    const worker=fs.readFileSync('src/index.js','utf8');
    const ver=JSON.parse(fs.readFileSync('package.json','utf8')).version;
    return ver==='3.267.0'&&worker.includes('VERSION="V3.267"')&&
      app.includes("const VERSION='3.267'")&&
      gm.includes("if(dead>0){")&&
      gm.includes("queue.push(['audio_system_morning_deaths_intro'")&&
      fs.existsSync('docs/releases/GMWW-V3.267-morning-zero-deaths-20261028.md');
  }catch{return false}
}

// PR #587: Hybrid DEMO is a self-contained, server-authoritative Player Web
// feature. No unrelated 3D, IPA, card-art or gallows browser suite is required.
// Fail closed if ANY extra source path is modified.
const HYBRID_DEMO_587_FILES=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-demo-hybrid.yml',
  'docs/releases/GMWW-DEMO-HYBRID-20261028.md',
  'src/gmww-demo-runner.js',
  'src/gmww-members-live.js',
  'src/gmww-player-private-card-patch.js',
  'src/index.js',
  'src/player-web-src/30-rooms-and-realtime.part',
  'tests/gmww-player-web-source-modules.test.mjs',
  'tests/player-web-receipt-patch-hotfix.test.mjs',
  'tests/demo-hybrid-live-e2e.mjs',
  'tests/demo-hybrid-real-players.test.mjs',
  'tests/demo-pr367-369-reconciliation.test.mjs',
  'tests/demo-room-cross-origin-webkit.mjs',
  'tests/demo-room-gm-safety.test.mjs',
  'tests/demo-room-lease-phases.test.mjs',
  'tests/demo-server-autonomous-e2e.mjs',
  'package.json','package-lock.json',
  'server-game/current/app.js','server-game/current/GMWW.html',
  'server-game/src/00-core-and-library.part'
]);
function isHybridDemo587Scope(changes){
  if(!Array.isArray(changes)||changes.length<8)return false;
  const names=new Set(changes.map(c=>c.path));
  const required=['src/index.js','src/gmww-demo-runner.js','src/gmww-members-live.js',
    'src/gmww-player-private-card-patch.js','src/player-web-src/30-rooms-and-realtime.part',
    'tests/demo-hybrid-real-players.test.mjs','tests/demo-hybrid-live-e2e.mjs',
    'docs/releases/GMWW-DEMO-HYBRID-20261028.md'];
  return required.every(p=>names.has(p))&&changes.every(c=>
    HYBRID_DEMO_587_FILES.has(c.path)&&['A','M'].includes(c.status));
}// V3.270: exclusively Audio/DEMO/Seer/Gallows + release markers.
 // An expanded diff or a mismatched Runtime version falls back to full CI.
const demoAudio3270Paths=new Set([
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  '.github/workflows/check-gm-audio-role-day.yml',
  '.github/scripts/prepare-update-channel.mjs',
  'docs/releases/GMWW-V3.270-audio-demo-gallows-20261028.md',
  'src/index.js','src/gmww-demo-runner.js','src/gmww-wolf-night-resolution.js',
  'server-game/src/00-core-and-library.part','server-game/src/30-village-and-setup.part',
  'server-game/src/40-battle-and-timeline.part','server-game/current/app.js',
  'server-game/current/GMWW.html','package.json','package-lock.json',
  'tests/audio-role-day-flow-20261027.test.mjs',
  'tests/demo-audio-clock-sync-20261028.test.mjs',
  'tests/demo-assassin-gallows-divination.test.mjs'
]);
function isDemoAudioSync3270Scope(changes){
  if(!Array.isArray(changes)||changes.length<14||
     changes.some(c=>!demoAudio3270Paths.has(c.path)||!['M','A'].includes(c.status)))return false;
  const touched=new Set(changes.map(c=>c.path));
  const required=['.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
    'src/index.js','src/gmww-demo-runner.js','src/gmww-wolf-night-resolution.js',
    'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
    'server-game/current/app.js','tests/demo-audio-clock-sync-20261028.test.mjs',
    'docs/releases/GMWW-V3.270-audio-demo-gallows-20261028.md'];
  if(!required.every(p=>touched.has(p)))return false;
  try{
    return JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.270.0'&&
      fs.readFileSync('server-game/current/app.js','utf8').includes("const VERSION='3.270'")&&
      fs.readFileSync('src/index.js','utf8').includes('VERSION="V3.270"')&&
      fs.readFileSync('src/gmww-wolf-night-resolution.js','utf8').includes('expelledIds=[]')&&
      fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8').includes('gallowsStageAudioKey');
  }catch{return false}
}
// PR #594: fail-closed V3.271 live DEMO admission and Player Web sync only.
const demoPlayerLive3271Paths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/scripts/prepare-update-channel.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-demo-player-live-v3271.yml',
  'docs/releases/GMWW-DEMO-PLAYER-V3.271-20261028.md',
  'package.json','package-lock.json',
  'src/index.js','src/gmww-members-live.js',
  'src/player-web-src/20-village-and-profile.part',
  'src/player-web-src/30-rooms-and-realtime.part',
  'server-game/current/GMWW.html','server-game/current/app.js',
  'server-game/src/00-core-and-library.part',
  'tests/demo-player-live-join-v3271.test.mjs'
]);
function isDemoPlayerLive3271Scope(changes){
  if(!Array.isArray(changes)||changes.length<12||
    changes.some(c=>!demoPlayerLive3271Paths.has(c.path)||!['A','M'].includes(c.status)))return false;
  const changed=new Set(changes.map(c=>c.path));
  const required=['src/index.js','src/gmww-members-live.js',
    'src/player-web-src/20-village-and-profile.part',
    'src/player-web-src/30-rooms-and-realtime.part',
    'tests/demo-player-live-join-v3271.test.mjs',
    'docs/releases/GMWW-DEMO-PLAYER-V3.271-20261028.md'];
  if(!required.every(p=>changed.has(p)))return false;
  try{
    return JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.271.0'&&
      fs.readFileSync('src/index.js','utf8').includes('UPDATE_CHANNEL_REV="runtime-3271-demo-player-live-join"');
  }catch{return false}
}

function gmAdmin3272Scope(changes){
  const allowed=new Set([
    'server-game/src/00-core-and-library.part',
    'server-game/src/40-battle-and-timeline.part',
    'server-game/src/45-online-chat.part',
    'server-game/current/app.js','server-game/current/style.css',
    'server-game/current/GMWW.html','src/index.js','package.json','package-lock.json',
    '.github/scripts/prepare-update-channel.mjs','.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml','.github/workflows/deploy-production.yml',
    '.github/workflows/check-gm-admin-top-chat.yml','.github/workflows/build-server-game-ipa.yml',
    'tests/gm-admin-top-chat-20261028.test.mjs',
    'docs/releases/gm-admin-top-chat-20261028.md'
  ]);
  const names=new Set(changes.map(c=>c.path));
  const required=['server-game/current/app.js','server-game/src/40-battle-and-timeline.part',
    'server-game/src/45-online-chat.part','server-game/current/style.css','src/index.js',
    'package.json','package-lock.json','.github/scripts/prepare-update-channel.mjs',
    'tests/gm-admin-top-chat-20261028.test.mjs'];
  if(changes.some(c=>!allowed.has(c.path)||!['A','M'].includes(c.status))||
     required.some(p=>!names.has(p)))return false;
  const get=p=>fs.readFileSync(p,'utf8');
  return JSON.parse(get('package.json')).version==='3.272.0'&&
    get('src/index.js').includes('VERSION="V3.272",NATIVE_SHELL_VERSION="3.264"')&&
    get('server-game/src/00-core-and-library.part').includes("const VERSION='3.272'")&&
    get('server-game/current/app.js').includes("const VERSION='3.272'")&&
    get('server-game/current/app.js').includes('function gmwwGMAdminMount()')&&
    get('server-game/current/app.js').includes("trigger.textContent='🦩'")&&
    get('server-game/current/GMWW.html').includes('<title>GMWW V3.272</title>')&&
    get('.github/scripts/prepare-update-channel.mjs').includes('V3.272 PR595:')&&
    get('docs/releases/gm-admin-top-chat-20261028.md').includes('Giết');
}
/* PR #596 — fail-closed V3.273 Player Web Online village and 7 required features. */
const onlineVillage3273Paths=new Set([".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-player-web-online-village.yml","docs/releases/GMWW-player-web-online-village-20261028.md","package.json","package-lock.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/src/00-core-and-library.part","server-game/src/10-library-and-settings.part","src/gmww-demo-runner.js","src/gmww-members-live.js","src/gmww-online-action-icons.js","src/gmww-wolf-recognition.js","src/index.js","src/player-web-src/20-village-and-profile.part","src/player-web-src/30-rooms-and-realtime.part","src/player-web-src/35-online-chat.part","src/player-web-src/40-cards-and-game.part","src/player-web-src/50-privacy-and-runtime.part","tests/player-web-online-actions-20261028.test.mjs","tests/player-web-online-village-20261028.test.mjs"]);
function isOnlineVillage3273Scope(changes){
 if(!Array.isArray(changes)||changes.length<20||
    changes.some(c=>!onlineVillage3273Paths.has(c.path)||!['A','M'].includes(c.status)))return false;
 const paths=new Set(changes.map(c=>c.path));
 const mandatory=['src/index.js','src/gmww-members-live.js','src/gmww-demo-runner.js',
   'src/gmww-online-action-icons.js','src/player-web-src/35-online-chat.part',
   'tests/player-web-online-actions-20261028.test.mjs',
   'docs/releases/GMWW-player-web-online-village-20261028.md'];
 if(!mandatory.every(x=>paths.has(x)))return false;
 try{
  return JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.273.0'&&
   fs.readFileSync('src/index.js','utf8').includes('UPDATE_CHANNEL_REV="runtime-3273-player-online-village"');
 }catch{return false}
}

const playerWebBackgroundPerformancePaths=new Set([
  '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
  'assets/village/scene-manager.mjs','assets/village/village-performance.mjs',
  'src/gmww-members-live.js','src/player-web-src/30-rooms-and-realtime.part',
  'src/player-web-src/50-privacy-and-runtime.part','tests/ci-browser-scope.test.mjs',
  'tests/player-web-background-performance.test.mjs',
  'docs/releases/GMWW-PLAYER-WEB-BACKGROUND-PERFORMANCE-20261029.md',
  'docs/superpowers/specs/2026-10-29-player-web-background-performance-design.md',
  'docs/superpowers/plans/2026-10-29-player-web-background-performance.md'
]);
function isPlayerWebBackgroundPerformanceScope(changes){
  if(!Array.isArray(changes)||changes.length<9||changes.some(c=>
    !playerWebBackgroundPerformancePaths.has(c.path)||!['A','M'].includes(c.status)))return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  const required=[
    'assets/village/scene-manager.mjs','assets/village/village-performance.mjs',
    'src/gmww-members-live.js','src/player-web-src/30-rooms-and-realtime.part',
    'src/player-web-src/50-privacy-and-runtime.part',
    'tests/player-web-background-performance.test.mjs',
    'docs/releases/GMWW-PLAYER-WEB-BACKGROUND-PERFORMANCE-20261029.md'
  ];
  return required.every(path=>by.has(path))&&
    by.get('assets/village/village-performance.mjs')?.after?.includes("document.addEventListener('visibilitychange',visibility)")&&
    by.get('assets/village/scene-manager.mjs')?.after?.includes('if(!document.hidden)void sync()')&&
    by.get('src/player-web-src/30-rooms-and-realtime.part')?.after?.includes('if(document.hidden)return;sendPresence()')&&
    by.get('src/player-web-src/50-privacy-and-runtime.part')?.after?.includes('if(!document.hidden)checkWebUpdate()');
}

// PR603: isolated top-account icon repair. Do not treat the compiled Player bundle
// as a change to voting, roles, or realtime; unknown paths fail closed to full.
const playerAvatar603Paths=new Set([
  '.github/workflows/check-player-web-online-village.yml',
  'src/gmww-members-live.js',
  'src/player-web-src/20-village-and-profile.part',
  'tests/player-web-top-account-avatar-20261029.test.mjs',
  '.github/scripts/ci-browser-scope.mjs',
  'tests/ci-browser-scope.test.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/check-drunk-spiritualist.yml',
  '.github/workflows/check-player-card-browsers.yml',
  '.github/workflows/check-p0-chrome-edge-realtime.yml',
  '.github/workflows/check-dual-renderer.yml',
  '.github/workflows/build-server-game-ipa.yml'
]);
function isPlayerAvatar603Scope(changes){
  if(!Array.isArray(changes)||changes.length<4||changes.some(c=>
    !playerAvatar603Paths.has(c.path)||!['A','M'].includes(c.status)))return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  const required=[
    'src/gmww-members-live.js',
    'src/player-web-src/20-village-and-profile.part',
    'tests/player-web-top-account-avatar-20261029.test.mjs',
    '.github/workflows/check-player-web-online-village.yml'
  ];
  if(!required.every(x=>by.has(x)))return false;
  const part=String(by.get('src/player-web-src/20-village-and-profile.part')?.after||'');
  const test=String(by.get('tests/player-web-top-account-avatar-20261029.test.mjs')?.after||'');
  return part.includes('gmww-player-account-fallback') &&
    part.includes("account.classList.add('has-avatar')") &&
    part.includes("account.classList.remove('has-avatar')") &&
    part.includes('avatar.onload=') && part.includes('avatar.onerror=') &&
    test.includes('Menu avatar is static') &&
    test.includes('Account avatar appears only after loading');
}

// GitHub Actions replaces only the Cloudflare *build* for PR Previews.
// Exact infrastructure-only scope; any gameplay or unknown path runs full CI.
const githubPreviewCIPaths=new Set([
  '.github/workflows/check-pr-preview-github.yml',
  '.github/scripts/guard-pr-preview-ci.mjs',
  'tests/github-actions-pr-preview-ci.test.mjs',
  'docs/releases/GMWW-GITHUB-ACTIONS-PR-PREVIEW-20261029.md',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-dual-renderer.yml',
  '.github/workflows/deploy-production.yml'
]);
function isGithubPreviewCIOnly(changes){
  return Array.isArray(changes)&&changes.length>=7&&
    changes.every(c=>githubPreviewCIPaths.has(c.path)&&['A','M'].includes(c.status))&&
    changes.some(c=>c.path==='.github/workflows/check-pr-preview-github.yml')&&
    changes.some(c=>c.path==='tests/github-actions-pr-preview-ci.test.mjs');
}

// PR613 V3.274 — fail-closed, image-only Runtime scope; any extra path is full CI.
const artifact3274Allowed=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/check-gm-card-preview-centering-20261029.yml',
  '.github/scripts/prepare-update-channel.mjs',
  'docs/releases/GMWW-artifact-preview-centering-main-20261029.md',
  'package.json','package-lock.json','src/index.js',
  'server-game/src/00-core-and-library.part',
  'server-game/src/10-library-and-settings.part',
  'server-game/current/app.js','server-game/current/GMWW.html',
  'tests/artifact-preview-horizontal-centering-20261029.test.mjs',
  'tests/ci-browser-scope.test.mjs'
]);
function isArtifactPreview3274Scope(changes){
  if(!Array.isArray(changes)||changes.length<12||
     changes.some(x=>!artifact3274Allowed.has(x.path)||!['A','M'].includes(x.status)))return false;
  const has=new Set(changes.map(x=>x.path));
  for(const p of [
    'server-game/src/10-library-and-settings.part',
    'server-game/current/app.js','src/index.js','package.json','package-lock.json',
    '.github/workflows/deploy-production.yml',
    'tests/artifact-preview-horizontal-centering-20261029.test.mjs',
    'docs/releases/GMWW-artifact-preview-centering-main-20261029.md'
  ])if(!has.has(p))return false;
  try{
    const load=p=>fs.readFileSync(p,'utf8');
    const source=load('server-game/src/10-library-and-settings.part');
    const bundled=load('server-game/current/app.js');
    const helper=source.slice(source.indexOf('function artifactArtworkSideMargins('),source.indexOf('async function renderEntityFront()'));
    const pkg=JSON.parse(load('package.json'));
    return pkg.version==='3.274.0'&&
      JSON.parse(load('package-lock.json')).version===pkg.version&&
      load('src/index.js').includes('VERSION="V3.274",NATIVE_SHELL_VERSION="3.264",UPDATE_CHANNEL_REV="runtime-3274-artifact-preview-centering"')&&
      load('server-game/src/00-core-and-library.part').includes("const VERSION='3.274'")&&
      bundled.includes("const VERSION='3.274'")&&
      load('server-game/current/GMWW.html').includes('<title>GMWW V3.274</title>')&&
      source.includes('const offsetPercent=50*(margins.right-margins.left)')&&
      helper.includes('img.style.transform=')&&!helper.includes('scaleX(')&&!helper.includes('scaleY(')&&
      bundled.includes(helper)&&
      source.includes("if(kind==='artifacts'&&currentKind===kind&&editDraft?.id===e.id)")&&
      load('.github/scripts/prepare-update-channel.mjs').includes('V3.274 PR613:');
  }catch{return false}
}

// PR613 post-merge recovery: only CI policy and release gating may change.
// The Production gate fetches full Git history to verify the immutable ancestor.
// An ancestor check and live V3.274 artifact/role contract are mandatory.
const artifact3274RecoveryPaths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/GMWW-PR613-postmerge-ci-20261029.md'
]);
const artifact3274ProofPaths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/deploy-production.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/GMWW-PR613-release-proof-ci-20261029.md'
]);
const artifact3274PortraitProofPaths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/scripts/verify-character40-production.mjs',
  '.github/workflows/deploy-production.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/GMWW-PR613-character40-proof-ci-20261029.md'
]);
function isArtifactPreview3274RecoveryScope(changes){
  if(!Array.isArray(changes)||changes.some(c=>!['A','M'].includes(c.status)))return false;
  const paths=new Set(changes.map(x=>x.path));
  const exact=expected=>paths.size===expected.size&&
    [...paths].every(path=>expected.has(path));
  if(!((changes.length===5&&exact(artifact3274RecoveryPaths))||
       (changes.length===4&&exact(artifact3274ProofPaths))||
       (changes.length===5&&exact(artifact3274PortraitProofPaths))))return false;
  try{
    // The classifier also runs in shallow-checkout unit tests. The exact
    // ancestor is enforced by the Production deploy-scope and release gate.
    const file=p=>fs.readFileSync(p,'utf8');
    const art=file('server-game/src/10-library-and-settings.part');
    const app=file('server-game/current/app.js');
    const begin=art.indexOf('function artifactArtworkSideMargins(');
    const end=art.indexOf('async function renderEntityFront()',begin);
    if(begin<0||end<=begin)return false;
    const helper=art.slice(begin,end);
    return JSON.parse(file('package.json')).version==='3.274.0'&&
      file('src/index.js').includes('VERSION="V3.274",NATIVE_SHELL_VERSION="3.264"')&&
      art.includes('const offsetPercent=50*(margins.right-margins.left)')&&
      !helper.includes('scaleX(')&&!helper.includes('scaleY(')&&app.includes(helper)&&
      art.includes("if(kind==='artifacts'&&currentKind===kind&&editDraft?.id===e.id)")&&
      file('.github/scripts/prepare-update-channel.mjs').includes('V3.274 PR613:');
  }catch{return false}
}


// Exact CI-only GitHub Runtime OTA repair; unknown paths fail closed.
const githubRuntimeCIRepairPaths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  '.github/runtime-release/verify-package.test.mjs',
  'tests/ci-browser-scope.test.mjs'
]);
function isGithubRuntimeCIRepair(changes){
  if(!Array.isArray(changes)||changes.length!==githubRuntimeCIRepairPaths.size||
    changes.some(c=>c?.status!=='M'||!githubRuntimeCIRepairPaths.has(c.path)))return false;
  try{
    const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
    const check=fs.readFileSync('.github/workflows/check-player-web.yml','utf8');
    const start=deploy.indexOf('while IFS= read -r FILE');
    const end=deploy.indexOf('done < /tmp/gmww-production-change-scope.txt',start);
    if(start<0||end<start)return false;
    const scope=deploy.slice(start,end);
    return [
      '.github/workflows/github-runtime-ota.yml',
      '.github/runtime-release/verify-package.mjs',
      '.github/runtime-release/verify-package.test.mjs',
      'docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md'
    ].every(p=>scope.includes(p))&&
      check.includes("steps.scope.outputs.mode == 'github-runtime-ota-ci'")&&
      fs.existsSync('docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md');
  }catch{return false}
}

// PR628 — exact GM UI only: card face fit, Artifact gutter and outside-dismiss.
// Fail closed on unexpected paths/versions; every included UI pathway is tested.
const gmCardOutside3275Paths=new Set([
  'server-game/src/00-core-and-library.part',
  'server-game/src/10-library-and-settings.part',
  'server-game/src/50-roles-and-artifacts.part',
  'server-game/current/app.js',
  'server-game/current/style.css',
  'server-game/current/GMWW.html',
  'src/index.js',
  'package.json','package-lock.json',
  '.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/check-gm-card-preview-centering-20261029.yml',
  'tests/gm-card-fit-outside-dismiss-20261029.test.mjs',
  'tests/gm-card-outside-ci-scope-20261029.test.mjs',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/GMWW-artifact-card-outside-dismiss-20261029.md'
]);
function isGMCardOutside3275Scope(changes){
  if(!Array.isArray(changes)||changes.length!==gmCardOutside3275Paths.size||
     changes.some(c=>!['A','M'].includes(c?.status)||!gmCardOutside3275Paths.has(c.path))||
     new Set(changes.map(c=>c.path)).size!==gmCardOutside3275Paths.size)return false;
  try{
    const load=p=>fs.readFileSync(p,'utf8'),pkg=JSON.parse(load('package.json'));
    const library=load('server-game/src/10-library-and-settings.part');
    const ui=load('server-game/src/50-roles-and-artifacts.part');
    const bundle=load('server-game/current/app.js');
    const assembly=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','45-online-chat','50-roles-and-artifacts']
      .map(part=>load('server-game/src/'+part+'.part')).join('');
    return pkg.version==='3.275.0'&&
      JSON.parse(load('package-lock.json')).version===pkg.version&&
      JSON.parse(load('package-lock.json')).packages[''].version===pkg.version&&
      load('src/index.js').includes('VERSION="V3.275",NATIVE_SHELL_VERSION="3.264",UPDATE_CHANNEL_REV="runtime-3275-gm-card-fit-outside-dismiss"')&&
      load('server-game/current/GMWW.html').includes('<title>GMWW V3.275</title>')&&
      bundle===assembly&&
      library.includes('function fitPlayerCardTitle()')&&
      library.includes('title.scrollHeight>available+1')&&
      ui.includes('function gmwwDismissOutsidePointer(event)')&&
      ui.includes('gmwwBindOutsideDismiss();')&&
      load('server-game/current/style.css').includes('white-space:normal;overflow-wrap:anywhere')&&
      load('.github/scripts/prepare-update-channel.mjs').includes('V3.275 PR628:')&&
      load('.github/workflows/check-player-web.yml').includes("steps.scope.outputs.mode == 'gm-card-outside-3275'")&&
      load('docs/releases/GMWW-artifact-card-outside-dismiss-20261029.md').includes('V3.275');
  }catch{return false}
}

function isGithubNativeStage2Scope(changes){
  const required=new Set([
    'server-game/GMWW-Server/GameView.swift',
    'server-game/src/10-library-and-settings.part',
    'server-game/current/app.js',
    '.github/workflows/build-server-game-ipa.yml',
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/check-native-github-ota.yml',
    '.github/workflows/deploy-production.yml',
    'tests/native-github-first-ota-stage2.test.mjs',
    'docs/releases/GMWW-NATIVE-GITHUB-OTA-STAGE2-20261029.md'
  ]);
  if(!Array.isArray(changes)||changes.length!==required.size||
     changes.some(v=>!v||!required.has(v.path)||!['M','A'].includes(v.status)))return false;
  const get=path=>changes.find(v=>v.path===path)?.after||'';
  return [...required].every(p=>changes.some(c=>c.path===p))&&
    get('server-game/GMWW-Server/GameView.swift').includes('GMWW_NATIVE_GITHUB_OTA=true')&&
    get('server-game/GMWW-Server/GameView.swift').includes('verifyManualContainer')&&
    get('server-game/current/app.js').includes('gmwwNativePost("checkGithubRuntime")')&&
    get('.github/workflows/build-server-game-ipa.yml').includes('inputs.publish_ipa == true')&&
    get('tests/native-github-first-ota-stage2.test.mjs').includes('GitHub network-only fallback');
}

// P0 #630: allow only reviewed Online Player, public status projection and
// private chat fixes. Unknown files/branches still use the comprehensive suite.
const onlinePrivacy630Paths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  'src/gmww-members-live.js','src/gmww-player-private-card-patch.js',
  'src/gmww-public-room-contract.js','src/index.js',
  'src/player-web-src/00-bootstrap-and-session.part',
  'src/player-web-src/20-village-and-profile.part',
  'src/player-web-src/30-rooms-and-realtime.part',
  'src/player-web-src/35-online-chat.part',
  'src/player-web-src/40-cards-and-game.part',
  'tests/online-chat-authority.test.mjs',
  'tests/player-online-privacy-bottom-dock-20261029.test.mjs',
  'tests/player-web-online-actions-20261028.test.mjs',
  'tests/player-web-online-village-20261028.test.mjs',
  'tests/player-web-resume-receipt-runtime.test.mjs',
  'tests/player-web-top-account-avatar-20261029.test.mjs',
  'tests/status-visuals-v1.test.mjs',
  'docs/releases/GMWW-PLAYER-ONLINE-UI-SECURITY-20261029.md',
  // Same PR's immutable V3.276 Runtime release identity; no IPA changes.
  'package.json','package-lock.json','server-game/current/GMWW.html',
  'server-game/current/app.js','server-game/src/00-core-and-library.part','server-game/src/45-online-chat.part',
  '.github/scripts/prepare-update-channel.mjs'
]);
function isPlayerOnlinePrivacy630Scope(changes){
  if(!Array.isArray(changes)||!changes.length||changes.length>onlinePrivacy630Paths.size)return false;
  const byPath=new Map(changes.map(c=>[c.path,c]));
  const required=['src/index.js','src/gmww-public-room-contract.js','src/gmww-members-live.js',
    'src/player-web-src/35-online-chat.part','src/player-web-src/30-rooms-and-realtime.part',
    'tests/player-online-privacy-bottom-dock-20261029.test.mjs',
    'docs/releases/GMWW-PLAYER-ONLINE-UI-SECURITY-20261029.md'];
  if(!required.every(p=>byPath.has(p)))return false;
  for(const c of changes){
    if(!onlinePrivacy630Paths.has(c.path)||!['M','A'].includes(c.status))return false;
    if(c.path.startsWith('src/')&&c.status!=='M')return false;
    if(c.path==='src/gmww-public-room-contract.js'){
      const after=c.after?.replace('const canSee=display[statusId]===true;',
        'const canSee=Object.prototype.hasOwnProperty.call(display,statusId)?display[statusId]===true:statusId!=="marked";');
      if(after!==c.before)return false; // Only make legacy statuses more private
    }
    if(c.path==='src/index.js'){
      if(!c.after?.includes('channel:"gm:"+id,scope:"gm"')||
         !c.after.includes('frozen:meta?.statusDisplay?.frozen===true&&frozenLogins')||
         !c.after.includes('body:JSON.stringify({loginId:data.member.loginId,text:body.text,channel:'))return false;
    }
    if(c.path==='package.json'||c.path==='package-lock.json'||c.path==='server-game/current/GMWW.html'||
       c.path==='server-game/current/app.js'||c.path==='server-game/src/00-core-and-library.part'||
       c.path==='.github/scripts/prepare-update-channel.mjs'){
      if(!c.after||!c.before)return false;
      const released=c.after.replaceAll('3.276.0','3.275.0').replaceAll('V3.276','V3.275')
        .replaceAll("const VERSION='3.276'","const VERSION='3.275'");
      if(c.path!=='server-game/current/app.js'&&c.path!=='.github/scripts/prepare-update-channel.mjs'&&released!==c.before)return false;
      if(c.path==='server-game/current/app.js'&&!c.after.includes("const VERSION='3.276'"))return false;
      if(c.path==='.github/scripts/prepare-update-channel.mjs'&&!c.after.includes('V3.276 PR630:'))return false;
    }
    // GM chat reply is part of this change: ensure the edit stays inside its own UI,
    // never bypass a genuinely unreviewed GM/Worker/runtime modification.
    if(c.path==='server-game/src/45-online-chat.part'){
      if(!c.before||!c.after||!c.after.includes("startsWith('gm:')")||
         !c.after.includes("playRoomApi('/chat',{method:'POST'")||
         !c.after.includes("function gmwwGMChatRefresh("))return false;
    }
    if(c.path==='src/player-web-src/35-online-chat.part'){
      if(!c.after?.includes('function gmwwChatDockSync(')||
         c.after.includes('new SpeechSynthesisUtterance')||
         c.after.includes("confirm('Thực hiện "))return false;
    }
  }
  return true;
}


/* PR642 GM Chrome iOS: exact, fail-closed viewport-only release scope.
   Never classify arbitrary GM HTML/gameplay edits as a small CI change. */
const gmChromeViewportBase=new Map([
  ['server-game/current/GMWW.html','M'],
  ['tests/gm-chrome-ios-viewport-20261030.test.mjs','A'],
  ['.github/workflows/check-gm-chrome-ios-viewport.yml','A'],
  ['docs/releases/GMWW-GM-CHROME-IOS-VIEWPORT-20261030.md','A']
]);
const gmChromeViewportRelease=new Map([
  ['package.json','M'],['package-lock.json','M'],
  ['src/index.js','M'],['server-game/current/app.js','M'],
  ['server-game/src/00-core-and-library.part','M']
]);
export function isGMChromeIosViewportScope(changes){
  if(!Array.isArray(changes))return false;
  const release=changes.length===gmChromeViewportBase.size+gmChromeViewportRelease.size;
  if(changes.length!==gmChromeViewportBase.size&&!release)return false;
  const expected=new Map(gmChromeViewportBase);
  if(release)for(const [k,v] of gmChromeViewportRelease)expected.set(k,v);
  if(changes.some(c=>!c||expected.get(c.path)!==c.status)||
     new Set(changes.map(c=>c.path)).size!==expected.size)return false;
  const html=changes.find(c=>c.path==='server-game/current/GMWW.html');
  if(typeof html.before!=='string'||typeof html.after!=='string')return false;
  const actual=html.after.replace(/\n\n<!-- GM Server viewport:[\s\S]*?<\/script>\n\n/,'\n')
    .replace('<title>GMWW V3.278</title>','<title>GMWW V3.277</title>');
  if(actual!==html.before||!html.after.includes('id="gmwwChromeViewportScript"')||
     !html.after.includes('/CriOS\\//')||
     !html.after.includes('--gmww-gm-visible-height'))return false;
  if(release){
    for(const c of changes){
      if(!gmChromeViewportRelease.has(c.path))continue;
      if(typeof c.before!=='string'||typeof c.after!=='string')return false;
      let old=c.after;
      if(['package.json','package-lock.json'].includes(c.path))
        old=old.replaceAll('3.278.0','3.277.0');
      else if(c.path==='src/index.js')old=old.replaceAll('V3.278','V3.277');
      else old=old.replaceAll("'3.278'","'3.277'");
      if(old!==c.before)return false;
    }
  }
  return true;
}

// PR648_EXACT_FPS_SCOPE: diagnostic FPS sampling only, not game animation or realtime.
// Require the exact approved reporter delta. A wider change fails closed to full CI.
const pr648AllowedPaths=new Set([
  'assets/village/village-performance.mjs',
  'tests/player-web-background-performance.test.mjs',
  'tests/ci-browser-scope.test.mjs',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  '.github/workflows/build-server-game-ipa.yml',
  'docs/releases/GMWW-PR648-IPHONE-THERMAL-20261031.md'
]);
function isPr648ThermalScope(changes){
  if(!Array.isArray(changes)||changes.length!==pr648AllowedPaths.size||
    changes.some(c=>!c||!pr648AllowedPaths.has(c.path)||
      !(c.path.startsWith('docs/')?c.status==='A':c.status==='M')))return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  if(by.size!==pr648AllowedPaths.size)return false;
  const perf=by.get('assets/village/village-performance.mjs');
  if(typeof perf?.before!=='string'||typeof perf?.after!=='string')return false;
  const oldDecl='  let stopped=false,frameId=0,frames=0,lastFrame=performance.now(),fps=60,longTasks=0,worstLongTask=0;';
  const newDecl='  // Frame-by-frame FPS sampling is diagnostic only; do not keep an idle village at 60Hz.\n  const sampleFps=new URLSearchParams(window.location.search).get("gmwwPerf")==="1";\n  let stopped=false,frameId=0,frames=0,lastFrame=performance.now(),fps=null,longTasks=0,worstLongTask=0;';
  const oldResume='  const resumeFrames=()=>{if(stopped||document.hidden||frameId)return;frames=0;lastFrame=performance.now();frameId=requestAnimationFrame(frame)};';
  const newResume='  const resumeFrames=()=>{if(!sampleFps||stopped||document.hidden||frameId)return;frames=0;lastFrame=performance.now();frameId=requestAnimationFrame(frame)};';
  const previous=perf.after
    .replace(newDecl,oldDecl)
    .replace(newResume,oldResume)
    .replace('  if(sampleFps)resumeFrames();\n  let observer=null;','  resumeFrames();\n  let observer=null;');
  if(previous!==perf.before||perf.before===perf.after||
    !perf.after.includes(newDecl)||!perf.after.includes(newResume))return false;
  const test=String(by.get('tests/player-web-background-performance.test.mjs')?.after||'');
  const scopeTest=String(by.get('tests/ci-browser-scope.test.mjs')?.after||'');
  const browser=String(by.get('.github/workflows/check-player-web.yml')?.after||'');
  const legacy=String(by.get('.github/workflows/prepare-runtime-v3202-candidate.yml')?.after||'');
  const ipa=String(by.get('.github/workflows/build-server-game-ipa.yml')?.after||'');
  return test.includes('PR648 normal village has no idle FPS animation')&&
    scopeTest.includes('PR648 diagnostics-only FPS')&&
    browser.includes("steps.scope.outputs.mode == 'village-perf-diagnostics-648'")&&
    (legacy.includes("needs.scope.outputs.mode != 'village-perf-diagnostics-648'")||
     legacy.includes("needs.scope.outputs.mode == 'gm-ui-controls-3238'"))&&
    ipa.includes("needs.scope.outputs.mode != 'village-perf-diagnostics-648'");
}

// V3.279 PR645 postmerge: only the five CI/release-gate files may change.
// A gameplay file, missing path, duplicate or deletion always returns full CI.
function isPR645PostmergeReleaseScope(changes){
  const expected=new Set([
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/check-player-card-browsers.yml',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs'
  ]);
  const markers=new Map([
    ['.github/scripts/ci-browser-scope.mjs','function isPR645PostmergeReleaseScope(changes)'],
    ['.github/workflows/check-player-web.yml',"steps.scope.outputs.mode == 'pr645-postmerge-release'"],
    ['.github/workflows/check-player-card-browsers.yml',"needs.scope.outputs.mode == 'pr645-postmerge-release'"],
    ['.github/workflows/deploy-production.yml','# PR645 V3.279: postmerge browser gate repair'],
    ['tests/ci-browser-scope.test.mjs',"PR645 V3.279 postmerge CI repair:"]
  ]);
  return Array.isArray(changes)&&changes.length===expected.size&&
    new Set(changes.map(c=>c?.path)).size===expected.size&&
    changes.every(c=>c?.status==='M'&&expected.has(c.path)&&
      typeof c.after==='string'&&c.after.includes(markers.get(c.path)));
}
// PR652 V3.280: final selector ordering recovery, only three CI files.
// Every runtime source remains identical to the owner-accepted PR652 merge.
function isPR652FinalReleaseScope(changes){
  const markers=new Map([
    ['.github/scripts/ci-browser-scope.mjs','function isPR652FinalReleaseScope(changes)'],
    ['.github/workflows/deploy-production.yml','# PR652 V3.280: final selector ordering repair'],
    ['tests/ci-browser-scope.test.mjs','PR652 V3.280 final selector ordering recovery:']
  ]);
  if(!Array.isArray(changes)||changes.length!==markers.size||
    new Set(changes.map(c=>c?.path)).size!==markers.size)return false;
  if(!changes.every(c=>c?.status==='M'&&markers.has(c.path)&&
    typeof c.before==='string'&&typeof c.after==='string'&&c.after.includes(markers.get(c.path))))return false;
  // Historical PR652 audit still applies to the next Runtime-only audio update;
  // exact three-file CI markers and live Online/undo checks remain mandatory.
  if(!['3.280.0','3.281.0'].includes(JSON.parse(fs.readFileSync('package.json','utf8')).version))return false;
  return fs.readFileSync('src/index.js','utf8').includes('advanceNightRuntime(meta,"jump","gm-undo",undoIndex)') &&
    fs.readFileSync('server-game/current/app.js','utf8').includes('soi-can-canonical') &&
    fs.readFileSync('docs/releases/GMWW-ONLINE-WOLF-UNDO-CHAT-ICON-FIX-20261031.md','utf8').includes('ĐẠT');
}
// PR652 V3.280: only the exact five-file postmerge CI repair can use
// focused browser/Worker checks. The accepted gameplay commit remains immutable.
// Unknown paths, deletions, duplicate paths or unreviewed code fail closed.
function isPR652PostmergeReleaseScope(changes){
  const markers=new Map([
    ['.github/scripts/ci-browser-scope.mjs','function isPR652PostmergeReleaseScope(changes)'],
    ['.github/workflows/check-player-web.yml',"steps.scope.outputs.mode == 'pr652-postmerge-release'"],
    ['.github/workflows/check-player-card-browsers.yml',"needs.scope.outputs.mode == 'pr652-postmerge-release'"],
    ['.github/workflows/deploy-production.yml','# PR652 V3.280: exact postmerge CI-only release handshake'],
    ['tests/ci-browser-scope.test.mjs','PR652 V3.280 postmerge CI repair:']
  ]);
  if(!Array.isArray(changes)||changes.length!==markers.size||
     new Set(changes.map(c=>c?.path)).size!==markers.size)return false;
  if(!changes.every(c=>c?.status==='M'&&markers.has(c.path)&&
    typeof c.after==='string'&&typeof c.before==='string'&&c.after.includes(markers.get(c.path))))return false;
  return fs.readFileSync('src/index.js','utf8').includes('advanceNightRuntime(meta,"jump","gm-undo",undoIndex)') &&
    fs.readFileSync('server-game/current/app.js','utf8').includes('soi-can-canonical') &&
    fs.readFileSync('docs/releases/GMWW-ONLINE-WOLF-UNDO-CHAT-ICON-FIX-20261031.md','utf8').includes('ĐẠT');
}
// PR652: fail-closed, source-bounded Online hotfix. The only production edits
// are the night Undo endpoint, three GM battle UI blocks, and GM chat monitor.
// The packaged GM app must match all seven source modules byte-for-byte.
function isPR652OnlineHotfixScope(changes){
  const expected=new Map([
    ['src/index.js','M'],
    ['server-game/src/40-battle-and-timeline.part','M'],
    ['server-game/src/45-online-chat.part','M'],
    ['server-game/current/app.js','M'],
    ['tests/gmww-v3228-battle-icons-footer.test.mjs','M'],
    ['tests/v389-night-runtime-integration.test.mjs','M'],
    ['tests/online-wolf-undo-gm-chat-notices-20261031.test.mjs','A'],
    ['.github/workflows/check-online-five-defects-20261031.yml','A'],
    ['docs/releases/GMWW-ONLINE-WOLF-UNDO-CHAT-ICON-FIX-20261031.md','A'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['tests/ci-browser-scope.test.mjs','M']
  ]);
  if(!Array.isArray(changes)||changes.length!==expected.size||
     new Set(changes.map(c=>c?.path)).size!==expected.size||
     changes.some(c=>!c||expected.get(c.path)!==c.status||
       typeof c.after!=='string'||(c.status==='M'&&typeof c.before!=='string')))return false;
  const byPath=new Map(changes.map(c=>[c.path,c]));
  const bounded=(file,ranges)=>{
    const {before,after}=byPath.get(file);
    let old=before,now=after;
    for(const [start,end] of ranges){
      old=outsideScope(old,start,end);
      now=outsideScope(now,start,end);
      if(old===null||now===null)return false;
    }
    return old===now;
  };
  if(!bounded('src/index.js',[['  async gmBattleUndo(request,body){','  async gmInteraction(request,body){']]))return false;
  if(!bounded('server-game/src/40-battle-and-timeline.part',[
    ['function battleIconResolve(action){','function battleIconPositionKey('],
    ['function battleIconEntryPoint(){','function battleIconResetPositions(){'],
    ['function battleIconDock(actions,phase){','function battleIconTargetAt('],
    ['function battleShowResultPopup(','/* Morning notices']
  ]))return false;
  if(!bounded('server-game/src/45-online-chat.part',[
    ['/* GM Chat monitor: available only with GM-authorized room API. No public history path. */',null]
  ]))return false;
  const worker=byPath.get('src/index.js').after;
  const battle=byPath.get('server-game/src/40-battle-and-timeline.part').after;
  const chat=byPath.get('server-game/src/45-online-chat.part').after;
  const selector=byPath.get('.github/scripts/ci-browser-scope.mjs').after;
  const workflow=byPath.get('.github/workflows/check-player-web.yml').after;
  if(!worker.includes('advanceNightRuntime(meta,"jump","gm-undo",undoIndex)')||
     !worker.includes('UNDO_STATE_CHANGED')||
     !battle.includes('soi-can-canonical')||
     !battle.includes('const wanted=bounds.bottom+8')||
     !battle.includes('.play-village-core .play-core-pearl')||
     !chat.includes('function gmwwGMChatAvailable()')||
     !chat.includes("trigger.hidden=!(active&&playSceneState.step!=='battle')")||
     !selector.includes("return 'online-hotfix-652'")||
     !workflow.includes("steps.scope.outputs.mode == 'online-hotfix-652'"))return false;
  const names=['00-core-and-library.part','10-library-and-settings.part',
   '20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part',
   '45-online-chat.part','50-roles-and-artifacts.part'];
  const assembled=names.map(n=>fs.readFileSync('server-game/src/'+n,'utf8')).join('');
  if(byPath.get('server-game/current/app.js').after!==assembled)return false;
  return true;
}
// BEGIN PR654_V3283_AUDITED_SCOPE
// Fail-closed selection: all approved V3.283 bytes are Git-blob pinned.
// A new source change must be reviewed and re-pinned before scoped CI is allowed.
function isRoleNameAudio3283Scope(changes){
  const pins=new Map([
    [".github/runtime-release/V3.282-PR654-candidate.md","A","98a4dc50cd635e0a10fd54d336f4db9c337ade30"],
    [".github/scripts/prepare-update-channel.mjs","M","edd5a4cbd2607c6fa231da68833452c0d09a7627"],
    [".github/workflows/check-gm-audio-role-day.yml","M","7b6d6bed0cfd06b4f700438b8cf364a5b99290a0"],
    [".github/workflows/github-runtime-ota.yml","M","e1a54f290aa1b65c8245429104c221a83078c1a1"],
    ["docs/RELEASE_NOTES_AUDIO_TEN_VAI_TRO_20261031.md","A","405773851f93f79a28baf20c4417dff8be08ef40"],
    ["docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md","M","1448c7fbf65b412ba71c854005c17fa62f769768"],
    ["package-lock.json","M","5d99fbfb3d666aab34d735f2fbb8d3ccdafd0d8f"],
    ["package.json","M","adc6f284da72f941f17d3fc567bef3f9b3b01375"],
    ["server-game/current/GMWW.html","M","ada3413243bf3fd7c2e0a8ea7c1e3ab56470e9ae"],
    ["server-game/current/app.js","M","28c0d397c478c273305a304e0e3019a199136b8f"],
    ["server-game/src/00-core-and-library.part","M","7b351d605baa93da7a82f0266bf1b0d512a65396"],
    ["server-game/src/10-library-and-settings.part","M","2ce04729706c9792841cf0507e2d412634d16b13"],
    ["server-game/src/30-village-and-setup.part","M","5528ec23f9f81cf01aa2347e19f56238aad8cc5e"],
    ["src/index.js","M","e108a05b6832b3ea190fbb210434add96d94984d"],
    ["tests/audio-binding-integrity-20261027.test.mjs","M","59765e7c33bd9257e5be8ddf053d88ed76001c81"],
    ["tests/audio-independent-role-name-20261031.test.mjs","A","e33437a6ef470a25f1cfc8090225b2a2cc94f327"],
    ["tests/audio-role-day-flow-20261027.test.mjs","M","4f8a468d7b74a9a750eba8896a004e9148d84f85"],
    ["tests/audio-safe-delete-and-audit-20261031.test.mjs","A","c3b6f587436f5b66a432354b85a4ab33ece79ddb"],
    ["tests/ci-browser-scope.test.mjs","M","f0809de25ee7fbd28e9aabbec20c5cc9a9c87993"],
    ["tests/demo-assassin-gallows-divination.test.mjs","M","de699082c64d00721ae783ecea7b0b9fbb65b4ee"]
  ].map(([path,status,sha])=>[path,{status,sha}]));
  const special=new Map([
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M']
  ]);
  if(!Array.isArray(changes)||changes.length!==pins.size+special.size||
    new Set(changes.map(c=>c?.path)).size!==changes.length)return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  const gitBlob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0'+s,'utf8').digest('hex');
  for(const [path,{status,sha}] of pins){
    const c=by.get(path);
    if(!c||c.status!==status||typeof c.after!=='string'||
      (status==='M'&&typeof c.before!=='string')||gitBlob(c.after)!==sha)return false;
  }
  for(const [path,status] of special){
    const c=by.get(path);
    if(!c||c.status!==status||typeof c.after!=='string'||typeof c.before!=='string')return false;
  }
  const scopeSource=by.get('.github/scripts/ci-browser-scope.mjs').after;
  const baselineScope=scopeSource
    .replace(/\/\/ BEGIN PR654_V3283_AUDITED_SCOPE[\s\S]*?\/\/ END PR654_V3283_AUDITED_SCOPE\n/,'')
    .replace("  if(isRoleNameAudio3283Scope(changes))return 'role-name-audio-3283';\n",'')
    .replace("      if(isRoleNameAudio3283Scope(changes))return{mode:'role-name-audio-3283',reason:'PR654 audited V3.283 source and focused regression'};\n",'');
  if(gitBlob(baselineScope)!=='129c8b8befcfcc053485e9346d4a023c8009cb00')return false;
  const checkSource=by.get('.github/workflows/check-player-web.yml').after;
  const baselineCheck=checkSource.replace(/      # BEGIN PR654_V3283_AUDITED_CI[\s\S]*?      # END PR654_V3283_AUDITED_CI\n/,'');
  if(gitBlob(baselineCheck)!=='14ff947d3260912ada522f2fe78b6fb5417fa966')return false;
  const app=by.get('server-game/current/app.js').after;
  const names=['00-core-and-library.part','10-library-and-settings.part',
    '20-members-and-roster.part','30-village-and-setup.part',
    '40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
  try{
    return app===names.map(name=>fs.readFileSync('server-game/src/'+name,'utf8')).join('') &&
      by.get('package.json').after.includes('"version": "3.283.0"') &&
      by.get('src/index.js').after.includes('VERSION="V3.283"') &&
      by.get('tests/audio-safe-delete-and-audit-20261031.test.mjs').after.includes('audio');
  }catch{return false}
}
// END PR654_V3283_AUDITED_SCOPE
// V3.281 PR654: exact GM-only role-name Audio Runtime; no Worker API,
// Player Web or native shell changes. Any unexpected path fails closed.
function isRoleNameAudio3281Scope(changes){
  const expected=new Map([
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/scripts/prepare-update-channel.mjs','M'],
    ['.github/workflows/check-gm-audio-role-day.yml','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['docs/RELEASE_NOTES_AUDIO_TEN_VAI_TRO_20261031.md','A'],
    ['docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md','M'],
    ['package-lock.json','M'],['package.json','M'],
    ['server-game/current/GMWW.html','M'],['server-game/current/app.js','M'],
    ['server-game/src/00-core-and-library.part','M'],
    ['server-game/src/10-library-and-settings.part','M'],
    ['server-game/src/30-village-and-setup.part','M'],
    ['src/index.js','M'],
    ['tests/audio-binding-integrity-20261027.test.mjs','M'],
    ['tests/audio-independent-role-name-20261031.test.mjs','A'],
    ['tests/demo-assassin-gallows-divination.test.mjs','M'],
    ['tests/ci-browser-scope.test.mjs','M']
  ]);
  if(!Array.isArray(changes)||changes.length!==expected.size||
    new Set(changes.map(c=>c?.path)).size!==expected.size||
    changes.some(c=>!c||expected.get(c.path)!==c.status||
      typeof c.after!=='string'||(c.status==='M'&&typeof c.before!=='string')))
    return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  const versionOnly=(path,from,to,count=1)=>{
    const {before,after}=by.get(path);
    return before.split(from).length-1===count&&before.split(from).join(to)===after;
  };
  if(!versionOnly('src/index.js','VERSION="V3.280"','VERSION="V3.281"')||
    !versionOnly('server-game/src/00-core-and-library.part',"const VERSION='3.280';","const VERSION='3.281';")||
    !versionOnly('server-game/current/GMWW.html','<title>GMWW V3.280</title>','<title>GMWW V3.281</title>')||
    !versionOnly('package.json','"version": "3.280.0"','"version": "3.281.0"')||
    !versionOnly('package-lock.json','"version": "3.280.0"','"version": "3.281.0"',2))
    return false;
  const bounded=(path,start,end)=>{
    const {before,after}=by.get(path);
    const oldOutside=outsideScope(before,start,end),newOutside=outsideScope(after,start,end);
    return oldOutside!==null&&oldOutside===newOutside;
  };
  if(!bounded('server-game/src/10-library-and-settings.part',
      'async function audioBindingStatus(', 'function bindCore(')||
    !bounded('server-game/src/30-village-and-setup.part',
      'const battleAudioReady=', 'function battleTurnAudioCue('))
    return false;
  // Lock the reviewed module bytes; an arbitrary function injected inside
  // the otherwise audio-only region cannot bypass the release gate.
  const gitBlob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0'+s,'utf8').digest('hex');
  if(gitBlob(by.get('server-game/src/10-library-and-settings.part').after)!=='20ffbcbbb2d48b9b8cc9a76ce405287ff17ce226'||
    gitBlob(by.get('server-game/src/30-village-and-setup.part').after)!=='5528ec23f9f81cf01aa2347e19f56238aad8cc5e')return false;
  const gm=by.get('server-game/current/app.js').after;
  const names=['00-core-and-library.part','10-library-and-settings.part',
    '20-members-and-roster.part','30-village-and-setup.part',
    '40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
  if(gm!==names.map(n=>fs.readFileSync('server-game/src/'+n,'utf8')).join(''))
    return false;
  const library=by.get('server-game/src/10-library-and-settings.part').after;
  const audio=by.get('server-game/src/30-village-and-setup.part').after;
  const worker=by.get('src/index.js').after;
  if(!library.includes('gmwwOpenRoleAudioReplace')||
    !library.includes("audioBlobKey('cards-name',a.id)")||
    library.includes('gmwwOpenAudioNameEditor')||
    !audio.includes("audioKindForSource=nameOnly?'cards-name':kind")||
    !audio.includes('const requestedCut=null')||
    !gm.includes("battlePlayConfiguredAudio('cards',target.roleId||'',roleName,false,null,1)")||
    !worker.includes('NATIVE_SHELL_VERSION="3.264"')||
    !worker.includes('UNDO_STATE_CHANGED'))
    return false;
  const release=by.get('.github/scripts/prepare-update-channel.mjs');
  if(release.after.replace(/"V3\.281 PR654:[^"]+",/,'')!==release.before)return false;
  const qa=by.get('docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md');
  if(!qa.after.startsWith(qa.before)||!qa.after.includes('PR #654 — đóng gói ứng viên Runtime V3.281'))
    return false;
  if(!by.get('docs/RELEASE_NOTES_AUDIO_TEN_VAI_TRO_20261031.md').after.includes('V3.281')||
    !by.get('tests/audio-independent-role-name-20261031.test.mjs').after.includes('Role-name playback honors separately linked source')||
    !by.get('.github/workflows/check-gm-audio-role-day.yml').after.includes('tests/audio-independent-role-name-20261031.test.mjs'))
    return false;
  return by.get('.github/scripts/ci-browser-scope.mjs').after.includes('function isRoleNameAudio3281Scope(changes)')&&
    by.get('.github/workflows/check-player-web.yml').after.includes("steps.scope.outputs.mode == 'role-name-audio-3281'")&&
    by.get('tests/ci-browser-scope.test.mjs').after.includes('PR654 V3.281 strict role-name audio release scope');
}

// BEGIN PR662_V3284_EXACT_AUDITED_SCOPE
// Combined PR654 Audio + PR659 version drift. Unreviewed bytes always run full CI.
function isPr662V3284Scope(changes){
  const pins=new Map([
    [".github/runtime-release/V3.282-PR654-candidate.md","A","98a4dc50cd635e0a10fd54d336f4db9c337ade30"],
    [".github/scripts/prepare-update-channel.mjs","M","9ac3785868c1cefdda029966524541b448584008"],
    [".github/scripts/runtime-server-drift-scope.mjs","A","41df76a8767c8045f4adf028b95c63277127bd95"],
    [".github/workflows/check-gm-audio-role-day.yml","M","7b6d6bed0cfd06b4f700438b8cf364a5b99290a0"],
    [".github/workflows/check-player-web.yml","M","234dffaaaa620731accea255659e040e8f2d146f"],
    [".github/workflows/check-runtime-server-version-drift.yml","A","9f86962738ba71e255b95fd42bbcaa0d82139e90"],
    [".github/workflows/deploy-production.yml","M","de54dbff6adf02449cd06e1aeb25e4756b20644a"],
    [".github/workflows/github-runtime-ota.yml","M","1d51c847ba92931de72436ee154026cd9eb42a4e"],
    ["docs/RELEASE_NOTES_AUDIO_TEN_VAI_TRO_20261031.md","A","405773851f93f79a28baf20c4417dff8be08ef40"],
    ["docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md","M","1448c7fbf65b412ba71c854005c17fa62f769768"],
    ["docs/releases/GMWW-RUNTIME-SERVER-DRIFT-20261031.md","A","4757423f647faf71d6ef67f4d2637ca9a941d79d"],
    ["docs/releases/GMWW-V3.284-PR654-PR659-INTEGRATION-20261031.md","A","0fa8be0ddc7465a9224356092f4df17829ea7ed6"],
    ["package-lock.json","M","1810e7357fa15c332206639fe081129c7790dd47"],
    ["package.json","M","cd6ac3ff83bfa864a19939f4d8b32d9c460c82f4"],
    ["server-game/current/GMWW.html","M","075572cba3e0b36f7cf48f5937f12a2f863ab1d6"],
    ["server-game/current/app.js","M","68fe00555a68faa370b502d5b8e0e4fb5922586f"],
    ["server-game/src/00-core-and-library.part","M","e47a8af48a9f18f88408a809849d44f2a929bc96"],
    ["server-game/src/10-library-and-settings.part","M","30af1e80f8ec83415fdbb858cb3c8ef03b3bc9fb"],
    ["server-game/src/20-members-and-roster.part","M","acbb87ad0aadd3a68bd81d88f2d3c39b162fd8c0"],
    ["server-game/src/30-village-and-setup.part","M","5528ec23f9f81cf01aa2347e19f56238aad8cc5e"],
    ["src/index.js","M","a9a3724a0b5303fa491a7f8544bbb6597f64bdb1"],
    ["tests/audio-binding-integrity-20261027.test.mjs","M","59765e7c33bd9257e5be8ddf053d88ed76001c81"],
    ["tests/audio-independent-role-name-20261031.test.mjs","A","e33437a6ef470a25f1cfc8090225b2a2cc94f327"],
    ["tests/audio-role-day-flow-20261027.test.mjs","M","4f8a468d7b74a9a750eba8896a004e9148d84f85"],
    ["tests/audio-safe-delete-and-audit-20261031.test.mjs","A","c3b6f587436f5b66a432354b85a4ab33ece79ddb"],
    ["tests/ci-browser-scope.test.mjs","M","f0809de25ee7fbd28e9aabbec20c5cc9a9c87993"],
    ["tests/demo-assassin-gallows-divination.test.mjs","M","de699082c64d00721ae783ecea7b0b9fbb65b4ee"],
    ["tests/runtime-server-drift-scope.test.mjs","A","cf79f138e86b5af756f7181dd8db911d6af0e092"],
    ["tests/runtime-server-version-drift.test.mjs","A","040f2295783c33261ba5e2b17f41984476d5d125"],
    ["tests/runtime-v3284-654-659-integration.test.mjs","A","cabd2c69507eedffb851e11037f0bd4e575f94c3"]
  ].map(([path,status,sha])=>[path,{status,sha}]));
  if(!Array.isArray(changes)||changes.length!==pins.size+1||
     new Set(changes.map(c=>c.path)).size!==changes.length)return false;
  const by=new Map(changes.map(c=>[c.path,c]));
  const digest=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0'+s,'utf8').digest('hex');
  for(const [path,{status,sha}] of pins){
    const c=by.get(path);
    if(!c||c.status!==status||typeof c.after!=='string'||
       (status==='M'&&typeof c.before!=='string')||digest(c.after)!==sha)return false;
  }
  const self=by.get('.github/scripts/ci-browser-scope.mjs');
  if(!self||self.status!=='M'||typeof self.after!=='string')return false;
  const baseline=self.after.replace(/\/\/ BEGIN PR662_V3284_EXACT_AUDITED_SCOPE[\s\S]*?\/\/ END PR662_V3284_EXACT_AUDITED_SCOPE\n/,'')
    .replace("  if(isPr662V3284Scope(changes))return 'audio-drift-integrated-3284';\n",'');
  if(digest(baseline)!=="0ee7db5c1c245cb0594c6558ee1a3a084f3c087f")return false;
  return by.get('package.json').after.includes('"version": "3.284.0"')&&
    by.get('server-game/current/app.js').after.includes("gmwwUpdateAlignment(gmwwRuntimeVersion(),server,latest)==='runtime_ahead'")&&
    by.get('server-game/src/10-library-and-settings.part').after.includes('data-audio-name-play')&&
    by.get('.github/workflows/check-player-web.yml').after.includes("steps.scope.outputs.mode == 'audio-drift-integrated-3284'")&&
    by.get('.github/workflows/github-runtime-ota.yml').after.includes('RELEASE_MAX=');
}
// END PR662_V3284_EXACT_AUDITED_SCOPE
function classifyBrowserScope(changes){
  if(isPagesAliasScope(changes))return 'pages-alias';
  if(isPr662V3284Scope(changes))return 'audio-drift-integrated-3284';
  if(isRuntimeDriftScope(changes))return 'runtime-server-drift';
  if(isRoleNameAudio3283Scope(changes))return 'role-name-audio-3283';
  if(isRoleNameAudio3281Scope(changes))return 'role-name-audio-3281';
  if(isPR652FinalReleaseScope(changes))return 'pr652-postmerge-release';
  if(isPR652PostmergeReleaseScope(changes))return 'pr652-postmerge-release';
  if(isPR652OnlineHotfixScope(changes))return 'online-hotfix-652';
  if(isPR645PostmergeReleaseScope(changes))return 'pr645-postmerge-release';
  if(isPr648ThermalScope(changes))return 'village-perf-diagnostics-648';
  if(isGMChromeIosViewportScope(changes))return 'gm-chrome-ios-viewport';
  const interactions=playerInteractionsScope(changes);if(interactions)return interactions;
  if(isPlayerOnlinePrivacy630Scope(changes))return "player-online-privacy-630";
  if(isGithubNativeStage2Scope(changes))return 'native-github-ota-stage2';
  if(isGithubRuntimeCIRepair(changes))return "github-runtime-ota-ci";
  if(isGMCardOutside3275Scope(changes))return "gm-card-outside-3275";
  if(isArtifactPreview3274RecoveryScope(changes))return 'artifact-preview-3274-postmerge';
  if(isArtifactPreview3274Scope(changes))return 'artifact-preview-3274';
  if(isGithubPreviewCIOnly(changes))return 'github-pr-preview-ci';
  if(isPlayerAvatar603Scope(changes))return 'player-top-avatar-603';
  if(isPlayerWebBackgroundPerformanceScope(changes))return 'player-web-background-performance';
  if(gmAdmin3272Scope(changes))return 'gm-admin-top-chat-3272';
  if(isOnlineVillage3273Scope(changes))return 'player-online-village-3273';
  if(isDemoPlayerLive3271Scope(changes))return 'demo-player-live-3271';
  if(isDemoAudioSync3270Scope(changes))return 'demo-audio-sync-3270';
  if(isHybridDemo587Scope(changes))return 'demo-hybrid-587';
  if(isMorningAudio3267Scope(changes))return 'gm-audio-morning-3267';
  if(isOnlineChatScope(changes))return 'online-chat-audio';
  if(isLeanPackaging3264Scope(changes))return 'ipa-ota-lean-3264';
  if(isGMFireRadius3262Scope(changes))return 'gm-fire-radius-3262';
  if(isGMFireWalk3261Scope(changes))return 'gm-fire-walk-3261';
  if(isDrunkCardOverlayScope(changes))return 'drunk-card-overlay-20261028';
  if(isGMVote3259PostverifyScope(changes))return 'gm-vote-postverify-3259';
  if(isGMVote3259Scope(changes))return 'gm-vote-3259';
  if(isGMWWAudio3258Scope(changes))return 'gm-audio-3258';
  if(isNativeManualReleaseVerifyScope(changes))return 'native-manual-release-verify';
  if(isManualRuntimeScope(changes))return "manual-runtime";
  if(isGMFireWalk3256Scope(changes))return 'gm-fire-walk-3256';
 if(isCharacter40V3254PostverifyScope(changes))return 'character40-postverify-3254';
 if(isGMPerformance3254Scope(changes))return 'gm-performance-thermal-3254';
  if(isGMTurnMotionScope(changes))return 'gm-turn-motion-lowheat';
  if(isRuntime248PostMergeScope(changes))return 'runtime-3248-postmerge';
  if(isRuntime248SetupUiScope(changes))return 'runtime-3248-setup-ui';
  if(isIcon247PostMergeScope(changes))return 'icon-scale-3247-postmerge';
  if(isIcon247Scope(changes))return 'icon-scale-3247';
  if(isRules550Scope(changes))return 'night02-rule-regression-550';
  // A partial/expanded PR550 change must never masquerade as a historic CI-only scope.
  if(Array.isArray(changes)&&changes.some(c=>
    c?.path==='tests/gmww-rule-snow-guard-pack-fairy.test.mjs'||
    (!stableCIPolicyPaths.has(c?.path)&&String(c?.after||'').includes('PR550 test-only rule regression'))))return 'full';
  if(isFairy246PostMergeScope(changes))return 'fairy-246-postmerge';
  if(isFairy246Scope(changes))return 'fairy-triptych-3246';
  if(isNight02Scope(changes))return 'night02-pack-roles';
  if(isPlayerReceiptHotfixScope(changes))return 'player-receipt-hotfix';
  if(isTimeline244Scope(changes))return 'timeline-six-center-3244';
  if(isLobbyGather541Scope(changes))return 'lobby-gather-541';
  if(isFairy3242PolicyScope(changes))return 'fairy-ci-policy';
  if(isFairy3242Scope(changes))return 'fairy-audio-3242';
  if(isWITCH01Scope(changes))return 'witch01-old-witch';
  if(isWOLF01Scope(changes))return 'wolf01-private-pack';
  if(isPostMatch532Scope(changes))return 'post-match-room-532';
  if(isPostMatchCIOnlyScope(changes))return 'postmatch-ci-532';
  if(isART01DeployGateScope(changes))return 'art01-deploy-gate';
  if(isART01NightFlowScope(changes))return 'art01-night-flow';
  if(isGM238DeployGateRecovery(changes))return 'gm238-deploy-repair';
  if(isGM238UniformMenuScope(changes))return 'gm-ui-controls-3238';
  if(isGM237MenuFooterScope(changes))return 'gm-ui-menu-3237';
  if(isGM236CampfireGallowsScope(changes))return 'gm-menu-gallows-3236';
  if(isGM235GlassDockScope(changes))return 'gm-ui-glass-3235';
  if(isGM3234PostMergeReleaseGateScope(changes))return 'phase-dock-gallows-3234';
  if(isPhaseDockGallows3234Scope(changes))return 'phase-dock-gallows-3234';
  if(isIconArtworkPolicyScope(changes))return 'icon-artwork-policy';
  if(isIconArtworkScope(changes))return 'icon-artwork';
  if(isGM3233AudioUICIScope(changes))return 'gm-ui-audio-3233';
  if(isRuntimeWarning3232Scope(changes))return 'runtime-warning-3232';
  if(isGMEntryIcons3231Scope(changes))return 'entry-icons-3231';
  if(isMaintenanceNotice3230Scope(changes))return 'settings-notices-3230';
  if(isDOOptimizer3228Scope(changes))return 'do-optimizer-3228';
  if(isIconV2CIRepairScope(changes))return 'icon-v2-ci-fix';
  if(isGMIcons501ReleaseScope(changes))return 'gm-icons-501-release';
  if(isGMIcons501Scope(changes))return 'gm-icons-501';
  if(isAutoVanCIPolicyScope(changes))return 'auto-van-ci';
  if(isAutoVanReleaseScope(changes))return 'auto-van-3222';
  if(!Array.isArray(changes)||!changes.length)return 'full';
  if(isGMFooter3229Scope(changes))return 'gm-footer-3229';
  if(isIconActionV23227Scope(changes))return 'icon-action-v2-3227';
  if(isFireIcons3226Scope(changes))return 'fire-icons-3226';
  if(isActionIcon3225Scope(changes))return 'active-icons-3225';
  if(isArenaHome3223Scope(changes))return 'arena-home-3223';
  if(isRanking3221Scope(changes))return 'ranking-3221';
  if(isHomeSea3219Scope(changes))return 'home-sea-3219';
  if(isAudio3217Scope(changes))return 'audio-fix-3217';
  if(isHomePodium3214Scope(changes))return 'home-podium-3214';
  if(isHomeSea3216Scope(changes))return 'home-sea-3216';
  if(isIconWave3218Scope(changes))return 'icon-wave5-3218';
  if(isIconGame3215Scope(changes))return 'icon-game-3215';
  if(isIconWave3213Scope(changes))return 'icon-wave3-3213';
  if(isIconClean3212Scope(changes))return 'icon-clean-3212';
  if(isIcon3210DispatchGateScope(changes))return 'icon-runtime-3210';
  if(isHomePodium3211Scope(changes))return 'home-podium-3211';
  if(isIconRuntime3210Scope(changes))return 'icon-runtime-3210';
  if(isAudioGallows209Scope(changes))return 'audio-gallows-3209';
  if(isAudio208Scope(changes))return 'audio-v3208';
  if(isStableCIPolicyScope(changes)||isPolicyScope(changes))return 'ci-policy';
  if(isDemo475Scope(changes)||isDemo475ReleaseScope(changes)||isDemo475FinalGateScope(changes)||isDemo475CompletionScope(changes)||isDemo475FinalGateScope(changes))return 'demo-475';
  if(isGallowsScope(changes)||isGallowsVisual205Scope(changes))return 'gallows';
  if(isP0Scope(changes))return 'p0-roster';
  if(isDualRendererScope(changes))return 'dual-renderer';
  for(const {path,before,after,status} of changes){
    if(!path||!['M','A'].includes(status))return 'full';
    if(notesPath.test(path)||testPath.test(path))continue;
    // Room DTO is large and shared with seats/cards: allow ONLY the exact
    // extra result-identity field, never arbitrary changes to publicRoom().
    if(path==='src/gmww-public-room-contract.js'){
      if(status!=='M'||typeof before!=='string'||typeof after!=='string')return 'full';
      const normalized=s=>s.replace(',lastEndedMatchId:m.lastEndedMatchId||null','');
      if(normalized(before)!==normalized(after))return 'full';
      continue;
    }
    const markers=scopedMarkers[path];
    if(!markers||status!=='M')return 'full';
    const oldOutside=outsideScope(before,...markers),newOutside=outsideScope(after,...markers);
    if(oldOutside===null||newOutside===null||oldOutside!==newOutside)return 'full';
  }
  return 'postgame';
}

function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:20*1024*1024})}
function isDrunkV3260PostMergeScope(changes){
  const exact=new Map([
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-drunk-spiritualist.yml','M']
  ]);
  if(!Array.isArray(changes)||changes.length!==exact.size||
    changes.some(c=>exact.get(c.path)!==c.status))return false;
  try{
    const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
    const worker=fs.readFileSync('src/index.js','utf8');
    const gm=fs.readFileSync('server-game/current/app.js','utf8');
    const web=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
    const ota=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
    const original=fs.readFileSync('src/player-web-src/10-role-card-artwork.part','utf8')
      .match(/const src='data:image\/webp;base64,([A-Za-z0-9+/=]+)'/)?.[1];
    execFileSync('git',['merge-base','--is-ancestor',
      'a5488dcc3ee249c416da43183a075d258c095c3e','HEAD']);
    return pkg.version==='3.260.0'&&worker.includes('VERSION="V3.260"')&&
      worker.includes('NATIVE_SHELL_VERSION="3.257"')&&
      gm.includes("const VERSION='3.260'")&&
      web.includes("document.getElementById('game').appendChild(panel)")&&
      !!original&&fs.readFileSync('assets/role-card-back.webp')
        .equals(Buffer.from(original,'base64'))&&
      ota.includes("copy('assets/role-card-back.webp','role-card-back.webp')")&&
      fs.existsSync('docs/releases/GMWW-DRUNK-CARD-OVERLAY-20261028.md');
  }catch{return false}
}

function cardRule3263MainScope(){
  try{
    if(process.env.GMWW_CI_EVENT!=='push'||process.env.GITHUB_REF!=='refs/heads/main'||
       JSON.parse(fs.readFileSync('package.json','utf8')).version!=='3.263.0')return false;
    // Inspect the full actual release diff, not just a version-bump follow-up.
    // V3.262 is the pinned, already-shipped and immutable release baseline.
    const base='ad501902144aee1eb4e679f8b4f1334eda73099d';
    git('merge-base','--is-ancestor',base,'HEAD');
    const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
    const changes=rows.map(s=>s.split('\t'));
    const allowed=new Set([".github/workflows/check-card-rule-audit.yml","docs/audits/card-rule-audit-20261028.md","docs/audits/card-rule-catalog-20261028.json","docs/releases/GMWW-CARD-RULE-AUDIT-20261028.md","docs/superpowers/plans/2026-10-28-card-rule-audit.md","server-game/current/app.js","server-game/current/battle-controls.js","server-game/src/00-core-and-library.part","server-game/src/10-library-and-settings.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/gmww-battle-action-policy.js","src/gmww-cycle-effect-expiry.js","src/gmww-delivery-snapshot.js","src/gmww-pack-night-rules.js","src/gmww-private-card-contract.js","src/gmww-wolf-night-resolution.js","src/gmww-wolf-recognition.js","src/index.js","tests/card-divination-audit-20261028.test.mjs","tests/card-rule-contract-audit-20261028.test.mjs","tests/v389-night-runtime-integration.test.mjs",".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","package.json","package-lock.json","server-game/current/GMWW.html","docs/releases/GMWW-V3.263-card-rule-executors-20261028.md"]);
    const files=changes.map(c=>c[1]);
    if(changes.length<10||changes.some(c=>!['M','A'].includes(c[0])||!allowed.has(c[1]))||
       !["src/index.js","server-game/current/app.js","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","src/gmww-cycle-effect-expiry.js","src/gmww-delivery-snapshot.js","tests/v389-night-runtime-integration.test.mjs","package.json","package-lock.json","docs/releases/GMWW-V3.263-card-rule-executors-20261028.md"].every(p=>files.includes(p)))return false;
    const worker=fs.readFileSync('src/index.js','utf8'),gm=fs.readFileSync('server-game/current/app.js','utf8');
    return worker.includes('VERSION="V3.263"')&&gm.includes("const VERSION='3.263'")&&
       gm.includes('cy+Math.sin(angle)*radius')&&
       worker.includes('artifact_action_lock_function')&&
       worker.includes('deferredArtifact==="artifact_07"')&&
       worker.includes('removedFromMatch=true')&&
       fs.existsSync('docs/releases/GMWW-V3.263-card-rule-executors-20261028.md');
  }catch{return false}
}


const gatherPinch3265Files=new Set([
  '.github/scripts/prepare-update-channel.mjs',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-lobby-gather-assassin.yml',
  '.github/workflows/check-player-web.yml',
  'assets/village/village-layout.js',
  'docs/releases/GMWW-V3.265-gather-pinch-spacing-20261028.md',
  'package-lock.json','package.json',
  'server-game/current/GMWW.html','server-game/current/app.js',
  'server-game/current/style.css',
  'server-game/src/00-core-and-library.part','server-game/src/30-village-and-setup.part',
  'src/index.js',
  'tests/gather-spacing-gm-menu.test.mjs',
  'tests/gm-gather-pinch-spacing-v3265.test.mjs',
  'tests/seat-free-map-drag-v3198.test.mjs',
  'tests/gmww-v3128-seat-geofence-rewrite.test.mjs',
  'tests/gmww-v3129-seat-anchor-sync.test.mjs',
  'tests/v3183-seat-perimeter-contract.test.mjs'
]);
function isGatherPinch3265Scope(changes){
  if(!changes?.length||changes.some(c=>!gatherPinch3265Files.has(c.path)||!['A','M'].includes(c.status)))return false;
  const touched=new Set(changes.map(c=>c.path));
  for(const required of [
    'assets/village/village-layout.js','server-game/src/30-village-and-setup.part',
    'server-game/current/app.js','server-game/current/GMWW.html',
    'src/index.js','tests/gm-gather-pinch-spacing-v3265.test.mjs',
    'docs/releases/GMWW-V3.265-gather-pinch-spacing-20261028.md',
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml'
  ])if(!touched.has(required))return false;
  const worker=fs.readFileSync('src/index.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const layout=fs.readFileSync('assets/village/village-layout.js','utf8');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  return pkg.version==='3.265.0' &&
    worker.includes('VERSION="V3.265",NATIVE_SHELL_VERSION="3.264"') &&
    html.includes('<title>GMWW V3.265</title>') &&
    !html.includes('id="playGatherSpacing" type="range"') &&
    layout.includes('Math.max(50,Math.min(300,Math.round(n)))');
}

// V3.268 is a narrowly bounded GM template layout fix. Old Player receipt,
// unrelated gameplay, 3D and Native IPA checks must not gate this OTA.
const templateDock3268Paths=new Set([
  '.github/scripts/ci-browser-scope.mjs',
  '.github/scripts/prepare-update-channel.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-game-template-dock-v3268.yml',
  'docs/releases/GMWW-V3.268-game-template-magnetic-dock-20261028.md',
  'package.json','package-lock.json',
  'server-game/current/GMWW.html','server-game/current/app.js','server-game/current/style.css',
  'server-game/src/00-core-and-library.part',
  'server-game/src/40-battle-and-timeline.part',
  'server-game/src/50-roles-and-artifacts.part',
  'src/index.js','tests/gmww-v3268-game-sheet-bottom-dock.test.mjs',
  'tests/lobby-gather-mode-assassin-20261027.test.mjs'
]);
function isTemplateDock3268Scope(changes){
  if(!Array.isArray(changes)||!changes.length||
      changes.some(c=>!templateDock3268Paths.has(c.path)||!['M','A'].includes(c.status)))return false;
  const touched=new Set(changes.map(c=>c.path));
  for(const required of [
    '.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml',
    'server-game/src/50-roles-and-artifacts.part','server-game/src/40-battle-and-timeline.part',
    'server-game/current/app.js','server-game/current/GMWW.html',
    'src/index.js','tests/gmww-v3268-game-sheet-bottom-dock.test.mjs',
    'docs/releases/GMWW-V3.268-game-template-magnetic-dock-20261028.md'
  ])if(!touched.has(required))return false;
  try{
    const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
    const worker=fs.readFileSync('src/index.js','utf8');
    const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
    const source=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
    return pkg.version==='3.268.0'&&
      worker.includes('VERSION="V3.268",NATIVE_SHELL_VERSION="3.264"')&&
      html.includes('<title>GMWW V3.268</title>')&&
      html.includes('id="playGameDockToggle"')&&
      source.includes("GMWW_GAME_SHEET_DOCK_KEY='gmww_game_template_dock_v2'")&&
      fs.existsSync('docs/releases/GMWW-V3.268-game-template-magnetic-dock-20261028.md');
  }catch{return false}
}

export function isPlayerOnlinePrivacy630Release(changes,previousChanges=[]){
  if(isPlayerOnlinePrivacy630Scope(changes))return true;
  const repair=new Map([
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['tests/pr630-release-ci.test.mjs','A'],
    ['docs/releases/GMWW-PLAYER-ONLINE-UI-SECURITY-20261029.md','M']
  ]);
  return changes.length===repair.size&&new Set(changes.map(c=>c.path)).size===repair.size&&
    changes.every(c=>repair.get(c.path)===c.status)&&isPlayerOnlinePrivacy630Scope(previousChanges);
}

// BEGIN GMWW_PLAYER_LINK_SHARE_SCOPE_637
function isGMPlayerLinkShare637Scope(){
  if(process.env.GMWW_CI_EVENT!=='pull_request')return false;
  const base=String(process.env.GMWW_CI_BASE_SHA||'');
  if(!/^[a-f0-9]{40}$/i.test(base))return false;
  const expected=new Map([
    ['server-game/current/GMWW.html','M'],
    ['tests/gm-player-web-share-link.test.mjs','A'],
    ['.github/workflows/check-gm-player-link-share.yml','A'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['.github/workflows/check-gallows-redesign.yml','M'],
    ['.github/workflows/check-gm-free-icons-501.yml','M'],
    ['.github/workflows/prepare-runtime-v3202-candidate.yml','M'],
    ['.github/workflows/build-server-game-ipa.yml','M']
  ]);
  const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim()
    .split('\n').filter(Boolean).map(s=>s.split('\t'));
  if(rows.length!==expected.size||rows.some(([status,p])=>expected.get(p)!==status))return false;
  const current=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const baseline=git('show',base+':server-game/current/GMWW.html');
  const stripped=current
    .replace(/\n<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->[\s\S]*?<!-- END GMWW_PLAYER_SHARE_STYLE -->\n/,'')
    .replace(/        <!-- BEGIN GMWW_PLAYER_SHARE_UI -->[\s\S]*?<!-- END GMWW_PLAYER_SHARE_UI -->\n/,'')
    .replace(/\n<script>\n\/\* BEGIN GMWW_PLAYER_SHARE_SCRIPT \*\/[\s\S]*?\/\* END GMWW_PLAYER_SHARE_SCRIPT \*\/\n<\/script>\n\n/,'');
  if(stripped!==baseline||!current.includes('window.GMWW_PLAYER_WEB_ALIAS_CONFIG')||
      !current.includes('config.verified!==true')||
      !current.includes("parsed.protocol!=='https:'"))return false;
  for(const [p] of rows){
    if(!p.startsWith('.github/')||p==='.github/workflows/check-gm-player-link-share.yml')continue;
    const original=git('show',base+':'+p);
    const after=fs.readFileSync(p,'utf8');
    let clean=after;
    if(p==='.github/scripts/ci-browser-scope.mjs'){
      clean=after.replace(/\n\/\/ BEGIN GMWW_PLAYER_LINK_SHARE_SCOPE_637[\s\S]*?\/\/ END GMWW_PLAYER_LINK_SHARE_SCOPE_637\n/,'');
      clean=clean.replace("  try{if(isGMPlayerLinkShare637Scope())return {mode:'gm-player-web-share-637',reason:'Only GM share UI and exact CI scope guards; no Worker/IPA/OTA/gameplay'};}catch(_){}\n",'');
    }else if(p==='.github/workflows/check-player-web.yml'){
      clean=after.replace(/      # BEGIN GMWW_PLAYER_LINK_SHARE_CHECK_637\n[\s\S]*?      # END GMWW_PLAYER_LINK_SHARE_CHECK_637\n/,'');
    }else{
      clean=after.replaceAll(" && steps.scope.outputs.mode != 'gm-player-web-share-637'",'')
                 .replaceAll(" && steps.iconsscope.outputs.mode != 'gm-player-web-share-637'",'')
                 .replaceAll(" && needs.scope.outputs.mode != 'gm-player-web-share-637'",'');
    }
    if(clean!==original)return false;
  }
  return true;
}
// END GMWW_PLAYER_LINK_SHARE_SCOPE_637
function detect(){
  // Verify the exact diff before any legacy full-suite selector.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
        const changes=rows.map(row=>{const [status,path]=row.split('\t');return{status,path};});
        if(isPagesAliasScope(changes))return{mode:'pages-alias',reason:'Exact isolated Pages redirect only; no game source changes'};
      }
    }catch{} // Fail closed for any unexpected scope, ref or status.
  }

  // PR654 same-SHA release gate: prove every change is strictly audio-local,
  // even on main after merge. Other changes keep the full safety suite.
  if(process.env.GMWW_CI_EVENT==='push'){
    try{
      const rows=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim().split('\n').filter(Boolean);
      const changes=rows.map(line=>{
        const [status,path]=line.split('\t');
        return {status,path,
          before:status==='M'?git('show','HEAD^1:'+path):null,
          after:status==='A'||status==='M'?fs.readFileSync(path,'utf8'):null};
      });
      if(isRoleNameAudio3283Scope(changes))return{mode:'role-name-audio-3283',reason:'PR654 audited V3.283 source and focused regression'};
      if(isRoleNameAudio3281Scope(changes))
        return{mode:'role-name-audio-3281',reason:'PR654 exact Runtime V3.281 Audio Tên and same-SHA release safeguards'};
    }catch(_){/* Unknown diff uses full CI. */}
  }
  // PR #651 repairs only the exact postmerge PR645 V3.279 release gate.
  // Resolve source and ancestry before allowing the focused task checks.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if((base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base))&&
         JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.279.0'){
        git('merge-base','--is-ancestor','d9527d6625868c0a25395e8ebf982446b4e4712b','HEAD');
        const lines=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
        const changes=lines.map(line=>{const [status,path]=line.split('\t');return{status,path,after:status==='M'?fs.readFileSync(path,'utf8'):null}});
        if(isPR645PostmergeReleaseScope(changes)&&
           fs.readFileSync('src/player-web-src/35-online-chat.part','utf8').includes('function gmwwOnlinePlaceAtFire(dock){')){
          return{mode:'pr645-postmerge-release',reason:'Exact PR645 V3.279 postmerge CI safety repair; Player/GM/Worker/browsers and immutable Runtime protected'};
        }
      }
    }catch{} // Fail closed: unexpected diffs run the normal full suite.
  }
  try{if(isGMPlayerLinkShare637Scope())return {mode:'gm-player-web-share-637',reason:'Only GM share UI and exact CI scope guards; no Worker/IPA/OTA/gameplay'};}catch(_){}
  // Main and PR: recognize only the exact Chrome UI change + optional version bump.
  // Use content-aware comparison, not a filename or a PR-title bypass.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim()
          .split('\n').filter(Boolean).map(row=>{
            const [status,file]=row.split('\t');
            return {status,path:file,before:status==='M'?git('show',base+':'+file):null,
              after:['M','A'].includes(status)?fs.readFileSync(file,'utf8'):null};
          });
        if(isGMChromeIosViewportScope(changes))
          return {mode:'gm-chrome-ios-viewport',reason:'Exact GM iOS Chrome viewport fix; verified HTML-only + optional version bump; no gameplay/IPA edits'};
      }
    }catch{} // Unverified changes always fall back to existing full checks.
  }
  // Exact PR630 release or its CI-only recovery; unrelated source stays fail-closed.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
        const readChanges=(from,to)=>git('diff','--name-status','--no-renames',from,to).trim().split('\n').filter(Boolean).map(row=>{
          const [status,path]=row.split('\t');
          return {status,path,before:status==='M'?git('show',from+':'+path):null,
            after:['M','A'].includes(status)?git('show',to+':'+path):null};
        });
        const changes=readChanges(base,'HEAD');
        const interactions=playerInteractionsScope(changes);if(interactions)return {mode:interactions,reason:'Player lobby interactions: exact files and chat-only Worker edits'};
        if(isPlayerOnlinePrivacy630Release(changes)||isPlayerOnlinePrivacy630Release(changes,readChanges(base+'^1',base)))
          return {mode:'player-online-privacy-630',reason:'Verified PR630 release/CI recovery; unchanged Runtime, scoped tests and integrity gates'};
      }
    }catch{} // Missing ancestry/content never authorizes a narrow release.
  }

  // Same strict classification must run BEFORE the legacy early full-suite fallback.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
        const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
        const changes=rows.map(line=>{const [status,path]=line.split('\t');return{status,path}});
        if(isGithubRuntimeCIRepair(changes))return{mode:'github-runtime-ota-ci',reason:'Exact GitHub-only OTA CI isolation'};
        if(isArtifactPreview3274RecoveryScope(changes))
          return{mode:'artifact-preview-3274-postmerge',reason:'V3.274 exact five-file postmerge CI and OTA release recovery'};
      }
    }catch{} // Never weaken unknown CI scopes.
  }
  // Owner-approved PR595 Runtime V3.272: verify every changed path and
  // the version/GM/chat contract. Unknown changes always run the full suite.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim()
          .split('\n').filter(Boolean).map(line=>{
            const [status,path]=line.split('\t');return{status,path};
          });
        if(gmAdmin3272Scope(changes))
          return{mode:'gm-admin-top-chat-3272',reason:'PR595 verified 3 GM actions, chat authority, no IPA, exact V3.272 Runtime OTA'};
      }
    }catch{} // Fail closed.
  }


  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean)
          .map(row=>{const [status,path]=row.split('\t');return{status,path}});
        if(isOnlineVillage3273Scope(changes))
          return{mode:'player-online-village-3273',reason:'PR596 V3.273 Online action and Player Web Server authenticated scope'};
      }
    }catch{}
  }
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim()
          .split('\n').filter(Boolean).map(line=>{
            const [status,path]=line.split('\t');return{status,path};
          });
        if(isDemoPlayerLive3271Scope(changes))
          return{mode:'demo-player-live-3271',reason:'PR594 V3.271 authenticated DEMO joining, Player Web sync, Worker and OTA only'};
      }
    }catch{}
  }

  // PR #593: use the same fail-closed focused check on PR and merged main.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim()
          .split(String.fromCharCode(10)).filter(Boolean).map(line=>{
            const [status,path]=line.split(String.fromCharCode(9));return{status,path};
          });
        if(isDemoAudioSync3270Scope(changes))
          return{mode:'demo-audio-sync-3270',reason:'V3.270: Audio/DEMO x2,x5, Seer, Aura, Gallows timing and Worker only'};
      }
    }catch{}
  }

  // Exact PR/main same-diff audio fix; keep the unrelated historical test
  // suites out of the release gate while preserving Worker/OTA validation.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD')
          .trim().split('\n').filter(Boolean).map(line=>{
            const [status,path]=line.split('\t');return {status,path};
          });
        if(isMorningAudio3267Scope(changes))
          return {mode:'gm-audio-morning-3267',reason:'V3.267 only: no-death dawn cue, Audio regression, bundle and Worker gate'};
      }
    }catch{}
  }

  // Respect the same focused scope on both the PR and the approved merged commit.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
        const changes=rows.map(line=>{const [status,path]=line.split('\t');return{status,path}});
        if(isOnlineChatScope(changes))return{mode:'online-chat-audio',reason:'Online Chat/GM moderation/Player announcements, focused privacy and bundle checks'};
      }
    }catch{}
  }

  // Isolate the exact Runtime V3.268 game-template dock from unrelated suites.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split(String.fromCharCode(10)).filter(Boolean);
        const changes=rows.map(line=>{const [status,path]=line.split(String.fromCharCode(9));return{status,path}});
        if(isTemplateDock3268Scope(changes))return{mode:'template-dock-3268',reason:'V3.268 GM template dock, Worker syntax, two bundles and related UI regression only'};
      }
    }catch{} // Fail closed: unknown diffs run full CI.
  }

  // Scope only the exact, reviewed V3.265 seat-pinch files, both PR and main.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
        const changes=rows.map(row=>{const [status,path]=row.split('\t');return{status,path}});
        if(isGatherPinch3265Scope(changes))return {mode:'gather-pinch-3265',reason:'Exact V3.265 shared seat geometry, pinch UI, Worker guard, OTA and related regression only'};
      }
    }catch{} // Fail closed: unknown changes run the normal broader checks.
  }
  if(cardRule3263MainScope())return{mode:'card-rule-3263',reason:'V3.263 approved 3 Artifact executors; exact 3.262 base, strict scope and GM radius preserved'};
  // CI-only fix after the approved V3.260 merge: retain exact-scope
  // Worker + Say Rượu checks; unrelated legacy tests must not block OTA.
  if(process.env.GMWW_CI_EVENT==='push'){
    try{
      const changed=git('diff','--name-status','--no-renames','HEAD^1','HEAD')
        .trim().split('\n').filter(Boolean).map(s=>{
          const [status,path]=s.split('\t');return{status,path};
        });
      if(isDrunkV3260PostMergeScope(changed))
        return{mode:'drunk-card-overlay-20261028',
          reason:'V3.260 postmerge CI scope only; exact prior merge and same-SHA focused checks'};
    }catch{}
  }

// Recognize the exact merged Hybrid DEMO 587 change set on main as well as
  // on its PR. An expanded diff falls back to full release validation.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim()
          .split('\n').filter(Boolean).map(row=>{const [status,path]=row.split('\t');return {status,path}});
        if(isHybridDemo587Scope(changes))return {mode:'demo-hybrid-587',
          reason:'PR587 hybrid DEMO live member auth, action priority, Player private UI and rollout safety'};
      }
    }catch{}
  }

  // Deterministic 3.258 classification on PR or main push; full tests for
  // unknown diffs. PR merge with exact same files is intentionally supported.
  if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[0-9a-f]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n')
          .filter(Boolean).map(row=>{const [status,path]=row.split('\t');return{status,path}});
        if(isGMVote3259PostverifyScope(changes))
          return{mode:'gm-vote-postverify-3259',reason:'V3.259: fix stale Native V3.110 assertion only; release existing Runtime V3.259 with SHA checks'};
        if(isGMVote3259Scope(changes))
          return{mode:'gm-vote-3259',reason:'Exact PR565 release V3.259, Audio V3.258 preserved'};
        if(isGMWWAudio3258Scope(changes))
          return{mode:'gm-audio-3258',reason:'Exact V3.258 GM Audio only; same-SHA Worker and OTA release guards'};
      }
    }catch{}
  }
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean).map(row=>{const [status,path]=row.split('\t');return {status,path}});
        if(isNativeManualReleaseVerifyScope(changes))return {mode:'native-manual-release-verify',reason:'Only V3.257 Native release verification and focused CI'};
        if(isManualRuntimeScope(changes))return {mode:'manual-runtime',reason:'Manual updater, package integrity and native IPA only'};
      }
    }catch{}
  }

  // Exact GM-only V3.256 release: do not run unrelated Player Card/Seat/3D/IPA suites.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
        const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
        const changes=rows.map(row=>{const [status,path]=row.split('\t');return{status,path}});
        if(isGMFireWalk3256Scope(changes))
          return{mode:'gm-fire-walk-3256',reason:'Strict V3.256 GM walk only, OTA release checks preserved'};
      }
    }catch{}
  }
  // Owner-approved V3.255 Drunk/Spiritualist-only release. Any file outside
  // the verified source allowlist falls back to full checks.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.255.0'){
        const base=process.env.GMWW_CI_EVENT==='pull_request'?
          String(process.env.GMWW_CI_BASE_SHA||''):'HEAD^1';
        if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
          execFileSync(process.execPath,['.github/scripts/verify-release-v3255.mjs'],{
            encoding:'utf8',env:{...process.env,GMWW_V3255_BASE:base}});
          return {mode:'drunk-spiritualist-3255',
            reason:'Strict V3.255 Server + private Player Web + GM draw and neutral faction comparison'};
        }
      }
    }catch{} // Fail closed, never waive unrelated source changes.
  }
 // V3.254 CI-only safety repair: no Runtime, Player or IPA changes.
 if(['pull_request','push'].includes(process.env.GMWW_CI_EVENT||'')){
   try{
     const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
     if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
       const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean).map(l=>{
          const [status,path]=l.split('\t');return{status,path};
       });
       if(isCharacter40V3254PostverifyScope(changes))return{mode:'character40-postverify-3254',reason:'Exact CI-only independent GM and Web controller SHA verification, V3.254'};
     }
   }catch{}
 }

 if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
  try{
   if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.254.0'){
    const base=process.env.GMWW_CI_EVENT==='push'||String(process.env.GITHUB_REF||'').startsWith('refs/pull/')?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
    if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
     execFileSync(process.execPath,['.github/scripts/verify-release-v3254.mjs'],{encoding:'utf8',env:{...process.env,GMWW_V3254_BASE:base}});
     return{mode:'gm-performance-thermal-3254',reason:'V3.254 scoped GM performance after 3.253 motion'};
    }
   }
  }catch{}
 }

  // V3.252: iPhone maintenance grid is flat, all 16 original handlers unchanged.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.252.0'){
        const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
        if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
          execFileSync(process.execPath,['.github/scripts/verify-release-v3252.mjs'],{
            encoding:'utf8',env:{...process.env,GMWW_V3252_BASE:base}});
          return{mode:'uniform-maintenance-3252',reason:'V3.252 same-size direct 16 tools and unaffected handlers'};
        }
      }
    }catch{} // Unexpected changes require full checks.
  }

  // V3.251: exact CSS-only GM settings release; keep V3.250 role-card changes.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.251.0'){
        const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
        if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
          execFileSync(process.execPath,['.github/scripts/verify-release-v3251.mjs'],{encoding:'utf8',env:{...process.env,GMWW_V3251_BASE:base}});
          return{mode:'cloudflare-tiles-3251',reason:'V3.251 only 16 uniform maintenance tiles, OTA and gate'};
        }
      }
    }catch{} // Keep full tests if release scope differs unexpectedly.
  }

  // V3.250 owner-approved settings fix: scoped only after strict diff+version
  // verification. Any unexpected changed file uses existing full CI.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.250.0'){
        const base=process.env.GMWW_CI_EVENT==='pull_request'?
          String(process.env.GMWW_CI_BASE_SHA||''):'HEAD^1';
        if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
          execFileSync(process.execPath,['.github/scripts/verify-release-v3250.mjs'],{
            encoding:'utf8',env:{...process.env,GMWW_V3250_BASE:base}});
          return{mode:'approved-role-card-settings-3250',
            reason:'V3.250 strict approved card settings, actions and Runtime files'};
        }
      }
    }catch{} // Fail closed; never pretend arbitrary changes are scoped.
  }
  // V3.249 scoped release: execute the fail-closed Worker/GM/OTA diff verifier.
  // Any unrecognized file or missing version contract falls back to full checks.
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.249.0'){
        const base=process.env.GMWW_CI_EVENT==='pull_request'&&
          String(process.env.GITHUB_REF||'').startsWith('refs/pull/')?
          'HEAD^1':process.env.GMWW_CI_EVENT==='pull_request'?
          String(process.env.GMWW_CI_BASE_SHA||''):'HEAD^1';
        if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
          execFileSync(process.execPath,['.github/scripts/verify-release-v3249.mjs'],{
            encoding:'utf8',env:{...process.env,GMWW_V3249_BASE:base}});
          return{mode:'witch-drunk-clone-3249',reason:'V3.249 approved files and role rules verified'};
        }
      }
    }catch{} // Fail closed: run full CI for any unreviewed change.
  }
  // PR652: inspect the exact three-file ordering fix BEFORE legacy main push
  // dispatchers return 'full'. Any unknown path/source reverts to full CI.
  if(process.env.GMWW_CI_EVENT==='push'){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.280.0'){
        git('merge-base','--is-ancestor','fa48216517e692924b47a936767369d0d654523c','HEAD');
        const changes=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim().split('\n').filter(Boolean).map(row=>{
          const [status,path]=row.split('\t');
          return{status,path,before:status==='M'?git('show','HEAD^1:'+path):null,
            after:status==='M'?fs.readFileSync(path,'utf8'):null};
        });
        if(isPR652FinalReleaseScope(changes))
          return{mode:'pr652-postmerge-release',reason:'PR652 final exact three-file CI selector ordering; approved Online gameplay immutable'};
      }
    }catch{} // Strict fail-closed: unknown diff does not narrow main CI.
  }
  // Push of CI-policy-only main merges needs selector unit tests, not
  // unrelated Chrome/Edge Card tests. All other main pushes remain full.
  if(process.env.GMWW_CI_EVENT==='push'){
    // Native OTA scope only on exact V3.275 Stage 2 merge; unknown diffs remain full.
    try {
      const rows=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim()
        .split('\n').filter(Boolean).map(line=>{const [status,path]=line.split('\t');return {status,path};});
      const expected=new Set([
        'server-game/GMWW-Server/GameView.swift',
        'server-game/src/10-library-and-settings.part','server-game/current/app.js',
        '.github/workflows/build-server-game-ipa.yml','.github/scripts/ci-browser-scope.mjs',
        '.github/workflows/check-player-web.yml','.github/workflows/check-native-github-ota.yml',
        '.github/workflows/deploy-production.yml',
        'tests/native-github-first-ota-stage2.test.mjs',
        'docs/releases/GMWW-NATIVE-GITHUB-OTA-STAGE2-20261029.md'
      ]);
      if(rows.length===expected.size&&rows.every(row=>expected.has(row.path)&&['M','A'].includes(row.status)))
        return{mode:'native-github-ota-stage2',reason:'Exact Native OTA Stage 2 merge on V3.275'};
    }catch{}
    // ART-01 on main must keep the same narrow tests as the reviewed PR.
    try{
      const rows=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim().split('\n').filter(Boolean);
      const changes=rows.map(line=>{
        const [status,path]=line.split('\t');
        const before=status==='M'?git('show','HEAD^1:'+path):null;
        const after=status==='M'||status==='A'?fs.readFileSync(path,'utf8'):null;
        return{status,path,before,after};
      });
      if(isLeanPackaging3264Scope(changes))return{mode:'ipa-ota-lean-3264',reason:'V3.264 exact IPA/OTA icon packaging and two Audio selector fixes'};
      if(isGMFireRadius3262Scope(changes))return{mode:'gm-fire-radius-3262',reason:'V3.262 exact GM campfire equal-radius motion patch'};
      if(isGMFireWalk3261Scope(changes))return{mode:'gm-fire-walk-3261',reason:'V3.261 exact GM fire walk hotfix with return home and immutable version'};
      if(isGMTurnMotionScope(changes))return{mode:'gm-turn-motion-lowheat',reason:'V3.253 exact GM motion and OTA changes only'};
      if(isRuntime248PostMergeScope(changes))return{mode:'runtime-3248-postmerge',reason:'Exact 4-file CI release fix for already tested Runtime V3.248'};
      if(isIcon247PostMergeScope(changes))return{mode:'icon-scale-3247-postmerge',reason:'Audited 2-file V3.247 CI release scope order fix'};
      if(isFairy246PostMergeScope(changes))return{mode:'fairy-246-postmerge',reason:'PR548 V3.246 exact 5-file post-merge CI repair; same Runtime and icon SHA'};
      if(isPlayerReceiptHotfixScope(changes))return{mode:'player-receipt-hotfix',reason:'Exact Player Web private receipt hotfix; no runtime/IPA'};
      if(isTimeline244Scope(changes))return{mode:'timeline-six-center-3244',reason:'V3.244 exact six-step centered GM timeline only'};
      if(isLobbyGather541Scope(changes))return{mode:'lobby-gather-541',reason:'PR541 V3.243 exact GM Room/Gather UI only'};
       if(isFairy3242PolicyScope(changes))return{mode:'fairy-ci-policy',reason:'CI-only V3.242 routing'};
      if(isFairy3242Scope(changes))return{mode:'fairy-audio-3242',reason:'Exact reviewed V3.242 blobs'};
      if(isPostMatch532Scope(changes))return{mode:'post-match-room-532',reason:'PR532 approved post-match room reset and Demo isolation only'};
      if(isPostMatchCIOnlyScope(changes))return{mode:'postmatch-ci-532',reason:'PR532 CI routing fix only, no game/IPA change'};
      if(isRules550Scope(changes))return{mode:'night02-rule-regression-550',reason:'PR550 exact five-file test-only merge; no Worker, gameplay, OTA or IPA'};
      if(changes.some(c=>c?.path==='tests/gmww-rule-snow-guard-pack-fairy.test.mjs'||
        (!stableCIPolicyPaths.has(c?.path)&&String(c?.after||'').includes('PR550 test-only rule regression'))))
        return{mode:'full',reason:'PR550 changes are not the exact approved test-only release scope'};
      if(isNight02Scope(changes))return{mode:'night02-pack-roles',reason:'V3.245 NIGHT-02 scoped wolf pack, snow, guard, fairy Core + GM'};
      if(isWITCH01Scope(changes))return{mode:'witch01-old-witch',reason:'V3.240 WITCH-01 authoritative and GM-only tests'};
      if(isWOLF01Scope(changes))return{mode:'wolf01-private-pack',reason:'V3.239 WOLF-01 private recognition; focused Player Web and Worker'};
      if(isART01DeployGateScope(changes))return{mode:'art01-deploy-gate',reason:'ART-01 release workflow only: no gameplay changes'};
      if(isART01NightFlowScope(changes))return{mode:'art01-night-flow',reason:'ART-01: only Artifact priority and first-night turn scheduler'};
      if(isIconArtworkPolicyScope(changes))return{mode:'icon-artwork-policy',reason:'Artwork CI only; no runtime deploy'};
      if(isIconArtworkScope(changes))return{mode:'icon-artwork',reason:'Individual image assets, picture URLs, version/notes only; gameplay unchanged'};
      if(isDOOptimizer3228Scope(changes))return{mode:'do-optimizer-3228',reason:'V3.228 Durable Object heartbeat dedup + Settings + Runtime gates'};
      if(isGM238DeployGateRecovery(changes))return{mode:'gm238-deploy-repair',reason:'V3.238 fix duplicate release workflow step IDs only'};
      if(isGM238UniformMenuScope(changes))return{mode:'gm-ui-controls-3238',reason:'V3.238 GM buttons uniform ON/OFF and concise labels only'};
      if(isGM237MenuFooterScope(changes))return{mode:'gm-ui-menu-3237',reason:'V3.237 exactly GM menu presentation + outside dismiss + icon footer'};
      if(isGM236CampfireGallowsScope(changes))return{mode:'gm-menu-gallows-3236',reason:'V3.236 exact GM campfire UI and gallows ties; no IPA/Seat/3D'};
      if(isGM235GlassDockScope(changes))return{mode:'gm-ui-glass-3235',reason:'V3.235 GM glass-only dock, clock, rainbow and Cloudflare UI'};
      if(isGM3234PostMergeReleaseGateScope(changes)||isPhaseDockGallows3234Scope(changes))return{mode:'phase-dock-gallows-3234',reason:'V3.234 scoped GM Đêm/Ngày/Gallows release and post-merge CI gate'};
      if(isGM3233AudioUICIScope(changes))return{mode:'gm-ui-audio-3233',reason:'V3.233: exactly four GM UI/Audio fixes'};
      if(isRuntimeWarning3232Scope(changes))return{mode:'runtime-warning-3232',reason:'Owner V3.232 Runtime diagnostics and OTA gates only'};
      if(isGMEntryIcons3231Scope(changes))return{mode:'entry-icons-3231',reason:'Only V3.231 GM entrance icon placement and 2x visual size'};
      if(isMaintenanceNotice3230Scope(changes))return{mode:'settings-notices-3230',reason:'V3.230 box thông báo riêng 16 tính năng, không sửa gameplay'};
      if(isIconV2CIRepairScope(changes))return{mode:'icon-v2-ci-fix',reason:'Exact 7-file approved V3.227 CI-only patch; no gameplay or Runtime version'};
      if(isAutoVanCIPolicyScope(changes))return{mode:'auto-van-ci',reason:'AUTO VÁN CI routing only'};
      if(isAutoVanReleaseScope(changes))return{mode:'auto-van-3222',reason:'V3.222 AUTO VÁN exact version, notes and OTA only'};
      if(isGMFooter3229Scope(changes))return{mode:'gm-footer-3229',reason:'Exact GM V3.229 icon spacing, multi-target and fixed footer only'};
      if(isIconActionV23227Scope(changes))return{mode:'icon-action-v2-3227',reason:'Icon Action V2 free drag/snap, 49 frameless SVG/PNG and OTA only'};
      if(isFireIcons3226Scope(changes))return{mode:'fire-icons-3226',reason:'V3.226 iPhone icon dock z-index versus immersive village; scoped CSS/OTA'};
      if(isActionIcon3225Scope(changes))return{mode:'active-icons-3225',reason:'V3.225 focused GM Icon runtime fix and OTA'};
      if(isArenaHome3223Scope(changes))return{mode:'arena-home-3223',reason:'V3.223 cổng VÀO LÀNG → Arena3D QA STAGING; OTA chốt an toàn'};
      if(isGMIcons501ReleaseScope(changes))return{mode:'gm-icons-501-release',reason:'GMWW V3.224 exact PR501 5 icon release; no Native or Core changes'};
      if(isRanking3221Scope(changes))return{mode:'ranking-3221',reason:'GMWW V3.221 xếp hạng ưu tiên nhiều ván'};
      if(isHomeSea3219Scope(changes))return{mode:'home-sea-3219',reason:'V3.219 Top 3 bỏ bục, Character thật, kính mờ, version OTA'};
      if(isAudio3217Scope(changes))return{mode:'audio-fix-3217',reason:'V3.217 audio fixes only, preserve Top 3 Sea V3.216'};
      if(isHomePodium3214Scope(changes))return{mode:'home-podium-3214',reason:'V3.214 Top 3 podium + current Character'};
      if(isHomeSea3216Scope(changes))return{mode:'home-sea-3216',reason:'V3.216 GM Top 3 sea podium/glass only'};
      if(isIconWave3218Scope(changes))return{mode:'icon-wave5-3218',reason:'V3.218 approved 49 icons and 34 audited action IDs'};
      if(isIconGame3215Scope(changes))return{mode:'icon-game-3215',reason:'Verified V3.215 10 icons and GM-only fire drag via existing Core'};
      if(isIconWave3213Scope(changes))return{mode:'icon-wave3-3213',reason:'Verified 10 icons wave 3 and OTA only'};
      if(isIconClean3212Scope(changes))return{mode:'icon-clean-3212',reason:'Verified V3.212 ICON card UI and OTA only'};
      if(isIcon3210DispatchGateScope(changes))return{mode:'icon-runtime-3210',reason:'Verified CI-only V3.210 owner dispatch correction'};
      if(isHomePodium3211Scope(changes))return{mode:'home-podium-3211',reason:'Verified focused V3.211 Top 3 home podium release'};
      if(isIconRuntime3210Scope(changes))return{mode:'icon-runtime-3210',reason:'Verified V3.210 ICON Runtime/OTA release only'};
      if(isAudioGallows209Scope(changes))return{mode:'audio-gallows-3209',reason:'Verified V3.209 audio and public vote UI only'};
      if(isAudio208Scope(changes))return{mode:'audio-v3208',reason:'Verified V3.208 audio/bulletin release only'};
      if(isStableCIPolicyScope(changes)||isPolicyScope(changes))return{mode:'ci-policy',reason:'Verified main CI-only merge: '+changes.map(c=>c.path).join(', ')};
      if(isDemo475Scope(changes)||isDemo475ReleaseScope(changes)||isDemo475FinalGateScope(changes)||isDemo475CompletionScope(changes)){
        git('merge-base','--is-ancestor','8772337ab95e7561aeba6d63b2ec2337d7bbee94','HEAD');
        return{mode:'demo-475',reason:'Verified merged PR #475 / focused V3.207 release: '+changes.map(c=>c.path).join(', ')};
      }
      if(isGallowsScope(changes)||isGallowsVisual205Scope(changes))return{mode:'gallows',reason:'Verified main Lên Giàn-only release: '+changes.map(c=>c.path).join(', ')};
    }catch(error){return{mode:'full',reason:'Unverified main diff: '+String(error.message||error)};}
    return{mode:'full',reason:'Main contains changes outside the verified scoped lists'};
  }
  // Owner-initiated V3.210 release on main after approved PR #483 merged.
  // Never narrow an arbitrary manual build: verify the exact release contract.
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.229.0'){
    if(fs.existsSync('docs/releases/GMWW-V3.229-battle-icon-footer-20261026.md')&&
       fs.readFileSync('server-game/current/app.js','utf8').includes('battleMainActionSlot'))
       return{mode:'gm-footer-3229',reason:'Owner V3.229 verified icon footer-only Runtime'};
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.227.0'){
    const path='assets/action-icons/v2/manifest.json';
    if(fs.existsSync(path)&&fs.existsSync('docs/releases/GMWW-V3.227-icon-action-v2-20261025.md')){
      const data=JSON.parse(fs.readFileSync(path,'utf8'));
      if(data.count===49&&data.icons.length===49)
        return{mode:'icon-action-v2-3227',reason:'Owner V3.227 verified 49 transparent icons and scoped runtime'};
    }
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.226.0'){
    if(fs.existsSync('docs/releases/GMWW-V3.226-fire-icon-visibility-20261025.md')&&fs.readFileSync('server-game/current/style.css','utf8').includes('z-index:1200;max-width:min(74vw,330px)'))
      return{mode:'fire-icons-3226',reason:'Owner V3.226 on main, Icon stacking regression and SHA check'};
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.225.0'){
    const doc='docs/releases/GMWW-V3.225-active-icon-drag-20261025.md';
    const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
    if(fs.existsSync(doc)&&html.indexOf('src="action-icon-library.js')<html.indexOf('src="app.js'))
      return{mode:'active-icons-3225',reason:'Owner V3.225 icon and pointer checks'};
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.218.0'){
    if(fs.existsSync('docs/releases/GMWW-V3.218-49-icons-audit-20261025.md')){
      const m=JSON.parse(fs.readFileSync('assets/action-icons/sea-v1/manifest.json','utf8'));
      if(m.count===49&&m.icons.length===49)return{mode:'icon-wave5-3218',reason:'Owner V3.218 verified 49 icon manifest'};
    }
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.215.0'){
    const release='docs/releases/GMWW-V3.215-action-icons-game-wave4-20261025.md';
    const manifest='assets/action-icons/sea-v1/manifest.json';
    if(fs.existsSync(release)&&fs.existsSync(manifest)){
      const m=JSON.parse(fs.readFileSync(manifest,'utf8'));
      if(m.count===39&&Array.isArray(m.icons)&&m.icons.length===39)
        return{mode:'icon-game-3215',reason:'Owner V3.215 verified exact 39-asset manifest and game Icon UI'};
    }
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.213.0'){
    if(fs.existsSync('docs/releases/GMWW-V3.213-icons-wave3-20261025.md')){const m=JSON.parse(fs.readFileSync('assets/action-icons/sea-v1/manifest.json','utf8'));if(m.count===29&&m.icons.length===29)return{mode:'icon-wave3-3213',reason:'Owner V3.213 verified icon manifest'};}
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'&&JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.212.0'){
    if(fs.existsSync('docs/releases/GMWW-V3.212-icon-clean-ui-20261025.md')&&fs.existsSync('tests/action-icon-card-clean.test.mjs'))return{mode:'icon-clean-3212',reason:'Owner V3.212, narrow icon card cleanup only'};
  }
  if(process.env.GMWW_CI_EVENT==='workflow_dispatch'&&process.env.GITHUB_REF==='refs/heads/main'){
    const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
    const release='docs/releases/GMWW-V3.210-icons-runtime-20261025.md';
    const manifest='assets/action-icons/sea-v1/manifest.json';
    if(pkg.version==='3.210.0'&&fs.existsSync(release)&&fs.existsSync(manifest)){
      const icons=JSON.parse(fs.readFileSync(manifest,'utf8'));
      if(icons.count===19&&Array.isArray(icons.icons)&&icons.icons.length===19)
        return{mode:'icon-runtime-3210',reason:'Owner-dispatched V3.210 only, SHA-256 and icon scope verified'};
    }
  }
  // PR652 V3.280: a production push must check this exact CI-only follow-up,
  // with the accepted merge commit as an ancestor, instead of running unrelated
  // obsolete full-suite assertions. The same source and browser release gates stay.
  if(process.env.GMWW_CI_EVENT==='push'){
    try{
      if(JSON.parse(fs.readFileSync('package.json','utf8')).version==='3.280.0'){
        git('merge-base','--is-ancestor','76426e1a77d8fa87f9f773d4cf7c3d0a95c2f9da','HEAD');
        const changes=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim().split('\n').filter(Boolean).map(row=>{
          const [status,path]=row.split('\t');
          return{status,path,before:status==='M'?git('show','HEAD^1:'+path):null,
            after:status==='M'?fs.readFileSync(path,'utf8'):null};
        });
        if(isPR652PostmergeReleaseScope(changes))
          return{mode:'pr652-postmerge-release',reason:'PR652 audited five-file CI-only recovery; gameplay source unchanged'};
      }
    }catch{} // Never allow an unknown ref or scope to bypass full checks.
  }
  // Production recovery: all deployed code is identical to merged #551;
  // only the four CI/release files may change. Unknown diffs remain full.
  if(process.env.GMWW_CI_EVENT==='push'){
   try{
    const rows=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim().split('\n').filter(Boolean);
    const changes=rows.map(row=>{const [status,path]=row.split('\t');return{status,path}});
    if(isArtifactPreview3274Scope(changes))
      return{mode:'artifact-preview-3274',reason:'PR613 V3.274 exact scoped artwork update on main'};
    if(isIcon247PostMergeScope(changes))
     return{mode:'icon-scale-3247-postmerge',reason:'Exact four-file same-version V3.247 recovery'};
   }catch{}
  }
  if(['push','pull_request'].includes(process.env.GMWW_CI_EVENT||'')){
    try{
      const base=process.env.GMWW_CI_EVENT==='push'?'HEAD^1':String(process.env.GMWW_CI_BASE_SHA||'');
      if(base==='HEAD^1'||/^[a-f0-9]{40}$/i.test(base)){
        const changes=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean).map(row=>{const [status,path]=row.split('\t');return{status,path}});
        if(isGMCardOutside3275Scope(changes))return{mode:'gm-card-outside-3275',reason:'PR628 V3.275 exact GM card fit, outside-dismiss and OTA release only'};
      }
    }catch{} // Unknown source or CI edits must run full checks.
  }
  if(process.env.GMWW_CI_EVENT!=='pull_request')return {mode:'full',reason:'Manual/other release requires full checks'};
  const base=String(process.env.GMWW_CI_BASE_SHA||'').trim();
  if(!/^[0-9a-f]{40}$/i.test(base))return {mode:'full',reason:'No verified PR base SHA'};
  try{
    const rows=git('diff','--name-status','--no-renames',base,'HEAD').trim().split('\n').filter(Boolean);
    if(!rows.length)return{mode:'full',reason:'Empty/unknown PR diff'};
    const changes=rows.map(line=>{
      const [status,path]=line.split('\t');
      const before=status==='M'?git('show',base+':'+path):null;
      const after=status==='M'||status==='A'?fs.readFileSync(path,'utf8'):null;
      return{status,path,before,after};
    });
    return{mode:classifyBrowserScope(changes),reason:changes.map(c=>c.path).join(', ')};
  }catch(error){
    return{mode:'full',reason:'Could not verify changes safely: '+String(error.message||error)};
  }
}
export {classifyBrowserScope};
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const result=detect();
  console.log('GMWW browser CI scope: '+result.mode+' | '+result.reason);
  if(result.mode==='icon-v2-ci-fix')console.log('V3.227: chỉ sửa test V2, khoảng trắng SVG/notes và checksum, không kiểm thử gameplay khác.');
  if(result.mode==='icon-wave5-3218')console.log('V3.218: chỉ test icon/manifest/OTA liên quan.');
  if(result.mode==='icon-game-3215')console.log('V3.215: chỉ kiểm tra giao diện ICON, 54 ánh xạ, kéo thả GM và Runtime OTA.');
  if(result.mode==='icon-wave3-3213')console.log('V3.213: chỉ kiểm tra 29 icon/SHA-256 và bản cập nhật OTA.');
  if(result.mode==='icon-clean-3212')console.log('V3.212: chỉ kiểm tra giao diện ICON, phiên bản và OTA.');
  if(result.mode==='icon-runtime-3210')console.log('V3.210: chỉ test Icon và OTA, không test Card, Seat, DEMO hoặc Native IPA.');
  if(result.mode==='audio-fix-3217')console.log('Chỉ kiểm thử ba lỗi âm thanh V3.217, không kiểm Seat/Card/3D.');
  if(result.mode==='audio-gallows-3209')console.log('Chỉ xác minh cú pháp, assembled bundles và phiên bản/OTA; không chạy bộ test gameplay mở rộng.');
  if(result.mode==='audio-v3208')console.log('Chỉ xác minh cú pháp, SHA và luồng Audio/Tiên Tri/Thông cáo liên quan V3.208; bỏ kiểm thử khác.');
  if(result.mode==='demo-475')console.log('PR #475: chi kiem DEMO Sat Thu/soi xet/audio/Len Gian, bao toan Worker/Player Web; khong kiem Card, Seat, OTA, IPA.');
  if(result.mode==='gallows')console.log('Chỉ dùng CI Lên Giàn và các chốt Worker/OTA/IPA có liên quan; không khởi chạy kiểm tra lá bài Chrome/Edge, ghế, Khám Phá, ảnh nền hay OTA trình duyệt.');
  if(result.mode==='ci-policy')console.log('Chỉ kiểm tra bộ chọn phạm vi CI; không chạy kiểm thử gameplay.');
  if(result.mode==='lobby-gather-541')console.log('PR541: only Lobby/Gather/Mode/Assassin tests, no IPA, Chrome or 3D.');
   if(result.mode==='fairy-audio-3242')console.log('V3.242: audio icon và Yêu Tinh; không Card, Seat, 3D, IPA.');
  if(result.mode==='fairy-ci-policy')console.log('CI-only V3.242; không thay game.');
  if(result.mode==='post-match-room-532')console.log('PR532: chỉ test kết thúc ván, Seat, DEMO, Worker syntax và nguồn app. Không build IPA.');
  if(result.mode==='postgame')console.log('Bỏ qua kiểm thử lá bài / 30 ghế / realtime nặng; chỉ chạy hồi quy kết thúc ván. Production vẫn kiểm thử toàn diện.');
  if(result.mode==='dual-renderer')console.log('Chỉ kiểm thử hợp đồng dùng chung 2D/3D, phân quyền và tính cô lập của bản mẫu; không chạy bộ test game không liên quan.');
  if(result.mode==='p0-roster')console.log('Chỉ kiểm tra 2 người, Role/Artifact, đề cử/vote Chrome/Edge và trạng thái phòng; bỏ qua 30 ghế/cảnh nền/DEMO rules. Release main vẫn full.');
  else if(!['icon-artwork','icon-artwork-policy','icon-v2-ci-fix','dual-renderer','gallows','ci-policy','postgame','p0-roster','demo-475','audio-v3208','audio-gallows-3209','audio-fix-3217','icon-runtime-3210','icon-clean-3212','icon-wave3-3213','home-podium-3214','home-sea-3216','icon-wave5-3218','active-icons-3225','fire-icons-3226','icon-action-v2-3227','gm-footer-3229','entry-icons-3231'].includes(result.mode))console.log('Phạm vi chưa được chứng minh an toàn hoặc đang phát hành: chạy toàn bộ kiểm thử.');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+result.mode+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Phạm vi CI: '+result.mode+'\n'+result.reason+'\n');
}
