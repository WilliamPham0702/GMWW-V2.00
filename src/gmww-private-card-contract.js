// GMWW FAST G3.5 — authoritative sanitized Player Web Role/Artifact DTOs.
// Functions lifted unchanged from the production Worker: no persisted schema changes.
import { defaultPriorityFirst } from "./gmww-game-scene-rules.js";

function functionRuleFields(fn){
  const out={};
  for(const key of ['noTarget','passive','allowConsecutive','targetPreviousCycleOnly','pushToPlayerWeb','systemRequired','usesPackBite','requiresNoOtherLivingWolf','actorMayBeDead','allowFriendlyFaction','replacesWolfBite'])
    if(typeof fn?.[key]==='boolean')out[key]=fn[key];
  for(const key of ['cooldownNights','perUserLimit'])
    if(fn?.[key]!=null)out[key]=Math.max(0,Math.min(100,Math.trunc(Number(fn[key])||0)));
  if(fn?.activation!=null)out.activation=String(fn.activation).slice(0,160);
  return out;
}
export function sanitizePlayerArtifactCard(v){
  const x=(v&&typeof v==="object")?v:{},actions=Array.isArray(x.actions)?x.actions.slice(0,40).map(a=>({id:String(a?.id||"").slice(0,120),name:String(a?.name||"Hành Động").slice(0,160),description:String(a?.description||"").slice(0,3000),limits:a?.limits??null,...(a?.targetCount!==undefined&&a?.targetCount!==null&&Number.isInteger(Number(a.targetCount))&&Number(a.targetCount)>=0&&Number(a.targetCount)<=30?{targetCount:Number(a.targetCount)}:{}),...(typeof a?.noSelf==="boolean"?{noSelf:a.noSelf}:{}),...(typeof a?.allowDead==="boolean"?{allowDead:a.allowDead}:{}),...(a?.phase!=null?{phase:['day','night','any'].includes(String(a.phase))?String(a.phase):'night'}:{}),...(a?.actorMayBeDead!=null?{actorMayBeDead:a.actorMayBeDead===true}:{})})):[];
  const functions=Array.isArray(x.functions)?x.functions.slice(0,40).map(fn=>({
    ...functionRuleFields(fn),id:String(fn?.id||fn?.actionId||"").slice(0,120),
    actionId:String(fn?.actionId||fn?.id||"").slice(0,120),
    ...(fn?.phase!=null?{phase:fn.phase==='both'?'any':["day","night","any","setup","trigger"].includes(String(fn.phase))?String(fn.phase):"night"}:{}),
    usageMode:["eachNight","eachDay","nPerNight","onceGame","nGame","custom","unlimited"].includes(String(fn?.usageMode||""))?String(fn.usageMode):"unlimited",
    usageCount:Math.max(1,Math.min(100,Math.trunc(Number(fn?.usageCount)||1))),
    ...(fn?.targetCount!=null?{targetCount:Math.max(0,Math.min(30,Math.trunc(Number(fn.targetCount)||0)))}:{}),
    ...(typeof fn?.noSelf==='boolean'?{noSelf:fn.noSelf}:{}),
    ...(typeof fn?.allowDead==='boolean'?{allowDead:fn.allowDead}:{}),
    effectIds:Array.isArray(fn?.effectIds)?fn.effectIds.map(String).slice(0,8):[],
    ...(fn?.fromNight!=null?{fromNight:Math.max(1,Math.trunc(Number(fn.fromNight)||1))}:{}),
    ...(fn?.toNight!==undefined?{toNight:fn.toNight==null?null:Math.max(1,Math.trunc(Number(fn.toNight)||1))}:{})
  })):null;
  const artworkAssetId=x.artworkAssetId==null?(x.artworkId==null?null:String(x.artworkId).slice(0,180)):String(x.artworkAssetId).slice(0,180);
  return{version:Number(x.version||x.playerCardVersion||1),name:String(x.name||x.artifactName||"Artifact").slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),actions,functions,limits:x.limits??null,singleUse:typeof x.singleUse==='boolean'?x.singleUse:!!(functions?.length===1&&functions[0].usageMode==='onceGame'&&functions[0].usageCount===1),priorityFirst:typeof (x.priorityFirst??x.artifact?.priorityFirst)==="boolean"?(x.priorityFirst??x.artifact.priorityFirst):defaultPriorityFirst(x.name||x.artifactName),artworkAssetId,artworkId:artworkAssetId}
}
export function privateArtifact(a){return{matchId:a.matchId||null,matchRevision:Number(a.matchRevision||0),artifactId:a.artifactId,artifactName:a.artifactName,description:a.description,artifactImage:a.artifactImage||null,artworkAssetId:a.artworkAssetId||a.artworkId||null,artworkId:a.artworkAssetId||a.artworkId||null,artworkAvailable:a.artworkAvailable!==false,artifactCard:a.artifactCard||null,singleUse:a.singleUse===true,deliveredAt:a.deliveredAt||null,viewedAt:a.viewedAt||null,usedAt:a.usedAt||null,lastActivation:a.lastActivation||null}}
export function sanitizePlayerRoleCard(v){
  const x=(v&&typeof v==="object")?v:{};
  const actions=Array.isArray(x.actions)?x.actions.slice(0,40).map(a=>({id:String(a?.id||"").slice(0,120),name:String(a?.name||"Hành Động").slice(0,160),description:String(a?.description||"").slice(0,3000),limits:a?.limits??null})):[];
  const functions=Array.isArray(x.functions)?x.functions.slice(0,40).map(fn=>({
    ...functionRuleFields(fn),id:String(fn?.id||fn?.actionId||"").slice(0,120),
    actionId:String(fn?.actionId||fn?.id||"").slice(0,120),
    usageMode:["eachNight","eachDay","nPerNight","onceGame","nGame","custom","unlimited"].includes(String(fn?.usageMode||""))?String(fn.usageMode):"unlimited",
    ...(fn?.phase!=null?{phase:fn.phase==='both'?'any':["day","night","any","setup","trigger"].includes(String(fn.phase))?String(fn.phase):"night"}:{}),
    ...(fn?.targetCount!=null?{targetCount:Math.max(0,Math.min(30,Math.trunc(Number(fn.targetCount)||0)))}:{}),
    ...(fn?.actorMayBeDead!=null?{actorMayBeDead:fn.actorMayBeDead===true}:{}),
    ...(fn?.allowDead!=null?{allowDead:fn.allowDead===true}:{}),
    ...(fn?.noSelf!=null?{noSelf:fn.noSelf!==false}:{}),
    ...(fn?.noTarget!=null?{noTarget:fn.noTarget===true}:{}),
    ...(fn?.passive!=null?{passive:fn.passive===true}:{}),
    ...(fn?.fromNight!=null?{fromNight:Math.max(1,Math.trunc(Number(fn.fromNight)||1))}:{}),
    ...(fn?.toNight!==undefined?{toNight:fn.toNight==null?null:Math.max(1,Math.trunc(Number(fn.toNight)||1))}:{}),
    ...(Array.isArray(fn?.effectIds)?{effectIds:fn.effectIds.map(String).slice(0,8)}:{}),
    usageCount:Math.max(1,Math.min(100,Math.trunc(Number(fn?.usageCount)||1)))
  })):null;
  const flagEntries=['allowMultipleActions','nightImmune'].filter(key=>typeof x.flags?.[key]==="boolean").map(key=>[key,x.flags[key]]);
  const flags=flagEntries.length?Object.fromEntries(flagEntries):null;
  const artworkAssetId=x.artworkAssetId==null?(x.artworkId==null?null:String(x.artworkId).slice(0,180)):String(x.artworkAssetId).slice(0,180);
  return{version:Number(x.version||x.playerCardVersion||7),name:String(x.name||x.roleName||"").slice(0,120),faction:x.faction==null?null:String(x.faction).slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),objective:x.objective==null?null:String(x.objective).slice(0,3000),actions,functions,flags,limits:x.limits??null,artworkAssetId,artworkId:artworkAssetId}
}
export function mergePlayerRoleCard(base,over){
  const b=(base&&typeof base==="object")?base:{},o=(over&&typeof over==="object")?over:{};
  const artworkAssetId=o.artworkAssetId??o.artworkId??b.artworkAssetId??b.artworkId??null;
  return{version:Number(o.version||b.version||7),name:o.name||b.name||"",faction:o.faction??b.faction??null,information:o.information??b.information??null,objective:o.objective??b.objective??null,actions:(Array.isArray(o.actions)&&o.actions.length)?o.actions:(Array.isArray(b.actions)?b.actions:[]),functions:o.functions??b.functions??null,flags:o.flags||b.flags?{...(b.flags||{}),...(o.flags||{})}:null,limits:o.limits??b.limits??null,artworkAssetId,artworkId:artworkAssetId}
}
export function privateRole(r){return{matchId:r.matchId||null,matchRevision:Number(r.matchRevision||0),roleId:r.roleId,roleName:r.roleName,faction:r.faction,description:r.description,order:r.order,roleImage:r.roleImage||null,artworkAssetId:r.artworkAssetId||r.artworkId||null,artworkId:r.artworkAssetId||r.artworkId||null,artworkAvailable:r.artworkAvailable!==false,playerCardVersion:r.playerCardVersion||7,roleCard:r.roleCard||null,deliveredAt:r.deliveredAt,viewedAt:r.viewedAt||null}}
