import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const workerBefore='// start\n  async gmConfig(request,body){return this.saveOldMatch(body)}\n  async gmDayClock(request,body){return null}\n// tail';
const workerAfter=workerBefore.replace('return this.saveOldMatch(body)','meta.winnerFaction=null;return this.saveOldMatch(body)');
const gmBefore='// start\n/* Match completion is shared */\nfunction playWatchCompletion(){return true}\nasync function openPlayEndSheet(){return null}\n// other UI';
const gmAfter=gmBefore.replace('return true','return room.matchId===room.lastEndedMatchId');
const dtoBefore='export function publicRoom(m){return{roomName:m.roomName,matchId:m.matchId||null,matchRevision:1,seatCount:m.seatCount}}';
const dtoAfter=dtoBefore.replace('matchRevision:1', 'lastEndedMatchId:m.lastEndedMatchId||null,matchRevision:1');
const modified=(path,before,after)=>({path,before,after,status:'M'});

test('Player Web background performance patch selects only its focused verification',()=>{
  const changes=[
    modified('assets/village/scene-manager.mjs','setInterval(sync,5000)','setInterval(()=>{if(!document.hidden)void sync()},5000)'),
    modified('assets/village/village-performance.mjs','requestAnimationFrame(frame)','document.addEventListener(\'visibilitychange\',visibility)'),
    modified('src/gmww-members-live.js','old bundle','document.hidden bundle'),
    modified('src/player-web-src/30-rooms-and-realtime.part','sendPresence()','if(document.hidden)return;sendPresence()'),
    modified('src/player-web-src/50-privacy-and-runtime.part','setInterval(checkWebUpdate,60000)','setInterval(()=>{if(!document.hidden)checkWebUpdate()},60000)'),
    {path:'tests/player-web-background-performance.test.mjs',status:'A',before:null,after:'visibility guarded'},
    {path:'docs/releases/GMWW-PLAYER-WEB-BACKGROUND-PERFORMANCE-20261029.md',status:'A',before:null,after:'# release'},
    {path:'docs/superpowers/specs/2026-10-29-player-web-background-performance-design.md',status:'A',before:null,after:'# spec'},
    {path:'docs/superpowers/plans/2026-10-29-player-web-background-performance.md',status:'A',before:null,after:'# plan'},
    modified('.github/scripts/ci-browser-scope.mjs','old selector','player-web-background-performance'),
    modified('.github/workflows/check-player-web.yml','old workflow','player-web-background-performance'),
    modified('tests/ci-browser-scope.test.mjs','old tests','Player Web background performance patch')
  ];
  assert.equal(classifyBrowserScope(changes),'player-web-background-performance');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M',before:'old',after:'unrelated'}]),'full');
});

test('Correctly scopes the original postgame bug with worker, bundled UI and room DTO',()=>{
  const changes=[
    modified('src/index.js',workerBefore,workerAfter),
    modified('src/gmww-public-room-contract.js',dtoBefore,dtoAfter),
    modified('server-game/src/50-roles-and-artifacts.part',gmBefore,gmAfter),
    modified('server-game/current/app.js',gmBefore,gmAfter),
    {path:'tests/match-completion-reentry.test.mjs',status:'A',before:null,after:'test'},
    {path:'docs/releases/pr-game-finish.md',status:'A',before:null,after:'# Notes'}
  ];
  assert.equal(classifyBrowserScope(changes),'postgame');
});
test('Unknown Worker changes always trigger full browser/30-player coverage',()=>{
  assert.equal(classifyBrowserScope([
    modified('src/index.js',workerBefore,workerAfter+'\n// routing changes')
  ]),'full');
  assert.equal(classifyBrowserScope([
    modified('src/index.js','const something=1','const something=2')
  ]),'full');
  assert.equal(classifyBrowserScope([
    modified('src/gmww-members-live.js','a','b')
  ]),'full');
});
test('Any other public-room contract change runs full browser checks',()=>{
  assert.equal(classifyBrowserScope([
    modified('src/gmww-public-room-contract.js',dtoBefore,dtoBefore.replace('seatCount:m.seatCount','seatCount:30'))
  ]),'full');
  assert.equal(classifyBrowserScope([
    modified('src/gmww-public-room-contract.js',dtoBefore,dtoAfter.replace('seatCount:m.seatCount','seatCount:30'))
  ]),'full');
});
test('UI changes outside the finished-match sheet cannot bypass visual checks',()=>{
  assert.equal(classifyBrowserScope([
    modified('server-game/current/app.js',gmBefore,gmAfter+'\nfunction drawSeats(){}')
  ]),'full');
});
test('Browser, seat, workflow and CI script changes always run full checks',()=>{
  for(const path of ['tests/browser-private-cards.mjs','assets/village/village.css',
    '.github/workflows/check-player-card-browsers.yml','.github/scripts/ci-browser-scope.mjs']){
    assert.equal(classifyBrowserScope([modified(path,'old','new')]),'full',path);
  }
});
test('A deletion, unexpected status or empty change set fails closed',()=>{
  assert.equal(classifyBrowserScope([]),'full');
  assert.equal(classifyBrowserScope([{path:'src/index.js',status:'D',before:workerBefore,after:null}]),'full');
  assert.equal(classifyBrowserScope([{path:'src/index.js',status:'R100',before:workerBefore,after:workerAfter}]),'full');
});
test('Completion-only documentation and focused tests do not run unrelated browser checks',()=>{
  assert.equal(classifyBrowserScope([
    {path:'tests/match-completion-server.test.mjs',status:'M',before:'old',after:'new'},
    {path:'docs/releases/pr-test.md',status:'A',before:null,after:'# Changed'}
  ]),'postgame');
});

test('P0 atomic roster and role recovery changes select focused Chrome/Edge checks, not 30 seats',()=>{
  const workerBefore='top\\n  async playerMove(body){old move}\\n  async playerMoveComplete(body){}\\n  async join(body){old join}\\n  async ready(body){}\\ntail';
  const workerAfter=workerBefore.replace('old move','new move').replace('old join','new join');
  const patcherBefore='top\\n // First click should OPEN the chosen card in Chrome and Edge\\nend';
  const patcherAfter=patcherBefore.replace(' // First click should OPEN',
    ' // Join now returns a public, privacy-safe room snapshot atomically with the\\n new private recovery code\\n // First click should OPEN');
  assert.equal(classifyBrowserScope([
    modified('src/index.js',workerBefore,workerAfter),
    modified('src/gmww-player-private-card-patch.js',patcherBefore,patcherAfter),
    modified('tests/browser-live-realtime-vote.mjs','old test','new test'),
    {status:'A',path:'tests/player-web-p0-atomic-roster-role-release.test.mjs',after:'new test',before:null},
    {status:'A',path:'docs/releases/player-web-p0-atomic-roster-v3196-20261024.md',after:'# notes',before:null}
  ]),'p0-roster');
  assert.equal(classifyBrowserScope([modified('src/index.js',workerBefore,workerAfter+'\\nnew global route')]),'full');
  assert.equal(classifyBrowserScope([modified('src/gmww-player-private-card-patch.js',patcherBefore,
    patcherAfter+'\\nnew unrelated view')]),'full');
  assert.equal(classifyBrowserScope([{status:'A',path:'src/player-web-src/dangerous.js',after:'new',before:null}]),'full');
});

test('PR475 DEMO + staging chọn đúng kiểm thử liên quan và fail-closed với file lạ',()=>{
 const changes=[
  modified('src/gmww-demo-runner.js','old','new'),
  modified('src/gmww-gallows-rules.js','old','new'),
  {path:'tests/demo-assassin-gallows-divination.test.mjs',status:'A',after:'test'},
  modified('src/index.js','old','new'),
  modified('src/player-web-src/30-rooms-and-realtime.part','old','new'),
  modified('src/gmww-members-live.js','old','new'),
  {path:'.github/workflows/deploy-demo-pr475-staging.yml',status:'A',after:'workflow'},
  {path:'wrangler.demo-pr475-staging.jsonc',status:'A',after:'isolated'},
  modified('.github/scripts/ci-browser-scope.mjs','old','new')
 ];
 assert.equal(classifyBrowserScope(changes),'demo-475');
 assert.equal(classifyBrowserScope([...changes,{path:'src/gmww-player-private-card-patch.js',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'assets/village/village.css',status:'M'}]),'full');
 assert.equal(classifyBrowserScope(changes.slice(1)),'full');
});

test('PR #463 chỉ kiểm thử Lên Giàn; bỏ qua browser card, ghế, Khám Phá và OTA không liên quan',()=>{
 const c=[
  {path:'.github/workflows/check-gallows-redesign.yml',status:'M'},
  {path:'src/gmww-gallows-rules.js',status:'M'},
  {path:'tests/gallows-panel-60s-controls.test.mjs',status:'A'},
  modified('src/index.js','old Worker','gallows Worker code'),
  modified('server-game/current/app.js','old GM','gallows GM panel'),
  modified('src/player-web-src/30-rooms-and-realtime.part','old','gallows display'),
  modified('src/gmww-members-live.js','old','gallows state'),
  modified('.github/scripts/prepare-update-channel.mjs','old','version gate'),
  {path:'docs/release-notes-gallows-panel-20261024.md',status:'A'}
 ];
 assert.equal(classifyBrowserScope(c),'gallows');
 assert.equal(classifyBrowserScope([...c,modified('src/gmww-player-private-card-patch.js','old','new')]),'full');
 assert.equal(classifyBrowserScope([...c,modified('tests/browser-private-cards.mjs','old','new')]),'full');
 assert.equal(classifyBrowserScope([...c,{path:'assets/village/village.css',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...c,{path:'src/player-web-src/unrelated.js',status:'A'}]),'full');
});

test('Đổi riêng quy tắc CI chỉ kiểm tra unit của bộ chọn, không quét toàn bộ Chrome/Seat',()=>{
 const c=[
  modified('.github/scripts/ci-browser-scope.mjs','old','new'),
  modified('.github/workflows/check-player-card-browsers.yml','old','new'),
  modified('.github/workflows/deploy-production.yml','old','new'),
  modified('tests/ci-browser-scope.test.mjs','old','new'),
  {path:'docs/releases/ci-browser-focused-gallows-20261024.md',status:'A'}
 ];
 assert.equal(classifyBrowserScope(c),'ci-policy');
 assert.equal(classifyBrowserScope([...c,modified('src/index.js','x','y')]),'full');
});

test('CI-only merge phải chặn auto-deploy Production',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
  assert.match(workflow,/deploy-scope:/);
  assert.match(workflow,/needs\.deploy-scope\.outputs\.should_deploy == 'true'/);
  assert.match(workflow,/\.github\/workflows\/deploy-production\.yml/);
  assert.match(workflow,/CHỈ CI: BỎ QUA DEPLOY PRODUCTION/);
});

test('Bản vá cổng phát hành V3.203 chỉ chạy CI policy, không kiểm Chrome/Seat',()=>{
  const c=[
    modified('.github/scripts/ci-browser-scope.mjs','old','new'),
    modified('.github/workflows/check-player-card-browsers.yml','old','new'),
    modified('.github/workflows/deploy-production.yml','old','new'),
    modified('tests/ci-browser-scope.test.mjs','old','new'),
    {path:'docs/releases/GMWW-V3.203-focused-release-gate-20261024.md',status:'A'}
  ];
  assert.equal(classifyBrowserScope(c),'ci-policy');
  assert.equal(classifyBrowserScope([...c,modified('server-game/current/app.js','before','after')]),'full');
});

test('V3.203 manual release only passes with dedicated Gallows CI and matching Worker SHA',()=>{
  const s=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
  for(const required of [
    'github.event_name == \'workflow_dispatch\'',
    'git merge-base --is-ancestor d97ff983668a2e92729cf5718015b3250119b5e2 HEAD',
    'Check Lên Giàn theo đúng phạm vi',
    'Check Player Web Worker',
    'r.head_sha===process.env.TESTED_SHA',
    'steps.gallows_release.outputs.approved',
    '3.203.0',
    'verify-ota-version-advance.mjs',
    'npx wrangler deploy'
  ])assert.ok(s.includes(required),'Missing release guard: '+required);
  assert.ok(s.includes('docs/release-notes-gallows-panel-20261024.md'));
});

test('V3.205 chỉ test Lên Giàn: cờ đỏ Player Web, toolbar iPhone, Ẩn/Hiện người chết',()=>{
 const changes=[
  {path:'assets/village/village.mjs',status:'M'},
  {path:'src/player-web-src/30-rooms-and-realtime.part',status:'M'},
  {path:'src/gmww-members-live.js',status:'M'},
  {path:'tests/gallows-pirate-ui-v3205.test.mjs',status:'A'},
  {path:'server-game/current/GMWW.html',status:'M'},
  {path:'server-game/current/style.css',status:'M'},
  {path:'server-game/current/app.js',status:'M'},
  {path:'server-game/src/00-core-and-library.part',status:'M'},
  {path:'server-game/src/40-battle-and-timeline.part',status:'M'},
  {path:'.github/workflows/check-gallows-redesign.yml',status:'M'},
  {path:'.github/workflows/deploy-production.yml',status:'M'},
  {path:'.github/scripts/ci-browser-scope.mjs',status:'M'},
  {path:'docs/releases/GMWW-V3.205-gallows-pirate-flag-20261024.md',status:'A'}
 ];
 assert.equal(classifyBrowserScope(changes),'gallows');
 for(const unrelated of ['tests/browser-private-cards.mjs','assets/village/arena-3d/main.mjs','tests/seat-presets-ota-v399.test.mjs']){
   assert.equal(classifyBrowserScope([...changes,{path:unrelated,status:'M'}]),'full',unrelated);
 }
});


test('PR475 release CI on main selects focused DEMO checks and fails closed',()=>{
 const files=[
  modified('.github/scripts/ci-browser-scope.mjs','old','scope updated'),
  modified('.github/workflows/check-player-web.yml','old','focused Worker'),
  modified('.github/workflows/deploy-production.yml','old','same SHA release guard'),
  modified('tests/ci-browser-scope.test.mjs','old','selector checks'),
  {path:'docs/releases/GMWW-V3.207-demo475-production-20261025.md',status:'A',after:'# release'}
 ];
 assert.equal(classifyBrowserScope(files),'demo-475');
 assert.equal(classifyBrowserScope([...files,modified('assets/village/village.css','old','changed')]),'full');
 assert.equal(classifyBrowserScope(files.filter(x=>x.path!=='.github/workflows/deploy-production.yml')),'full');
 const wf=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
 for(const required of [
  'demo475_release_3207',
  '8772337ab95e7561aeba6d63b2ec2337d7bbee94',
  'docs/releases/GMWW-V3.207-demo475-production-20261025.md',
  'Check Lên Giàn theo đúng phạm vi',
  'Check Player Web Worker'
 ])assert.ok(wf.includes(required),'Missing focused release guard: '+required);
});


test('PR475 manual Gallows workflow dispatched on exact main SHA is scoped and fail-closed',()=>{
 const changes=[
  modified('.github/scripts/ci-browser-scope.mjs','before','after'),
  modified('.github/workflows/deploy-production.yml','before','after'),
  modified('tests/ci-browser-scope.test.mjs','before','after'),
  {path:'docs/releases/GMWW-V3.207-demo475-manual-gallows-ci-20261025.md',status:'A',after:'notes'}
 ];
 assert.equal(classifyBrowserScope(changes),'demo-475');
 assert.equal(classifyBrowserScope(changes.filter(x=>x.path!=='.github/workflows/deploy-production.yml')),'full');
 assert.equal(classifyBrowserScope([...changes,modified('src/index.js','x','y')]),'full');
 const wf=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
 assert.match(wf,/r\.event==='workflow_dispatch'&&r\.name==='Check Lên Giàn theo đúng phạm vi'/);
});


test('V3.207 final main push CI selector stays scoped for documented verified correction',()=>{
 const c=[
  modified('.github/scripts/ci-browser-scope.mjs','old','new'),
  modified('tests/ci-browser-scope.test.mjs','old','new'),
  {path:'docs/releases/GMWW-V3.207-demo475-main-ci-final-20261025.md',status:'A',after:'# Corrected main push CI'}
 ];
 assert.equal(classifyBrowserScope(c),'demo-475');
 assert.equal(classifyBrowserScope(c.slice(1)),'full');
 assert.equal(classifyBrowserScope([...c,modified('src/index.js','before','different runtime')]),'full');
 const selector=readFileSync(new URL('../.github/scripts/ci-browser-scope.mjs',import.meta.url),'utf8');
 assert.ok(selector.includes('isDemo475FinalGateScope(changes)||isDemo475CompletionScope(changes)'));
});

test('AUTO VÁN CI-only selector is isolated; never treats gameplay as CI-only',()=>{
 const files=[
  modified('.github/scripts/ci-browser-scope.mjs','old','new'),
  modified('.github/workflows/check-player-web.yml','old','new'),
  modified('.github/workflows/deploy-production.yml','old','new'),
  modified('tests/ci-browser-scope.test.mjs','old','new')
 ];
 assert.equal(classifyBrowserScope(files),'auto-van-ci');
 assert.equal(classifyBrowserScope([...files,modified('src/index.js','before','unknown gameplay')]),'full');
});
test('AUTO VÁN V3.222 release allows only exact metadata bump, notes and unchanged gameplay',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const files=[
  modified('package.json',read('package.json'),read('package.json').replace('"version": "3.221.0"','"version": "3.222.0"')),
  modified('package-lock.json',read('package-lock.json'),read('package-lock.json').split('"version": "3.221.0"').join('"version": "3.222.0"')),
  modified('src/index.js',read('src/index.js'),read('src/index.js').replace('VERSION="V3.221"','VERSION="V3.222"').replace('UPDATE_CHANNEL_REV="runtime-3221"','UPDATE_CHANNEL_REV="runtime-3222"')),
  modified('server-game/src/00-core-and-library.part',read('server-game/src/00-core-and-library.part'),read('server-game/src/00-core-and-library.part').replace("const VERSION='3.221'","const VERSION='3.222'")),
  modified('server-game/current/app.js',read('server-game/current/app.js'),read('server-game/current/app.js').replace("const VERSION='3.221'","const VERSION='3.222'")),
  modified('server-game/current/GMWW.html',read('server-game/current/GMWW.html'),read('server-game/current/GMWW.html').replace('<title>GMWW V3.221</title>','<title>GMWW V3.222</title>')),
  modified('.github/scripts/prepare-update-channel.mjs',read('.github/scripts/prepare-update-channel.mjs'),read('.github/scripts/prepare-update-channel.mjs').replace('releaseNotes:[','releaseNotes:["V3.222: AUTO VÁN đúng số người, lưu khi xác nhận; rollback V3.221.",')),
  {path:'docs/releases/GMWW-V3.222-auto-van-20261025.md',status:'A',before:null,after:'AUTO VÁN\nrollback'}
 ];
 // Current fixtures are no longer historical V3.221 data: fail closed.
 assert.equal(classifyBrowserScope(files),'full');
 assert.equal(classifyBrowserScope([...files,modified('src/gmww-gallows-rules.js','x','y')]),'full');
 const broken=files.map(c=>c.path==='server-game/current/app.js'?{...c,after:c.after+'\n// gameplay changed'}:c);
 assert.equal(classifyBrowserScope(broken),'full');
});

test('PR501 chỉ thu gọn CI khi chính xác 5 icon, phiên bản giữ nguyên và không có gameplay/Native',()=>{
  const entries=[
    modified('assets/village/village.mjs','old flag code',"flag.textContent='🚩'"),
    modified('server-game/current/GMWW.html','<title>GMWW V3.218</title>','<title>GMWW V3.218</title> 🌈 🏖️ ⛱️ 🐦‍🔥'),
    modified('server-game/current/app.js',"const VERSION='3.218';","const VERSION='3.218'; gmwwSetupFreeBattleIcons();"),
    modified('server-game/current/style.css','old CSS','#battleFactionStatsFloat.gmww-free-icon'),
    modified('server-game/src/30-village-and-setup.part','old UI',"const GMWW_BATTLE_ICON_POSITIONS='gmww_battle_free_icons_v1'"),
    modified('server-game/src/40-battle-and-timeline.part','old','new'),
    {path:'tests/gm-free-floating-shortcuts-20261025.test.mjs',status:'A',after:'tests'},
    {path:'tests/gm-free-floating-shortcuts-iphone-webkit.mjs',status:'A',after:'webkit'},
    {path:'.github/workflows/check-gm-free-icons-501.yml',status:'A',after:'CI'},
    modified('.github/scripts/ci-browser-scope.mjs','before','after'),
    modified('.github/workflows/check-player-web.yml','before','after'),
    modified('.github/workflows/build-server-game-ipa.yml','before','after'),
    modified('.github/workflows/check-gallows-redesign.yml','before','after'),
    modified('.github/workflows/prepare-runtime-v3202-candidate.yml','before','after'),
    {path:'docs/acceptance-pr501-iphone-playerweb.md',status:'A',after:'Checklist'}
  ];
  assert.equal(classifyBrowserScope(entries),'gm-icons-501');
  assert.equal(classifyBrowserScope([...entries,modified('src/index.js','old','new')]),'full','Worker logic expands scope');
  assert.equal(classifyBrowserScope([...entries,modified('server-game/GMWW-Server/GameView.swift','old','new')]),'full','Native changes expand scope');
  assert.equal(classifyBrowserScope([...entries,{path:'src/gmww-gallows-rules.js',status:'A',after:'change'}]),'full','Gameplay changes expand scope');
  assert.equal(classifyBrowserScope([...entries,modified('package.json','3.218','3.219')]),'full','Runtime release needs own gate');
  assert.equal(classifyBrowserScope(entries.map(c=>c.path==='server-game/current/app.js'?
    {...c,after:"const VERSION='3.219'; gmwwSetupFreeBattleIcons();"}:c)),'full','Any version advance requires release gates');
  assert.equal(classifyBrowserScope(entries.filter(c=>c.path!=='assets/village/village.mjs')),'full','Missing Player Web flag forces full');
});


test('V3.224 #501 release mode verifies exact 3.223 to 3.224 changes and fails closed',()=>{
 const modified501=(path,before,after)=>({path,before,after,status:'M'});
 const c=[
  modified501('assets/village/village.mjs','old flag',"flag.textContent='🚩'"),
  modified501('server-game/current/GMWW.html','<title>GMWW V3.223</title>','<title>GMWW V3.224</title> 🌈 🏖️ ⛱️ 🐦‍🔥'),
  modified501('server-game/current/app.js',"const VERSION='3.223';","const VERSION='3.224'; gmwwSetupFreeBattleIcons();"),
  modified501('server-game/current/style.css','old','#battleFactionStatsFloat.gmww-free-icon'),
  modified501('server-game/src/00-core-and-library.part',"const VERSION='3.223';","const VERSION='3.224';"),
  modified501('server-game/src/30-village-and-setup.part','old',"GMWW_BATTLE_ICON_POSITIONS='gmww_battle_free_icons_v1'"),
  modified501('server-game/src/40-battle-and-timeline.part','old','new'),
  modified501('src/index.js','VERSION="V3.223"','VERSION="V3.224"; UPDATE_CHANNEL_REV="runtime-3224"'),
  modified501('package.json','"version": "3.223.0"','"version": "3.224.0"'),
  modified501('package-lock.json','"version": "3.223.0"','"version": "3.224.0"'),
  modified501('.github/scripts/prepare-update-channel.mjs','old','releaseNotes:["V3.224:'),
  {path:'docs/releases/GMWW-V3.224-five-floating-icons-20261025.md',status:'A',after:'Rollback V3.223'},
  {path:'tests/gm-free-floating-shortcuts-20261025.test.mjs',status:'A',after:'tests'},
  {path:'tests/gm-free-floating-shortcuts-iphone-webkit.mjs',status:'A',after:'WebKit'},
  {path:'.github/workflows/check-gm-free-icons-501.yml',status:'A',after:'CI'}
 ];
 assert.equal(classifyBrowserScope(c),'gm-icons-501-release');
 assert.equal(classifyBrowserScope([...c,modified501('src/gmww-gallows-rules.js','old','new')]),'full','No gameplay changes');
 assert.equal(classifyBrowserScope([...c,modified501('server-game/GMWW-Server/Native.swift','a','b')]),'full','No IPA changes');
 assert.equal(classifyBrowserScope(c.map(x=>x.path==='package.json'?{...x,after:'"version": "3.225.0"'}:x)),'full','No arbitrary release version');
 assert.equal(classifyBrowserScope(c.map(x=>x.path==='server-game/current/app.js'?{...x,after:"const VERSION='3.223';"}:x)),'full','Missing runtime version fails closed');
 assert.equal(classifyBrowserScope(c.filter(x=>x.path!=='docs/releases/GMWW-V3.224-five-floating-icons-20261025.md')),'full','Mandatory release notes');
});

test('V3.234 post-merge push CI is scoped to four verified CI/release-note files',()=>{
 const c=[
  modified('.github/scripts/ci-browser-scope.mjs','old','isGM3234PostMergeReleaseGateScope(changes)'),
  modified('tests/ci-browser-scope.test.mjs','old','V3.234 post-merge push CI is scoped'),
  modified('.github/workflows/check-player-web.yml','old','node --test tests/ci-browser-scope.test.mjs'),
  modified('docs/releases/GMWW-V3.234-night-day-dock-gallows-20261026.md','old','CI hậu merge V3.234')
 ];
 // Historical dock release shortcut must not match contemporary CI changes.
 assert.equal(classifyBrowserScope(c),'full');
 assert.equal(classifyBrowserScope(c.slice(0,3)),'full','Release notes mandatory');
 assert.equal(classifyBrowserScope([...c,modified('src/gmww-gallows-rules.js','old','new')]),'full','Core modification cannot inherit UI scope');
 assert.equal(classifyBrowserScope(c.map(x=>x.path==='docs/releases/GMWW-V3.234-night-day-dock-gallows-20261026.md'?{...x,after:'unknown version'}:x)),'full','Release version evidence mandatory');
 const scopeSource=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
 assert.match(scopeSource,/if\(isGM3234PostMergeReleaseGateScope\(changes\)\|\|isPhaseDockGallows3234Scope\(changes\)\)return\{mode:'phase-dock-gallows-3234'/);
});

test('V3.235 scoped GM glass dock checks only the exact UI release files',()=>{
 const paths=[
  '.github/scripts/ci-browser-scope.mjs','.github/scripts/prepare-update-channel.mjs',
  '.github/workflows/check-player-web.yml','docs/releases/GMWW-V3.235-ui-glass-dock-20261026.md',
  '.github/workflows/check-gallows-redesign.yml','.github/workflows/check-gm-free-icons-501.yml',
  '.github/workflows/check-dual-renderer.yml','.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/prepare-runtime-v3202-candidate.yml',
  'package-lock.json','package.json','server-game/current/GMWW.html',
  'server-game/current/app.js','server-game/current/style.css',
  'server-game/src/00-core-and-library.part','server-game/src/20-members-and-roster.part',
  'server-game/src/30-village-and-setup.part','server-game/src/40-battle-and-timeline.part',
  'src/index.js','tests/ci-browser-scope.test.mjs',
  'tests/gmww-v3233-audio-templates-dock.test.mjs',
  'tests/gmww-v3234-phase-dock-gallows.test.mjs','tests/gmww-v3235-unified-glass-dock.test.mjs'
 ];
 const tokens={
  'src/index.js':'VERSION="V3.235"',
  'server-game/current/app.js':"const VERSION='3.235'",
  'server-game/current/style.css':'V3.235 unified GM',
  'server-game/current/GMWW.html':'gmww-cloudflare-label">CLOUDFLARE</b>',
  'tests/gmww-v3235-unified-glass-dock.test.mjs':'V3.235: five daytime text controls',
  'docs/releases/GMWW-V3.235-ui-glass-dock-20261026.md':'Rollback',
  '.github/workflows/check-player-web.yml':"'gm-ui-glass-3235'",
  'package.json':'"version": "3.235.0"'
 };
 const c=paths.map(path=>({
  path,status:['tests/gmww-v3235-unified-glass-dock.test.mjs','docs/releases/GMWW-V3.235-ui-glass-dock-20261026.md'].includes(path)?'A':'M',
  before:'prior',after:tokens[path]||'UI only'
 }));
 assert.equal(classifyBrowserScope(c),'gm-ui-glass-3235');
 assert.equal(classifyBrowserScope(c.slice(1)),'full','Missing file may not bypass full gate');
 assert.equal(classifyBrowserScope([...c,modified('src/gmww-gallows-rules.js','a','b')]),'full','Core changes fail closed');
 assert.equal(classifyBrowserScope(c.map(x=>x.path==='src/index.js'?{...x,after:'VERSION="V3.234"'}:x)),'full','Runtime version required');
 assert.equal(classifyBrowserScope(c.map(x=>x.path==='docs/releases/GMWW-V3.235-ui-glass-dock-20261026.md'?{...x,after:'no notes'}:x)),'full','Release notes required');
});

test('V3.236 scoped change set excludes unrelated Seat/Card/3D/IPA but fails closed on extra Core changes',()=>{
 const allowed=[".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","docs/releases/GMWW-V3.236-menu-gallows-20261026.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/gmww-gallows-rules.js","src/gmww-members-live.js","src/index.js","src/player-web-src/30-rooms-and-realtime.part","tests/ci-browser-scope.test.mjs","tests/gallows-panel-60s-controls.test.mjs","tests/gmww-v3236-menu-gallows.test.mjs"];
 const tokens={
  'src/index.js':'VERSION="V3.236"',
  'server-game/current/app.js':"const VERSION='3.236'",
  'server-game/current/GMWW.html':'id="battleGMChromeToggle"',
  'server-game/current/style.css':'GMWW V3.236',
  'src/gmww-gallows-rules.js':"outcome:'no_lynch'",
  'src/player-web-src/30-rooms-and-realtime.part':"'no_lynch'",
  'tests/gmww-v3236-menu-gallows.test.mjs':'V3.236 tied nomination',
  'docs/releases/GMWW-V3.236-menu-gallows-20261026.md':'Rollback',
  'package.json':'"version": "3.236.0"',
  '.github/workflows/check-player-web.yml':"'gm-menu-gallows-3236'",
  '.github/workflows/deploy-production.yml':'3.236.0'
 };
 const changes=allowed.map(path=>({path,status:path==='tests/gmww-v3236-menu-gallows.test.mjs'||path==='docs/releases/GMWW-V3.236-menu-gallows-20261026.md'?'A':'M',after:tokens[path]||'approved'}));
 assert.equal(classifyBrowserScope(changes),'gm-menu-gallows-3236');
 assert.equal(classifyBrowserScope(changes.slice(1)),'full');
 assert.equal(classifyBrowserScope([...changes,modified('src/gmww-wolf-night-resolution.js','a','b')]),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/gmww-gallows-rules.js'?{...c,after:'missing no lynch'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='package.json'?{...c,after:'"version": "3.235.0"'}:c)),'full');
});

test('V3.237 scoped GM menu & footer only, excluding game rules and unrelated tests',()=>{
 const paths=[".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-player-web.yml",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/deploy-production.yml","docs/releases/GMWW-V3.237-gm-menu-footer-20261026.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/index.js","tests/ci-browser-scope.test.mjs","tests/gmww-v3237-gm-menu-footer.test.mjs"];
 const tokens={
  'src/index.js':'VERSION="V3.237"',
  'server-game/current/app.js':"const VERSION='3.237'",
  'server-game/current/GMWW.html':'id="battleGMChromeToggle"',
  'server-game/current/style.css':'GMWW V3.237: shared campfire menu',
  'tests/gmww-v3237-gm-menu-footer.test.mjs':'V3.237 GM hide toggle',
  'docs/releases/GMWW-V3.237-gm-menu-footer-20261026.md':'Rollback',
  'package.json':'"version": "3.237.0"',
  '.github/workflows/check-player-web.yml':"'gm-ui-menu-3237'",
  '.github/workflows/deploy-production.yml':'3.237.0'
 };
 const rows=paths.map(path=>({path,status:['tests/gmww-v3237-gm-menu-footer.test.mjs','docs/releases/GMWW-V3.237-gm-menu-footer-20261026.md'].includes(path)?'A':'M',after:tokens[path]||'approved'}));
 assert.equal(classifyBrowserScope(rows),'gm-ui-menu-3237');
 assert.equal(classifyBrowserScope(rows.slice(1)),'full');
 assert.equal(classifyBrowserScope([...rows,modified('src/gmww-gallows-rules.js','old','changed')]),'full');
 assert.equal(classifyBrowserScope(rows.map(x=>x.path==='package.json'?{...x,after:'3.236.0'}:x)),'full');
});

test('V3.238 scoped all-GM controls only; no unrelated Core, Player Web or IPA test',()=>{
 const paths=[".github/scripts/ci-browser-scope.mjs",".github/scripts/prepare-update-channel.mjs",".github/workflows/check-gallows-redesign.yml",".github/workflows/check-gm-free-icons-501.yml",".github/workflows/check-dual-renderer.yml",".github/workflows/build-server-game-ipa.yml",".github/workflows/prepare-runtime-v3202-candidate.yml",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","docs/releases/GMWW-V3.238-uniform-gm-controls-20261026.md","package-lock.json","package.json","server-game/current/GMWW.html","server-game/current/app.js","server-game/current/style.css","server-game/src/00-core-and-library.part","server-game/src/40-battle-and-timeline.part","server-game/src/50-roles-and-artifacts.part","src/index.js","tests/ci-browser-scope.test.mjs","tests/gmww-v3237-gm-menu-footer.test.mjs","tests/gmww-v3238-uniform-gm-controls.test.mjs"];
 const tokens={
  'src/index.js':'VERSION="V3.238"',
  'server-game/current/app.js':"const VERSION='3.238'",
  'server-game/current/GMWW.html':'id="battleGMChromeToggle"',
  'server-game/current/style.css':'V3.238 — every GM control',
  'tests/gmww-v3238-uniform-gm-controls.test.mjs':'V3.238 all GM buttons',
  'docs/releases/GMWW-V3.238-uniform-gm-controls-20261026.md':'Rollback',
  'package.json':'"version": "3.238.0"',
  '.github/workflows/check-player-web.yml':"'gm-ui-controls-3238'",
  '.github/workflows/deploy-production.yml':'3.238.0'
 };
 const rows=paths.map(path=>({path,status:['tests/gmww-v3238-uniform-gm-controls.test.mjs','docs/releases/GMWW-V3.238-uniform-gm-controls-20261026.md'].includes(path)?'A':'M',after:tokens[path]||'approved'}));
 assert.equal(classifyBrowserScope(rows),'gm-ui-controls-3238');
 assert.equal(classifyBrowserScope(rows.slice(1)),'full');
 assert.equal(classifyBrowserScope([...rows,modified('src/gmww-gallows-rules.js','old','new')]),'full');
 assert.equal(classifyBrowserScope(rows.map(x=>x.path==='package.json'?{...x,after:'"version": "3.237.0"'}:x)),'full');
});

test('V3.238 deployment hotfix validates only duplicate-ID release workflow repair',()=>{
 const paths=['.github/workflows/deploy-production.yml','.github/workflows/check-player-web.yml','.github/workflows/check-dual-renderer.yml','.github/workflows/build-server-game-ipa.yml','.github/scripts/ci-browser-scope.mjs','tests/ci-browser-scope.test.mjs'];
 const token={
  '.github/workflows/deploy-production.yml':'V3.238 emergency:',
  '.github/workflows/check-player-web.yml':"'gm238-deploy-repair'",
  'tests/ci-browser-scope.test.mjs':'V3.238 deployment hotfix'
 };
 const rows=paths.map(path=>({path,status:'M',after:token[path]||'scope whitelist'}));
 assert.equal(classifyBrowserScope(rows),'gm238-deploy-repair');
 assert.equal(classifyBrowserScope(rows.slice(1)),'full');
 assert.equal(classifyBrowserScope([...rows,modified('server-game/current/app.js','a','b')]),'full');
});

test('V3.238 workflow revalidation: exactly one deploy job and only three repair files',()=>{
 const paths=['.github/workflows/deploy-production.yml','.github/scripts/ci-browser-scope.mjs','tests/ci-browser-scope.test.mjs'];
 const c=paths.map(path=>({path,status:'M',after:path.endsWith('deploy-production.yml')?'V3.238 recovery:':path.endsWith('ci-browser-scope.test.mjs')?'V3.238 workflow revalidation':'classifier'}));
 assert.equal(classifyBrowserScope(c),'gm238-deploy-repair');
 assert.equal(classifyBrowserScope(c.slice(1)),'full');
 assert.equal(classifyBrowserScope([...c,modified('src/index.js','before','after')]),'full');
});



test('PR532 scoped CI selector accepts exactly match-exit, Demo switch and reset edits',()=>{
 const workerBefore='header\n  async gmReset(request,body){return 0}\n  async gmEnd(request,body){return 1}\ntail';
 const workerAfter=workerBefore.replace('return 0','["demoLease","demoClock","demoPlan"]; return 2');
 const setupBefore='head\nasync function selectPlayExistingRoom(r){return 0}\nfunction renderPlayCreatedRooms(){return 0}\nasync function flushPlayRoomMode(){return 0}\nfunction bindPlayRoomModeButtons(){return 0}\ntail';
 const setupAfter=setupBefore.replace('selectPlayExistingRoom(r){return 0','selectPlayExistingRoom(r){return 2').replace('flushPlayRoomMode(){return 0','flushPlayRoomMode(){// ROOM_MODE_REQUIRES_EMPTY_RESET; return 3');
 const uiBefore='head\nasync function playCompletionNext(choice){return 0}\nfunction initPlayCompletion(){return 0}\ntail';
 const uiAfter=uiBefore.replace('return 0',"transactionId:'completed-leave-'; return 1");
 const appBefore=setupBefore+'\n'+uiBefore;
 const appAfter=setupAfter+'\n'+uiAfter;
 const files=[
  modified('src/index.js',workerBefore,workerAfter),
  modified('server-game/src/30-village-and-setup.part',setupBefore,setupAfter),
  modified('server-game/src/50-roles-and-artifacts.part',uiBefore,uiAfter),
  modified('server-game/current/app.js',appBefore,appAfter),
  {path:'tests/post-match-room-cleanup.test.mjs',status:'A',after:'Hard room reset clears DEMO lease'},
  {path:'docs/releases/post-match-room-demo-seat-20261026.md',status:'A',after:'Release notes'}
 ];
 assert.equal(classifyBrowserScope(files),'post-match-room-532');
 assert.equal(classifyBrowserScope(files.filter(x=>x.path!=='server-game/current/app.js')),'full');
 assert.equal(classifyBrowserScope([...files,modified('src/gmww-gallows-rules.js','a','b')]),'full');
 assert.equal(classifyBrowserScope(files.map(x=>x.path==='src/index.js'?{...x,after:x.after+'\n// unwanted Worker change'}:x)),'full');
 assert.equal(classifyBrowserScope(files.map(x=>x.path==='server-game/src/30-village-and-setup.part'?{...x,after:x.after+'\n// unexpected Seat change'}:x)),'full');
});

test('PR532 scoped CI selector permits only the exact isolated CI-only followup',()=>{
 const paths=[
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/check-player-web.yml',
  '.github/workflows/check-player-card-browsers.yml',
  '.github/workflows/check-gm-free-icons-501.yml',
  '.github/workflows/check-gallows-redesign.yml',
  '.github/workflows/check-dual-renderer.yml',
  '.github/workflows/build-server-game-ipa.yml',
  'tests/ci-browser-scope.test.mjs',
  'docs/releases/post-match-ci-scope-20261026.md'
 ];
 const files=paths.map(path=>({path,status:path.startsWith('docs/')?'A':'M',
   before:'old',after:path==='tests/ci-browser-scope.test.mjs'?'PR532 scoped CI selector':'CI routing'}));
 assert.equal(classifyBrowserScope(files),'postmatch-ci-532');
 assert.equal(classifyBrowserScope([...files,modified('server-game/current/app.js','a','b')]),'full');
});

test('PR550 focused rules regression only (no unrelated gameplay, IPA, OTA)',()=>{
 const rows=[
   {path:'tests/gmww-rule-snow-guard-pack-fairy.test.mjs',status:'A',after:'Snow Wolf: night N target is barred at N+1'},
   {path:'tests/ci-browser-scope.test.mjs',status:'M',before:'previous',after:'PR550 focused rules regression only'},
   {path:'.github/scripts/ci-browser-scope.mjs',status:'M',before:'previous',after:'function isRules550Scope(changes)'},
   {path:'.github/workflows/check-player-web.yml',status:'M',before:'previous',
     after:"steps.scope.outputs.mode == 'night02-rule-regression-550'"},
   {path:'.github/workflows/deploy-production.yml',status:'M',before:'previous',
     after:'PR550 test-only rule regression'}
 ];
 assert.equal(classifyBrowserScope(rows),'night02-rule-regression-550');
 assert.equal(classifyBrowserScope(rows.slice(1)),'full');
 assert.equal(classifyBrowserScope([...rows,{path:'src/index.js',status:'M',before:'a',after:'b'}]),'full');
 assert.equal(classifyBrowserScope(rows.map(row=>row.path.startsWith('tests/gmww-rule-snow')?{...row,after:'unrelated'}:row)),'full');
});

test('PR603 account avatar uses scoped verification and rejects unrelated Worker or role changes',()=>{
  const rows=[
    modified('src/gmww-members-live.js','old generated bundle','new generated bundle'),
    modified('src/player-web-src/20-village-and-profile.part','old avatar',`
function updatePlayerTopMenu(){const account={};avatar.onload=()=>{account.classList.add('has-avatar')};avatar.onerror=()=>{account.classList.remove('has-avatar')};}
const cls='gmww-player-account-fallback';
`),
    {path:'tests/player-web-top-account-avatar-20261029.test.mjs',status:'A',before:null,after:'Account avatar appears only after loading; Menu avatar is static'},
    modified('.github/workflows/check-player-web-online-village.yml','old','new')
  ];
  assert.equal(classifyBrowserScope(rows),'player-top-avatar-603');
  assert.equal(classifyBrowserScope([...rows,modified('src/index.js','old','new')]),'full');
  assert.equal(classifyBrowserScope([...rows,{path:'src/player-web-src/30-rooms-and-realtime.part',status:'M',before:'a',after:'b'}]),'full');
  assert.equal(classifyBrowserScope(rows.map(x=>x.path==='src/player-web-src/20-village-and-profile.part'?{...x,after:'unrelated UI rewrite'}:x)),'full');
});

test('CI-only merge selects focused CI checks but fails closed for gameplay and missing evidence',()=>{
  const changes=[
    modified('.github/scripts/ci-browser-scope.mjs','old selector','stable policy selector'),
    modified('.github/workflows/check-player-web.yml','old workflow','focused policy workflow'),
    modified('.github/workflows/check-player-card-browsers.yml','old browser workflow','focused policy workflow'),
    modified('.github/workflows/deploy-production.yml','old deploy',"CHỈ CI: BỎ QUA DEPLOY PRODUCTION needs.deploy-scope.outputs.should_deploy == 'true'"),
    modified('tests/ci-browser-scope.test.mjs','old tests','focused CI tests'),
    {path:'docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md',status:'A',before:null,after:'# CI-only scope'}
  ];
  assert.equal(classifyBrowserScope(changes),'ci-policy');
  assert.equal(classifyBrowserScope(changes.filter(x=>!x.path.startsWith('docs/'))),'full');
  assert.equal(classifyBrowserScope([...changes,modified('src/index.js','old game','changed game')]),'full');
  assert.equal(classifyBrowserScope([...changes,{path:'assets/village/village.css',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='tests/ci-browser-scope.test.mjs'?{...c,status:'D'}:c)),'full');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='.github/workflows/deploy-production.yml'?{...c,after:'deploy without safety check'}:c)),'full');
});

test('CI-only merge remains scoped with actual selector/deploy source containing historical PR550 text',()=>{
  const selector=readFileSync(new URL('../.github/scripts/ci-browser-scope.mjs',import.meta.url),'utf8');
  const deploy=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
  const changes=[
    modified('.github/scripts/ci-browser-scope.mjs','old',selector),
    modified('.github/workflows/deploy-production.yml','old',deploy),
    modified('tests/ci-browser-scope.test.mjs','old','current safety assertions'),
    {path:'docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md',status:'A',after:'# release notes'}
  ];
  assert.equal(classifyBrowserScope(changes),'ci-policy');
  assert.equal(classifyBrowserScope([...changes,modified('src/index.js','old','new')]),'full');
  const complete=[...changes,
    modified('.github/workflows/check-player-web.yml','previous',readFileSync(new URL('../.github/workflows/check-player-web.yml',import.meta.url),'utf8')),
    modified('.github/workflows/check-player-card-browsers.yml','previous',readFileSync(new URL('../.github/workflows/check-player-card-browsers.yml',import.meta.url),'utf8')),
    modified('.github/workflows/check-dual-renderer.yml','previous',readFileSync(new URL('../.github/workflows/check-dual-renderer.yml',import.meta.url),'utf8')),
    modified('.github/workflows/build-server-game-ipa.yml','previous',readFileSync(new URL('../.github/workflows/build-server-game-ipa.yml',import.meta.url),'utf8'))
  ];
  assert.equal(classifyBrowserScope(complete),'ci-policy','all eight actual PR files must remain focused');
  assert.equal(classifyBrowserScope([...complete,modified('server-game/current/app.js','old','game changed')]),'full');
});

test('CI-only merge main push does not treat the CI policy selector itself as a PR550 gameplay patch',()=>{
  const selector=readFileSync(new URL('../.github/scripts/ci-browser-scope.mjs',import.meta.url),'utf8');
  const mainGuard=selector.slice(selector.indexOf("if(isRules550Scope(changes))return{mode:'night02-rule-regression-550'"));
  assert.match(mainGuard,/!stableCIPolicyPaths\.has\(c\?\.path\)/);
  assert.match(mainGuard,/if\(isStableCIPolicyScope\(changes\)\|\|isPolicyScope\(changes\)\)return\{mode:'ci-policy'/);
  const changes=[
    modified('.github/scripts/ci-browser-scope.mjs','old',selector),
    modified('tests/ci-browser-scope.test.mjs','old','policy regression'),
    modified('docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md','old','# Vietnamese notes')
  ];
  assert.equal(classifyBrowserScope(changes),'ci-policy');
  assert.equal(classifyBrowserScope([...changes,modified('src/index.js','old','gameplay')]),'full');
});

test('CI-only merge excludes unrelated Drunk-role tests without waiving gameplay checks',()=>{
  const selector=readFileSync(new URL('../.github/scripts/ci-browser-scope.mjs',import.meta.url),'utf8');
  const deploy=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
  const workflow=readFileSync(new URL('../.github/workflows/check-drunk-spiritualist.yml',import.meta.url),'utf8');
  assert.match(workflow,/steps\.scope\.outputs\.mode != 'player-top-avatar-603' && steps\.scope\.outputs\.mode != 'ci-policy'/);
  assert.match(workflow,/steps\.scope\.outputs\.mode == 'ci-policy'/);
  assert.match(deploy,/check-drunk-spiritualist\.yml/);
  const changes=[
    modified('.github/scripts/ci-browser-scope.mjs','old',selector),
    modified('.github/workflows/check-drunk-spiritualist.yml','old',workflow),
    modified('.github/workflows/deploy-production.yml','old',deploy),
    modified('tests/ci-browser-scope.test.mjs','old','Drunk CI test'),
    modified('docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md','old','# CI-only notes')
  ];
  assert.equal(classifyBrowserScope(changes),'ci-policy');
  assert.equal(classifyBrowserScope([...changes,modified('src/index.js','old','actual game change')]),'full');
  assert.equal(classifyBrowserScope([...changes,{path:'src/gmww-drunk-draw-rules.js',status:'M',before:'a',after:'b'}]),'full');
  assert.equal(classifyBrowserScope(changes.filter(c=>c.path!=='docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md')),'full');
});

const historicArtifact3274=JSON.parse(readFileSync('package.json','utf8')).version==='3.274.0';
test('PR613 Artifact preview V3.274 scope accepts only reviewed image, runtime and CI files',()=>{
  const allowed=[
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
  ];
  const changes=allowed.map(path=>({path,status:path.startsWith('tests/artifact-')?'A':'M'}));
  assert.equal(classifyBrowserScope(changes),historicArtifact3274?'artifact-preview-3274':'full');
  assert.equal(classifyBrowserScope([...changes,modified('src/gmww-members-live.js','old','unexpected Player logic')]),'full');
  assert.equal(classifyBrowserScope(changes.filter(c=>c.path!=='server-game/src/10-library-and-settings.part')),'full');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/index.js'?{...c,status:'D'}:c)),'full');
});

test('PR613 Artifact preview V3.274 postmerge CI-only recovery preserves exact release proof',()=>{
  const allowed=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs',
    'docs/releases/GMWW-PR613-postmerge-ci-20261029.md'
  ];
  const changes=allowed.map(path=>({path,status:path.startsWith('docs/')?'A':'M'}));
  assert.equal(classifyBrowserScope(changes),historicArtifact3274?'artifact-preview-3274-postmerge':'full');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(changes.filter(x=>x.path!=='.github/workflows/deploy-production.yml')),'full');
  assert.equal(classifyBrowserScope(changes.map(x=>x.path==='tests/ci-browser-scope.test.mjs'?{...x,status:'D'}:x)),'full');
  const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
  const deploy=readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(worker,/artifact-preview-3274-postmerge/);
  const scopeStart=deploy.indexOf('name: Lấy đúng commit đã hoàn tất CI');
  const scopeEnd=deploy.indexOf('name: Chặn auto-deploy',scopeStart);
  assert.ok(scopeStart>=0 && scopeEnd>scopeStart);
  assert.match(deploy.slice(scopeStart,scopeEnd),/fetch-depth: 0/);
  assert.match(deploy,/IS_RECOVERY/);
  assert.match(deploy,/TYPE=runtime/);
  assert.match(deploy,/2171214cec2c9af92994c27caaa8f75e976dbb1c/);
  assert.match(deploy,/V3\.274 PR613/);
});

test('PR613 Artifact preview V3.274 release proof accepts only exact four CI files',()=>{
  const paths=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs',
    'docs/releases/GMWW-PR613-release-proof-ci-20261029.md'
  ];
  const rows=paths.map(path=>({path,status:path.startsWith('docs/')?'A':'M'}));
  assert.equal(classifyBrowserScope(rows),historicArtifact3274?'artifact-preview-3274-postmerge':'full');
  assert.equal(classifyBrowserScope([...rows,{path:'server-game/current/app.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(rows.filter(x=>x.path!=='.github/workflows/deploy-production.yml')),'full');
  const gate=readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(gate,/head_sha=28f62f91dea9538b79b06177cd1d7cdbd7703e57/);
  assert.match(gate,/CI Stability Gate/);
  assert.match(gate,/V3\.274 PR613/);
});

test('PR613 V3.274 canonical Character40 verification repair keeps exact CI-only scope',()=>{
  const paths=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/scripts/verify-character40-production.mjs',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs',
    'docs/releases/GMWW-PR613-character40-proof-ci-20261029.md'
  ];
  const rows=paths.map(path=>({path,status:path.startsWith('docs/')?'A':'M'}));
  assert.equal(classifyBrowserScope(rows),historicArtifact3274?'artifact-preview-3274-postmerge':'full');
  assert.equal(classifyBrowserScope([...rows,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(rows.filter(x=>x.path!=='.github/scripts/verify-character40-production.mjs')),'full');
  assert.equal(classifyBrowserScope(rows.map(x=>x.path==='tests/ci-browser-scope.test.mjs'?{...x,status:'D'}:x)),'full');
  const workflow=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const verify=readFileSync('.github/scripts/verify-character40-production.mjs','utf8');
  const route=readFileSync('src/gmww-character40-catalog.js','utf8');
  assert.match(workflow,/GMWW-PR613-character40-proof-ci-20261029.md/);
  assert.ok(workflow.includes('assets/characters/gmww40/originals/character-01.webp'));
  assert.ok(verify.includes("const originalPath='assets/characters/gmww40/'+c.original"));
  assert.ok(route.includes("u.pathname='/characters/gmww40/originals/'+visual+'.webp'"));
  assert.match(workflow,/git merge-base --is-ancestor 2171214cec2c9af92994c27caaa8f75e976dbb1c HEAD/);
});

test('GitHub-only Runtime CI repair scopes only audited policy and package checks',()=>{
  const paths=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/deploy-production.yml',
    '.github/runtime-release/verify-package.test.mjs',
    'tests/ci-browser-scope.test.mjs'
  ];
  const changes=paths.map(path=>({path,status:'M'}));
  assert.equal(classifyBrowserScope(changes),'github-runtime-ota-ci');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(changes.slice(1)),'full');
  assert.equal(classifyBrowserScope(changes.map(x=>x.path==='tests/ci-browser-scope.test.mjs'?{...x,status:'D'}:x)),'full');
});


test('PR642 Chrome iOS GM viewport is strict and excludes old gameplay, IPA and OTA candidate CI',async()=>{
  const {isGMChromeIosViewportScope}=await import('../.github/scripts/ci-browser-scope.mjs');
  const before='<meta name="viewport">\n<title>GMWW V3.277</title>';
  const patch='\n\n<!-- GM Server viewport: Chrome -->\n<style>--gmww-gm-visible-height</style>\n<script id="gmwwChromeViewportScript">if(!/CriOS\\//.test(navigator.userAgent))return;</script>\n\n';
  const after=before.replace('\n<title>',''+patch+'<title>');
  const changes=[
    modified('server-game/current/GMWW.html',before,after),
    {path:'tests/gm-chrome-ios-viewport-20261030.test.mjs',status:'A',before:null,after:'test'},
    {path:'.github/workflows/check-gm-chrome-ios-viewport.yml',status:'A',before:null,after:'on: pull_request'},
    {path:'docs/releases/GMWW-GM-CHROME-IOS-VIEWPORT-20261030.md',status:'A',before:null,after:'release notes'}
  ];
  assert.equal(isGMChromeIosViewportScope(changes),true);
  assert.equal(classifyBrowserScope(changes),'gm-chrome-ios-viewport');
  assert.equal(isGMChromeIosViewportScope([...changes,modified('server-game/current/app.js','game','game changed')]),false);
  assert.equal(isGMChromeIosViewportScope(changes.map(c=>c.path==='server-game/current/GMWW.html'?{...c,after:c.after+'<script>gameplay change</script>'}:c)),false);
  const versions=[
    modified('package.json','3.277.0','3.278.0'),
    modified('package-lock.json','3.277.0','3.278.0'),
    modified('src/index.js','VERSION="V3.277"','VERSION="V3.278"'),
    modified('server-game/current/app.js',"const VERSION='3.277'","const VERSION='3.278'"),
    modified('server-game/src/00-core-and-library.part',"const VERSION='3.277'","const VERSION='3.278'")
  ];
  const bumped=changes.map(c=>c.path==='server-game/current/GMWW.html'?{...c,after:c.after.replace('GMWW V3.277','GMWW V3.278')}:c).concat(versions);
  assert.equal(isGMChromeIosViewportScope(bumped),true);
  assert.equal(isGMChromeIosViewportScope(bumped.map(c=>c.path==='src/index.js'?{...c,after:c.after+' // more edits'}:c)),false);
});

test('PR646 staged PR637 release policy is CI-only, never gameplay or automatic deployment',()=>{
  const deploy=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const githubOta=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  const changes=[
    modified('.github/scripts/ci-browser-scope.mjs','old classifier','policy classifier'),
    modified('.github/workflows/deploy-production.yml','old deploy',deploy),
    modified('.github/workflows/github-runtime-ota.yml','old OTA',githubOta),
    modified('tests/ci-browser-scope.test.mjs','old test','release safety'),
    modified('docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md','old notes','new notes')
  ];
  assert.equal(classifyBrowserScope(changes),'ci-policy');
  assert.match(deploy,/BEGIN GMWW_PR637_STAGED_RELEASE_GUARD/);
  assert.match(deploy,/SHOULD_DEPLOY=false/);
  assert.match(githubOta,/needs\.package\.outputs\.skip_auto_release != 'true'/);
  assert.match(githubOta,/skip_auto_release=\$SKIP_AUTO_RELEASE/);
  assert.equal(classifyBrowserScope([...changes,modified('server-game/current/GMWW.html','old','gameplay modified')]),'full');
  assert.equal(classifyBrowserScope(changes.filter(c=>c.path!=='docs/releases/GMWW-CI-SCOPED-MAIN-20261029.md')),'full');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='tests/ci-browser-scope.test.mjs'?{...c,status:'D'}:c)),'full');
});


test('PR648 diagnostics-only FPS selects focused tests and rejects any gameplay change',()=>{
  const after=readFileSync('assets/village/village-performance.mjs','utf8');
  const before=after
    .replace('  // Frame-by-frame FPS sampling is diagnostic only; do not keep an idle village at 60Hz.\n  const sampleFps=new URLSearchParams(window.location.search).get("gmwwPerf")==="1";\n  let stopped=false,frameId=0,frames=0,lastFrame=performance.now(),fps=null,longTasks=0,worstLongTask=0;',
      '  let stopped=false,frameId=0,frames=0,lastFrame=performance.now(),fps=60,longTasks=0,worstLongTask=0;')
    .replace('  const resumeFrames=()=>{if(!sampleFps||stopped||document.hidden||frameId)return;frames=0;lastFrame=performance.now();frameId=requestAnimationFrame(frame)};',
      '  const resumeFrames=()=>{if(stopped||document.hidden||frameId)return;frames=0;lastFrame=performance.now();frameId=requestAnimationFrame(frame)};')
    .replace('  if(sampleFps)resumeFrames();\n  let observer=null;','  resumeFrames();\n  let observer=null;');
  assert.notEqual(before,after,'the reporter must contain an actual scoped change');
  const changes=[
    modified('assets/village/village-performance.mjs',before,after),
    modified('tests/player-web-background-performance.test.mjs','previous test',readFileSync('tests/player-web-background-performance.test.mjs','utf8')),
    modified('tests/ci-browser-scope.test.mjs','previous test',readFileSync('tests/ci-browser-scope.test.mjs','utf8')),
    modified('.github/scripts/ci-browser-scope.mjs','previous selector',readFileSync('.github/scripts/ci-browser-scope.mjs','utf8')),
    modified('.github/workflows/check-player-web.yml','previous browser workflow',readFileSync('.github/workflows/check-player-web.yml','utf8')),
    modified('.github/workflows/prepare-runtime-v3202-candidate.yml','previous OTA candidate',readFileSync('.github/workflows/prepare-runtime-v3202-candidate.yml','utf8')),
    modified('.github/workflows/build-server-game-ipa.yml','previous Native build',readFileSync('.github/workflows/build-server-game-ipa.yml','utf8')),
    {path:'docs/releases/GMWW-PR648-IPHONE-THERMAL-20261031.md',status:'A',before:null,after:'# Thermal reporter'}
  ];
  assert.equal(classifyBrowserScope(changes),'village-perf-diagnostics-648');
  // The retired V3.238 candidate may also be safely limited to its exact old scope.
  const unsafe=changes.map(c=>c.path==='.github/workflows/prepare-runtime-v3202-candidate.yml'
    ?{...c,after:c.after.replace("needs.scope.outputs.mode == 'gm-ui-controls-3238'","needs.scope.outputs.mode != 'ci-policy'")}
    :c);
  assert.equal(classifyBrowserScope(unsafe),'full');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='assets/village/village-performance.mjs'?{...c,after:c.after+'\n// extra change'}:c)),'full');
  assert.equal(classifyBrowserScope(changes.filter(c=>!c.path.startsWith('docs/releases/'))),'full');
  assert.equal(classifyBrowserScope([...changes,modified('src/index.js','old','gameplay change')]),'full');
});

test('PR645 V3.279 postmerge CI repair: exactly five CI-only files use focused release gate',()=>{
  const expected=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/check-player-card-browsers.yml',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs'
  ].map(path=>modified(path,'previous CI',readFileSync(path,'utf8')));
  // Recreate the historical PR645 signature without the later PR652 selector.
  expected[1].after=expected[1].after.replace("steps.scope.outputs.mode == 'pr652-postmerge-release'",'legacy PR645 checks only');
  assert.equal(classifyBrowserScope(expected),'pr645-postmerge-release');
  assert.equal(classifyBrowserScope(expected.slice(1)),'full','missing CI guard must not bypass full regression');
  assert.equal(classifyBrowserScope([...expected,modified('src/index.js','old','runtime changed')]),'full','gameplay edits must never be classified CI-only');
  assert.equal(classifyBrowserScope(expected.map((c,i)=>i===0?{...c,status:'D'}:c)),'full','deleted CI files must fail closed');
  assert.equal(classifyBrowserScope([...expected.slice(0,4),expected[0]]),'full','duplicate path cannot impersonate exact scope');
});


test('PR652 online hotfix: exact bounded production diff selects focused Worker checks',()=>{
 const paths={
  'src/index.js':'M',
  'server-game/src/40-battle-and-timeline.part':'M',
  'server-game/src/45-online-chat.part':'M',
  'server-game/current/app.js':'M',
  'tests/gmww-v3228-battle-icons-footer.test.mjs':'M',
  'tests/v389-night-runtime-integration.test.mjs':'M',
  'tests/online-wolf-undo-gm-chat-notices-20261031.test.mjs':'A',
  '.github/workflows/check-online-five-defects-20261031.yml':'A',
  'docs/releases/GMWW-ONLINE-WOLF-UNDO-CHAT-ICON-FIX-20261031.md':'A',
  '.github/scripts/ci-browser-scope.mjs':'M',
  '.github/workflows/check-player-web.yml':'M',
  'tests/ci-browser-scope.test.mjs':'M'
 };
 const changes=Object.entries(paths).map(([path,status])=>{
  const after=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  return{path,status,before:status==='M'?after:null,after};
 });
 // PR652's narrow selector was valid for its immutable V3.280 snapshot only.
 // A later Chat/Worker revision is intentionally outside its byte-level hotfix contract.
 const historical=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version==='3.280.0';
 assert.equal(classifyBrowserScope(changes),historical?'online-hotfix-652':'full');
 assert.equal(classifyBrowserScope(changes.slice(1)),'full','Missing Worker source cannot be exempted');
 assert.equal(classifyBrowserScope([...changes,{path:'src/extra-worker.js',status:'A',before:null,after:'new logic'}]),'full','New Worker logic must be audited');
 const unsafe=changes.map(c=>c.path==='src/index.js'?{...c,after:'// unrelated code change\n'+c.after}:c);
 assert.equal(classifyBrowserScope(unsafe),'full','Unrelated Worker line must select full CI');
 const changedBattle=changes.map(c=>c.path==='server-game/src/40-battle-and-timeline.part'?{...c,after:c.after+'\n// another behavior change'}:c);
 assert.equal(classifyBrowserScope(changedBattle),'full','Unrelated GM behavior is not covered by hotfix');
 const changedChat=changes.map(c=>c.path==='server-game/src/45-online-chat.part'?{...c,after:'// unexpected change before chat\n'+c.after}:c);
 assert.equal(classifyBrowserScope(changedChat),'full','Unexpected code before Chat must select full CI');
});

test('PR652 V3.280 postmerge CI repair: only five audited CI-only files can select release checks',()=>{
  const files=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/check-player-web.yml',
    '.github/workflows/check-player-card-browsers.yml',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs'
  ];
  const changes=files.map(path=>modified(path,'previous CI',readFileSync(path,'utf8')));
  assert.equal(classifyBrowserScope(changes),'pr652-postmerge-release');
  assert.equal(classifyBrowserScope(changes.slice(1)),'full','missing source selector fails closed');
  assert.equal(classifyBrowserScope([...changes,modified('src/index.js','old','gameplay mutation')]),'full','gameplay mutation cannot be CI-only');
  assert.equal(classifyBrowserScope([...changes,changes[0]]),'full','duplicate CI file cannot impersonate audited change');
  assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),'full','deleted file fails closed');
  assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,after:'changed without guard'}:c)),'full','missing selector guard fails closed');
  const deploy=readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(deploy,/git merge-base --is-ancestor 76426e1a77d8fa87f9f773d4cf7c3d0a95c2f9da HEAD/);
  assert.match(deploy,/git diff --quiet 76426e1a77d8fa87f9f773d4cf7c3d0a95c2f9da HEAD/);
});

test('PR652 V3.280 final selector ordering recovery: exact three CI-only files select focused release',()=>{
  const paths=[
    '.github/scripts/ci-browser-scope.mjs',
    '.github/workflows/deploy-production.yml',
    'tests/ci-browser-scope.test.mjs'
  ];
  const verified=paths.map(path=>modified(path,'previous CI',readFileSync(path,'utf8')));
  if(JSON.parse(readFileSync('package.json','utf8')).version==='3.280.0')assert.equal(classifyBrowserScope(verified),'pr652-postmerge-release');
  else assert.notEqual(classifyBrowserScope(verified),'pr652-postmerge-release','V3.280 release scope cannot authorize a newer Runtime');
  assert.equal(classifyBrowserScope(verified.slice(1)),'full','missing selector fails closed');
  assert.equal(classifyBrowserScope([...verified,modified('src/index.js','before','gameplay changed')]),'full','gameplay cannot bypass broad CI');
  assert.equal(classifyBrowserScope([...verified,verified[0]]),'full','duplicate fails closed');
  assert.equal(classifyBrowserScope(verified.map((c,i)=>i===1?{...c,status:'D'}:c)),'full','deleted production gate fails closed');
  assert.equal(classifyBrowserScope(verified.map((c,i)=>i===1?{...c,after:'missing release marker'}:c)),'full','marker is mandatory');
  const selector=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
  assert.ok(selector.indexOf('PR652: inspect the exact three-file ordering fix')<selector.indexOf('Push of CI-policy-only main merges'));
  const deploy=readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(deploy,/git merge-base --is-ancestor fa48216517e692924b47a936767369d0d654523c HEAD/);
  assert.match(deploy,/git diff --quiet 76426e1a77d8fa87f9f773d4cf7c3d0a95c2f9da HEAD/);
});

test('PR672 exact DEMO Online transport uses focused CI and rejects any extra gameplay edits',()=>{
  const worker=readFileSync('src/index.js','utf8');
  const setup=readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const app=readFileSync('server-game/current/app.js','utf8');
  const modeOld="const patch={demo:target==='demo',roomMode:target==='online'?'online':'offline'};";
  const modeNew="const patch={demo:target==='demo',roomMode:(target==='online'||target==='demo')?'online':'offline'};";
  const workerBefore=worker.replace('roomMode=b?.demo===true?"online":normalizeRoomMode(b?.roomMode),seatMoveMode=','roomMode=normalizeRoomMode(b?.roomMode),seatMoveMode=')
    .replace('const roomMode=desiredDemo?"online":body&&','const roomMode=desiredDemo?"offline":body&&');
  const afterWorker=workerBefore.replace('roomMode=normalizeRoomMode(b?.roomMode),seatMoveMode=','roomMode=b?.demo===true?"online":normalizeRoomMode(b?.roomMode),seatMoveMode=')
    .replace('const roomMode=desiredDemo?"offline":body&&','const roomMode=desiredDemo?"online":body&&');
  const setupBefore=setup.replace(modeNew,modeOld);
  const appBefore=app.replace(modeNew,modeOld);
  assert.notEqual(workerBefore,afterWorker,'fixture must exercise Worker delta');
  assert.notEqual(setupBefore,setupBefore.replace(modeOld,modeNew),'fixture must exercise GM delta');
  const changes=[
    modified('src/index.js',workerBefore,afterWorker),
    modified('server-game/src/30-village-and-setup.part',setupBefore,setupBefore.replace(modeOld,modeNew)),
    modified('server-game/current/app.js',appBefore,appBefore.replace(modeOld,modeNew)),
    modified('tests/v3175-post-create-room-mode.test.mjs','old test',"assert.equal(r.room.roomMode,'online'); DEMO chooses online room transport"),
    {path:'docs/releases/GMWW-DEMO-ONLINE-TRANSPORT-20261031.md',status:'A',before:null,after:'DEMO dùng kết nối Online - Rollback'}
  ];
  assert.equal(classifyBrowserScope(changes),'demo-online-transport-672');
  assert.equal(classifyBrowserScope(changes.slice(1)),'full');
  assert.equal(classifyBrowserScope([...changes,{path:'src/random.js',status:'A',after:'unsafe'}]),'full');
  const unsafe=changes.map(c=>c.path==='src/index.js'?{...c,after:c.after+'\\n// unexpected worker edit'}:c);
  assert.equal(classifyBrowserScope(unsafe),'full');
  const gmUnsafe=changes.map(c=>c.path==='server-game/current/app.js'?{...c,after:c.after+'\\n// other GM edit'}:c);
  assert.equal(classifyBrowserScope(gmUnsafe),'full');
});


test('Cloudflare B synthetic PR runs CI-LITE only for approved files; mixed gameplay stays FULL',()=>{
  const A=path=>({path,status:'A'}),M=path=>({path,status:'M'});
  const files=[
    A('infra/cloudflare-standby/fixture-contract.mjs'),
    A('infra/cloudflare-standby/fixture-contract.test.mjs'),
    A('docs/architecture/dual-cloudflare-standby-20261101.md'),
    A('tests/dual-cloudflare-release-guard.test.mjs'),
    M('tests/github-actions-pr-preview-ci.test.mjs'),
    M('tests/ci-browser-scope.test.mjs'),
    M('.github/scripts/ci-browser-scope.mjs'),
    M('.github/workflows/check-player-web.yml'),
    A('.github/workflows/check-cloudflare-standby.yml'),
    M('.github/workflows/deploy-production.yml'),
    M('.github/workflows/github-runtime-ota.yml'),
    M('.github/workflows/check-pr-preview-github.yml')
  ];
  assert.equal(classifyBrowserScope(files),'dual-cloudflare-standby');
  assert.equal(classifyBrowserScope([...files,M('src/index.js')]),'full');
  assert.equal(classifyBrowserScope([...files,M('wrangler.jsonc')]),'full');
  assert.equal(classifyBrowserScope([...files,A('assets/index.html')]),'full');
  assert.equal(classifyBrowserScope([...files,A('docs/other.md')]),'full');
  assert.equal(classifyBrowserScope([...files,files[0]]),'full');
  assert.equal(classifyBrowserScope(files.filter(x=>x.path!=='infra/cloudflare-standby/fixture-contract.test.mjs')),'full');
});


test('Dual Cloudflare synthetic follow-up uses focused CI only on exact six modified paths',()=>{
  const scope=[
    'infra/cloudflare-standby/fixture-contract.mjs',
    'infra/cloudflare-standby/fixture-contract.test.mjs',
    '.github/scripts/ci-browser-scope.mjs',
    'tests/ci-browser-scope.test.mjs',
    '.github/workflows/check-pr-preview-github.yml',
    'tests/github-actions-pr-preview-ci.test.mjs'
  ].map(path=>({path,status:'M'}));
  assert.equal(classifyBrowserScope(scope),'dual-cloudflare-standby');
  for(const p of ['src/index.js','wrangler.jsonc','assets/index.html','docs/another.md'])
    assert.equal(classifyBrowserScope([...scope,{path:p,status:'M'}]),'full',p);
  assert.equal(classifyBrowserScope(scope.slice(1)),'full');
  assert.equal(classifyBrowserScope(scope.map((x,i)=>i===0?{...x,status:'D'}:x)),'full');
  assert.equal(classifyBrowserScope([...scope,scope[0]]),'full');
});

test('Cloudflare B Stage3 B health-only Worker routes to focused required Worker CI, fail-closed for unknown paths',()=>{
  const stage3=[
    ['infra/cloudflare-standby/b-staging-worker.mjs','A'],
    ['infra/cloudflare-standby/b-staging-worker.test.mjs','A'],
    ['infra/cloudflare-standby/wrangler-b-staging.jsonc','A'],
    ['infra/cloudflare-standby/STAGE3-README.md','A'],
    ['.github/workflows/check-cloudflare-standby.yml','M'],
    ['.github/workflows/check-pr-preview-github.yml','M'],
    ['tests/github-actions-pr-preview-ci.test.mjs','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['tests/ci-browser-scope.test.mjs','M'],
    ['.github/workflows/check-player-web.yml','M']
  ].map(([path,status])=>({path,status}));
  assert.equal(classifyBrowserScope(stage3),'dual-cloudflare-standby');
  assert.equal(classifyBrowserScope(stage3.slice(1)),'full');
  assert.equal(classifyBrowserScope([...stage3,stage3[0]]),'full');
  assert.equal(classifyBrowserScope([...stage3,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope([...stage3,{path:'wrangler.jsonc',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(stage3.map((x,i)=>i===0?{...x,status:'D'}:x)),'full');
});

test('PR743 Chat voice uses focused privacy and Worker CI only for exact reviewed scope',()=>{
  const expected=[
    ['server-game/current/app.js','M'],
    ['server-game/src/45-online-chat.part','M'],
    ['src/gmww-members-live.js','M'],
    ['src/index.js','M'],
    ['src/player-web-src/35-online-chat.part','M'],
    ['tests/ci-browser-scope.test.mjs','M'],
    ['tests/drunk-card-overlay-match-cleanup-20261028.test.mjs','M'],
    ['tests/gmww-chat-voice-gm-broadcast-20261102.test.mjs','A'],
    ['tests/online-wolf-undo-gm-chat-notices-20261031.test.mjs','M'],
    ['tests/player-online-realtime-freeze-day-20261030.test.mjs','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M'],
    ['docs/releases/GMWW-CHAT-VOICE-PR743-20261102.md','A']
  ].map(([path,status])=>({path,status}));
  assert.equal(classifyBrowserScope(expected),'gmww-chat-voice-pr743');
  assert.equal(classifyBrowserScope(expected.slice(1)),'full','missing source must not get narrower tests');
  assert.equal(classifyBrowserScope([...expected,{path:'server-game/GMWW-Server/GameView.swift',status:'M'}]),'full','native changes remain isolated');
  assert.equal(classifyBrowserScope([...expected,{path:'wrangler.jsonc',status:'M'}]),'full','binding changes require full release guard');
  assert.equal(classifyBrowserScope([...expected,{path:'src/index.js',status:'M'}]),'full','duplicate file must fail closed');
  assert.equal(classifyBrowserScope(expected.map((c,i)=>i===0?{...c,status:'D'}:c)),'full','deleted runtime must fail closed');
  const workflow=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(workflow,/steps\.scope\.outputs\.mode == 'gmww-chat-voice-pr743'/);
  assert.match(workflow,/tests\/gmww-chat-voice-gm-broadcast-20261102\.test\.mjs/);
  assert.match(workflow,/tests\/online-chat-authority\.test\.mjs/);
  assert.match(workflow,/npm run check/);
});


test('PR743 postmerge CI-only recovery is safe on exact four files and keeps Production release guards',()=>{
 const exact=[
   {path:'.github/scripts/ci-browser-scope.mjs',status:'M'},
   {path:'.github/workflows/check-player-web.yml',status:'M'},
   {path:'.github/workflows/deploy-pr743-chat-worker.yml',status:'A'},
   {path:'tests/ci-browser-scope.test.mjs',status:'M'}
 ];
 // PR743's narrowly authorized one-time recovery is invalid after Runtime V3.289.
 const legacyChatRelease=JSON.parse(readFileSync('package.json','utf8')).version==='3.289.0';
 assert.equal(classifyBrowserScope(exact),legacyChatRelease?'gmww-chat-pr743-postmerge':'full');
 assert.equal(classifyBrowserScope(exact.slice(1)),'full');
 assert.equal(classifyBrowserScope([...exact,{path:'src/index.js',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...exact,{path:'wrangler.jsonc',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...exact,{path:'server-game/GMWW-Server/GameView.swift',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...exact,exact[0]]),'full');
 const wf=readFileSync('.github/workflows/deploy-pr743-chat-worker.yml','utf8');
 assert.match(wf,/git merge-base --is-ancestor 7b981859d4f9171e47f4a7c0d7164b50f27d7bda HEAD/);
 assert.match(wf,/git diff --quiet 7b981859d4f9171e47f4a7c0d7164b50f27d7bda HEAD/);
 assert.match(wf,/GMWW AUTO-DELIVERY V3.0/);
 assert.match(wf,/Previous Cloudflare A Worker/);
 assert.match(wf,/Automatic rollback to previous Cloudflare A Worker/);
 assert.doesNotMatch(wf,/wrangler deploy --name/);
 const workerCheck=readFileSync('.github/workflows/check-player-web.yml','utf8');
 assert.match(workerCheck,/steps\.scope\.outputs\.mode == 'gmww-chat-pr743-postmerge'/);
 assert.match(workerCheck,/tests\/online-chat-authority\.test\.mjs/);
});

test('PR748 Chat main-push selector recovery requires exact 3 changed CI files and immutable Worker source',()=>{
 const fixed=[
   {path:'.github/scripts/ci-browser-scope.mjs',status:'M'},
   {path:'.github/workflows/deploy-pr743-chat-worker.yml',status:'M'},
   {path:'tests/ci-browser-scope.test.mjs',status:'M'}
 ];
 // After V3.290, historical CI-only release paths must fail closed (mode=full).
 const legacyChatRelease=JSON.parse(readFileSync('package.json','utf8')).version==='3.289.0';
 assert.equal(classifyBrowserScope(fixed),legacyChatRelease?'gmww-chat-pr743-postmerge':'full');
 for(const missing of fixed)assert.equal(classifyBrowserScope(fixed.filter(x=>x!==missing)),'full','missing '+missing.path);
 for(const extra of ['src/index.js','wrangler.jsonc','server-game/GMWW-Server/GameView.swift','.github/workflows/check-player-web.yml'])
   assert.equal(classifyBrowserScope([...fixed,{path:extra,status:'M'}]),'full',extra);
 assert.equal(classifyBrowserScope([...fixed,fixed[0]]),'full','duplicate CI changes fail closed');
 assert.equal(classifyBrowserScope(fixed.map((x,i)=>i===0?{...x,status:'D'}:x)),'full');
 const selector=readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
 assert.ok(selector.indexOf('// PR743 CI-only push recovery must run before') <
           selector.indexOf('// Push of CI-policy-only main merges needs selector unit tests'));
 const deploy=readFileSync('.github/workflows/deploy-pr743-chat-worker.yml','utf8');
 assert.match(deploy,/git merge-base --is-ancestor cc430dd97af48aba6afb1d415582d9e5818457dd HEAD/);
 assert.match(deploy,/GMWW_CI_EVENT=push GITHUB_REF=refs\/heads\/main/);
 assert.match(deploy,/git diff --quiet 7b981859d4f9171e47f4a7c0d7164b50f27d7bda HEAD/);
 assert.match(deploy,/tests\/ci-browser-scope\.test\.mjs \| sort\)/);
 assert.doesNotMatch(deploy,/This workflow is only permitted from a four-file postmerge CI fix/);
 assert.match(deploy,/Automatic rollback to previous Cloudflare A Worker/);
});


test('SERVER-3 B synthetic E2E only receives focused CI on the exact nine audited files',()=>{
  const fixture=[
    ['infra/cloudflare-standby/b-stage3-e2e.mjs','A'],
    ['infra/cloudflare-standby/b-stage3-e2e.test.mjs','A'],
    ['infra/cloudflare-standby/b-staging-worker.mjs','M'],
    ['infra/cloudflare-standby/b-staging-worker.test.mjs','M'],
    ['infra/cloudflare-standby/wrangler-b-staging.jsonc','M'],
    ['infra/cloudflare-standby/STAGE3-README.md','M'],
    ['.github/workflows/check-pr-preview-github.yml','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['tests/ci-browser-scope.test.mjs','M']
  ].map(([path,status])=>({path,status}));
  assert.equal(classifyBrowserScope(fixture),'dual-cloudflare-standby');
  assert.equal(classifyBrowserScope(fixture.slice(1)),'full');
  assert.equal(classifyBrowserScope([...fixture,fixture[0]]),'full');
  assert.equal(classifyBrowserScope(fixture.map((f,i)=>i===1?{...f,status:'D'}:f)),'full');
  for(const source of ['src/index.js','wrangler.jsonc','server-game/current/app.js','assets/index.html']){
    assert.equal(classifyBrowserScope([...fixture,{path:source,status:'M'}]),'full',source);
  }
});

test('B live GitHub Actions E2E exact six-file scope avoids Cloudflare A Preview, mixed diffs fail closed',()=>{
  const scope=[
    ['infra/cloudflare-standby/b-staging-live-e2e.mjs','A'],
    ['infra/cloudflare-standby/b-staging-live-e2e.test.mjs','A'],
    ['.github/workflows/check-cloudflare-standby.yml','M'],
    ['.github/workflows/check-pr-preview-github.yml','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['tests/ci-browser-scope.test.mjs','M']
  ].map(([path,status])=>({path,status}));
  assert.equal(classifyBrowserScope(scope),'dual-cloudflare-standby');
  assert.equal(classifyBrowserScope(scope.slice(1)),'full');
  assert.equal(classifyBrowserScope([...scope,scope[0]]),'full');
  for(const path of ['src/index.js','wrangler.jsonc','server-game/current/app.js','.github/workflows/deploy-production.yml']){
    assert.equal(classifyBrowserScope([...scope,{path,status:'M'}]),'full');
  }
  assert.equal(classifyBrowserScope(scope.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
  const release=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const ota=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  for(const src of [release,ota]){
    assert.match(src,/BEGIN GMWW_DUAL_CLOUDFLARE_(STAGING|RUNTIME)_GUARD/);
    assert.match(src,/check-cloudflare-standby/);
    assert.match(src,/infra\/cloudflare-standby/);
  }
});


test('PR749 Chat glass guard selects focused Worker gate only for strict V3.291 release and exact source changes',()=>{
  const paths=[
    ['docs/releases/GMWW-RUNTIME-V3.291-CHAT-GLASS-20261102.md','A'],
    ['package-lock.json','M'],['package.json','M'],
    ['server-game/current/GMWW.html','M'],
    ['server-game/current/app.js','M'],['server-game/src/00-core-and-library.part','M'],
    ['server-game/src/45-online-chat.part','M'],
    ['src/gmww-members-live.js','M'],['src/index.js','M'],
    ['src/player-web-src/35-online-chat.part','M'],
    ['tests/ci-browser-scope.test.mjs','M'],
    ['tests/gmww-chat-voice-gm-broadcast-20261102.test.mjs','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['.github/workflows/check-player-web.yml','M']
  ];
  const rewrites=new Map([
    ['package.json',['"version": "3.291.0"','"version": "3.290.0"']],
    ['package-lock.json',['"version": "3.291.0"','"version": "3.290.0"']],
    ['src/index.js',['VERSION="V3.291"','VERSION="V3.290"']],
    ['server-game/src/00-core-and-library.part',["const VERSION='3.291'","const VERSION='3.290'"]],
    ['server-game/current/GMWW.html',['<title>GMWW V3.291</title>','<title>GMWW V3.290</title>']]
  ]);
  const changes=paths.map(([path,status])=>{
    const after=readFileSync(path,'utf8');
    const pair=rewrites.get(path);
    const before=pair?after.replaceAll(pair[0],pair[1]):status==='M'?'prior content':null;
    return {path,status,before,after};
  });
  // PR749's one-time focused exemption applies only to V3.291.
  // Any later Runtime release must run full CI, never reuse the old bypass.
  assert.equal(classifyBrowserScope(changes),
    JSON.parse(readFileSync('package.json','utf8')).version==='3.291.0'?'gmww-chat-glass-749':'full');
  assert.equal(classifyBrowserScope(changes.slice(1)),'full','missing release notes');
  assert.equal(classifyBrowserScope([...changes,{path:'wrangler.jsonc',status:'M'}]),'full','DO/Worker config cannot bypass full CI');
  assert.equal(classifyBrowserScope([...changes,{path:'server-game/GMWW-Server/GameView.swift',status:'M'}]),'full','IPA/native changes forbidden');
  assert.equal(classifyBrowserScope([...changes,changes[0]]),'full','duplicate path must fail closed');
  assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/index.js'?{...c,after:c.after+'\n// unrelated worker edit'}:c)),'full','unknown Worker edit must trigger full tests');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path==='server-game/src/00-core-and-library.part'?{...c,after:c.after+'\n// core changed'}:c)),'full','core gameplay edit must trigger full tests');
  const workflow=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(workflow,/steps\.scope\.outputs\.mode == 'gmww-chat-glass-749'/);
  assert.match(workflow,/tests\/online-chat-authority\.test\.mjs/);
  assert.match(workflow,/tests\/gmww-chat-voice-gm-broadcast-20261102\.test\.mjs/);
  assert.match(workflow,/npm run check/);
});

test('B-only GM auth diagnostics stay CI-LITE and exclude Production/Preview only for exact six modifications',()=>{
  const files=['infra/cloudflare-standby/b-staging-live-e2e.mjs',
    'infra/cloudflare-standby/b-staging-live-e2e.test.mjs',
    '.github/workflows/check-cloudflare-standby.yml',
    '.github/workflows/check-pr-preview-github.yml',
    '.github/scripts/ci-browser-scope.mjs','tests/ci-browser-scope.test.mjs'];
  const changed=files.map(path=>({path,status:'M'}));
  assert.equal(classifyBrowserScope(changed),'dual-cloudflare-standby');
  assert.equal(classifyBrowserScope(changed.slice(1)),'full');
  assert.equal(classifyBrowserScope([...changed,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope([...changed,changed[0]]),'full');
  assert.equal(classifyBrowserScope(changed.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
});


test('PR753 voice and clock V3.292 exact guarded scope keeps mandatory privacy and Worker checks',()=>{
 const files=[
  ['docs/releases/GMWW-RUNTIME-V3.292-VOICE-CLOCK-20261102.md','A'],
  ['package-lock.json','M'],['package.json','M'],
  ['server-game/current/GMWW.html','M'],
  ['server-game/current/app.js','M'],
  ['server-game/current/battle-controls.js','M'],
  ['server-game/src/00-core-and-library.part','M'],
  ['server-game/src/45-online-chat.part','M'],
  ['src/gmww-members-live.js','M'],
  ['src/gmww-public-turn-clock.js','A'],
  ['src/index.js','M'],
  ['src/player-web-src/20-village-and-profile.part','M'],
  ['src/player-web-src/35-online-chat.part','M'],
  ['tests/ci-browser-scope.test.mjs','M'],
  ['tests/gmww-chat-voice-send-v3292.test.mjs','A'],
  ['tests/gmww-public-turn-clock-v3292.test.mjs','A'],
  ['.github/scripts/ci-browser-scope.mjs','M'],
  ['.github/workflows/check-player-web.yml','M']
 ];
 const versionPairs=new Map([
  ['package.json',['"version": "3.292.0"','"version": "3.291.0"']],
  ['package-lock.json',['"version": "3.292.0"','"version": "3.291.0"']],
  ['server-game/current/GMWW.html',['<title>GMWW V3.292</title>','<title>GMWW V3.291</title>']],
  ['server-game/src/00-core-and-library.part',["const VERSION='3.292'","const VERSION='3.291'"]]
 ]);
 const changes=files.map(([path,status])=>{
  const after=readFileSync(path,'utf8'),pair=versionPairs.get(path);
  let before=pair?after.replaceAll(pair[0],pair[1]):'Prior unrelated scope preserved';
  if(path==='src/index.js'){
   before=after.replace('VERSION="V3.292"','VERSION="V3.291"')
     .replace('\nimport {projectPublicTurnClock} from "./gmww-public-turn-clock.js";','')
     .replace('\n          clock:projectPublicTurnClock(wolfRuntime),','');
  }
  return {path,status,before:status==='A'?null:before,after};
 });
 // The immutable V3.292-only scope must reject later Runtime revisions.
 // A newer package may not masquerade as the old PR753 release to skip CI.
 const oldVersion=JSON.parse(readFileSync('package.json','utf8')).version==='3.292.0';
 assert.equal(classifyBrowserScope(changes),oldVersion?'gmww-voice-clock-v3292':'full');
 assert.equal(classifyBrowserScope(changes.filter(c=>c.path!=='src/gmww-public-turn-clock.js')),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'wrangler.jsonc',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'server-game/GMWW-Server/GameView.swift',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...changes,changes[0]]),'full');
 assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/index.js'?{...c,after:c.after+'\n// unsafe unrelated Worker mutation'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='package.json'?{...c,after:c.after.replace('3.292.0','3.293.0')}:c)),'full');
 const worker=readFileSync('.github/workflows/check-player-web.yml','utf8');
 for(const required of ['tests/gmww-chat-voice-send-v3292.test.mjs','tests/gmww-public-turn-clock-v3292.test.mjs',
 'tests/online-chat-authority.test.mjs','tests/ci-browser-scope.test.mjs','npm run check',
 "steps.scope.outputs.mode == 'gmww-voice-clock-v3292'"])assert.ok(worker.includes(required),required);
});

test('PR761 V3.293 exact Online action, realtime, privacy and Runtime scope fails closed',()=>{
 const paths=[
  ['.github/scripts/ci-browser-scope.mjs','M'],
  ['.github/workflows/check-player-web.yml','M'],
  ['docs/releases/GMWW-RUNTIME-V3.293-ONLINE-20261103.md','A'],
  ['package-lock.json','M'],['package.json','M'],
  ['server-game/current/GMWW.html','M'],['server-game/current/app.js','M'],
  ['server-game/src/00-core-and-library.part','M'],
  ['server-game/src/30-village-and-setup.part','M'],
  ['server-game/src/40-battle-and-timeline.part','M'],
  ['src/gmww-members-live.js','M'],['src/index.js','M'],
  ['src/player-web-src/30-rooms-and-realtime.part','M'],
  ['src/player-web-src/35-online-chat.part','M'],
  ['tests/ci-browser-scope.test.mjs','M'],
  ['tests/demo-hybrid-real-players.test.mjs','M'],
  ['tests/gmww-online-four-fixes-v3293.test.mjs','A']
 ];
 const oldMarkers=new Map([
  ['package.json',['"version": "3.293.0"','"version": "3.292.0"']],
  ['package-lock.json',['"version": "3.293.0"','"version": "3.292.0"']],
  ['server-game/current/GMWW.html',['<title>GMWW V3.293</title>','<title>GMWW V3.292</title>']],
  ['server-game/src/00-core-and-library.part',["const VERSION='3.293'","const VERSION='3.292'"]],
  ['src/index.js',['VERSION="V3.293"','VERSION="V3.292"']]
 ]);
 const changes=paths.map(([path,status])=>{
  const after=readFileSync(path,'utf8'),markers=oldMarkers.get(path);
  const before=status==='M'?(markers?after.replaceAll(...markers):'unchanged baseline source') :null;
  return {path,status,after,before};
 });
 // This narrow gate was only approved for the one-time V3.293 release.
 // Later versions must run the full suite (never silently reuse its shortcut).
 assert.equal(classifyBrowserScope(changes),
  JSON.parse(readFileSync('package.json','utf8')).version==='3.293.0'?'online-turn-v3293':'full');
 assert.equal(classifyBrowserScope(changes.slice(1)),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'server-game/GMWW-Server/GameView.swift',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...changes,changes[0]]),'full');
 assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/index.js'?{...c,after:c.after.replace('this.broadcast({type:"battle_action_confirmed",matchId,serverTime:Date.now()})','this.broadcast({type:"battle_action_confirmed",matchId,turnId,targets,serverTime:Date.now()})')}:c)),'full');
});

test('Stage4 synthetic recovery exact six-file scope skips full Worker tests; any extra path fails closed',()=>{
  const changes=[
    ['infra/cloudflare-standby/stage4-readiness.mjs','A'],
    ['infra/cloudflare-standby/stage4-readiness.test.mjs','A'],
    ['docs/architecture/dual-cloudflare-standby-20261101.md','M'],
    ['.github/scripts/ci-browser-scope.mjs','M'],
    ['tests/ci-browser-scope.test.mjs','M'],
    ['.github/workflows/check-pr-preview-github.yml','M']
  ].map(([path,status])=>({path,status}));
  assert.equal(classifyBrowserScope(changes),'dual-cloudflare-standby');
  assert.equal(classifyBrowserScope(changes.slice(1)),'full');
  assert.equal(classifyBrowserScope([...changes,changes[0]]),'full');
  for(const path of ['src/index.js','wrangler.jsonc','package.json','server-game/current/app.js']){
    assert.equal(classifyBrowserScope([...changes,{path,status:'M'}]),'full',path);
  }
  assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
});


// V3.293 postmerge CI release guard: old 3D-version tests are unrelated to PR761.
test('V3.293 postmerge CI release guard rejects any non-CI gameplay, native or version change',()=>{
 const scope=[
  ['.github/scripts/ci-browser-scope.mjs','M'],
  ['.github/workflows/check-player-web.yml','M'],
  ['tests/ci-browser-scope.test.mjs','M'],
  ['docs/releases/GMWW-V3.293-POSTMERGE-CI-RECOVERY-20261103.md','A']
 ];
 const changes=scope.map(([path,status])=>({path,status,
  before:status==='M'?'old reviewed CI source':null,
  after:readFileSync(path,'utf8')
 }));
 assert.equal(classifyBrowserScope(changes),'online-v3293-postmerge-ci');
 for(const ix of [0,1,2,3])assert.equal(classifyBrowserScope(changes.filter((_,i)=>i!==ix)),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M',after:'changed Worker'}]),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'server-game/GMWW-Server/GameView.swift',status:'M',after:'native'}]),'full');
 assert.equal(classifyBrowserScope([...changes,changes[0]]),'full');
 assert.equal(classifyBrowserScope(changes.map((x,i)=>i===0?{...x,status:'D'}:x)),'full');
});


// V3.293 early-main CI gate strict source safeguard: exact 3-file recovery only.
test('V3.293 early-main CI gate strict source safeguard rejects unknown or native modifications',()=>{
 const rows=[
  ['.github/scripts/ci-browser-scope.mjs','M'],
  ['tests/ci-browser-scope.test.mjs','M'],
  ['docs/releases/GMWW-V3.293-CI-EARLY-GATE-20261103.md','A']
 ];
 const changes=rows.map(([path,status])=>({
  path,status,before:status==='M'?'reviewed CI':null,after:readFileSync(path,'utf8')
 }));
 assert.equal(classifyBrowserScope(changes),'online-v3293-postmerge-ci');
 assert.equal(classifyBrowserScope(changes.slice(0,2)),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M',after:'unreviewed Worker code'}]),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'server-game/GMWW-Server/GameView.swift',status:'M',after:'native IPA'}]),'full');
 assert.equal(classifyBrowserScope([...changes,changes[0]]),'full');
 assert.equal(classifyBrowserScope(changes.map((x,i)=>i===2?{...x,status:'D'}:x)),'full');
});

test('PR767 immutable V3.294 live microphone+fast private Chat CI-LITE remains fail-closed',()=>{
 const paths=[[".github/scripts/ci-browser-scope.mjs","M"],[".github/workflows/check-player-web.yml","M"],["tests/ci-browser-scope.test.mjs","M"],["docs/releases/GMWW-RUNTIME-V3.294-LIVE-VOICE-FAST-20261103.md","A"],["tests/gmww-chat-live-meter-fast-send-v3294.test.mjs","A"],["package.json","M"],["package-lock.json","M"],["server-game/src/00-core-and-library.part","M"],["server-game/src/45-online-chat.part","M"],["server-game/current/GMWW.html","M"],["server-game/current/app.js","M"],["src/index.js","M"],["src/player-web-src/35-online-chat.part","M"],["src/gmww-members-live.js","M"]];
 const changes=paths.map(([path,status])=>({path,status,after:readFileSync(path,'utf8'),before:status==='A'?null:'prior production content'}));
 // The new SHA-1 pin is the reviewed V3.294 Worker plus already-merged PR766 Auto GM scheduler.
 // The 14-file exact-diff contract remains fail-closed for unreviewed edits.
 assert.equal(classifyBrowserScope(changes),'gmww-chat-live-v3294','reviewed merged Worker must pass focused mandatory CI');
 assert.equal(classifyBrowserScope(changes.slice(1)),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'wrangler.jsonc',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...changes,{path:'server-game/GMWW-Server/GameView.swift',status:'M'}]),'full');
 assert.equal(classifyBrowserScope([...changes,changes[0]]),'full');
 assert.equal(classifyBrowserScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/index.js'?{...c,after:c.after+'\\n// unreviewed data access'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='src/player-web-src/35-online-chat.part'?{...c,after:c.after+'\\n// private audio leak'}:c)),'full');
 assert.equal(classifyBrowserScope(changes.map(c=>c.path==='package.json'?{...c,after:c.after.replace('3.294.0','3.295.0')}:c)),'full');
 const workflow=readFileSync('.github/workflows/check-player-web.yml','utf8');
 for(const required of ['tests/gmww-chat-live-meter-fast-send-v3294.test.mjs','tests/online-chat-authority.test.mjs','npm run check', "steps.scope.outputs.mode == 'gmww-chat-live-v3294'"])
  assert.ok(workflow.includes(required),required);
});
