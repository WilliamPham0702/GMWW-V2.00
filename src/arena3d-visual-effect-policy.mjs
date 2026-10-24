// Strict GM-only visual projection. Called inside an authorized staging Durable Object.
// No actor identity, role, faction, ballot receipt or individual vote is projected.
// The public 3D renderer uses only already-public status tags + aggregate tally.
const ACTION_TO_VISUAL=Object.freeze({
  action_protect:'shield',action_guard:'shield',
  action_witch_save:'heal',action_witch_heal:'heal',action_revive:'heal',
  action_witch_kill:'attack',action_wolf_bite:'attack',action_poison:'attack',
  action_prophet:'inspect',action_prophet_inspect:'inspect',action_seer:'inspect',
  action_inspect:'inspect'
});
const TYPE_TO_VISUAL=Object.freeze({
  protected:'shield',revive:'heal',dead:'attack',expelled:'attack',wolf_bitten:'attack',
  frozen:'attack'
});
const safe=s=>String(s||'').slice(0,120);
export function projectGmOnlyVisuals(interactions,{matchId,cycleKey,now=Date.now()}={}){
  if(!Array.isArray(interactions)||!matchId||!cycleKey)return [];
  const out=[],seen=new Set();
  for(const row of interactions.slice(-150)){
    if(!row||row.effectActive===false||row.undone===true)continue;
    if(String(row.matchId||'')!==String(matchId)||String(row.cycleKey||'')!==String(cycleKey))continue;
    const created=Date.parse(String(row.createdAt||row.resolvedAt||''));
    if(!Number.isFinite(created)||created>now+10000||now-created>18000)continue;
    const kind=ACTION_TO_VISUAL[String(row.actionId||'')]||TYPE_TO_VISUAL[String(row.type||'')];
    const login=safe(row.loginId||row.targetId);
    if(!kind||!login||!(/^[A-Za-z0-9_.-]{1,60}$/.test(login)))continue;
    const id=safe(row.id||row.clientEventId);
    if(!id||seen.has(id))continue;seen.add(id);
    out.push({eventId:id,targetId:'member:'+login,kind,
      // End time is tightly bounded; no historical replay of secret night actions.
      expiresAt:Math.min(now+1500,created+18000)});
  }
  return out.slice(-40);
}

// Staging Core V2 currently broadcasts a generic confirmation with raw night targets.
// Keep the fact of a confirmation without its private targets for public WebSocket viewers.
export function redactStagingPublicBroadcast(payload){
  if(!payload||typeof payload!=='object')return payload;
  // V2 night_turn and room_cycle contain runtime queues/role assignments. These
  // broadcasts go to ALL Player Web sockets, not only GM — never leak runtime.
  if(payload.type==='night_turn'){
    const {runtime,nightRuntime,queue,recognitionIds,roles,loginIds,...safe}=payload;
    return safe;
  }
  if(payload.type==='room_cycle'){
    const {runtime,nightRuntime,queue,recognitionIds,roles,loginIds,...safe}=payload;
    return safe;
  }
  if(['battle_action_confirmed','battle_action_undone','battle_action_reverted'].includes(payload.type)){
    const {targets,targetIds,revealTargetIds,revealTargetId,actorId,roleName,roleId,
      artifactId,loginId,actionId,actionNonce,...safe}=payload;
    return safe;
  }
  return payload;
}
