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

export function classifyBrowserScope(changes){
  if(!Array.isArray(changes)||!changes.length)return 'full';
  if(isPolicyScope(changes))return 'ci-policy';
  if(isDemo475Scope(changes)||isDemo475ReleaseScope(changes)||isDemo475FinalGateScope(changes))return 'demo-475';
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
      if(isPolicyScope(changes))return{mode:'ci-policy',reason:'Verified main CI-only merge: '+changes.map(c=>c.path).join(', ')};
      if(isDemo475Scope(changes)||isDemo475ReleaseScope(changes)){
        git('merge-base','--is-ancestor','8772337ab95e7561aeba6d63b2ec2337d7bbee94','HEAD');
        return{mode:'demo-475',reason:'Verified merged PR #475 / focused V3.207 release: '+changes.map(c=>c.path).join(', ')};
      }
      if(isGallowsScope(changes)||isGallowsVisual205Scope(changes))return{mode:'gallows',reason:'Verified main Lên Giàn-only release: '+changes.map(c=>c.path).join(', ')};
    }catch(error){return{mode:'full',reason:'Unverified main diff: '+String(error.message||error)};}
    return{mode:'full',reason:'Main contains changes outside the verified scoped lists'};
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
  if(result.mode==='demo-475')console.log('PR #475: chi kiem DEMO Sat Thu/soi xet/audio/Len Gian, bao toan Worker/Player Web; khong kiem Card, Seat, OTA, IPA.');
  if(result.mode==='gallows')console.log('Chỉ dùng CI Lên Giàn và các chốt Worker/OTA/IPA có liên quan; không khởi chạy kiểm tra lá bài Chrome/Edge, ghế, Khám Phá, ảnh nền hay OTA trình duyệt.');
  if(result.mode==='ci-policy')console.log('Chỉ kiểm tra bộ chọn phạm vi CI; không chạy kiểm thử gameplay.');
  if(result.mode==='postgame')console.log('Bỏ qua kiểm thử lá bài / 30 ghế / realtime nặng; chỉ chạy hồi quy kết thúc ván. Production vẫn kiểm thử toàn diện.');
  if(result.mode==='dual-renderer')console.log('Chỉ kiểm thử hợp đồng dùng chung 2D/3D, phân quyền và tính cô lập của bản mẫu; không chạy bộ test game không liên quan.');
  if(result.mode==='p0-roster')console.log('Chỉ kiểm tra 2 người, Role/Artifact, đề cử/vote Chrome/Edge và trạng thái phòng; bỏ qua 30 ghế/cảnh nền/DEMO rules. Release main vẫn full.');
  else if(!['dual-renderer','gallows','ci-policy','postgame','p0-roster','demo-475'].includes(result.mode))console.log('Phạm vi chưa được chứng minh an toàn hoặc đang phát hành: chạy toàn bộ kiểm thử.');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+result.mode+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Phạm vi CI: '+result.mode+'\n'+result.reason+'\n');
}
