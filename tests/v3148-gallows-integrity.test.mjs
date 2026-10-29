import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gallowsSnapshot,gallowsNominate,gallowsBegin,gallowsCast,gallowsBan,gallowsResolve,GALLOWS_VOTE_MS} from '../src/gmww-gallows-rules.js';

const fresh=()=>({id:'g-1',matchId:'m1',cycleKey:'morning-2',day:2,stage:'nominating',
  nominations:{},votes:{},blocked:[],eligible:['alice','bob','carol']});
test('one nomination per player, GM selected candidate opens using the configured 60-second default',()=>{
  const n=gallowsNominate(fresh(),'alice','bob',1000);
  assert.equal(n.ok,true);
  assert.equal(gallowsNominate(n.value,'alice','carol',1001).error,'NOMINATION_ALREADY_USED');
  const started=gallowsBegin(n.value,'bob',2000);
  assert.equal(started.value.deadlineAt,2000+GALLOWS_VOTE_MS);
  assert.equal(gallowsBegin(started.value,'bob',2001).ok,false);
});
test('ballots are immutable after deadline, ineligible and banned voters are rejected',()=>{
  const started=gallowsBegin(fresh(),'bob',1000).value;
  const first=gallowsCast(started,'alice','👍',3000);
  assert.equal(first.ok,true);
  assert.equal(gallowsCast(first.value,'alice','👎',3100).error,'VOTE_ALREADY_USED');
  assert.equal(gallowsCast(first.value,'stranger','👍',4000).error,'VOTER_NOT_ELIGIBLE');
  const banned=gallowsBan(first.value,'alice',4200);
  assert.equal(banned.value.votes.alice,undefined);
  assert.equal(gallowsCast(banned.value,'alice','👍',5000).error,'VOTER_BANNED');
  assert.equal(gallowsCast(banned.value,'carol','👎',1000+GALLOWS_VOTE_MS).error,'VOTE_DEADLINE_PASSED');
  assert.equal(gallowsResolve(banned.value,'dead',1000+GALLOWS_VOTE_MS-1).error,'VOTING_NOT_FINISHED');
  const result=gallowsResolve(banned.value,'dead',1000+GALLOWS_VOTE_MS);
  assert.equal(result.ok,true);
  assert.equal(result.value.outcome,'dead');
});
test('new match/day cannot reuse old ballot or disclose old votes',()=>{
  const ballot=gallowsBegin(fresh(),'bob',1000).value;
  assert.equal(gallowsSnapshot(ballot,{matchId:'m1',cycleKey:'morning-3'},2000),null);
  assert.equal(gallowsSnapshot(ballot,{matchId:'other',cycleKey:'morning-2'},2000),null);
  assert.equal(gallowsSnapshot(ballot,{matchId:'m1',cycleKey:'morning-2'},1000+GALLOWS_VOTE_MS+1).stage,'closed');
});
test('gallows is connected to authenticated GM and player APIs and private room state',()=>{
  const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  const gm=readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
  const player=readFileSync(new URL('../src/player-web-src/30-rooms-and-realtime.part',import.meta.url),'utf8');
  assert.match(server,/async gmGallows\(request,body\)/);
  assert.match(server,/async playerGallows\(body,authorizedDemo=false\)/);
  // Approved hybrid DEMO admits joined human accounts and still rejects others.
  assert.match(server,/if\(meta\?\.demo===true&&!authorizedDemo\)\{/);
  assert.match(server,/if\(actor\?\.humanControlled!==true\)return j\(\{ok:false,error:"DEMO_PLAYER_NOT_JOINED"/);
  assert.match(server,/await this.gmAuthorized\(request\)/);
  assert.match(server,/memberStore\(env\).fetch\(new Request\("https:\/\/member.internal\/members\/session"/);
  assert.match(server,/gallowsId:ballot.id/);
  assert.match(server,/expiredReason="GM_GALLOWS_RESTORE"/);
  assert.match(gm,/battleGallowsCommand\(/);
  assert.match(gm,/battleGallowsTick\(\)/);
  assert.match(player,/function sendGallowsChoice\(/);
  assert.match(player,/function syncGallowsVoteTags\(/);
  assert.match(player,/gallows_updated/);
});
