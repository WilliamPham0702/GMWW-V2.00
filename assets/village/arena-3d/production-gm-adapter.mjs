// Read-only Core GM state adapter for Arena 3D on the SAME official RoomDurableObject.
// Caller MUST first receive a HTTP-200 /api/gm/rooms/:room response with a valid
// GM bearer token. This never authenticates a user or invents private role cards.
import {privateTurnActionOptions} from './stage29-gm-actions.mjs';
import {stageCastingCue} from './casting-choreography.mjs';
import {coreActionFamily} from './stage11-core-action-bridge.mjs';

export const ARENA_GM_LIVE_ADAPTER_VERSION='gmww.arena.live-gm-state.1';
const ID=/^[a-z0-9._-]{1,80}$/i,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function member(login){return ID.test(String(login||''))?'member:'+String(login):null}
function actionKind(row){
  const fam=coreActionFamily(String(row?.actionId||''));
  const result={wolf:'attack',attack:'attack',curse:'attack',
    shield:'shield',heal:'heal',oracle:'inspect',scout:'inspect'};
  return result[fam]||({dead:'attack',revive:'heal',protected:'shield',
    frozen:'attack',expelled:'attack'})[String(row?.type||'')]||null;
}
function confirmedEffects(state,now){
  const room=state.room,seen=new Set(),effects=[];
  for(const x of (Array.isArray(state.interactions)?state.interactions:[]).slice(-150)){
    if(!x||x.undone||x.effectActive===false||String(x.matchId||'')!==String(room.matchId||'')||
      String(x.cycleKey||'')!==String(room.cycleKey||''))continue;
    const at=Date.parse(String(x.createdAt||x.resolvedAt||''));
    if(!Number.isFinite(at)||now-at>18000||at>now+10000)continue;
    const id=String(x.id||x.clientEventId||'').slice(0,120),
      target=member(x.loginId||x.targetId),kind=actionKind(x);
    if(!id||!target||!kind||seen.has(id))continue;
    seen.add(id);effects.push(Object.freeze({eventId:id,targetId:target,kind,
      expiresAt:Math.min(now+1500,at+18000)}));
  }
  return Object.freeze(effects.slice(-40));
}
function turnActors(step){
  const raw=[
    ...(Array.isArray(step.loginIds)?step.loginIds:[step.loginId]),
    ...(step.kind==='role-group'&&Array.isArray(step.roles)?
      step.roles.flatMap(r=>Array.isArray(r.loginIds)?r.loginIds:[r.loginId]):[])
  ];
  return Object.freeze([...new Set(raw.map(member).filter(Boolean))].slice(0,30));
}
export function projectAuthorizedGmCoreState(state,now=Date.now()){
  if(!state||state.ok!==true||!state.room||typeof state.room!=='object')return null;
  const room=state.room,matchId=String(room.matchId||''),cycleKey=String(room.cycleKey||'');
  if(!matchId||!cycleKey||room.phase!=='running')
    return Object.freeze({ok:true,matchId,cycleKey,effects:[],casting:null,nightControl:null,gallows:null});
  const effects=confirmedEffects(state,now);
  const night=room.cyclePhase==='night'&&state.nightRuntime;
  const rt=night?state.nightRuntime:null;
  const step=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;
  const actorIds=step?turnActors(step):[];
  const roles=step?.kind==='role-group'&&Array.isArray(step.roles)?step.roles:[];
  const owned=Array.isArray(state.assignments)?state.assignments:[];
  const availableActions=[];
  if(step&&actorIds.length){
    for(const actor of actorIds){
      const login=actor.slice(7);
      const match=owned.find(row=>String(row?.loginId||'')===login&&
        // Assignments come only from GM-authenticated Core state.
        // If a role was switched and no longer matches the current turn, refuse menu guesses.
        (roles.length?roles.some(r=>String(r.roleId||'')===String(row?.roleId||'')&&
          (r.loginIds||[r.loginId]).includes(login)):
          String(row?.roleId||'')===String(step.roleId||'')));
      if(!match?.roleCard)continue; // no guessed action IDs / metadata
      const artifactId=String(match.artifact?.artifactId||match.artifactId||'');
      const actions=privateTurnActionOptions({actorId:login,roleId:match.roleId,
        artifactId,card:match.roleCard,artifactCard:match.artifact?.artifactCard||match.artifactCard||null,
        turnActorIds:actorIds,matchOk:true});
      availableActions.push(...actions);
    }
  }
  const nightControl=rt?Object.freeze({
    complete:Boolean(rt.completed),turnId:step?String(step.id||''):null,
    actorIds,availableActions:Object.freeze(availableActions.slice(0,90)),
    roleId:step?String(step.roleId||''):null,
    label:String(step?.label||step?.kind||'Lượt đêm').slice(0,120),
    kind:String(step?.kind||'').slice(0,35),
    stepIndex:clamp(Number(rt.cursor)||0,0,999),totalSteps:clamp(rt.queue?.length||0,0,999)
  }):null;
  // Current actor staging cue is visual-only and contains no target or action
  // until an authoritative confirmed Core interaction exists.
  const casting=step&&actorIds.length?stageCastingCue({
    matchId,cycleKey,phase:'night',turnId:String(step.id||''),actorIds
  },now):null;
  const gallows=room.cyclePhase==='morning'&&state.gallows?
    Object.freeze({stage:String(state.gallows.stage||'ready'),mode:String(state.gallows.mode||'auto'),
      candidateId:state.gallows.candidateId||null,
      nominationTotals:(state.gallows.nominationTotals||[]).slice(0,30).map(x=>({
        loginId:String(x.loginId||'').slice(0,80),votes:Math.max(0,Number(x.votes)||0)})),
      voteTotals:{save:Math.max(0,Number(state.gallows.voteTotals?.save)||0),
        kill:Math.max(0,Number(state.gallows.voteTotals?.kill)||0)}}):null;
  return Object.freeze({ok:true,matchId,cycleKey,effects,casting,nightControl,gallows});
}
