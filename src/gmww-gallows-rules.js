// Server-authoritative 10-second gallows ballot. Pure functions keep DO writes atomic.
export const GALLOWS_VOTE_MS=10000;
export const gallowsDurationSec=(value,fallback=10)=>{
  const n=Number(value);
  return Number.isFinite(n)&&n>=1?Math.max(1,Math.min(3600,Math.trunc(n))):fallback;
};
export const gallowsStage=(ballot,now=Date.now())=>{
  if(ballot?.stage==='nominating'&&ballot.nominationDeadlineAt&&now>=ballot.nominationDeadlineAt)return 'selecting';
  if(ballot?.stage==='voting'&&now>=ballot.deadlineAt)return 'closed';
  return ballot?.stage||'ready';
};
export function gallowsOpen(ballot,now=Date.now()){
  if(ballot.stage!=='ready')return {ok:false,error:'NOMINATION_ALREADY_OPEN'};
  return {ok:true,value:{...ballot,stage:'nominating',nominationStartedAt:now,
    nominationDeadlineAt:now+1000*gallowsDurationSec(ballot.nominationDurationSec),
    nominations:{},votes:{},updatedAt:now}};
}
const validId=id=>typeof id==='string'&&/^[a-z0-9._-]{1,80}$/i.test(id);
export function gallowsSnapshot(ballot,meta,now=Date.now()){
  if(!ballot||ballot.matchId!==String(meta?.matchId||'')||ballot.cycleKey!==String(meta?.cycleKey||''))return null;
  const stage=gallowsStage(ballot,now);
  return {id:ballot.id,day:ballot.day,candidateId:ballot.candidateId||null,stage,
    deadlineAt:ballot.deadlineAt||null,startedAt:ballot.startedAt||null,
    nominationDeadlineAt:ballot.nominationDeadlineAt||null,nominationStartedAt:ballot.nominationStartedAt||null,
    nominationDurationSec:gallowsDurationSec(ballot.nominationDurationSec),voteDurationSec:gallowsDurationSec(ballot.voteDurationSec),
    nominations:{...(ballot.nominations||{})},votes:{...(ballot.votes||{})},
    blocked:[...(ballot.blocked||[])],outcome:ballot.outcome||null};
}
export function gallowsNominate(ballot,voter,target,now=Date.now()){
  if(!validId(voter)||!validId(target)||gallowsStage(ballot,now)!=='nominating')return {ok:false,error:'NOMINATION_CLOSED'};
  if(ballot.nominations[voter])return {ok:false,error:'NOMINATION_ALREADY_USED'};
  return {ok:true,value:{...ballot,nominations:{...ballot.nominations,[voter]:target},updatedAt:now}};
}
export function gallowsBegin(ballot,candidate,now=Date.now()){
  if(!validId(candidate)||!['nominating','selecting'].includes(gallowsStage(ballot,now)))return {ok:false,error:'BALLOT_NOT_READY'};
  return {ok:true,value:{...ballot,candidateId:candidate,stage:'voting',startedAt:now,
    deadlineAt:now+1000*gallowsDurationSec(ballot.voteDurationSec),updatedAt:now,votes:{}}};
}
export function gallowsCast(ballot,voter,choice,now=Date.now()){
  if(!validId(voter)||!['👍','👎'].includes(choice))return {ok:false,error:'INVALID_VOTE'};
  if(ballot.stage!=='voting'||now>=ballot.deadlineAt)return {ok:false,error:'VOTE_DEADLINE_PASSED'};
  if((ballot.blocked||[]).includes(voter))return {ok:false,error:'VOTER_BANNED'};
  if(!(ballot.eligible||[]).includes(voter))return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  if(ballot.votes?.[voter])return ballot.votes[voter]===choice?{ok:true,idempotent:true,value:ballot}:{ok:false,error:'VOTE_ALREADY_USED'};
  return {ok:true,value:{...ballot,votes:{...(ballot.votes||{}),[voter]:choice},updatedAt:now}};
}
export function gallowsBan(ballot,voter,now=Date.now()){
  if(!validId(voter)||!['nominating','voting'].includes(ballot.stage))return {ok:false,error:'INVALID_VOTER'};
  const votes={...(ballot.votes||{})};delete votes[voter];
  const blocked=[...new Set([...(ballot.blocked||[]),voter])];
  return {ok:true,value:{...ballot,blocked,votes,updatedAt:now}};
}
export function gallowsResolve(ballot,outcome,now=Date.now()){
  if(!['dead','alive'].includes(outcome)||!['voting','closed'].includes(ballot.stage)||now<ballot.deadlineAt)return {ok:false,error:'VOTING_NOT_FINISHED'};
  return {ok:true,value:{...ballot,stage:'resolved',outcome,resolvedAt:now,updatedAt:now}};
}
