import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=read('src/index.js');

function sliceBetween(startNeedle,endNeedle){
  const start=server.indexOf(startNeedle);
  assert.ok(start>=0,'Missing '+startNeedle);
  const end=server.indexOf(endNeedle,start+startNeedle.length);
  assert.ok(end>start,'Missing end marker '+endNeedle);
  return server.slice(start,end);
}

test('Security contract: Player mutation APIs bind identity to authenticated member session',()=>{
  const segment=sliceBetween('async function playerMoveApi','async function playerRoleViewedApi');
  assert.ok(segment.includes('/members/session'));
  assert.ok(segment.includes('loginId:data.member.loginId'));

  const role=sliceBetween('async function playerRoleViewedApi','async function playerArtifactViewedApi');
  const artifactViewed=sliceBetween('async function playerArtifactViewedApi','async function playerArtifactActivateApi');
  const artifactActivate=sliceBetween('async function playerArtifactActivateApi','async function playerInteractionRespondApi');
  for(const part of [role,artifactViewed,artifactActivate]){
    assert.ok(part.includes('/members/session'));
    assert.ok(part.includes('loginId:data.member.loginId'));
  }
});

test('Security contract: GM global mutation routes reject requests without GM authorization',()=>{
  for(const route of [
    '/api/gm/web-sync',
    '/api/gm/presence',
    '/api/gm/move',
    '/api/gm/ui-settings',
    '/api/gm/assets/victory-audio',
    '/api/gm/assets/role-card-back',
    '/api/gm/avatars/upsert',
    '/api/gm/game-templates'
  ]){
    const pos=server.indexOf('url.pathname==="'+route+'"');
    assert.ok(pos>=0,'Missing '+route);
    const block=server.slice(pos,Math.min(server.length,pos+900));
    assert.ok(block.includes('bearer(request)!==GM_SYNC_TOKEN'),route+' must enforce GM authorization');
  }
});

test('Security contract: destructive member administration remains GM-only',()=>{
  for(const route of [
    '/api/gm/members/create',
    '/api/gm/members/edit',
    '/api/gm/members/reset-password'
  ]){
    const pos=server.indexOf('url.pathname==="'+route+'"');
    assert.ok(pos>=0,'Missing '+route);
    const block=server.slice(pos,Math.min(server.length,pos+700));
    assert.ok(block.includes('bearer(request)!==GM_SYNC_TOKEN'),route+' must enforce GM authorization');
  }
  const del=server.indexOf('const gmMemberDelete=url.pathname.match');
  assert.ok(del>=0);
  assert.ok(server.slice(del,del+900).includes('bearer(request)!==GM_SYNC_TOKEN'));
});

test('Security contract: result recording is internal-only and has no public API route',()=>{
  assert.ok(server.includes('https://member.internal/members/record-result'));
  assert.doesNotMatch(server,/url\.pathname==="\/api\/members\/record-result"/);
});

test('Security contract: GM credential exposure is explicitly tracked until auth migration',()=>{
  const runtime=read('server-game/current/app.js');
  assert.ok(server.includes('const GM_SYNC_TOKEN='));
  assert.ok(runtime.includes('const GMWW_GM_AUTH='));
  assert.match(runtime,/Authorization:'Bearer '\+GMWW_GM_AUTH/);
});
