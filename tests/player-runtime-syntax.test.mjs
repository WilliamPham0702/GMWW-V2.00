import test from 'node:test';
import assert from 'node:assert/strict';
import { gmwwMembersLiveScript } from '../src/gmww-members-live.js';

test('Player Web browser runtime script has valid JavaScript syntax',()=>{
  assert.doesNotThrow(()=>new Function(gmwwMembersLiveScript));
});

test('Player Web login handler remains callable after runtime script parsing',()=>{
  assert.match(gmwwMembersLiveScript,/async function login\(\)/);
  assert.match(gmwwMembersLiveScript,/window\.login=login/);
  assert.match(gmwwMembersLiveScript,/api\('\/api\/members\/login'/);
});
