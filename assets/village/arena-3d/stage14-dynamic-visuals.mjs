// Arena 3D GĐ14 — visual-only mapping of GM-private, Core-CONFIRMED custom actions.
// Never infer a role, owner, faction or target from public Player Web snapshots.
// A custom action is eligible ONLY when present in the assigned private role or
// currently owned Artifact for the SAME match, and Core already returned ok=true.
import {coreActionFamily} from './stage11-core-action-bridge.mjs';
export const STAGE14_VERSION='gmww.arena.dynamic-visuals.14';
export const VISUAL_FAMILIES=Object.freeze(['wolf','oracle','wand','shield','heal','attack','vote','scout','curse']);
const FAMILY=new Set(VISUAL_FAMILIES);
const EFFECT_FAMILY=Object.freeze({
 effect_wolf_bite:'wolf',effect_snow_wolf_freeze:'curse',
 effect_protected:'shield',effect_witch_save:'heal',effect_revive:'heal',
 effect_heal:'heal',effect_kill:'attack',effect_destroyer_kill:'attack',
 effect_stab:'attack',effect_knight_last_strike:'attack',
 effect_seer:'oracle',effect_aura_read:'oracle',effect_destroyer_scry:'oracle',
 effect_scan_three:'oracle',effect_find_seer:'oracle',effect_fox_scan:'oracle',
 effect_bear_scan:'oracle',effect_compare_faction:'oracle',
 effect_exile:'curse',effect_assassin_mark:'curse',
 effect_transfer_bite:'wand',effect_drunk_draw:'wand',
 effect_thief_change_role:'wand',effect_clone_watch:'scout',
 effect_visit_house:'scout',effect_hunter_mark:'attack'
});
const KIND=Object.freeze({
 wolf:'attack',attack:'attack',curse:'attack',oracle:'inspect',
 scout:'inspect',wand:'inspect',shield:'shield',heal:'heal',vote:'vote'
});
const TYPE=Object.freeze({
 frozen:'curse',expelled:'curse',dead:'attack',assassin_mark:'curse',
 revive:'heal',thumb_vote:'vote',effect_notice:'wand',clear_state:'wand'
});
const ID=/^[a-z0-9._-]{1,120}$/i;
const normalize=id=>typeof id==='string'&&ID.test(id)?id:'';
const actions=card=>[...(Array.isArray(card?.functions)?card.functions:[]),
 ...(Array.isArray(card?.actions)?card.actions:[])];
export function confirmedCustomVisual({actorId,matchId,actionId,roleId='',artifactId='',
 privateRoles=[],ownedArtifact=null,phase='night',actionType=''}={}){
 const actor=normalize(actorId),match=normalize(matchId),action=normalize(actionId);
 if(!actor||!match||!action)return null;
 // Custom role names or IDs can never override a known Core-action animation.
 const builtin=coreActionFamily(action);
 if(builtin)return Object.freeze({actionId:action,roleId:normalize(roleId),
  visualFamily:builtin,kind:KIND[builtin]});
 let card=null,verifiedRole='',verifiedArtifact='';
 if(artifactId){
  const aid=normalize(artifactId),owned=ownedArtifact;
  if(!aid||!owned||String(owned.artifactId)!==aid||
     String(owned.loginId||actor)!==actor||
     (owned.matchId&&String(owned.matchId)!==match))return null;
  verifiedArtifact=aid;card=owned.artifactCard;
 }else{
  const rid=normalize(roleId);
  const row=(Array.isArray(privateRoles)?privateRoles:[]).find(x=>
    String(x?.roleId)===rid&&(!x.matchId||String(x.matchId)===match)&&
    String(x.loginId||actor)===actor);
  if(!rid||!row)return null;
  verifiedRole=rid;card=row.roleCard;
 }
 const fn=actions(card).find(f=>normalize(String(f?.actionId||f?.id||''))===action &&
   (f.phase==null||f.phase===''||f.phase==='any'||f.phase===phase||
    (phase==='morning'&&f.phase==='day')));
 if(!fn||fn.passive===true)return null;
 const declared=Array.isArray(fn.effectIds)?fn.effectIds:[];
 // Only strict, enumerated Core effect IDs. Never match player-provided names,
 // descriptions, URLs, or unconstrained strings to prevent fake wolf/role claims.
 const first=declared.map(x=>EFFECT_FAMILY[normalize(x)]).find(Boolean);
 const family=first||TYPE[actionType]||'wand';
 if(!FAMILY.has(family))return null;
 return Object.freeze({actionId:action,roleId:verifiedRole,artifactId:verifiedArtifact,
  visualFamily:family,kind:KIND[family]});
}
export function safePrivateVisualFamily(value){
 return typeof value==='string'&&FAMILY.has(value)?value:'';
}
