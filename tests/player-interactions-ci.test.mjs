import test from 'node:test';
import assert from 'node:assert/strict';
import {playerInteractionsScope} from '../.github/scripts/player-interactions-scope.mjs';
const paths=['.github/scripts/assemble-player-web.mjs','.github/scripts/player-server-menu.mjs','src/gmww-members-live.js','src/gmww-online-chat-policy.js','src/index.js','src/player-web-src/20-village-and-profile.part','src/player-web-src/35-online-chat.part','tests/player-lobby-chat-interactions-20261030.test.mjs','tests/player-online-privacy-bottom-dock-20261029.test.mjs','docs/releases/GMWW-PLAYER-LOBBY-INTERACTIONS-20261030.md'];
const before='prefix\\nconst VERSION="V3.276";\\n  async chatAccess(){old}\\n  async gmChatModerate(){unchanged}';
const changes=()=>paths.map(path=>({path,status:'M',before,after:before.replace('{old}','{new}')}));
const vFiles=[
 ['package.json','"version": "3.276.0"','"version": "3.277.0"'],
 ['package-lock.json','"version": "3.276.0",x,"version": "3.276.0"','"version": "3.277.0",x,"version": "3.277.0"'],
 ['server-game/src/00-core-and-library.part',"const VERSION='3.276';","const VERSION='3.277';"],
 ['server-game/current/app.js',"const VERSION='3.276';","const VERSION='3.277';"],
 ['server-game/current/GMWW.html','<title>GMWW V3.276</title>','<title>GMWW V3.277</title>'],
 ['.github/scripts/prepare-update-channel.mjs','releaseNotes:["V3.276 PR630: old','releaseNotes:["V3.277 PR634: approved release note","V3.276 PR630: old']
];
function releaseChanges(){
 const data=changes();data.find(x=>x.path==='src/index.js').after=data.find(x=>x.path==='src/index.js').after.replace('VERSION="V3.276"','VERSION="V3.277"');
 return [...data,...vFiles.map(([path,before,after])=>({path,status:'M',before,after}))];
}
test('focused Player feature is limited to exact paths and chat-only Worker edits',()=>{
 assert.equal(playerInteractionsScope(changes()),'player-lobby-interactions');
 assert.equal(playerInteractionsScope([...changes(),{path:'src/new-rule.js',status:'A'}]),null);
 const outside=changes();outside.find(c=>c.path==='src/index.js').after+='unsafe';assert.equal(playerInteractionsScope(outside),null);
 assert.equal(playerInteractionsScope(changes().slice(1)),null);
 assert.equal(playerInteractionsScope([]),null);
});
test('V3.277 Runtime bump stays byte-exact outside the Player lobby and release note',()=>{
 const changeset=releaseChanges();assert.equal(playerInteractionsScope(changeset),'player-lobby-interactions');
 const unexpected=releaseChanges();unexpected.find(x=>x.path==='server-game/current/app.js').after+='gameplay';assert.equal(playerInteractionsScope(unexpected),null);
 const inject=releaseChanges();inject.find(x=>x.path==='src/index.js').after+='unsafe';assert.equal(playerInteractionsScope(inject),null);
 const badVersion=releaseChanges();badVersion.find(x=>x.path==='package-lock.json').after+='x';assert.equal(playerInteractionsScope(badVersion),null);
 const unknown=releaseChanges();unknown.push({path:'assets/new.css',status:'A'});assert.equal(playerInteractionsScope(unknown),null);
});
test('CI-only routing stays separate and never includes gameplay',()=>{
 const ci=['.github/scripts/ci-browser-scope.mjs','.github/scripts/player-interactions-scope.mjs','.github/workflows/check-player-web.yml','.github/workflows/deploy-production.yml','tests/player-interactions-ci.test.mjs'].map(path=>({path,status:'M'}));
 assert.equal(playerInteractionsScope(ci),'player-interactions-ci');
 assert.equal(playerInteractionsScope([...ci,{path:'src/index.js',status:'M'}]),null);
});
