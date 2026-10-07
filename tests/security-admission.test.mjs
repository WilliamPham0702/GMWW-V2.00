import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PUBLIC_ENTRY_LIMITS,publicEntryPolicy,stepPublicEntryWindow} from '../src/gmww-security-admission.js';

test('Public entry limits protect intended routes without touching gameplay or health',()=>{
  for(const [route,policy] of Object.entries(PUBLIC_ENTRY_LIMITS)){
    assert.equal(publicEntryPolicy('POST',route),policy);
    assert.equal(publicEntryPolicy('GET',route),null);
    assert.ok(policy.limit>=30,'allow a 30-player group to sign in/register behind one IP');
  }
  for(const route of ['/api/health','/api/health/deep','/api/rooms/ABCD23','/api/members/me','/api/gm/presence'])
    assert.equal(publicEntryPolicy('POST',route),null);
});

test('Fixed-window admission is deterministic and resets after expiration',()=>{
  const policy={limit:2,windowMs:60000};
  const a=stepPublicEntryWindow(null,policy,100000);
  const b=stepPublicEntryWindow(a.next,policy,100001);
  const c=stepPublicEntryWindow(b.next,policy,100002);
  assert.equal(a.allowed,true);
  assert.equal(b.allowed,true);
  assert.equal(c.allowed,false);
  assert.equal(c.retryAfterSeconds,60);
  assert.deepEqual(c.next,b.next);
  assert.deepEqual(stepPublicEntryWindow(c.next,policy,160000).next,{startedAt:160000,count:1,windowMs:60000});
  assert.equal(stepPublicEntryWindow(c.next,policy,99999).allowed,true);
});

test('Old and malformed state does not permanently lock out legitimate users',()=>{
  const policy={limit:30,windowMs:60000};
  for(const invalid of [null,{}, {startedAt:-10,count:500},{startedAt:NaN,count:-1},{startedAt:4000,count:1.5}]){
    const r=stepPublicEntryWindow(invalid,policy,5000);
    assert.equal(r.allowed,true);
    assert.equal(r.next.count,1);
  }
});

test('Worker admission path hashes the client address, applies 429, and probes storage without mutating room data',()=>{
  const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.match(server,/publicEntryPolicy\(request\.method,url\.pathname\)/);
  assert.match(server,/request\.headers\.get\("CF-Connecting-IP"\)/);
  assert.match(server,/sha256\("public-entry-v1:"\+policy\.key\+":"\+clientAddress\)/);
  assert.match(server,/idFromName\("__GMWW_RATE_V1__"\+digest\)/);
  assert.match(server,/url\.pathname==="\/security\/rate-limit"/);
  assert.match(server,/return new Response\(JSON\.stringify\(\{ok:false,error:"TOO_MANY_REQUESTS"/);
  assert.match(server,/url\.pathname==="\/api\/health\/deep"/);
  assert.match(server,/url\.pathname==="\/health\/storage"/);
  assert.doesNotMatch(server,/env\.ROOMS\.get\(env\.ROOMS\.idFromName\(clientAddress/);
});
