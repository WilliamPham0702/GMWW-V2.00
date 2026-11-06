/* GMWW — Kẻ Trộm: từ Đêm 3 chọn 1 lá trong bộ bài (63 vai trò) để đổi hoặc giữ nguyên; quyết định đúng 1 lần/ván. */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
export const THIEF_FROM_NIGHT=3;
export function thiefPool(catalog=[],{excludeRoleIds=['role_thief']}={}){
  const seen=new Set(),out=[];
  for(const c of Array.isArray(catalog)?catalog:[]){
    const id=String(c?.roleId||'').trim();
    if(!id||!id.startsWith('role_')||id.startsWith('role:')||seen.has(id)||excludeRoleIds.includes(id)||!c.roleCard)continue;
    seen.add(id);out.push({id,roleId:id,roleName:String(c.roleName||c.roleCard?.name||id)});
  }
  return out.sort((a,b)=>a.roleName.localeCompare(b.roleName,'vi'));
}
export function thiefCanChoose({assignments=[],actorId='',night=0,existingChoice=null}={}){
  const id=login(actorId);
  if(Number(night)<THIEF_FROM_NIGHT)return {ok:false,error:'THIEF_TOO_EARLY'};
  if(existingChoice)return {ok:false,error:'THIEF_ALREADY_DECIDED'};
  if(!(Array.isArray(assignments)?assignments:[]).some(a=>login(a?.loginId)===id&&a.roleId==='role_thief'))return {ok:false,error:'THIEF_ROLE_NOT_OWNED'};
  return {ok:true};
}
export function thiefDeckView(pool,choice,{matchId='',night=0}={}){
  return {matchId:String(matchId),night:Number(night),kind:'thief',status:choice?'done':'pending',canKeep:true,
    cards:choice?[]:pool.map(c=>({id:c.id,roleName:c.roleName}))};
}
export function thiefPlan({actorId,roleId,night}){
  return {kind:'thief',actorId:login(actorId),sourceId:null,sourceRoleId:'',targetRoleId:String(roleId),fromRoleId:'role_thief',night:Number(night)};
}
