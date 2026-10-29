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
  assert.equal(classifyBrowserScope(changes),'artifact-preview-3274');
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
  assert.equal(classifyBrowserScope(changes),'artifact-preview-3274-postmerge');
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
  assert.equal(classifyBrowserScope(rows),'artifact-preview-3274-postmerge');
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
  assert.equal(classifyBrowserScope(rows),'artifact-preview-3274-postmerge');
  assert.equal(classifyBrowserScope([...rows,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(rows.filter(x=>x.path!=='.github/scripts/verify-character40-production.mjs')),'full');
  assert.equal(classifyBrowserScope(rows.map(x=>x.path==='tests/ci-browser-scope.test.mjs'?{...x,status:'D'}:x)),'full');
  const workflow=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const verify=readFileSync('.github/scripts/verify-character40-production.mjs','utf8');
  const route=readFileSync('src/gmww-character40-catalog.js','utf8');
  assert.match(workflow,/GMWW-PR613-character40-proof-ci-20261029.md/);
  assert.match(workflow,/assets\\/characters\\/gmww40\\/originals\\/character-01.webp/);
  assert.match(verify,/const originalPath='assets\\/characters\\/gmww40\\/'\\+c.original/);
  assert.match(route,/u.pathname='\\/characters\\/gmww40\\/originals\\/'\\+visual\\+'.webp'/);
  assert.match(workflow,/git merge-base --is-ancestor 2171214cec2c9af92994c27caaa8f75e976dbb1c HEAD/);
});
