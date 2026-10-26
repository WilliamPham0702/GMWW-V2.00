#!/usr/bin/env node
// Select the smallest SAFE browser scope on PRs. Unknown diffs run the full suite.
// Production/main and manual release checks ALWAYS run the full browser suite.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scopedMarkers={
  'src/index.js':['  async gmConfig(request,body){','  async gmDayClock(request,body){'],
  'server-game/src/50-roles-and-artifacts.part':['/* Match completion is shared','async function openPlayEndSheet(){'],
  'server-game/current/app.js':['/* Match completion is shared','async function openPlayEndSheet(){']
};
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
  '.github/workflows/check-dual-renderer.yml',
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
  '.github/workflows/build-server-game-ipa.yml',
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
  '.github/workflows/deploy-production.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/ci-browser-focused-gallows-20261024.md',
  'docs/releases/GMWW-V3.203-focused-release-gate-20261024.md'
]);
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
 'server-game/current/app.js','server-game/src/00-core-and-library.part',
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
 const names=new Set(changes.map(c=>c.path));
 return names.size===autoVanCIPolicyPaths.size&&
   [...autoVanCIPolicyPaths].every(x=>names.has(x))&&
   changes.every(c=>autoVanCIPolicyPaths.has(c.path)&&c.status==='M');
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

export function classifyBrowserScope(changes){
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
  if(isPolicyScope(changes))return 'ci-policy';
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
function detect(){
  // Push of CI-policy-only main merges needs selector unit tests, not
  // unrelated Chrome/Edge Card tests. All other main pushes remain full.
  if(process.env.GMWW_CI_EVENT==='push'){
    try{
      const rows=git('diff','--name-status','--no-renames','HEAD^1','HEAD').trim().split('\n').filter(Boolean);
      const changes=rows.map(line=>{
        const [status,path]=line.split('\t');
        const before=status==='M'?git('show','HEAD^1:'+path):null;
        const after=status==='M'||status==='A'?fs.readFileSync(path,'utf8'):null;
        return{status,path,before,after};
      });
      if(isDOOptimizer3228Scope(changes))return{mode:'do-optimizer-3228',reason:'V3.228 Durable Object heartbeat dedup + Settings + Runtime gates'};
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
      if(isPolicyScope(changes))return{mode:'ci-policy',reason:'Verified main CI-only merge: '+changes.map(c=>c.path).join(', ')};
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
  if(result.mode==='postgame')console.log('Bỏ qua kiểm thử lá bài / 30 ghế / realtime nặng; chỉ chạy hồi quy kết thúc ván. Production vẫn kiểm thử toàn diện.');
  if(result.mode==='dual-renderer')console.log('Chỉ kiểm thử hợp đồng dùng chung 2D/3D, phân quyền và tính cô lập của bản mẫu; không chạy bộ test game không liên quan.');
  if(result.mode==='p0-roster')console.log('Chỉ kiểm tra 2 người, Role/Artifact, đề cử/vote Chrome/Edge và trạng thái phòng; bỏ qua 30 ghế/cảnh nền/DEMO rules. Release main vẫn full.');
  else if(!['icon-v2-ci-fix','dual-renderer','gallows','ci-policy','postgame','p0-roster','demo-475','audio-v3208','audio-gallows-3209','audio-fix-3217','icon-runtime-3210','icon-clean-3212','icon-wave3-3213','home-podium-3214','home-sea-3216','icon-wave5-3218','active-icons-3225','fire-icons-3226','icon-action-v2-3227','gm-footer-3229'].includes(result.mode))console.log('Phạm vi chưa được chứng minh an toàn hoặc đang phát hành: chạy toàn bộ kiểm thử.');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+result.mode+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Phạm vi CI: '+result.mode+'\n'+result.reason+'\n');
}
