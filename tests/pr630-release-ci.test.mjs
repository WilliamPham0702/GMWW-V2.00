import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as scope from '../.github/scripts/ci-browser-scope.mjs';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:20*1024*1024});
// Immutable reviewed PR630 merge and its first parent: authentic release fixture.
const release='df5c429702017c4ef7f0443638bf6cfb01520667';
const original=git('diff','--name-status',release+'^1',release).trim().split('\n').map(row=>{
 const [status,path]=row.split('\t');return {status,path,before:status==='M'?git('show',release+'^1:'+path):null,after:git('show',release+':'+path)};
});
const repair=[['M','.github/scripts/ci-browser-scope.mjs'],['M','.github/workflows/check-player-web.yml'],['A','tests/pr630-release-ci.test.mjs'],['M','docs/releases/GMWW-PLAYER-ONLINE-UI-SECURITY-20261029.md']].map(([status,path])=>({status,path}));
test('PR630 merged release uses the reviewed scope on main',()=>assert.equal(scope.isPlayerOnlinePrivacy630Release?.(original),true));
test('PR630 exact CI recovery requires its reviewed release predecessor',()=>{
 assert.equal(scope.isPlayerOnlinePrivacy630Release?.(repair,original),true);
 assert.equal(scope.isPlayerOnlinePrivacy630Release?.(repair,[]),false);
});
test('PR630 recovery rejects runtime edits, deleted gates and unrelated predecessor',()=>{
 assert.equal(scope.isPlayerOnlinePrivacy630Release?.([...repair,{status:'M',path:'src/index.js'}],original),false);
 assert.equal(scope.isPlayerOnlinePrivacy630Release?.(repair.map((x,i)=>i===0?{...x,status:'D'}:x),original),false);
 assert.equal(scope.isPlayerOnlinePrivacy630Release?.(repair,[...original,{status:'M',path:'wrangler.jsonc'}]),false);
});
