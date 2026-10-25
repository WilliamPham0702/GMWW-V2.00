// Stage 10: art-only animation catalog. Role identity MUST come from authorized GM-private Core cues.
// No roles, secret targets or faction identities may be inferred from public room snapshots.
import {coreActionFamily} from './stage11-core-action-bridge.mjs';
import {arenaActionSignature} from './stage26-action-signatures.mjs';
export const STAGE10_VERSION='gmww.arena.role-animation.10';
const PROFILES=Object.freeze({
 wand:Object.freeze({motion:'wand-orbit',projectile:'arcane-ribbon',impact:'star-bloom',sound:'ritual_wand',color:'#b6a5ff'}),
 oracle:Object.freeze({motion:'wand-orbit',projectile:'oracle-ray',impact:'aura-ring',sound:'ritual_inspect',color:'#d6c2ff'}),
 wolf:Object.freeze({motion:'claw-charge',projectile:'spectral-wolf-head',impact:'wolf-bite',sound:'ritual_wolf_bite',color:'#73dfe9'}),
 shield:Object.freeze({motion:'raise-shield',projectile:'pearl-shield',impact:'shield-dome',sound:'ritual_shield',color:'#65ebdb'}),
 heal:Object.freeze({motion:'wand-orbit',projectile:'sea-lotus',impact:'healing-bloom',sound:'ritual_heal',color:'#80e9b1'}),
 attack:Object.freeze({motion:'hand-thrust',projectile:'lunar-spark',impact:'spark-burst',sound:'ritual_attack',color:'#ef99d1'}),
 vote:Object.freeze({motion:'hand-vote',projectile:'golden-sigil',impact:'vote-ring',sound:'ritual_vote',color:'#ffd889'}),
 scout:Object.freeze({motion:'point-scout',projectile:'sea-compass',impact:'target-ping',sound:'ritual_scout',color:'#92e5f4'}),
 curse:Object.freeze({motion:'curse-gesture',projectile:'shadow-rune',impact:'curse-ring',sound:'ritual_curse',color:'#bf9ef0'})
});
const roleGroups=Object.freeze({
 wolf:['wolf','werewolf','soi','soi-thuong','soi-tuyet','soi-lua','soi-chua','soi-con','alpha-wolf','snow-wolf','white-wolf'],
 oracle:['tien-tri','tien-tri-hao-quang','seer','aura-seer','prophet','prophet-aura','tien-tri-tap-su'],
 wand:['phu-thuy','witch','sorcerer','phap-su','phu-thuy-den','wizard','mage','yeu-tinh','elf'],
 shield:['bao-ve','guard','bodyguard','guardian','hiep-si','knight','protect'],
 scout:['tham-tu','detective','tracker','thay-boi','oracle-scout'],
 curse:['nguyen-rua','curse','voodoo','shaman'],
 attack:['tho-san','hunter','sat-thu','assassin','than-chet','death','serial-killer'],
 heal:['bac-si','doctor','healer','cupid','thien-than','angel']
});
const aliases=new Map(Object.entries(roleGroups).flatMap(([family,ids])=>ids.map(id=>[id,family])));
export const animationFamilies=Object.freeze(Object.keys(PROFILES));
export const animationRoleGroups=roleGroups;
const safeRoleId=x=>typeof x==='string'&&/^[a-z0-9_-]{1,64}$/i.test(x)?x.toLowerCase():'';
export function resolveRoleAnimation({kind='vote',roleId='',actionId='',authorizedFamily=''}={}){
 const role=safeRoleId(roleId),action=safeRoleId(actionId);
 // Core action takes priority for witch heal/kill, oracle inspect, and wolf bite.
 let family=coreActionFamily(action)||(Object.hasOwn(PROFILES,authorizedFamily)?authorizedFamily:null)||aliases.get(role)||({shield:'shield',inspect:'oracle',heal:'heal',attack:'attack',vote:'vote'}[kind]||'vote');
 // Built-ins use the canonical action, never a role-name guess. Each action
 // receives a distinct, deterministic visual accent without changing its
 // family or sound ID. Core-confirmed custom role/Artifact uses trusted family.
 if(coreActionFamily(action))return Object.freeze({
  family,...PROFILES[family],signature:arenaActionSignature({
   actionId:action,family,coreConfirmed:true})
 });
 if(action==='wolf-bite'||action==='bite')family='wolf';
 else if(action==='protect')family='shield';
 else if(action==='inspect'||action==='aura-inspect')family='oracle';
 else if(action==='heal'||action==='revive')family='heal';
 else if(action==='poison'||action==='kill')family=family==='wolf'?'wolf':'attack';
 else if(family==='wolf'&&kind!=='attack')family=({shield:'shield',inspect:'oracle',heal:'heal'}[kind]||family);
 else if(family==='wand'&&kind==='heal')family='heal';
 const profile=PROFILES[family]||PROFILES.vote;
 return Object.freeze({family,...profile,
  signature:authorizedFamily&&Object.hasOwn(PROFILES,authorizedFamily)?
   arenaActionSignature({actionId:action,family,coreConfirmed:true}):null});
}
export function authorizedAnimationCue(cue,{gmAuthorized=false}={}){
 if(!gmAuthorized||!cue?.cast)return null;
 const cast=cue.cast;
 if(typeof cast.actorId!=='string'||!Array.isArray(cast.targetIds))return null;
 return Object.freeze({actorId:cast.actorId,targetIds:cast.targetIds.slice(0,5),
  kind:cast.kind,startedAt:cast.startedAt,expiresAt:cast.expiresAt,
  profile:resolveRoleAnimation({kind:cast.kind,roleId:cast.roleId,actionId:cast.actionId,authorizedFamily:cast.visualFamily})});
}
export function animationMotion(profile,time,{reducedMotion=false}={}){
 const t=Number.isFinite(time)?time:0;
 const accent=profile?.signature;
 const wave=reducedMotion?0:Math.sin(t*.018*(accent?.gestureSpeed||1)+(accent?.orbitalPhase||0));
 return Object.freeze({armLift:profile?.motion==='wand-orbit'?.27+.18*wave:
  profile?.motion==='claw-charge'?.34+.12*wave:
  profile?.motion==='raise-shield'?.42:
  profile?.motion==='hand-thrust'?.34:.16,
  wristTurn:reducedMotion?0:Math.cos(t*.016)*.16,
  lowPower:reducedMotion});
}
export function animationAudioCue(profile,enabled=false){
 // IDs only. Audio URLs must be assigned in the sound library; never invent a recording.
 return enabled&&profile?.sound?Object.freeze({soundId:profile.sound}):null;
}
