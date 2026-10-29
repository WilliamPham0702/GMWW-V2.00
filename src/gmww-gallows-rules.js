import {gallowsTally} from '../shared/gallows-statistics.mjs';
// Server-authoritative gallows: member nominations/votes or GM-operated voting.
export const GALLOWS_VOTE_MS=60000;
export const gallowsDurationSec=(value,fallback=60)=>{
  const n=Number(value);
  return Number.isFinite(n)&&n>=1?Math.max(1,Math.min(3600,Math.trunc(n))):fallback;
};
const validId=id=>typeof id==='string'&&/^[a-z0-9._-]{1,80}$/i.test(id);
const unique=a=>[...new Set((Array.isArray(a)?a:[]).filter(validId))];
export const gallowsMode=ballot=>ballot?.mode==='gm'?'gm':'auto';
// Candidate/nomination eligibility remains alive-only; this list is voting-only.
export const gallowsVoteEligible=ballot=>unique(Array.isArray(ballot?.voteEligible)?ballot.voteEligible:ballot?.eligible);
// The legacy `blocked` list meant "ban from voting". Preserve that interpretation.
export const gallowsBlockedNomination=ballot=>unique(ballot?.blockedNomination);
export const gallowsGmBlockedVotes=ballot=>unique([...(ballot?.blockedVotes||[]),...(ballot?.blocked||[])]);
export const gallowsBlockedVotes=ballot=>unique([...gallowsGmBlockedVotes(ballot),...(ballot?.artifactVoteBans||[]),...(ballot?.foolVoteBans||[]),...(ballot?.saveOnlyVoters||[]).filter(id=>(ballot?.forcedKillVoters||[]).includes(id))]);
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

/* All public tallies derive from accepted Server receipts.
   Tied highest nominations = no gallows this day; tied save/kill = alive. */
// Timing belongs to the active Gallows panel, not the pre-match template.
export function gallowsSetDuration(ballot,kind,seconds,now=Date.now()){
  const stage=gallowsStage(ballot,now),field=kind==='nomination'?'nominationDurationSec':kind==='vote'?'voteDurationSec':kind==='both'?'both':null;
  if(gallowsMode(ballot)!=='auto'||!field||stage==='resolved'||
     (kind==='both'&&stage!=='ready')||
     (kind==='nomination'&&stage!=='ready')||
     (kind==='vote'&&!['ready','nominating','selecting'].includes(stage)))
    return {ok:false,error:'GALLOWS_TIMER_LOCKED'};
  const duration=gallowsDurationSec(seconds,0);
  if(!duration)return {ok:false,error:'INVALID_GALLOWS_DURATION'};
  return {ok:true,value:{...ballot,...(kind==='both'?
    {nominationDurationSec:duration,voteDurationSec:duration}:{[field]:duration}),updatedAt:now}};
}
// Force an early nomination close; a tie or empty ballot means NO hanging this day.
export function gallowsCloseNomination(ballot,now=Date.now()){
  if(gallowsMode(ballot)!=='auto'||!['nominating','selecting'].includes(gallowsStage(ballot,now)))
    return {ok:false,error:'NOMINATION_NOT_OPEN'};
  if(gallowsStage(ballot,now)==='selecting'&&ballot.stage==='selecting')return {ok:true,value:ballot};
  const candidate=gallowsAutomaticNominee(ballot);
  // No clear highest nominee: finish the gallows without a target, death or vote phase.
  if(!candidate)return {ok:true,value:{...ballot,stage:'resolved',candidateId:null,
    outcome:'no_lynch',resolvedAt:now,hangingStartedAt:null,deadlineAt:null,
    nominationDeadlineAt:now,updatedAt:now}};
  // Only the GM's "Mở bỏ phiếu" starts voting for the unique leader.
  return {ok:true,value:{...ballot,stage:'selecting',candidateId:candidate,
    hangingStartedAt:now,nominationDeadlineAt:now,updatedAt:now}};
}
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
  const eligible=new Set(gallowsVoteEligible(ballot)),blocked=new Set(gallowsBlockedVotes(ballot));
  const votes=Object.entries(ballot?.votes||{}).filter(([voter,choice])=>eligible.has(voter)&&voter!==String(ballot?.candidateId||'')&&!blocked.has(voter)&&['👍','👎'].includes(choice));
  // Each confirmed Crow mark contributes exactly two adverse votes only
  // when its target reaches the gallows; these aren't fabricated voters.
  const crowPenalty=(ballot?.crowMarks||[]).filter(id=>id===String(ballot?.candidateId||'')).length*2;
  // Ấn Thị Trưởng makes each accepted vote by its holder count twice,
  // without adding a fake voter or increasing ballot eligibility.
  const doubles=new Set(ballot?.doubleVoteVoters||[]),
    weight=([id])=>doubles.has(id)?2:1;
  return {save:votes.filter(([,choice])=>choice==='👍').reduce((sum,v)=>sum+weight(v),0),
    kill:votes.filter(([,choice])=>choice==='👎').reduce((sum,v)=>sum+weight(v),0)+crowPenalty,cast:votes.length,
    eligible:[...eligible].filter(id=>id!==String(ballot?.candidateId||'')&&!blocked.has(id)).length};
}
// Kẻ Ngốc survives only the FIRST execution; from then on cannot vote,
// but remains eligible to be nominated and can die on a later execution.
export function resolveFoolGallows({candidateId,outcome,assignments=[],interactions=[],matchId}={}){
  const target=String(candidateId||''),match=String(matchId||'');
  if(outcome!=='dead'||!target||!match)return {outcome,escaped:false};
  const role=(Array.isArray(assignments)?assignments:[]).find(x=>
    String(x.loginId||'').replace(/^member:/,'')===target);
  // Áo Choàng Hoàng Tử repeatedly prevents execution by gallows. It does
  // not consume the Fool's first escape (if that role also owns the cloak).
  if(role?.artifactId==='artifact_12')
    return {outcome:'alive',escaped:false,protectedBy:'artifact_12'};
  if(role?.roleId!=='role_fool')return {outcome,escaped:false};
  const previously=(Array.isArray(interactions)?interactions:[]).some(x=>
    String(x.matchId||'')===match&&x.actionId==='action-fool-escape'&&
    String(x.loginId||'').replace(/^member:/,'')===target);
  return previously?{outcome:'dead',escaped:false}:{outcome:'alive',escaped:true};
}
export function gallowsAutomaticOutcome(ballot){
  const tally=gallowsVoteTotals(ballot);
  return tally.kill>tally.save?'dead':'alive';
}

export function gallowsRosterStats(ballot){
  // Server-authoritative receipts: do not reconstruct vote percentages from UI state.
  const eligible=gallowsVoteEligible(ballot);
  const candidate=String(ballot?.candidateId||'');
  const living=new Set(ballot?.eligible||[]);
  const nominations=Object.entries(ballot?.nominations||{}).filter(([voterId,targetId])=>living.has(voterId)&&living.has(targetId)).map(([voterId,targetId])=>({voterId,targetId}));
  const votes=Object.entries(ballot?.votes||{}).filter(([voterId])=>voterId!==candidate).map(([voterId,choice])=>({
    voterId,targetId:candidate,choice:choice==='👍'?'save':choice==='👎'?'kill':null
  }));
  return gallowsTally(eligible.map(id=>({id})),nominations,votes,{
    nominationBans:unique([...gallowsBlockedNomination(ballot),...eligible.filter(id=>!living.has(id))]),
    voteBans:gallowsBlockedVotes(ballot)
  }).map(({player,...row})=>row);
}

/* The suspended Character is a derived visual state, never a Seat movement or death effect. */
export function gallowsHangingState(ballot,now=Date.now()){
  const stage=gallowsStage(ballot,now),candidateId=String(ballot?.candidateId||'');
  if(!validId(candidateId)||!['selecting','voting','closed'].includes(stage)||
     !(ballot?.eligible||[]).includes(candidateId))return null;
  return {active:true,candidateId,stage,startedAt:Number(ballot.hangingStartedAt||ballot.startedAt||ballot.updatedAt||now)};
}
// GM selects the accused before Giết/Cứu; Durable Object persists and broadcasts.
export function gallowsSelectCandidate(ballot,candidate,now=Date.now()){
  if(gallowsMode(ballot)!=='gm')return {ok:false,error:'GM_MANUAL_MODE_REQUIRED'};
  if(!validId(candidate)||!(ballot?.eligible||[]).includes(candidate))return {ok:false,error:'INVALID_GALLOWS_CANDIDATE'};
  if(!['ready','selecting'].includes(gallowsStage(ballot,now)))return {ok:false,error:'GALLOWS_ALREADY_VOTING_OR_RESOLVED'};
  if(ballot.stage==='selecting'&&ballot.candidateId===candidate)return {ok:true,idempotent:true,value:ballot};
  return {ok:true,value:{...ballot,stage:'selecting',candidateId:candidate,
    hangingStartedAt:now,outcome:null,updatedAt:now}};
}
export function gallowsSnapshot(ballot,meta,now=Date.now()){
  if(!ballot||ballot.matchId!==String(meta?.matchId||'')||ballot.cycleKey!==String(meta?.cycleKey||''))return null;
  const stage=gallowsStage(ballot,now),blockedNomination=gallowsBlockedNomination(ballot),blockedVotes=gallowsBlockedVotes(ballot);
  return {id:ballot.id,day:ballot.day,round:Number(ballot.round||1),extraRoundPending:ballot.extraRoundPending===true,candidateId:ballot.candidateId||null,stage,mode:gallowsMode(ballot),hanging:gallowsHangingState(ballot,now),
    deadlineAt:ballot.deadlineAt||null,startedAt:ballot.startedAt||null,
    nominationDeadlineAt:ballot.nominationDeadlineAt||null,nominationStartedAt:ballot.nominationStartedAt||null,
    nominationDurationSec:gallowsDurationSec(ballot.nominationDurationSec),voteDurationSec:gallowsDurationSec(ballot.voteDurationSec),
    nominations:Object.fromEntries(Object.entries(ballot.nominations||{}).filter(([id])=>!blockedNomination.includes(id))),
    votes:Object.fromEntries(Object.entries(ballot.votes||{}).filter(([id])=>id!==String(ballot.candidateId||'')&&!blockedVotes.includes(id))),
    resolvedAt:ballot.resolvedAt||null,updatedAt:ballot.updatedAt||null,
    blockedNomination,blockedVotes,gmBlockedVotes:gallowsGmBlockedVotes(ballot),
    artifactVoteBans:unique(ballot.artifactVoteBans),blocked:blockedVotes,outcome:ballot.outcome||null,
    voteEligible:gallowsVoteEligible(ballot),eligible:[...(ballot.eligible||[])],eligibleCount:(ballot.eligible||[]).length,nominationTotals:gallowsNominationTotals(ballot),
    rosterStats:gallowsRosterStats(ballot),voteTotals:gallowsVoteTotals(ballot)};
}
export function gallowsNominate(ballot,voter,target,now=Date.now()){
  if(gallowsMode(ballot)!=='auto')return {ok:false,error:'GM_MANUAL_MODE'};
  if(!validId(voter)||!validId(target)||voter===target||!(ballot?.eligible||[]).includes(voter)||!(ballot?.eligible||[]).includes(target)||gallowsStage(ballot,now)!=='nominating')return {ok:false,error:'NOMINATION_CLOSED'};
  if(gallowsBlockedNomination(ballot).includes(voter))return {ok:false,error:'NOMINATION_BANNED'};
  if(ballot.nominations?.[voter])return {ok:false,error:'NOMINATION_ALREADY_USED'};
  return {ok:true,value:{...ballot,nominations:{...ballot.nominations,[voter]:target},updatedAt:now}};
}
export function gallowsBegin(ballot,candidate,now=Date.now()){
  if(!validId(candidate)||!(ballot?.eligible||[]).includes(candidate)||
     !['nominating','selecting'].includes(gallowsStage(ballot,now)))return {ok:false,error:'BALLOT_NOT_READY'};
  if(gallowsMode(ballot)==='auto'&&gallowsStage(ballot,now)==='selecting'){
    const unique=gallowsAutomaticNominee(ballot);
    if(!unique)return {ok:false,error:'GALLOWS_NO_UNIQUE_NOMINEE'};
    if(candidate!==unique)return {ok:false,error:'GALLOWS_CANDIDATE_NOT_TOP_NOMINEE'};
  }
  return {ok:true,value:{...ballot,candidateId:candidate,stage:'voting',hangingStartedAt:now,startedAt:now,
    deadlineAt:now+1000*gallowsDurationSec(ballot.voteDurationSec),updatedAt:now,votes:{}}};
}
export function gallowsCast(ballot,voter,choice,now=Date.now()){
  if(!validId(voter)||!['👍','👎'].includes(choice))return {ok:false,error:'INVALID_VOTE'};
  if(gallowsMode(ballot)!=='auto')return {ok:false,error:'GM_MANUAL_MODE'};
  if(ballot.stage!=='voting'||now>=ballot.deadlineAt)return {ok:false,error:'VOTE_DEADLINE_PASSED'};
  if(voter===String(ballot.candidateId||''))return {ok:false,error:'GALLOWS_CANDIDATE_CANNOT_VOTE'};
  if(gallowsBlockedVotes(ballot).includes(voter))return {ok:false,error:'VOTER_BANNED'};
  if(choice==='👍'&&(ballot?.forcedKillVoters||[]).includes(voter))
    return {ok:false,error:'FOOL_HAT_REQUIRES_KILL_VOTE'};
  if(choice==='👎'&&(ballot?.saveOnlyVoters||[]).includes(voter))
    return {ok:false,error:'PEACE_LOVER_KILL_VOTE_FORBIDDEN'};
  if(!gallowsVoteEligible(ballot).includes(voter))return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  if(ballot.votes?.[voter])return ballot.votes[voter]===choice?{ok:true,idempotent:true,value:ballot}:{ok:false,error:'VOTE_ALREADY_USED'};
  return {ok:true,value:{...ballot,votes:{...(ballot.votes||{}),[voter]:choice},updatedAt:now}};
}
export function gallowsSetRestriction(ballot,voter,kind,banned=true,now=Date.now()){
  if(!validId(voter)||!['nomination','vote'].includes(kind)||gallowsStage(ballot,now)==='resolved')
    return {ok:false,error:'INVALID_RESTRICTION'};
  if(!(kind==='vote'?gallowsVoteEligible(ballot):ballot.eligible||[]).includes(voter))return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  const field=kind==='nomination'?'blockedNomination':'blockedVotes';
  const current=kind==='nomination'?gallowsBlockedNomination(ballot):gallowsGmBlockedVotes(ballot);
  const next=banned?unique([...current,voter]):current.filter(id=>id!==voter);
  const changed={...ballot,[field]:next,updatedAt:now};
  if(kind==='nomination'){
    const nominations={...(ballot.nominations||{})};delete nominations[voter];changed.nominations=nominations;
    // A ban made after closing nominations invalidates the old receipt.
    // Recompute the leader *and* hanging Character before the GM opens voting.
    if(gallowsMode(ballot)==='auto'&&gallowsStage(ballot,now)==='selecting'&&ballot.stage==='selecting'){
      const nominee=gallowsAutomaticNominee(changed);
      if(!nominee){
        changed.stage='resolved';changed.candidateId=null;changed.hangingStartedAt=null;
        changed.outcome='no_lynch';changed.resolvedAt=now;changed.deadlineAt=null;
      }else if(nominee!==ballot.candidateId){
        changed.candidateId=nominee;changed.hangingStartedAt=now;
      }
    }
  }
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
  return {ok:true,value:{...ballot,mode,stage:'ready',candidateId:null,hangingStartedAt:null,
    nominationStartedAt:null,nominationDeadlineAt:null,startedAt:null,deadlineAt:null,
    resolvedAt:null,outcome:null,nominations:{},votes:{},updatedAt:now}};
}
export function gallowsManualVote(ballot,voter,choice,now=Date.now()){
  if(gallowsMode(ballot)!=='gm'||!['voting','closed'].includes(gallowsStage(ballot,now)))
    return {ok:false,error:'GM_MANUAL_MODE_REQUIRED'};
  if(!validId(voter)||!gallowsVoteEligible(ballot).includes(voter)||gallowsBlockedVotes(ballot).includes(voter))
    return {ok:false,error:'VOTER_NOT_ELIGIBLE'};
  if(voter===String(ballot.candidateId||''))return {ok:false,error:'GALLOWS_CANDIDATE_CANNOT_VOTE'};
  if(!['👍','👎',null].includes(choice))return {ok:false,error:'INVALID_VOTE'};
  if(choice==='👍'&&(ballot?.forcedKillVoters||[]).includes(voter))
    return {ok:false,error:'FOOL_HAT_REQUIRES_KILL_VOTE'};
  if(choice==='👎'&&(ballot?.saveOnlyVoters||[]).includes(voter))
    return {ok:false,error:'PEACE_LOVER_KILL_VOTE_FORBIDDEN'};
  const votes={...(ballot.votes||{})};
  if(choice===null)delete votes[voter];else votes[voter]=choice;
  return {ok:true,value:{...ballot,votes,updatedAt:now}};
}
export function gallowsResolve(ballot,outcome,now=Date.now()){
  if(!['dead','alive'].includes(outcome)||!['voting','closed'].includes(ballot.stage)||now<ballot.deadlineAt)return {ok:false,error:'VOTING_NOT_FINISHED'};
  return {ok:true,value:{...ballot,stage:'resolved',outcome,resolvedAt:now,updatedAt:now}};
}

// GM can decide directly; manual mode never starts Player Web nomination or voting timers.
export function gallowsManualResolve(ballot,candidate,outcome,now=Date.now()){
  if(gallowsMode(ballot)!=='gm')return {ok:false,error:'GM_MANUAL_MODE_REQUIRED'};
  if(ballot.stage==='resolved')return {ok:false,error:'GALLOWS_ALREADY_RESOLVED'};
  if(!validId(candidate)||!(ballot.eligible||[]).includes(candidate))return {ok:false,error:'INVALID_GALLOWS_CANDIDATE'};
  if(!['dead','alive'].includes(outcome))return {ok:false,error:'INVALID_GALLOWS_OUTCOME'};
  return {ok:true,value:{...ballot,stage:'resolved',candidateId:candidate,outcome,
    deadlineAt:null,nominationDeadlineAt:null,nominationStartedAt:null,
    resolvedAt:now,updatedAt:now,nominations:{},votes:{}}};
}
