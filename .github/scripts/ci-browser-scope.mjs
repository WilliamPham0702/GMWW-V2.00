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

export function classifyBrowserScope(changes){
  if(!Array.isArray(changes)||!changes.length)return 'full';
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
  if(process.env.GMWW_CI_EVENT!=='pull_request')return {mode:'full',reason:'Full CI mandatory on main/manual release'};
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
  if(result.mode==='postgame')console.log('Bỏ qua kiểm thử lá bài / 30 ghế / realtime nặng; chỉ chạy hồi quy kết thúc ván. Production vẫn kiểm thử toàn diện.');
  if(result.mode==='dual-renderer')console.log('Chỉ kiểm thử hợp đồng dùng chung 2D/3D, phân quyền và tính cô lập của bản mẫu; không chạy bộ test game không liên quan.');
  if(result.mode==='p0-roster')console.log('Chỉ kiểm tra 2 người, Role/Artifact, đề cử/vote Chrome/Edge và trạng thái phòng; bỏ qua 30 ghế/cảnh nền/DEMO rules. Release main vẫn full.');
  else if(result.mode!=='dual-renderer')console.log('Phạm vi chưa được chứng minh an toàn hoặc đang phát hành: chạy toàn bộ kiểm thử.');
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'mode='+result.mode+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Phạm vi CI: '+result.mode+'\n'+result.reason+'\n');
}
