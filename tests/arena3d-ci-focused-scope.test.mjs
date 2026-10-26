// The official GM room and bearer bridge touches assembled GMWW Runtime.
// Such changes are a release security boundary: fail CLOSED to full CI.
// Do not whitelist them as an unrelated cosmetic Arena-only edit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const app=readFileSync('server-game/current/app.js','utf8');
const source=readFileSync('server-game/src/20-members-and-roster.part','utf8');
const portal=readFileSync('server-game/current/GMWW.html','utf8');
const modified=(path,before,after)=>({path,status:'M',before,after});
const added=path=>({path,status:'A',before:null,after:'Arena 3D 6–30 Core E2E'});
const changed=[
 modified('server-game/current/app.js','GMWW existing runtime without room handoff',app),
 modified('server-game/src/20-members-and-roster.part','GMWW existing source',source),
 modified('server-game/current/GMWW.html','GMWW existing 2D-only entry',portal),
 added('assets/village/arena-3d/player.mjs'),
 added('tests/arena3d-room-adoption.test.mjs')
];
test('Official 3D Core/GM/Player changes fail closed to full release tests',()=>{
 assert.equal(classifyBrowserScope(changed),'full');
 assert.match(app,/gmww-arena3d-adopt-room/);
 assert.match(source,/gmww-arena3d-adopt-room/);
 assert.match(portal,/gmww-arena3d-room-adopted/);
});
test('Core gameplay, secret handoff, Worker and Player changes cannot be silently scoped',()=>{
 for(const row of [
  modified('src/index.js','prior Core','altered Core'),
  modified('server-game/src/40-battle-and-timeline.part','prior rules','altered rules'),
  modified('server-game/current/app.js',app,app+'\\n// unexpected mutation'),
  modified('server-game/current/GMWW.html',portal,portal+'\\n<!-- unexpected -->')
 ]){
  assert.equal(classifyBrowserScope([...changed,row]),'full',row.path);
 }
});
test('No unverified Arena-only selector may make Production and its GM token bypass full CI',()=>{
 const corrupted=app.replace('GMWW_ARENA_OFFICIAL_ORIGIN','GMWW_ARENA_UNSAFE_ORIGIN');
 assert.equal(classifyBrowserScope([
  modified('server-game/current/app.js',app,corrupted),
  added('tests/arena3d-room-adoption.test.mjs')
 ]),'full');
});
