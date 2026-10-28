// GMWW Arena 3D GĐ14: trusted role/Artifact VFX selection AFTER Core V2 accepts an action.
// No player/room public data, role names or arbitrary text may select secret VFX.
import {coreActionFamily,coreCastingKind} from './stage11-core-action-bridge.mjs';
export const STAGE14_VERSION='gmww.arena.dynamic-actions.14';
export const SAFE_ACTION_ID=/^[A-Za-z0-9_.-]{1,80}$/;
export const ARENA_FAMILIES=Object.freeze(['wand','oracle','wolf','shield','heal','attack','vote','scout','curse']);
const familyKinds=Object.freeze({wand:'inspect',oracle:'inspect',wolf:'attack',shield:'shield',
  heal:'heal',attack:'attack',vote:'vote',scout:'inspect',curse:'attack'});
const TYPE_FAMILY=Object.freeze({frozen:'curse',expelled:'curse',dead:'attack',
  assassin_mark:'attack',revive:'heal',clear_state:'heal',thumb_vote:'vote',
  effect_notice:'scout'});
const EFFECT_FAMILY=Object.freeze({
 effect_protected:'shield',effect_guard:'shield',effect_witch_save:'heal',
 effect_revive:'heal',effect_heal:'heal',effect_wolf_bite:'wolf',
 effect_snow_wolf_freeze:'curse',effect_exile:'curse',effect_kill:'attack',
 effect_seer:'oracle',effect_aura_read:'oracle',effect_fox_scan:'oracle',
 effect_bear_scan:'oracle',effect_inspect:'oracle',effect_hunted_death:'attack',
 effect_stab:'attack',effect_thief_change_role:'wand',
 effect_destroyer_kill:'attack',effect_knight_last_strike:'attack',
 effect_destroyer_scry:'oracle',effect_scan_three:'oracle',
 effect_find_seer:'oracle',effect_compare_faction:'oracle',
 effect_assassin_mark:'curse',effect_transfer_bite:'wand',
 effect_drunk_draw:'wand',effect_clone_watch:'scout',
 effect_visit_house:'scout',effect_hunter_mark:'attack'
});
const checked=x=>typeof x==='string'&&SAFE_ACTION_ID.test(x)?x:'';
export function matchConfiguredAction(card,actionId){
 const id=checked(actionId);
 if(!id||!card||typeof card!=='object')return null;
 const entries=[...(Array.isArray(card.functions)?card.functions:[]),
   ...(Array.isArray(card.actions)?card.actions:[])];
 const fn=entries.find(x=>x&&checked(String(x.actionId||x.id||''))===id);
 return fn||null;
}
export function familyForConfirmedAction({actionId='',type='',card=null,effectId='',stagingFamily=''}={}){
 const id=checked(actionId);
 if(!id)return null;
 const canonical=coreActionFamily(id);
 if(canonical)return Object.freeze({actionId:id,family:canonical,kind:coreCastingKind(id),confirmedBy:'core-catalog'});
 const fn=matchConfiguredAction(card,id);
 if(!fn)return null; // Do not guess unconfigured/custom role actions from request text.
 const requested=String(fn.arenaVfxFamily||fn.vfxFamily||'');
 const explicit=ARENA_FAMILIES.includes(stagingFamily)?stagingFamily:
   ARENA_FAMILIES.includes(requested)?requested:null;
 const effects=[...(Array.isArray(fn.effectIds)?fn.effectIds:[]),effectId].filter(Boolean);
 const byEffect=effects.map(x=>EFFECT_FAMILY[String(x)]).find(Boolean);
 const family=explicit||byEffect||TYPE_FAMILY[String(type)]||'scout';
 return Object.freeze({actionId:id,family,kind:familyKinds[family],confirmedBy:'core-configured'});
}
export function stageAuthorizedRoleId(control,actorId){
 const id=checked(actorId),member=id&&'member:'+id;
 if(!member||!control)return '';
 const role=Array.isArray(control.roles)?
   control.roles.find(r=>Array.isArray(r.actorIds)&&r.actorIds.includes(member))?.roleId:null;
 const fallback=Array.isArray(control.actorIds)&&control.actorIds.includes(member)?control.roleId:'';
 return checked(role||fallback);
}
export function verifiedPrivateCard({actorId='',roleId='',artifactId='',roles=[],artifact=null,matchId=''}={}){
 const rid=checked(roleId),aid=checked(artifactId),actor=checked(actorId);
 if(!actor)return null;
 if(aid){
  if(!artifact||String(artifact.artifactId)!==aid||String(artifact.loginId||actor)!==actor||
    artifact.matchId&&String(artifact.matchId)!==String(matchId))return null;
  return artifact.artifactCard||null;
 }
 if(!rid||!Array.isArray(roles))return null;
 const row=roles.find(x=>x&&String(x.loginId||actor)===actor&&String(x.roleId)===rid&&
   (!x.matchId||String(x.matchId)===String(matchId)));
 return row?.roleCard||null;
}

/**
 * Snapshot only the visual family from the GM's Core-confirmed assignment
 * BEFORE the Core strips visual-only custom Artifact metadata. The stored
 * artifact action must still be present on the DELIVERED private card.
 * Stage-only Durable Object storage, scoped by match, never broadcast.
 */
export function artifactVisualSnapshot(rows,ownedArtifacts,{matchId=''}={}){
 const out=Object.create(null);
 for(const row of (Array.isArray(rows)?rows:[]).slice(0,30)){
  const loginId=checked(String(row?.loginId||'')),raw=row?.artifact||
   (row?.artifactId?{artifactId:row.artifactId,artifactCard:row.artifactCard}:null);
  const artifactId=checked(String(raw?.artifactId||raw?.id||''));
  if(!loginId||!artifactId)continue;
  const owned=ownedArtifacts?.[loginId],card=owned?.artifactCard;
  if(!card||String(owned.artifactId)!==artifactId||String(owned.matchId)!==String(matchId))continue;
  const input=raw?.artifactCard||{},incoming=[...(input.functions||[]),...(input.actions||[])];
  for(const fn of incoming.slice(0,40)){
   const id=checked(String(fn?.actionId||fn?.id||''));
   if(!id||!matchConfiguredAction(card,id))continue;
   const visual=familyForConfirmedAction({actionId:id,card:{functions:[fn]},type:'effect_notice'});
   if(visual&&!(loginId+':'+artifactId+':'+id in out))
     out[loginId+':'+artifactId+':'+id]=visual.family;
  }
 }
 return out;
}

/** A successful Core undo can revoke only the visual from that exact match/cycle/action. */
export function shouldRevokeVisualAfterUndo(saved,{matchId='',cycleKey='',undoToken=''}={}){
 return Boolean(saved&&typeof saved.undoToken==='string'&&saved.undoToken&&
   typeof undoToken==='string'&&undoToken&&
   saved.matchId===String(matchId)&&saved.cycleKey===String(cycleKey)&&
   saved.undoToken===undoToken);
}
