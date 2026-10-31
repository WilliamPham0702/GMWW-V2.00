import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseOrigins,verifyTwoBackends} from './verify-two-backends.mjs';

const oracle='https://oracle-staging.example.org';
const cloudflare='https://gmww-v2-00.example.workers.dev';
const good={
  '/api/health':{status:200,body:{ok:true,project:'GMWW-V2.00',version:'V3.280',serverVersion:'V3.280'}},
  '/healthz':{status:200,body:{service:'gmww-oracle-staging',environment:'STAGING',ready:false,adapterSchema:'gmww-oracle-staging-room-v1'}},
  '/readyz':{status:503,body:{ready:false,accepts_game_traffic:false}},
  '/api/members/me':{status:401,body:{error:'UNAUTHORIZED'}}
};
function mock(overrides={}){
  const reads=[];
  const fn=async(url,opts)=>{
    assert.equal(opts.method,'GET','Read-only probe cannot mutate either backend');
    assert.equal(opts.redirect,'manual');
    assert.equal(opts.headers.accept,'application/json');
    reads.push(url);
    const u=new URL(url),id=u.origin===oracle?'oracle':'cf';
    const item=overrides[id+u.pathname]||good[u.pathname];
    assert.ok(item,'unexpected path '+u.pathname);
    return Response.json(item.body,{status:item.status});
  };
  return{fn,reads};
}
test('real Oracle target must be independent HTTPS and explicitly opted in',()=>{
 const env={GMWW_ORACLE_REMOTE_READONLY:'1',GMWW_ORACLE_STAGING_URL:oracle+'/',GMWW_CLOUDFLARE_PROD_URL:cloudflare+'/'};
 assert.deepEqual(chooseOrigins(env),{oracle,cloudflare});
 for(const patch of [
  {GMWW_ORACLE_REMOTE_READONLY:'0'},
  {GMWW_ORACLE_STAGING_URL:'http://oracle-staging.example.org/'},
  {GMWW_ORACLE_STAGING_URL:'https://user:pass@oracle-staging.example.org/'},
  {GMWW_ORACLE_STAGING_URL:'https://oracle-staging.example.org/api/health'},
  {GMWW_ORACLE_STAGING_URL:cloudflare+'/'},
  {GMWW_ORACLE_STAGING_URL:'https://other.pages.dev/'},
  {GMWW_CLOUDFLARE_PROD_URL:'https://unrelated.example.org/'}
 ])assert.throws(()=>chooseOrigins({...env,...patch}));
});
test('read-only Oracle and Cloudflare API health contract can match but never approve failover',async()=>{
 const {fn,reads}=mock();
 const r=await verifyTwoBackends({oracle,cloudflare},fn);
 assert.equal(r.contractComparable,true);
 assert.equal(r.oracleStagingIdentityVerified,true);
 assert.equal(r.productionSwitchAllowed,false);
 assert.equal(r.storageMigrationVerified,false);
 assert.equal(r.remoteLoginSessionWebSocketE2EVerified,false);
 assert.equal(reads.length,6);
 assert.ok(reads.every(url=>url.startsWith(oracle)||url.startsWith(cloudflare)));
});
test('remote gate rejects mismatch in version, staging identity, readiness and session security',async()=>{
 const changes=[
  {'oracle/api/health':{status:200,body:{...good['/api/health'].body,version:'V3.279',serverVersion:'V3.279'}}},
  {'oracle/healthz':{status:200,body:{...good['/healthz'].body,environment:'PRODUCTION'}}},
  {'oracle/readyz':{status:200,body:{ready:true,accepts_game_traffic:true}}},
  {'oracle/api/members/me':{status:200,body:{ok:true}}},
  {'cf/api/members/me':{status:200,body:{ok:true}}}
 ];
 for(const patch of changes)await assert.rejects(verifyTwoBackends({oracle,cloudflare},mock(patch).fn));
});
test('remote gate rejects redirects and HTML disguised as a health response',async()=>{
 const redirected=async()=>new Response(null,{status:302,headers:{location:'https://example.com'}});
 await assert.rejects(verifyTwoBackends({oracle,cloudflare},redirected));
 const html=async()=>new Response('<!doctype html>',{status:200});
 await assert.rejects(verifyTwoBackends({oracle,cloudflare},html));
});
