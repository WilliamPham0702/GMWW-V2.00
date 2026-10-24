// GMWW Arena 3D final-staging acceptance scenario.
// Stage-only fixed roles for testing the *real* Core night queue and GM actions.
// Not a replacement for the production rule engine or an automatic win condition.
export const ARENA_SCENARIO_VERSION='arena-e2e-roles.v1';
const ROLES=Object.freeze([
  {id:'role_guard',name:'Bảo Vệ',faction:'village',order:1,actionId:'action_protect',type:'effect_notice',kind:'shield'},
  {id:'role_prophet',name:'Tiên Tri',faction:'village',order:2,actionId:'action_prophet',type:'effect_notice',kind:'inspect'},
  {id:'role_witch',name:'Phù Thủy',faction:'village',order:3,actionId:'action_witch_save',type:'effect_notice',kind:'heal'},
  {id:'role_wolf',name:'Ma Sói',faction:'wolf',order:4,actionId:'action_wolf_bite',type:'effect_notice',kind:'attack'}
]);
export function createArenaTrialConfig(playerCount){
  const n=Number(playerCount);
  if(!Number.isInteger(n)||n<6||n>30)throw new RangeError('Số người thử phải từ 6 đến 30');
  const roleSlots=[...ROLES,{id:'role_villager',name:'Dân Làng',faction:'village',order:5}];
  return {id:'arena-acceptance-e2e',name:'Arena 3D — Kiểm thử Core thật',
    playerCount:n,
    roles:roleSlots.map((role,i)=>({
      roleId:role.id,roleName:role.name,faction:role.faction,order:role.order,
      actionDurationSec:i===4?0:45,count:i===4?n-ROLES.length:1
    })),
    artifactsEnabled:false,timing:{autoAdvance:false,defaultActionSec:45,
      wolfDiscussionSec:0,earlyArtifactSec:0,gallowsNominationSec:50,gallowsVoteSec:50}
  };
}
export function createArenaTrialAssignments(ids,matchId){
  if(!Array.isArray(ids)||ids.length<6||ids.length>30||new Set(ids).size!==ids.length)
    throw new RangeError('Cần 6–30 mã người chơi duy nhất');
  return ids.map((loginId,i)=>{
    const r=ROLES[i]||{id:'role_villager',name:'Dân Làng',faction:'village',order:5};
    const acts=r.actionId?[{id:r.actionId,actionId:r.actionId,label:r.name,usageMode:'eachNight'}]:[];
    return {loginId:String(loginId),roleId:r.id,roleName:r.name,faction:r.faction,order:r.order,
      roleCard:{name:r.name,faction:r.faction,functions:acts,actions:acts,
        information:'Chỉ dùng thử chức năng trong Arena 3D STAGING.'}};
  });
}
export function stagingRoleAction(roleId){
  const row=ROLES.find(r=>r.id===roleId);
  return row?{actionId:row.actionId,type:row.type,kind:row.kind}:null;
}
export const ARENA_TRIAL_ROLE_COUNT=ROLES.length;
