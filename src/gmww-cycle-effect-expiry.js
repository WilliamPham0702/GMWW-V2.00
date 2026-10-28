/* GMWW FAST G3.3: deterministic cycle effect expiry policy.
 * Mutates only provided interaction rows (as the original DO code did).
 * Durable Object owns persistence, broadcasting, timing and transactions.
 */
export function expireCycleEffects(rows,{phase:p,night:n,cycleKey:key,matchId,statusDefs={},now}={}){
  const expired=[];
  if(!Array.isArray(rows))return expired;
  for(const x of rows){const type=String(x?.type||""),sameMatch=!x?.matchId||!matchId||String(x.matchId)===String(matchId);if(!sameMatch||x?.effectActive===false||!["frozen","expelled","status"].includes(type))continue;const effectNight=Math.max(0,Number(x?.night||0)||0);let shouldExpire=false,reason="";if(type==="frozen"){if(p==="morning"&&(effectNight===0||n===0||n>=effectNight)){shouldExpire=true;reason="MORNING_START"}else if(p==="night"&&effectNight>0&&n>effectNight){shouldExpire=true;reason="NEXT_NIGHT_SELF_HEAL"}}else if(type==="expelled"){if(p==="night"&&effectNight>0&&n>effectNight){shouldExpire=true;reason="NEXT_NIGHT_START"}else if(p==="night"&&effectNight===0&&x?.cycleKey&&String(x.cycleKey)!==key){shouldExpire=true;reason="NEXT_CYCLE_FALLBACK"}}if(type==="status"){const d=statusDefs[x.statusId]||{};if(x.statusId==="disabled_2n"&&x.activationPhase==="morning"){if(p==="morning"&&n>=effectNight+2){shouldExpire=true;reason="TWO_DAY_NIGHT_CYCLES_ELAPSED"}}else if(d.duration==="nights"&&p==="night"&&n>=effectNight+Number(d.nights||0)){shouldExpire=true;reason="NIGHTS_ELAPSED"}else if(d.duration==="morning"&&p==="morning"&&x.cycleKey&&String(x.cycleKey)!==key){shouldExpire=true;reason="MORNING"}}if(shouldExpire){x.effectActive=false;x.expiredAt=now;x.expiredReason=reason;expired.push({id:x.id,type,loginId:x.loginId,night:effectNight,reason})}}
  return expired;
}
