import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGE8_VERSION,normalizeRitualCue,ritualSequence,ritualPhaseAt,ritualQuality,publicRitualSummary} from '../assets/village/arena-3d/stage8-ritual-director.mjs';
const now=Date.now(),ids=Array.from({length:30},(_,i)=>'member:'+i);
test('GĐ8 Core cue: reject untrusted actor and invalid phase',()=>{
 assert.equal(normalizeRitualCue({turnId:'x',actorIds:['hacker'],cast:null},ids,now),null);
 assert.equal(normalizeRitualCue({actorIds:[ids[0]]},ids,now),null);
 assert.equal(normalizeRitualCue(null,ids,now),null);
});
test('GĐ8 normalize: multiple targets, deduplication, cap and expiring cue',()=>{
 const cue={turnId:'night-2',actorIds:[ids[0],ids[0],ids[1],'hidden'],
  cast:{actorId:ids[0],targetIds:[ids[1],ids[2],ids[2],'private',...ids],kind:'inspect',startedAt:now-500,expiresAt:now+2500}};
 const n=normalizeRitualCue(cue,ids,now);
 assert.deepEqual(n.actorIds,[ids[0],ids[1]]);
 assert.equal(n.cast.targetIds.length,5);
 assert.equal(n.cast.targetIds[0],ids[1]);
 assert.equal(n.cast.targetIds[1],ids[2]);
 assert.equal(n.cast.targetIds.includes('private'),false);
 assert.equal(normalizeRitualCue({...cue,cast:{...cue.cast,expiresAt:now-1}},ids,now).cast,null);
 assert.equal(normalizeRitualCue({...cue,cast:{...cue.cast,kind:'secret'}},ids,now).cast,null);
});
test('GĐ8 animation: deterministic stand, approach, cast, return and seat',()=>{
 const n=normalizeRitualCue({turnId:'1',actorIds:[ids[0]],cast:{actorId:ids[0],targetIds:[ids[1]],kind:'shield',startedAt:now,expiresAt:now+3000}},ids,now);
 const seq=ritualSequence(n,{start:1000,approachMs:900,castMs:2000,returnMs:1200});
 assert.deepEqual(seq.map(x=>x.phase),['standing','approaching','casting','returning','seated']);
 assert.equal(ritualPhaseAt(seq,3000).phase,'casting');
 assert.equal(ritualPhaseAt(seq,5100).phase,'seated');
 assert.deepEqual(ritualSequence(n,{start:1000}),ritualSequence(n,{start:1000}));
});
test('GĐ8 performance budgets 6–30 and reduced motion',()=>{
 for(const n of [6,12,20,30]){
  const q=ritualQuality({players:n,fps:60});
  const low=ritualQuality({players:n,fps:12,lowPower:true,reducedMotion:true});
  assert.ok(q.simultaneousCasters<=3);
  assert.equal(low.simultaneousCasters,1);
  assert.equal(low.decorativeParticles,0);
  assert.equal(low.cameraEaseMs,0);
 }
});
test('GĐ8 public summary and Core-only integration without secret exposure',()=>{
 assert.equal(STAGE8_VERSION,'gmww.arena.core-ritual-director.8');
 const n=normalizeRitualCue({turnId:'1',actorIds:[ids[0]],cast:{actorId:ids[0],targetIds:[ids[1]],kind:'vote',startedAt:now,expiresAt:now+2000}},ids,now);
 assert.deepEqual(publicRitualSummary(n),{active:true,kind:'vote',actors:1,targets:1});
 const src=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(src,/normalizeRitualCue\(data\.casting,authorized\)/);
 assert.match(src,/gmwwStage8=STAGE8_VERSION/);
 assert.match(src,/gmToken\)void refreshPrivateGmEffects/);
});

test('GĐ8 multi-target renderer uses separate beams and disposes shared resources',()=>{
 const src=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 assert.match(src,/const spellBeams=Array\.from\(\{length:5\}/);
 assert.match(src,/for\(const \[index,targetId\] of activeBeam\.targetIds\.entries\(\)\)/);
 assert.match(src,/get visibleBeamCount\(\)/);
 assert.match(src,/for\(const beam of spellBeams\)beam\.material\.dispose\(\)/);
 assert.doesNotMatch(src,/targetId:target\.id,start:spellStart/);
});
