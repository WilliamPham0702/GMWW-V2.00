// Già Làng: GM-authoritative bell decisions, scoped to the current match and night.
// Effect-notice rows can be non-status/non-active; use their accepted receipts,
// not the visual status flag. Replays deduplicate the same actor/night.
const id=x=>String(x??'').trim().replace(/^member:/,'').toLowerCase();
export function resolveElderBell({assignments=[],interactions=[],matchId,night}={}){
  const match=String(matchId||''),cycle=Number(night);
  if(!match||!Number.isInteger(cycle)||cycle<1)return {blocked:false,spends:[]};
  const elders=new Set((Array.isArray(assignments)?assignments:[])
    .filter(x=>x?.roleId==='role_elder').map(x=>id(x.loginId)));
  const bells=(Array.isArray(interactions)?interactions:[]).filter(x=>
    String(x.matchId||'')===match&&x.type==='effect_notice'&&
    String(x.actionId||'')==='18'&&elders.has(id(x.actorId))&&
    Number(x.night)>0&&Number(x.night)<=cycle&&x.undone!==true&&
    x.noEffect!==true&&x.status!=='skipped')
    .sort((a,b)=>Number(a.night)-Number(b.night)||
      String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  const seen=new Set(),counts=new Map(),spends=[];
  for(const bell of bells){
    const actorId=id(bell.actorId),signature=actorId+':'+Number(bell.night);
    if(seen.has(signature))continue;seen.add(signature);
    const used=counts.get(actorId)||0;
    if(Number(bell.night)>4||used>=2)continue;
    counts.set(actorId,used+1);
    if(Number(bell.night)===cycle)spends.push({actorId,livesRemaining:1-used,
      exhausted:used+1===2});
  }
  return {blocked:spends.length>0,spends};
}
