// Stage 11: RESEARCH-only renderer bridge from real GMWW built-in Core action IDs.
// Classifications are VISUAL MOTIFS, never gameplay rules or death outcomes.
// Unknown custom role/artifact actions must fail safely to no secret animation.
import {CORE_ACTION_CATALOG,CORE_ROLE_CATALOG} from './stage11-core-catalog.mjs';
export const STAGE11_VERSION='gmww.arena.core-action-bridge.11';
export const CORE_ACTION_FAMILY=Object.freeze({
 action_exile:'curse',action_revive:'heal',action_transfer_bite:'wand',
 action_assassin_mark:'attack',action_visit_house:'scout',action_snow_wolf_freeze:'curse',
 action_wolf_bite:'wolf',action_protect:'shield',action_witch_save:'heal',
 action_witch_kill:'attack',action_hunt:'attack',action_compare_faction:'oracle',
 action_drunk_draw:'wand',action_stab:'attack',action_scan_three:'oracle',
 action_find_seer:'oracle',action_hunter_mark:'attack',action_seer:'oracle',
 action_destroyer_scry:'oracle',action_destroyer_kill:'attack',
 action_clone_target:'scout',action_aura_read:'oracle',
 action_knight_last_strike:'attack',action_fox_scan:'oracle',
 action_bear_scan:'oracle',action_thief_change_role:'wand'
});
const FAMILY_TO_BASE=Object.freeze({
 curse:'attack',wolf:'attack',attack:'attack',
 heal:'heal',shield:'shield',wand:'inspect',oracle:'inspect',scout:'inspect'
});
export const isCanonicalCoreAction=id=>typeof id==='string'&&Object.hasOwn(CORE_ACTION_FAMILY,id);
export function coreActionFamily(actionId){
 return isCanonicalCoreAction(actionId)?CORE_ACTION_FAMILY[actionId]:null;
}
export function coreCastingKind(actionId){
 const family=coreActionFamily(actionId);
 return family?FAMILY_TO_BASE[family]||null:null;
}
export function coreRoleForActor(nightControl,actorId){
 if(!nightControl||typeof actorId!=='string')return '';
 const member='member:'+actorId;
 const group=Array.isArray(nightControl.roles)
  ?nightControl.roles.find(r=>Array.isArray(r.actorIds)&&r.actorIds.includes(member))
  :null;
 const role=group?.roleId||(Array.isArray(nightControl.actorIds)&&nightControl.actorIds.includes(member)?nightControl.roleId:'');
 return typeof role==='string'&&CORE_ROLE_CATALOG.some(r=>r.id===role)?role:'';
}
export function catalogAnimationCoverage(){
 const ids=new Set(CORE_ACTION_CATALOG.map(x=>x.id));
 return Object.freeze({roles:CORE_ROLE_CATALOG.length,actions:ids.size,
  mapped:[...ids].filter(isCanonicalCoreAction).length,
  unmapped:[...ids].filter(x=>!isCanonicalCoreAction(x)),
  customArtifactActions:'requires-authorized-Core-metadata'});
}
