import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const worker=readFileSync('src/index.js','utf8');
const web=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const gm=readFileSync('server-game/current/app.js','utf8');
const status=readFileSync('src/gmww-public-room-contract.js','utf8');

test('Visual-only effects are acknowledged on Server without prompting or leaking a WS receipt',()=>{
  const gate=worker.match(/silentVisualNotice=([^,]+),interaction=/)?.[1];
  assert.ok(gate,'The production Worker must decide whether a notice needs a reply');
  const silent=new Function('type','body','return '+gate);
  assert.equal(silent('effect_notice',{}),true);
  assert.equal(silent('effect_notice',{requireAck:false,requireResponse:false}),true);
  assert.equal(silent('effect_notice',{requireAck:true}),false);
  assert.equal(silent('effect_notice',{requireResponse:true}),false);
  assert.equal(silent('thumb_vote',{}),false);
  assert.equal(silent('assassin_mark',{}),false);
  assert.match(worker,/status:silentVisualNotice\?"responded":"pending"/);
  assert.match(worker,/response:silentVisualNotice\?"AUTO_ACK":null/);
  assert.match(worker,/!interaction\.pendingDeath&&!silentVisualNotice/);
});

test('Player Web silently cleans up pending visual notices from older Runtime versions',()=>{
  const fn=web.match(/function showPlayerInteraction\(ix\)\{[\s\S]*?\n\}\n(?=function handlePendingInteractions)/)?.[0];
  assert.ok(fn,'Player Web interaction presenter must be present');
  const calls=[];
  const context={state:{member:{loginId:'seer'}},respondInteraction:(...args)=>calls.push(args),
    setRoleEffect:()=>{throw Error('unexpected role lock')},
    ensureInteractionUi:()=>{throw Error('unexpected modal')},
    $:()=>{throw Error('unexpected DOM access')}};
  vm.runInNewContext(fn,context);
  context.showPlayerInteraction({id:'legacy-1',loginId:'seer',status:'pending',type:'effect_notice'});
  assert.deepEqual(calls,[['legacy-1','ĐÃ HIỂU',true]]);
  assert.match(fn,/ix\.requireAck!==true&&ix\.requireResponse!==true/);
  assert.match(fn,/if\(ix\.type==='assassin_mark'\)setRoleEffect\(ix\)/);
  assert.match(fn,/type==='thumb_vote'\?\['👍','👎'\]/);
});

test('GM visual toggles remain Server-authoritative and library counts all 16 statuses',()=>{
  assert.match(gm,/type:'status_display_batch'/);
  assert.match(gm,/type:'status_display'/);
  assert.match(gm,/visuals\.entries\.length\+'<\/span>/);
  assert.match(status,/statusTagsFor\(rows,meta,loginId,players=\{\}\)/);
  assert.match(status,/display\[x\.statusId\]===true/);
  assert.match(status,/if\(canSee\)tags\.set\(statusId/);
});
