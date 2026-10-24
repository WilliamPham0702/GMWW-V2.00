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
