/* GMWW role inheritance decisions are match-local, pure and private.
 * This file NEVER publishes copied role identities or accesses player accounts.
 */
const login=v=>String(v??'').toLowerCase().trim().replace(/^member:/,'');
const relevant=(rows,matchId)=>(Array.isArray(rows)?rows:[]).filter(x=>
  String(x?.matchId||'')===String(matchId));
export function inheritedRolePlans({assignments=[],interactions=[],matchId='',night=1,
  chooseIndex=length=>crypto.getRandomValues(new Uint32Array(1))[0]%length}={}){
  const n=Math.max(1,Number(night)||1),rows=Array.isArray(assignments)?assignments:[],
    events=relevant(interactions,matchId);
  const dead=new Set(events.filter(x=>x.type==='dead'&&x.effectActive!==false&&
    Number(x.night||0)<n).map(x=>login(x.loginId)).filter(Boolean));
  const assigned=id=>rows.find(r=>login(r?.loginId)===login(id));
  const allDead=rows.filter(r=>dead.has(login(r.loginId)));
  const out=[];
  for(const row of rows){
    const actorId=login(row.loginId),roleId=String(row.roleId||'');
    if(!actorId||dead.has(actorId))continue;
    if(roleId==='role_clone'&&n>=2){
      const chosen=events.find(x=>x.type==='effect_notice'&&x.actionId==='action_clone_target'&&
        Number(x.night)===1&&login(x.actorId)===actorId);
      const target=chosen&&assigned(chosen.loginId);
      if(target&&dead.has(login(target.loginId))&&login(target.loginId)!==actorId){
        out.push({kind:'clone',actorId,sourceId:login(target.loginId),
          sourceRoleId:String(target.roleId||''),fromRoleId:roleId,night:n});
      }
    }else if(roleId==='role_drunk'&&n===3){
      const candidates=allDead.filter(x=>login(x.loginId)!==actorId&&
        x.roleId!=='role_drunk'&&x.roleId!=='role_clone');
      const at=candidates.length?Math.max(0,Math.min(candidates.length-1,
        Math.trunc(Number(chooseIndex(candidates.length))||0))):-1;
      const picked=at>=0?candidates[at]:null;
      out.push({kind:'drunk',actorId,sourceId:picked?login(picked.loginId):null,
        sourceRoleId:picked?String(picked.roleId||''):'role_villager',fromRoleId:roleId,night:n});
    }
  }
  return out;
}
