import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const rule=fs.readFileSync('server-game/current/battle-controls.js','utf8');
const doSource=fs.readFileSync('src/index.js','utf8');
const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');

test('Assassin GM must choose 👍 or 👎; correct role, target and turn enforced by Durable Object',()=>{
  assert.ok(rule.includes('return "assassin_mark"'));
  assert.ok(gm.includes("battleState.assassinChoice=button.dataset.assassinChoice"));
  assert.ok(gm.includes("a.actionId==='action_assassin_mark'&&!['👍','👎'].includes(battleState.assassinChoice)"));
  assert.ok(gm.includes("assassinChoice:battleState.assassinChoice"));
  assert.ok(html.includes('id="battleAssassinChoice"'));
  assert.ok(html.includes('data-assassin-choice="👍"'));
  assert.ok(html.includes('data-assassin-choice="👎"'));
  assert.ok(css.includes('#battleAssassinChoice button.is-selected'));
  assert.ok(doSource.includes('if(assassinAction&&roleId!=="role_assassin")'));
  assert.ok(doSource.includes('INVALID_ASSASSIN_CHOICE'));
});

test('Secret Assassin thumb never leaks to Player Web at night',()=>{
  assert.ok(doSource.includes('if(type!=="assassin_mark")this.broadcast({type:"player_interaction",interaction});'));
  assert.ok(doSource.includes('x.type!=="assassin_mark"||(String(meta?.cyclePhase||"")==="morning"'));
  assert.ok(doSource.includes(".slice(-10).map(({gmChoice,...safe})=>safe)"));
  assert.ok(doSource.includes("const effects=Object.values(latest).map(({gmChoice,...safe})=>safe)"));
});

test('Player can answer only next morning, Server compares secret signs and commits deadly mismatch',()=>{
  assert.ok(doSource.includes('ASSASSIN_RESPONSE_NOT_YET_OPEN'));
  assert.ok(doSource.includes('ASSASSIN_CHOICE_NOT_RECORDED'));
  assert.ok(doSource.includes('ASSASSIN_TARGET_NO_LONGER_ELIGIBLE'));
  assert.ok(doSource.includes('row.gmChoice===response?"survived":"dead"'));
  assert.ok(doSource.includes('if(assassinOutcome==="dead")'));
  assert.ok(doSource.includes('type:"dead",loginId'));
  assert.ok(doSource.includes('this.broadcast({type:"player_interaction_response",interaction:{...row,gmChoice:undefined}'));
  assert.ok(player.includes('handlePendingInteractions(d?.interactions)'));
  assert.ok(player.includes("interaction/respond"));
});
