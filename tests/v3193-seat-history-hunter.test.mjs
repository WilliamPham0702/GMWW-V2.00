import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../assets/village/village-layout.js';
import {hunterLinkedDeaths,isHunterRole} from '../src/gmww-hunter-death-rules.js';

const hunter={loginId:'a',roleId:'role_hunter',roleName:'Thợ Săn'};
const mark={id:'mark',type:'effect_notice',matchId:'M',night:1,actorId:'a',
  loginId:'b',actionId:'action_hunt',effectActive:false,createdAt:'2026-01-01T01:00:00Z'};
const dead={id:'hunter-dead',type:'dead',matchId:'M',night:1,loginId:'a',
  effectActive:true,createdAt:'2026-01-01T02:00:00Z'};
test('Hunter choice is deferred until confirmed Hunter death, not activated on marking',()=>{
  assert.equal(isHunterRole(hunter),true);
  assert.deepEqual(hunterLinkedDeaths({assignments:[hunter],interactions:[mark],matchId:'M',night:1}),[]);
  const events=hunterLinkedDeaths({assignments:[hunter],interactions:[mark,dead],matchId:'M',night:1});
  assert.equal(events.length,1);
  assert.equal(events[0].loginId,'b');
  assert.equal(events[0].actorId,'a');
  assert.equal(events[0].causeDeathId,'hunter-dead');
  assert.equal(events[0].type,'dead');
  assert.equal(hunterLinkedDeaths({assignments:[hunter],interactions:[mark,dead,...events],matchId:'M',night:1}).length,0);
});
test('Hunter keeps most recent legitimate target; ignores artifacts, unrelated matches, surviving hunter and healed death',()=>{
  const first={...mark,loginId:'c',id:'first',createdAt:'2026-01-01T00:00:00Z'};
  const ignoredArtifact={...mark,loginId:'d',id:'artifact',artifactId:'artifact_x',createdAt:'2026-01-01T03:00:00Z'};
  const events=hunterLinkedDeaths({assignments:[hunter],interactions:[first,mark,ignoredArtifact,dead],matchId:'M',night:1});
  assert.equal(events.length,1);assert.equal(events[0].loginId,'b');
  assert.deepEqual(hunterLinkedDeaths({assignments:[hunter],interactions:[first,{...mark,matchId:'OTHER'},dead],matchId:'M',night:1}).map(x=>x.loginId),['c']);
  assert.deepEqual(hunterLinkedDeaths({assignments:[hunter],interactions:[mark,{...dead,effectActive:false}],matchId:'M',night:1}),[]);
  assert.deepEqual(hunterLinkedDeaths({assignments:[],interactions:[mark,dead],matchId:'M',night:1}),[]);
});
test('Seat formation moves above prior Y -10 limit without altering seat IDs or count',()=>{
  const layout=globalThis.GMWW_VILLAGE_LAYOUT;
  assert.ok(layout);
  assert.equal(layout.normalizeSeatOffset({x:0,y:-17}).y,-17);
  const initial=layout.positions(8,'circle',{x:0,y:-10},135);
  const raised=layout.positions(8,'circle',{x:0,y:-11},135);
  assert.equal(initial.length,8);assert.equal(raised.length,8);
  assert.ok(raised.some((p,i)=>p.y<initial[i].y),'Arrow ↑ must move seat positions up at 135%');
});
test('GM drag UI, canonical script and browser bundle implement synchronized preview and single Server commit',()=>{
  const source=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const bundle=fs.readFileSync('server-game/current/app.js','utf8');
  for(const code of [source,bundle]){
    assert.match(code,/playSeatOffsetPreview/);
    assert.match(code,/world\.addEventListener\('pointermove'/);
    assert.match(code,/pointerup',stop/);
    assert.match(code,/playUpdateRoomSettings\(\{seatOffset:next\}\)/);
  }
});
test('Server DEMO history spans all cycles and village notice includes nonpersistent effects from archive',()=>{
  const server=fs.readFileSync('src/index.js','utf8');
  const ui=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  assert.match(server,/async villageHistoryForMatch/);
  assert.match(server,/this\.villageHistoryForMatch\(meta,interactions\)/);
  assert.match(server,/history:\(Array\.isArray\(demoLease\?\.history\)/);
  assert.doesNotMatch(server,/String\(event\?\.cycleKey\|\|''\)===String\(meta\.cycleKey\|\|''\)/);
  assert.match(ui,/entry\.effectActive===false&&\/UNDO/);
});
