import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {configuredAdminToken,matchesAdminToken} from '../src/gmww-admin-sync-auth.js';

const key='stage4-test-fixture-only-key-'.padEnd(48,'z');
const env={GMWW_ADMIN_SYNC_TOKEN:key};
test('production admin secret binding accepts valid token and denies all variants',()=>{
  assert.equal(configuredAdminToken(env),key);
  assert.equal(matchesAdminToken(key,env),true);
  for(const value of ['',key.slice(0,-1),key+'x',key.replace('k','q'),null,undefined,{},42])
    assert.equal(matchesAdminToken(value,env),false);
});
test('missing, malformed or short Worker secret always fails closed',()=>{
  for(const invalid of [null,undefined,{}, {GMWW_ADMIN_SYNC_TOKEN:''},
    {GMWW_ADMIN_SYNC_TOKEN:'short'},
    {GMWW_ADMIN_SYNC_TOKEN:' a'.repeat(25)},
    {GMWW_ADMIN_SYNC_TOKEN:key+'\n'},
    {GMWW_ADMIN_SYNC_TOKEN:key+'\r'},
    {GMWW_ADMIN_SYNC_TOKEN:'z'.repeat(257)}]){
    assert.equal(configuredAdminToken(invalid),null);
    assert.equal(matchesAdminToken(key,invalid),false);
    assert.equal(matchesAdminToken('',invalid),false);
  }
});
test('Worker and DO code contain no inline admin sync credential or legacy constant',()=>{
  const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bGM_SYNC_TOKEN\b/);
  assert.match(source,/matchesAdminToken\(token,this\.env\)/);
  assert.match(source,/matchesAdminToken\(bearer\(request\),env\)/);
  assert.match(source,/configuredAdminToken\(this\.env\)/);
});
