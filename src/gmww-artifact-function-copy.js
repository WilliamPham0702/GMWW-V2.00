// Tráng Gương (#23) — a verified subset of copied DAY powers.
// Never add a power whose effect engine is not capable of executing it.
// Extended source-role dispatch and Night-stage copies need separate acceptance.
const login=x=>String(x??'').trim().toLowerCase().replace(/^member:/,'');
const SUPPORTED=new Set(['role_thug:action_stab']);
export function planDayFunctionCopy({assignments=[],actorId,targetId,actorRoles=[],targetRoles=[],now}={}){
 const actor=login(actorId),target=login(targetId);
 if(!actor||!target||actor===target)return {ok:false,error:'COPY_FUNCTION_INVALID_TARGET'};
 const owners=assignments.filter(x=>login(x.loginId)===actor),
   donors=assignments.filter(x=>login(x.loginId)===target);
 if(owners.length!==1||donors.length!==1)
  return {ok:false,error:'COPY_FUNCTION_SINGLE_ROLE_REQUIRED'};
 const owned=actorRoles.find(r=>String(r.roleId)===String(owners[0].roleId)),
   donor=targetRoles.find(r=>String(r.roleId)===String(donors[0].roleId));
 if(!owned?.roleCard||!donor?.roleCard)
  return {ok:false,error:'COPY_FUNCTION_PRIVATE_ROLE_MISSING'};
 const current=Array.isArray(owned.roleCard.functions)?owned.roleCard.functions:[],
   source=(Array.isArray(donor.roleCard.functions)?donor.roleCard.functions:[])
    .filter(fn=>fn&&!fn.passive&&['day','any','both'].includes(String(fn.phase||''))&&
      SUPPORTED.has(String(donor.roleId)+':'+String(fn.actionId||'')));
 if(current.length!==1||source.length!==1||
   current.some(fn=>String(fn.actionId||'')===String(source[0]?.actionId||'')))
  return {ok:false,error:'COPY_FUNCTION_NOT_EXECUTABLE'};
 const fn={...source[0],id:'copied:'+String(source[0].id||source[0].actionId),
  copiedFromRoleId:String(donor.roleId),copiedFromLoginId:target,
  name:'Đâm (Tráng Gương)',usageMode:'onceGame',usageCount:1};
 const result={...owned,roleCard:{...owned.roleCard,
  functions:[...current,fn]},deliveredAt:now,viewedAt:null};
 return {ok:true,roles:actorRoles.map(x=>x===owned?result:x),
  copiedActionId:fn.actionId,copiedFromRoleId:donor.roleId};
}
