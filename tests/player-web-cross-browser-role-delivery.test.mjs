import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const begin=player.indexOf('let gmwwPrivateReceiptInFlight=null;');
const end=player.indexOf('async function refreshPrivateRole(force=false){',begin);
const reader=player.slice(begin,end)+'\nthis.read=gmwwReadPrivateReceipt;';

test('Chrome, Edge, Safari sessions use one authenticated private receipt per browser and current room',async()=>{
  assert.ok(begin>0&&end>begin);
  assert.doesNotThrow(()=>new vm.Script(player));
  for(const account of ['chrome','edge','safari']){
    let requests=0,resolveRequest;
    const deferred=new Promise(resolve=>resolveRequest=resolve);
    const state={token:'token-'+account,roomCode:'ABCDEF',participantId:'member:'+account};
    const context={state,api:(url,opts)=>{requests++;assert.equal(url,'/api/rooms/ABCDEF/me');assert.equal(opts.headers.Authorization,'Bearer token-'+account);return deferred},Promise,encodeURIComponent};
    vm.runInNewContext(reader,context);
    const first=context.read(),second=context.read();
    assert.equal(first,second,'WebSocket and poll must reuse the same inflight request');
    assert.equal(requests,1);
    resolveRequest({ok:true,role:{roleId:'seer-'+account},artifact:{artifactId:'mirror-'+account}});
    const response=await first;
    assert.equal(response.role.roleId,'seer-'+account);
    assert.equal(response.artifact.artifactId,'mirror-'+account);
    assert.equal(context.state.participantId,'member:'+account);
  }
});

test('A late response from a previous room or account must never replace the current private cards',async()=>{
  let complete;
  const state={token:'token-edge',roomCode:'OLD123',participantId:'member:edge'};
  const context={state,api:()=>new Promise(done=>complete=done),Promise,encodeURIComponent};
  vm.runInNewContext(reader,context);
  const request=context.read();
  state.roomCode='NEW456';
  complete({role:{roleId:'stale'},artifact:{artifactId:'stale'}});
  assert.equal(await request,null,'the old room receipt is discarded');
});

test('Polling uses one complete receipt path instead of separately applying only the role',()=>{
  const poll=player.slice(player.indexOf('async function pollRoomState(){'),player.indexOf('function startRoomStateWatch(){'));
  const update=player.slice(player.indexOf('async function refreshPrivateRole(force=false){'),player.indexOf('async function ensureRoleGameView('));
  assert.match(poll,/await refreshPrivateRole\(true\)/);
  assert.doesNotMatch(poll,/\/me'|state\.role=d\.role/);
  assert.match(update,/const d=await gmwwReadPrivateReceipt\(\);if\(!d\)return false/);
  assert.match(update,/state\.artifactExpected=d\?\.deliveryManifest\?\.artifactExpected===true\|\|d\?\.artifactExpected===true/);
  assert.match(update,/if\(state\.artifactExpected&&!state\.artifact\)/);
  assert.match(update,/if\(!state\.rolePoll\)state\.rolePoll=setInterval\(\(\)=>refreshPrivateRole\(true\),4000\)/);
});

test('Chrome/Edge can tap an unreceived card to retry, then open it after receipt; no premature release',()=>{
  const start=player.indexOf('function ensurePlayerPrivateDock(){');
  const end=player.indexOf('const gmwwPrivateArtworkCache=new Map()',start);
  const dock=player.slice(start,end);
  const render=player.slice(player.indexOf('function renderPlayerPrivateDock(){'),player.indexOf('function renderGMWWPlayerCardFace(kind){'));
  assert.match(dock,/gmwwPendingPrivateCardTap=kind;gmwwRecoverPrivateRole\(true\)/);
  assert.match(dock,/if\(playerScenePolicy\(state\.room\)\.rolesReleased&&state\.token\)/);
  assert.match(render,/artifact\.disabled=!state\.artifact&&!waitingArtifact/);
  assert.match(render,/if\(wanted&&ready&&\(wanted==='role'\|\|wanted==='artifact'&&state\.artifact\)\)/);
  assert.match(render,/openPrivateCardViewer\(wanted\)/);
  assert.match(player,/state\.artifactExpected=d\.artifactExpected===true/);
  assert.match(player,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
});
