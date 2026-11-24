// V3.330 LIVE: nhận vai Tiên Tri/Phù Thuỷ, phản biện, uy tín đổi trong ván; nút LIVE riêng; số ghế; đồng hồ Demo/Live.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planClaimScript,applyClaimEffect,claimLine,weightedPick,killChance,CLAIM_BANK} from '../src/gmww-live-claims.js';
import {demoTaskAt} from '../src/gmww-demo-runner.js';

const seq=values=>{let i=0;return()=>values[i++%values.length]};
const prof=(over={})=>({stats:{smart:50,honest:50,gullible:50,aggressive:50,firm:50,acting:50,trust:50,...over},trust:50,tone:1});

test('real Seer bot claims its real result; a wolf may counter-claim; others react', () => {
  const facts={alive:['a','b','c','d','e'],wolves:['e'],seer:{actorId:'a',targetId:'e'},witch:null,bitten:[],witchSaved:false,diedLastNight:[]};
  const profiles={a:prof({aggressive:80}),b:prof(),c:prof(),d:prof(),e:prof({acting:95})};
  const steps=planClaimScript(facts,profiles,seq([0.01]));
  assert.equal(steps[0].actorId,'a');assert.equal(steps[0].label,'seer_wolf');assert.equal(steps[0].vars.t,'e');
  const counter=steps.find(s=>s.label==='counter_seer');
  assert.ok(counter&&counter.actorId==='e'&&counter.vars.s==='a','wolf counter-claims the real Seer');
  assert.ok(steps.some(s=>['believe','doubt'].includes(s.label)),'others react');
});

test('Witch claim: bitten target survived without a save → suspicious line + target defends', () => {
  const facts={alive:['w','x','y'],wolves:[],seer:null,witch:{actorId:'w'},bitten:['x'],witchSaved:false,diedLastNight:[]};
  const steps=planClaimScript(facts,{w:prof(),x:prof(),y:prof({acting:10})},seq([0.01]));
  assert.equal(steps[0].label,'witch_nosave_alive');assert.equal(steps[0].vars.t,'x');
  assert.equal(steps[1].label,'defend_alive');assert.equal(steps[1].actorId,'x');
  const text=claimLine('witch_nosave_alive',2,{t:'số 3'},()=>0);
  assert.match(text,/Phù Thuỷ/);assert.match(text,/số 3/);assert.match(text,/không cứu/);
  assert.match(claimLine('seer_wolf',1,{t:'số 12'},()=>0),/Tiên Tri.*số 12.*Sói/);
});

test('trust rises for an uncontested claim, falls for a contested one; doubts lower it; suspicion steers votes', () => {
  const profiles={a:prof(),e:prof()},suspicion={};
  const claim={type:'claim',role:'seer',target:'e',wolf:true};
  applyClaimEffect(claim,'a',profiles,suspicion,[claim]);
  assert.equal(profiles.a.trust,54);assert.ok(suspicion.e>0);
  const p2={a:prof(),e:prof()},s2={};
  const counter={type:'counter',role:'seer',against:'a',target:'a',wolf:true};
  applyClaimEffect(claim,'a',p2,s2,[claim,counter]);applyClaimEffect(counter,'e',p2,s2,[claim,counter]);
  assert.ok(p2.a.trust<50&&p2.e.trust<50,'both claimers lose trust when contested');
  applyClaimEffect({type:'doubt',about:'a'},'z',profiles,suspicion);assert.equal(profiles.a.trust,51);
  applyClaimEffect({type:'believe',about:'a'},'z',profiles,suspicion);assert.equal(profiles.a.trust,54);
  assert.ok(killChance(4)>killChance(0));
  const picks={};const r=seq([0.1,0.3,0.5,0.7,0.9,0.95,0.99,0.2]);for(let i=0;i<80;i++){const id=weightedPick(['e','x'],{e:4},r);picks[id]=(picks[id]||0)+1}
  assert.ok(picks.e>picks.x);
  for(const label of Object.keys(CLAIM_BANK))assert.equal(CLAIM_BANK[label].length,3,label);
});

test('LIVE day talk is spread from the start of discussion, not only the second half', () => {
  const plan={live:true,cursor:0,tasks:Array.from({length:10},()=>({kind:'talk'}))};
  assert.ok(demoTaskAt(300000,plan)<=15000);
  assert.ok(demoTaskAt(300000,{...plan,live:false})>=150000);
});

test('runner wires claims, suspicion-driven ballots and Live opening reaction', () => {
  const runner=fs.readFileSync('src/gmww-demo-runner.js','utf8');
  assert.match(runner,/planClaimScript\(liveNightFacts/);
  assert.match(runner,/weightedPick\(others,liveSuspicion/);
  assert.match(runner,/killChance\(liveSuspicion/);
  assert.match(runner,/label:'death_react'/);
  assert.match(runner,/'số '\+m\.seatId/);
});

test('Demo/Live clock: running server clock is not reported as paused 0; Live speed fixed x1', () => {
  assert.match(fs.readFileSync('src/worker/room/gm-state.js','utf8'),/autoPausedRemainingMs=demoClock\.running\?null:/);
  assert.match(fs.readFileSync('src/worker/room/demo-and-auto.js','utf8'),/speed=meta\.live===true\?1:/);
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(app,/demoClock\?\.kind==='night'&&demoClock\.running&&Number\(demoClock\.deadlineAt\)>0/);
});

test('GM menu shows a separate LIVE button (no x1/x2) and seat numbers under Live players', () => {
  const app=fs.readFileSync('server-game/current/app.js','utf8'),html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(app,/modeName=live\?'LIVE':'DEMO'/);
  assert.match(app,/if\(wrap\)wrap\.hidden=!enabled\|\|live;/);
  assert.match(app,/class="play-seat-number"/);
  assert.match(html,/#battleDemoToggle\.is-live-mode\{/);
  assert.match(html,/\.play-seat-number\{/);
});
