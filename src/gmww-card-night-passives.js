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

export function apprenticeSeersDue({assignments=[],interactions=[],matchId,night,initialSeerCount}={}){
  const n=Number(night),original=Number(initialSeerCount);
  if(!Number.isInteger(n)||n<1||!Number.isInteger(original)||original<0)return [];
  const rows=matchRows(interactions,matchId),dead=deadIds(rows);
  const seers=(Array.isArray(assignments)?assignments:[]).filter(x=>x.roleId==='role_seer');
  if(seers.some(a=>!dead.has(id(a.loginId))))return [];
  // Seers who died tonight cannot be replaced until the next night.
  if(original>0&&(n===1||rows.filter(x=>x.type==='dead'&&
    seers.some(a=>id(a.loginId)===id(x.loginId))).some(x=>Number(x.night)>=n)))return [];
  return (Array.isArray(assignments)?assignments:[])
    .filter(a=>a.roleId==='role_apprentice_seer'&&!dead.has(id(a.loginId)))
    .map(a=>id(a.loginId));
}

export function bigfootWolfDue({assignments=[],interactions=[],matchId,night}={}){
  if(Number(night)!==2)return [];
  const hadExecution=matchRows(interactions,matchId).some(x=>
    x.type==='dead'&&x.source==='gallows'&&Number(x.night)===1);
  if(hadExecution)return [];
  const dead=deadIds(matchRows(interactions,matchId));
  return (Array.isArray(assignments)?assignments:[])
    .filter(a=>a.roleId==='role_bigfoot'&&!dead.has(id(a.loginId))).map(a=>id(a.loginId));
}
export function factionRoleTransitionsDue({assignments=[],interactions=[],matchId,night}={}){
  const n=Number(night),rows=matchRows(interactions,matchId),dead=deadIds(rows);
  const result=[];
  for(const a of Array.isArray(assignments)?assignments:[]){
    const loginId=id(a.loginId);if(!loginId||dead.has(loginId))continue;
    if(a.roleId==='role_hybrid_wolf'&&n>=5&&
      !['village','villager'].includes(String(a.faction||a.factionId||'')))
      result.push({loginId,toFaction:'village',reason:'HYBRID_NIGHT_FIVE'});
    if(a.roleId==='role_wild_child'&&n>=2&&
      String(a.faction||a.factionId||'')==='village'){
      const mark=rows.filter(x=>x.actionId==='action-wild-child-idol'&&
        id(x.actorId)===loginId&&x.type==='effect_notice'&&x.undone!==true)
        .sort((x,y)=>String(x.createdAt||'').localeCompare(String(y.createdAt||''))).at(-1);
      if(mark&&rows.some(x=>x.type==='dead'&&id(x.loginId)===id(mark.loginId)&&
        Number(x.night)<n))
        result.push({loginId,toFaction:'wolf',reason:'WILD_CHILD_IDOL_DIED'});
    }
  }
  return result;
}
export function activePackAtNight({assignments=[],interactions=[],matchId,night}={}){
  const n=Number(night),rows=matchRows(interactions,matchId),dead=deadIds(rows);
  const living=(Array.isArray(assignments)?assignments:[]).filter(a=>
    !dead.has(id(a.loginId))&&id(a.loginId)&&
    (String(a.faction||a.factionId||a.roleCard?.factionId||'').toLowerCase()==='wolf'||
     (!String(a.faction||a.factionId||'')&&/wolf/.test(a.roleId||''))));
  const others= living.filter(x=>x.roleId!=='role_lycan');
  const lastOtherDeath=rows.filter(x=>x.type==='dead'&&
    (Array.isArray(assignments)?assignments:[]).some(a=>a.roleId!=='role_lycan'&&
      String(a.faction||a.factionId||'')==='wolf'&&id(a.loginId)===id(x.loginId)))
    .reduce((m,x)=>Math.max(m,Number(x.night)||0),0);
  return living.filter(x=>
    (x.roleId!=='role_lone_wolf'||n>=3)&&
    (x.roleId!=='role_lycan'||others.length===0&&lastOtherDeath<n));
}
