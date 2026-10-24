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
