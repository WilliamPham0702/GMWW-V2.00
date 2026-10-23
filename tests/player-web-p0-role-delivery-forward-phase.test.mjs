import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const begin=player.indexOf('function gmwwShouldAdvancePrivatePhase(next){');
const end=player.indexOf('async function refreshPrivateRole(force=false){',begin);

test('P0: Worker emits browser-valid Player Web and a precise forward-only phase fence',()=>{
 assert.doesNotThrow(()=>new vm.Script(player));
 assert.ok(begin>=0&&end>begin,'private receipt must contain a forward-phase reconciliation helper');
 assert.match(player,/if\(d\.type==='room_state'\)gmwwLastRoomBroadcastAt=Date\.now\(\)/);
 assert.doesNotMatch(player,/if\(\['room_state','player_move','player_move_complete'\]\.includes\(d\.type\)\)gmwwLastRoomBroadcastAt/);
 const receipt=player.slice(end,player.indexOf('async function ensureRoleGameView(',end));
 assert.equal(receipt.split('gmwwShouldAdvancePrivatePhase(d.room)').length-1,2,'both private room updates must advance phase');
});

test('P0: latest private receipt advances lobby→Phát Vai→Vào Trận without waiting for refresh',()=>{
 const state={room:{phase:'lobby',matchId:'match-1'}};
 const ctx={state};
 vm.runInNewContext(player.slice(begin,end)+';this.advance=gmwwShouldAdvancePrivatePhase;',ctx);
 assert.equal(ctx.advance({phase:'role_delivery',matchId:'match-1'}),true);
 state.room={phase:'role_delivery',matchId:'match-1'};
 assert.equal(ctx.advance({phase:'running',matchId:'match-1'}),true);
 state.room={phase:'running',matchId:'match-1'};
 assert.equal(ctx.advance({phase:'role_delivery',matchId:'match-1'}),false,'never roll running state back');
 assert.equal(ctx.advance({phase:'ended',matchId:'old-match'}),false,'never leak another match');
});
