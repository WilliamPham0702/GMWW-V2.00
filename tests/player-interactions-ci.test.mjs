import test from 'node:test';
import assert from 'node:assert/strict';
import {playerInteractionsScope} from '../.github/scripts/player-interactions-scope.mjs';
const paths=['.github/scripts/assemble-player-web.mjs','.github/scripts/player-server-menu.mjs','src/gmww-members-live.js','src/gmww-online-chat-policy.js','src/index.js','src/player-web-src/20-village-and-profile.part','src/player-web-src/35-online-chat.part','tests/player-lobby-chat-interactions-20261030.test.mjs','tests/player-online-privacy-bottom-dock-20261029.test.mjs','docs/releases/GMWW-PLAYER-LOBBY-INTERACTIONS-20261030.md'];
const before='prefix\n  async chatAccess(){old}\n  async gmChatModerate(){unchanged}';
const changes=()=>paths.map(path=>({path,status:'M',before,after:before.replace('{old}','{new}')}));
test('only exact feature files and chat-only Worker edits select focused tests',()=>{
 assert.equal(playerInteractionsScope(changes()),'player-lobby-interactions');
 assert.equal(playerInteractionsScope([...changes(),{path:'src/new-rule.js',status:'A'}]),null);
 const outside=changes();outside.find(c=>c.path==='src/index.js').after+='unsafe';assert.equal(playerInteractionsScope(outside),null);
 assert.equal(playerInteractionsScope(changes().slice(1)),null);
 assert.equal(playerInteractionsScope([]),null);
});
test('CI-only routing stays separate from feature and refuses unknown paths',()=>{
 const ci=['.github/scripts/ci-browser-scope.mjs','.github/scripts/player-interactions-scope.mjs','.github/workflows/check-player-web.yml','tests/player-interactions-ci.test.mjs'].map(path=>({path,status:'M'}));
 assert.equal(playerInteractionsScope(ci),'player-interactions-ci');
 assert.equal(playerInteractionsScope([...ci,{path:'src/index.js',status:'M'}]),null);
});
