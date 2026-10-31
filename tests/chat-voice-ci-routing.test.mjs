import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const pairs=[
 ['.github/scripts/ci-browser-scope.mjs','M'],
 ['.github/workflows/check-player-web.yml','M'],
 ['docs/releases/GMWW-PLAYER-VOICE-FREE-20261031.md','A'],
 ['src/gmww-chat-voice-policy.js','A'],
 ['src/gmww-members-live.js','M'],
 ['src/index.js','M'],
 ['src/player-web-src/35-online-chat.part','M'],
 ['tests/chat-voice-message.test.mjs','A'],
 ['tests/chat-voice-ci-routing.test.mjs','A']
];
function changes(){return pairs.map(([path,status])=>({path,status,
  before:status==='M'?'original source':null,
  after:readFileSync(path,'utf8')}));}
test('PR712 bounded voice source gets isolated Worker security checks',()=>{
 assert.equal(classifyBrowserScope(changes()),'player-voice-notes-712');
});
test('PR712 voice scope rejects unrelated source changes and missing auth or tests',()=>{
 const extraneous=changes();extraneous.push({path:'server-game/current/app.js',status:'M',before:'x',after:'y'});
 assert.equal(classifyBrowserScope(extraneous),'full');
 const wrongStatus=changes();wrongStatus[0].status='A';assert.equal(classifyBrowserScope(wrongStatus),'full');
 const removedAuth=changes();removedAuth.find(x=>x.path==='src/index.js').after='Worker with no voice authorization';
 assert.equal(classifyBrowserScope(removedAuth),'full');
 const brokenBundle=changes();brokenBundle.find(x=>x.path==='src/gmww-members-live.js').after='export const gmwwMembersLiveScript = "stale";';
 assert.equal(classifyBrowserScope(brokenBundle),'full');
 const missingTest=changes().filter(x=>x.path!=='tests/chat-voice-message.test.mjs');
 assert.equal(classifyBrowserScope(missingTest),'full');
});
