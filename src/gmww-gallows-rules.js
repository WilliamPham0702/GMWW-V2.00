// Server-authoritative gallows: member nominations/votes or GM-operated voting.
export const GALLOWS_VOTE_MS=10000;
export const gallowsDurationSec=(value,fallback=10)=>{
  const n=Number(value);
  return Number.isFinite(n)&&n>=1?Math.max(1,Math.min(3600,Math.trunc(n))):fallback;
};
const validId=id=>typeof id==='string'&&/^[a-z0-9._-]{1,80}$/i.test(id);
const unique=a=>[...new Set((Array.isArray(a)?a:[]).filter(validId))];
export const gallowsMode=ballot=>ballot?.mode==='gm'?'gm':'auto';
// The legacy `blocked` list meant "ban from voting". Preserve that interpretation.
export const gallowsBlockedNomination=ballot=>unique(ballot?.blockedNomination);
export const gallowsBlockedVotes=ballot=>unique([...(ballot?.blockedVotes||[]),...(ballot?.blocked||[])]);
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

/* All public tallies derive from accepted, still-eligible Server receipts.
   Tie for nomination needs GM choice; tied execution votes save the accused. */
export function gallowsNominationTotals(ballot){
  const eligible=new Set(ballot?.eligible||[]),blocked=new Set(gallowsBlockedNomination(ballot)),counts=new Map();
  for(const [voter,target] of Object.entries(ballot?.nominations||{})){
    if(!eligible.has(voter)||blocked.has(voter)||!eligible.has(target)||voter===target)continue;
    counts.set(target,(counts.get(target)||0)+1);
  }
  return [...counts].map(([loginId,votes])=>({loginId,votes}))
    .sort((a,b)=>b.votes-a.votes||a.loginId.localeCompare(b.loginId));
}
export function gallowsAutomaticNominee(ballot){
  const totals=gallowsNominationTotals(ballot);
  return totals[0]&&(!totals[1]||totals[0].votes>totals[1].votes)?totals[0].loginId:null;
}
export function gallowsVoteTotals(ballot){
  const eligible=new Set(ballot?.eligible||[]),blocked=new Set(gallowsBlockedVotes(ballot));
  const votes=Object.entries(ballot?.votes||{}).filter(([voter,choice])=>eligible.has(voter)&&!blocked.has(voter)&&['👍','👎'].includes(choice));
  return {save:votes.filter(([,choice])=>choice==='👍').length,kill:votes.filter(([,choice])=>choice==='👎').length,cast:votes.length,
    eligible:[...eligible].filter(id=>!blocked.has(id)).length};
}
export function gallowsAutomaticOutcome(ballot){
  const tally=gallowsVoteTotals(ballot);
  return tally.kill>tally.save?'dead':'alive';
}

export function gallowsSnapshot(ballot,meta,now=Date.now()){
  if(!ballot||ballot.matchId!==String(meta?.matchId||'')||ballot.cycleKey!==String(meta?.cycleKey||''))return null;
  const stage=gallowsStage(ballot,now),blockedNomination=gallowsBlockedNomination(ballot),blockedVotes=gallowsBlockedVotes(ballot);
  return {id:ballot.id,day:ballot.day,candidateId:ballot.candidateId||null,stage,mode:gallowsMode(ballot),
    deadlineAt:ballot.deadlineAt||null,startedAt:ballot.startedAt||null,
    nominationDeadlineAt:ballot.nominationDeadlineAt||null,nominationStartedAt:ballot.nominationStartedAt||null,
    nominationDurationSec:gallowsDurationSec(ballot.nominationDurationSec),voteDurationSec:gallowsDurationSec(ballot.voteDurationSec),
    nominations:Object.fromEntries(Object.entries(ballot.nominations||{}).filter(([id])=>!blockedNomination.includes(id))),
    votes:Object.fromEntries(Object.entries(ballot.votes||{}).filter(([id])=>!blockedVotes.includes(id))),
    blockedNomination,blockedVotes,blocked:blockedVotes,outcome:ballot.outcome||null,
    eligible:[...(ballot.eligible||[])],eligibleCount:(ballot.eligible||[]).length,nominationTotals:gallowsNominationTotals(ballot),voteTotals:gallowsVoteTotals(ballot)};
}
export function gallowsNominate(ballot,voter,target,now=Date.now()){
  if(!validId(voter)||!validId(target)||voter===target||!(ballot?.eligible||[]).includes(target)||gallowsStage(ballot,now)!=='nominating')return {ok:false,error:'NOMINATION_CLOSED'};
  if(gallowsMode(ballot)!=='auto')return {ok:false,error:'GM_MANUAL_MODE'};
  if(gallowsBlockedNomination(ballot).includes(voter))return {ok:false,error:'NOMINATION_BANNED'};
  if(ballot.nominations?.[voter])return {ok:false,error:'NOMINATION_ALREADY_USED'};
  return {ok:true,value:{...ballot,nominations:{...ballot.nominations,[voter]:target},updatedAt:now}};
}
export function gallowsBegin(ballot,candidate,now=Date.now()){
  if(!validId(candidate)||!['nominating','selecting'].includes(gallowsStage(ballot,now)))return {ok:false,error:'BALLOT_NOT_READY'};
  return {ok:true,value:{...ballot,candidateId:candidate,stage:'voting',startedAt:now,
    deadlineAt:now+1000*gallowsDurationSec(ballot.voteDurationSec),updatedAt:now,votes:{}}};
}
export function gallowsCast(ballot,voter,choice,now=Date.now()){
  if(!validId(voter)||!['👍','👎'].includes(choice))return {ok:false,error:'INVALID_VOTE'};
  if(gallowsMode(ballot)!=='auto')return {ok:false,error:'GM_MANUAL_MODE'};
  if(ballot.stage!=='voting'||now>=ballot.deadlineAt)return {ok:false,error:'VOTE_DEADLINE_PASSED'};
  if(gallowsBlockedVotes(ballot).includes(voter))return {ok:false,error:'VOTER_BANNED'};
  if(!(ballot.eligible||[]).includes(voter))return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  if(ballot.votes?.[voter])return ballot.votes[voter]===choice?{ok:true,idempotent:true,value:ballot}:{ok:false,error:'VOTE_ALREADY_USED'};
  return {ok:true,value:{...ballot,votes:{...(ballot.votes||{}),[voter]:choice},updatedAt:now}};
}
export function gallowsSetRestriction(ballot,voter,kind,banned=true,now=Date.now()){
  if(!validId(voter)||!['nomination','vote'].includes(kind)||gallowsStage(ballot,now)==='resolved')
    return {ok:false,error:'INVALID_RESTRICTION'};
  if(!(ballot.eligible||[]).includes(voter))return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  const field=kind==='nomination'?'blockedNomination':'blockedVotes';
  const current=kind==='nomination'?gallowsBlockedNomination(ballot):gallowsBlockedVotes(ballot);
  const next=banned?unique([...current,voter]):current.filter(id=>id!==voter);
  const changed={...ballot,[field]:next,updatedAt:now};
  if(kind==='nomination'){const nominations={...(ballot.nominations||{})};delete nominations[voter];changed.nominations=nominations}
  else {const votes={...(ballot.votes||{})};delete votes[voter];changed.votes=votes;changed.blocked=[]}
  return {ok:true,value:changed};
}
export function gallowsBan(ballot,voter,now=Date.now()){
  return gallowsSetRestriction(ballot,voter,'vote',true,now);
}
export function gallowsSetMode(ballot,mode,now=Date.now()){
  if(!['auto','gm'].includes(mode)||gallowsStage(ballot,now)==='resolved')return {ok:false,error:'INVALID_GALLOWS_MODE'};
  if(gallowsMode(ballot)===mode)return {ok:true,value:ballot};
  // A switch never silently counts an already submitted ballot in another mode.
  return {ok:true,value:{...ballot,mode,nominations:{},votes:{},updatedAt:now}};
}
export function gallowsManualVote(ballot,voter,choice,now=Date.now()){
  if(gallowsMode(ballot)!=='gm'||!['voting','closed'].includes(gallowsStage(ballot,now)))
    return {ok:false,error:'GM_MANUAL_MODE_REQUIRED'};
  if(!validId(voter)||!(ballot.eligible||[]).includes(voter)||gallowsBlockedVotes(ballot).includes(voter))
    return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  if(!['👍','👎',null].includes(choice))return {ok:false,error:'INVALID_VOTE'};
  const votes={...(ballot.votes||{})};
  if(choice===null)delete votes[voter];else votes[voter]=choice;
  return {ok:true,value:{...ballot,votes,updatedAt:now}};
}
export function gallowsResolve(ballot,outcome,now=Date.now()){
  if(!['dead','alive'].includes(outcome)||!['voting','closed'].includes(ballot.stage)||now<ballot.deadlineAt)return {ok:false,error:'VOTING_NOT_FINISHED'};
  return {ok:true,value:{...ballot,stage:'resolved',outcome,resolvedAt:now,updatedAt:now}};
}
