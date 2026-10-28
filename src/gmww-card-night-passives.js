// Server-authoritative passive roles. Each calculation uses only receipts from
// the current match; the caller persists stable event IDs before publishing.
const id=x=>String(x??'').trim().toLowerCase().replace(/^member:/,'');
const matchRows=(rows,matchId)=>(Array.isArray(rows)?rows:[]).filter(x=>
  String(x?.matchId||'')===String(matchId||'')&&x?.effectActive!==false);
const deadIds=rows=>new Set(rows.filter(x=>x.type==='dead').map(x=>id(x.loginId)));
export function resolvePassiveWolfBite({resolution,assignments=[],interactions=[],matchId}={}){
  if(!resolution?.ok)return {victims:[],cursed:[],stoneAbsorbed:[]};
  const current=new Map((Array.isArray(assignments)?assignments:[]).map(x=>[id(x.loginId),x]));
  const existing=matchRows(interactions,matchId);
  const spentStone=new Set(existing.filter(x=>x.actionId==='action_stone_wolf_life').map(x=>id(x.loginId)));
  const targetDeaths=deadIds(existing),victims=[],cursed=[],stoneAbsorbed=[];
  for(const source of resolution.victims||[]){
    const loginId=id(source),assigned=current.get(loginId);
    if(!assigned||targetDeaths.has(loginId))continue;
    if(assigned.roleId==='role_cursed'){cursed.push(loginId);continue}
    if(assigned.roleId==='role_stone_wolf'&&!spentStone.has(loginId)){
      stoneAbsorbed.push(loginId);continue;
    }
    victims.push(loginId);
  }
  return {victims,cursed,stoneAbsorbed};
}
export function wolfCubBiteQuota({assignments=[],interactions=[],matchId,night}={}){
  const n=Number(night);
  if(!Number.isInteger(n)||n<=1)return 1;
  const cubs=new Set((Array.isArray(assignments)?assignments:[])
    .filter(a=>a.roleId==='role_wolf_cub').map(a=>id(a.loginId)));
  const died=matchRows(interactions,matchId).some(x=>x.type==='dead'&&
    cubs.has(id(x.loginId))&&Number(x.night)===n-1);
  return died?2:1;
}
export function oldManAgeVictims({assignments=[],interactions=[],matchId,night,initialWolfCount}={}){
  const n=Number(night),wolves=Number(initialWolfCount);
  if(!Number.isInteger(n)||!Number.isInteger(wolves)||wolves<0||n!==wolves+1)return [];
  const rows=matchRows(interactions,matchId),alreadyDead=deadIds(rows),
    aged=new Set(rows.filter(x=>x.actionId==='action-old-man-lifespan').map(x=>id(x.loginId)));
  return (Array.isArray(assignments)?assignments:[])
    .filter(a=>a.roleId==='role_old_man'&&!alreadyDead.has(id(a.loginId))&&!aged.has(id(a.loginId)))
    .map(a=>id(a.loginId));
}
export function cursedConversionsDue({assignments=[],interactions=[],matchId,night}={}){
  const n=Number(night),rows=matchRows(interactions,matchId),dead=deadIds(rows);
  return (Array.isArray(assignments)?assignments:[])
    .filter(a=>a.roleId==='role_cursed'&&!dead.has(id(a.loginId))&&
      rows.some(x=>x.actionId==='action_cursed_bite'&&id(x.loginId)===id(a.loginId)&&Number(x.night)<n))
    .map(a=>id(a.loginId));
}
