// Unit tests: LIVE bot brain (7 chỉ số, cá tính, tin cậy). Chỉ kiểm logic thuần.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBotProfile,decideTalk,applyLynchOutcome,revealStats,toneFor,BOT_STAT_KEYS} from '../src/gmww-live-bot-brain.js';

test('profile has 7 stats in range', () => {
  const a=createBotProfile('bot-anna','m1');
  assert.deepEqual(Object.keys(a.stats).sort(), [...BOT_STAT_KEYS].sort());
  for (const k of BOT_STAT_KEYS) assert.ok(a.stats[k]>=10 && a.stats[k]<=90, k);
});

test('same bot in a new match gets a different personality (no repeat)', () => {
  const sigs=new Set();
  for (let m=0;m<20;m++) sigs.add(JSON.stringify(createBotProfile('bot-A','match-'+m).stats));
  assert.equal(sigs.size,20);
});

test('different bots get different personalities', () => {
  const ids=['bot-1','bot-2','bot-3','bot-4','bot-5','bot-6'];
  const sig=new Set(ids.map(id=>JSON.stringify(createBotProfile(id).stats)));
  assert.ok(sig.size>=5);
});

test('tone follows aggression: aggressive bot speaks hot, firm bot calm', () => {
  assert.equal(toneFor({aggressive:90,acting:50,firm:20}),0);
  assert.equal(toneFor({aggressive:10,acting:10,firm:90}),2);
});

test('aggressive bot accuses more often than a gullible one (seeded rolls)', () => {
  const hot={stats:{...createBotProfile('x').stats,aggressive:90,smart:20,gullible:10,acting:70}};
  const calm={stats:{...createBotProfile('y').stats,aggressive:10,smart:80,gullible:80,acting:20}};
  const count=p=>{let n=0;for(let i=0;i<2000;i++){ if(decideTalk(p,{target:'t'},()=>((i*9301+49297)%233280)/233280).label==='accuse')n++ }return n};
  assert.ok(count(hot)>count(calm));
});

test('decideTalk only returns known labels and never speaks without a target to accuse', () => {
  const p=createBotProfile('z');
  const known=new Set(['accuse','defend_self','defend_other','agree','disagree','filler']);
  for (let i=0;i<500;i++){
    const r=decideTalk(p,{target:i%2?'t':'',prev:i%3?{loginId:'q',seatId:3}:null,prevTrust:50},Math.random);
    assert.ok(known.has(r.label), r.label);
    if(!('t' in (r.vars||{})) && r.label==='accuse') assert.fail('accuse without target');
  }
});

test('trust rises when accusers were right and falls when wrong', () => {
  const profiles={a:createBotProfile('a'),b:createBotProfile('b')};
  const ta=profiles.a.trust, tb=profiles.b.trust;
  applyLynchOutcome(profiles,['a'],true);   // a tố đúng sói
  applyLynchOutcome(profiles,['b'],false);  // b tố sai
  assert.equal(profiles.a.trust,Math.min(100,ta+4));
  assert.equal(profiles.b.trust,Math.max(0,tb-6));
});

test('reveal exposes all 7 stats only as a snapshot', () => {
  const p=createBotProfile('r'); const r=revealStats(p);
  assert.equal(Object.keys(r.stats).length,7);
  r.stats.smart=999; assert.notEqual(p.stats.smart,999);
});
