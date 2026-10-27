import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {familyForConfirmedAction,shouldRevokeVisualAfterUndo} from '../assets/village/arena-3d/stage14-dynamic-actions.mjs';

test('GĐ17: Core accepted undo clears private cast for only the exact match, cycle and token',()=>{
  const cue={matchId:'m-17',cycleKey:'night-2',undoToken:'core-undo-7',actionId:'action_witch_save'};
  assert.equal(shouldRevokeVisualAfterUndo(cue,{matchId:'m-17',cycleKey:'night-2',undoToken:'core-undo-7'}),true);
  for(const candidate of [
    {matchId:'old',cycleKey:'night-2',undoToken:'core-undo-7'},
    {matchId:'m-17',cycleKey:'night-3',undoToken:'core-undo-7'},
    {matchId:'m-17',cycleKey:'night-2',undoToken:'another'},
    {matchId:'m-17',cycleKey:'night-2',undoToken:''},
    {matchId:'m-17',cycleKey:'night-2',undoToken:null}
  ])assert.equal(shouldRevokeVisualAfterUndo(cue,candidate),false);
  assert.equal(shouldRevokeVisualAfterUndo({...cue,undoToken:''},{matchId:'m-17',cycleKey:'night-2',undoToken:'core-undo-7'}),false);
  assert.equal(shouldRevokeVisualAfterUndo(null,{matchId:'m-17',cycleKey:'night-2',undoToken:'core-undo-7'}),false);
});

test('GĐ17: Core-confirmed custom effect IDs map to role-specific families only',()=>{
  const cases=[
    ['effect_destroyer_scry','oracle'],['effect_scan_three','oracle'],
    ['effect_compare_faction','oracle'],['effect_transfer_bite','wand'],
    ['effect_clone_watch','scout'],['effect_assassin_mark','curse'],
    ['effect_knight_last_strike','attack'],['effect_hunter_mark','attack']
  ];
  for(const [effectId,expected] of cases){
    const actionId='custom_'+effectId;
    const card={functions:[{actionId,effectIds:[effectId]}]};
    assert.equal(familyForConfirmedAction({actionId,card}).family,expected,effectId);
  }
  assert.equal(familyForConfirmedAction({actionId:'action_witch_save',
    card:{functions:[{actionId:'action_witch_save',effectIds:['effect_wolf_bite']}]} }).family,'heal');
  assert.equal(familyForConfirmedAction({actionId:'fake_action',
    card:{functions:[{actionId:'other',effectIds:['effect_wolf_bite']}]} }),null);
});

test('GĐ17: undo does not bypass Core and never publishes the GM secret cue',()=>{
  const worker=readFileSync('src/arena3d-stage-worker.mjs','utf8');
  const rollback=worker.slice(worker.indexOf('  async gmBattleUndo('),
    worker.indexOf('  async gmNightControls('));
  assert.match(rollback,/await super\.gmBattleUndo\(request,body\)/);
  assert.match(rollback,/ack\?\.ok!==true/);
  assert.match(rollback,/shouldRevokeVisualAfterUndo\(saved/);
  assert.match(rollback,/await this\.ctx\.storage\.delete\(key\)/);
  assert.match(worker,/undoToken:typeof result\.undoToken==='string'/);
  assert.match(worker,/redactStagingPublicBroadcast\(payload\)/);
  assert.match(worker,/const previous=await this\.ctx\.storage\.get\('meta'\)/);
  assert.doesNotMatch(rollback,/this\.broadcast\(/);
});

test('GĐ17: stale GM visual fetch cannot re-enable old effects or sound after reconnect',()=>{
  const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  assert.match(live,/const session=\{room:code,token:gmToken,matchId:/);
  assert.match(live,/if\(signal\.aborted\|\|current\?\.room\?\.phase!==/);
  assert.match(live,/code!==session\.room\|\|gmToken!==session\.token/);
  assert.match(live,/String\(current\?\.room\.cycleKey\|\|''\)!==session\.cycleKey/);
  assert.match(live,/arenaAudio\.stop\(\);localVoice\.clear\(\)/);
  assert.ok(live.indexOf('code!==session.room||gmToken!==session.token')<live.indexOf('field.setServerEffects(data.effects)'),
    'Session guard must run before applying a private cue');
});
