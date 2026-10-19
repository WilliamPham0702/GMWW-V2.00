/* GMWW FAST G3.2: shared, pure actor effect-eligibility policy.
 * Behavior-preserving extraction from Durable Object confirmation handler.
 */
const loginId=value=>String(value||'').trim().toLowerCase();
export function isBattleActorBlocked(rows,{actorId,matchId,statusDefs={}}={}){
  const actor=loginId(actorId),match=String(matchId||'');
  return (Array.isArray(rows)?rows:[]).some(row=>
    loginId(row?.loginId)===actor&&row?.effectActive!==false&&
    (!row?.matchId||String(row.matchId)===match)&&
    (['frozen','dead'].includes(String(row?.type||''))||
      (row?.type==='status'&&statusDefs[row?.statusId]?.blocks===true))
  );
}
