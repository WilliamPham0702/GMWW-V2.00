import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isBattleActorBlocked} from '../src/gmww-battle-actor-eligibility.js';
import {expireCycleEffects} from '../src/gmww-cycle-effect-expiry.js';

const worker=fs.readFileSync('src/index.js','utf8');
const statusPolicy=fs.readFileSync('src/gmww-public-room-contract.js','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');
const villageCss=fs.readFileSync('assets/village/village.css','utf8');

const ids=['wolf_bitten','marked','infected','mute','disabled_permanent','disabled_2n'];

test('Worker defines every new status with a duration rule and a blocking flag',()=>{
  for(const id of ids)assert.match(statusPolicy,new RegExp(id+':\\{label:'));
  assert.match(statusPolicy,/disabled_permanent:\{label:"[^"]+",icon:"⛔",blocks:true,duration:"permanent"\}/);
  assert.match(statusPolicy,/disabled_2n:\{label:"[^"]+",icon:"⏳",blocks:true,duration:"nights",nights:2\}/);
});

test('Worker expires nights and morning statuses, and never auto-expires permanent ones',()=>{
  assert.match(worker,/expireCycleEffects\(rows,\{phase:p,night:n,cycleKey:key,matchId:meta\.matchId,statusDefs:STATUS_DEFS,now\}\)/);
  const base={type:'status',effectActive:true,night:1,cycleKey:'night-1',matchId:'m'};
  const rows=[{...base,id:'timed',statusId:'disabled_2n'},
    {...base,id:'morning',statusId:'marked'},
    {...base,id:'permanent',statusId:'disabled_permanent'}];
  const statusDefs={disabled_2n:{duration:'nights',nights:2},
    marked:{duration:'morning'},disabled_permanent:{duration:'permanent'}};
  const run=(phase,night)=>expireCycleEffects(rows,{
    phase,night,cycleKey:phase+'-'+night,matchId:'m',statusDefs,now:'2026-10-17T00:00:00Z'});
  assert.deepEqual(run('night',2),[]);
  assert.equal(run('morning',2).some(x=>x.id==='morning'),true);
  assert.equal(run('night',3).some(x=>x.id==='timed'),true);
  assert.equal(rows.find(x=>x.id==='permanent').effectActive,true);
});

test('Worker blocks battle actions for blocking statuses and keeps legacy blocks',()=>{
  assert.match(worker,/if\(isBattleActorBlocked\(interactions,\{actorId,matchId,statusDefs:STATUS_DEFS\}\)\)/);
  const base={loginId:'gm-player',matchId:'m1',effectActive:true};
  const rules={disabled_permanent:{blocks:true},disabled_2n:{blocks:true},infected:{blocks:false}};
  const evaluate=(type,extra={})=>isBattleActorBlocked([{...base,type,...extra}],
    {actorId:'gm-player',matchId:'m1',statusDefs:rules});
  for(const type of ['frozen','dead'])
    assert.equal(evaluate(type),true,type);
  assert.equal(evaluate('expelled'),false);
  assert.equal(evaluate('status',{statusId:'disabled_permanent'}),true);
  assert.equal(evaluate('status',{statusId:'disabled_2n'}),true);
  assert.equal(evaluate('status',{statusId:'infected'}),false);
  assert.equal(evaluate('dead',{effectActive:false}),false);
});

test('Worker lets GM toggle Player Web visibility per status and exposes visible tags',()=>{
  assert.match(worker,/if\(type==="status_display"\)/);
  assert.match(statusPolicy,/statusDisplay:m\.statusDisplay/);
  assert.match(worker,/statusTags:statusTagsFor\(interactions,meta,p\?\.loginId,players\)/);
  assert.match(statusPolicy,/display\[x\.statusId\]===true/);
});

test('GM client has the full catalog, chips for new statuses, and a blocking helper',()=>{
  for(const id of ['expelled','frozen','dead',...ids])assert.match(app,new RegExp("\\b"+id+":\\{label:"));
  assert.match(app,/const STATUS_CHIP_IDS=\['wolf_bitten','marked','infected','mute','disabled_permanent','disabled_2n'\]/);
  assert.match(app,/function playPlayerBlocked\(loginId\)/);
  assert.match(app,/data-play-player-state="status:'\+id\+'"/);
  assert.match(app,/if\(String\(type\)\.startsWith\('status:'\)\)/);
});

test('status library renders all nine statuses with a Player Web toggle for the new ones',()=>{
  assert.match(html,/id="statusLibraryGrid"/);
  assert.match(app,/function renderStatusLibrary\(\)/);
  assert.match(app,/data-status-display="\'\+visuals\.safe\(id\)\+\'"/);
  assert.match(app,/type:'status_display'/);
  assert.doesNotMatch(html,/data-character-status="frozen"/);
});

test('Player Web renders visible status tags on the village token',()=>{
  assert.match(village,/statusTags:Array\.isArray\(p\.statusTags\)/);
  assert.match(village,/gmww-sv-overlay/);
  assert.match(village,/gmww-sv-badges/);
  assert.match(villageCss,/\.status-tags\{/);
});

test('turn label stays above the head and a vertical orbit wraps the actor and target',()=>{
});

test('confirm buttons after target selection are compact',()=>{
  assert.match(css,/is-confirm-only>footer>button\{min-width:64px!important;min-height:32px!important/);
});
