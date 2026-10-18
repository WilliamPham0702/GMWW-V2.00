// GMWW FAST G3.5 — authoritative sanitized Player Web Role/Artifact DTOs.
// Functions lifted unchanged from the production Worker: no persisted schema changes.
import { defaultPriorityFirst } from "./gmww-game-scene-rules.js";

export function sanitizePlayerArtifactCard(v){
  const x=(v&&typeof v==="object")?v:{},actions=Array.isArray(x.actions)?x.actions.slice(0,40).map(a=>({id:String(a?.id||"").slice(0,120),name:String(a?.name||"Hành Động").slice(0,160),description:String(a?.description||"").slice(0,3000),limits:a?.limits??null,...(a?.targetCount!==undefined&&a?.targetCount!==null&&Number.isInteger(Number(a.targetCount))&&Number(a.targetCount)>=0&&Number(a.targetCount)<=30?{targetCount:Number(a.targetCount)}:{}),...(typeof a?.noSelf==="boolean"?{noSelf:a.noSelf}:{}),...(typeof a?.allowDead==="boolean"?{allowDead:a.allowDead}:{}),phase:['day','night','any'].includes(String(a?.phase||''))?String(a.phase):'night',actorMayBeDead:a?.actorMayBeDead===true})):[];
  const artworkAssetId=x.artworkAssetId==null?(x.artworkId==null?null:String(x.artworkId).slice(0,180)):String(x.artworkAssetId).slice(0,180);
  return{version:Number(x.version||x.playerCardVersion||1),name:String(x.name||x.artifactName||"Artifact").slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),actions,limits:x.limits??null,singleUse:x.singleUse===true,priorityFirst:typeof (x.priorityFirst??x.artifact?.priorityFirst)==="boolean"?(x.priorityFirst??x.artifact.priorityFirst):defaultPriorityFirst(x.name||x.artifactName),artworkAssetId,artworkId:artworkAssetId}
}
export function privateArtifact(a){return{matchId:a.matchId||null,matchRevision:Number(a.matchRevision||0),artifactId:a.artifactId,artifactName:a.artifactName,description:a.description,artifactImage:a.artifactImage||null,artworkAssetId:a.artworkAssetId||a.artworkId||null,artworkId:a.artworkAssetId||a.artworkId||null,artworkAvailable:a.artworkAvailable!==false,artifactCard:a.artifactCard||null,singleUse:a.singleUse===true,deliveredAt:a.deliveredAt||null,viewedAt:a.viewedAt||null,usedAt:a.usedAt||null,lastActivation:a.lastActivation||null}}
export function sanitizePlayerRoleCard(v){
  const x=(v&&typeof v==="object")?v:{};
  const actions=Array.isArray(x.actions)?x.actions.slice(0,40).map(a=>({id:String(a?.id||"").slice(0,120),name:String(a?.name||"Hành Động").slice(0,160),description:String(a?.description||"").slice(0,3000),limits:a?.limits??null})):[];
  const functions=Array.isArray(x.functions)?x.functions.slice(0,40).map(fn=>({
    id:String(fn?.id||fn?.actionId||"").slice(0,120),
    actionId:String(fn?.actionId||fn?.id||"").slice(0,120),
    usageMode:["eachNight","onceGame","nGame","unlimited"].includes(String(fn?.usageMode||""))?String(fn.usageMode):"unlimited",
    phase:["day","night","any"].includes(String(fn?.phase||""))?String(fn.phase):"night",
    targetCount:Math.max(0,Math.min(30,Math.trunc(Number(fn?.targetCount??1)||0))),
    actorMayBeDead:fn?.actorMayBeDead===true,allowDead:fn?.allowDead===true,
    noSelf:fn?.noSelf!==false,noTarget:fn?.noTarget===true,passive:fn?.passive===true,
    fromNight:Math.max(1,Math.trunc(Number(fn?.fromNight)||1)),
    toNight:fn?.toNight==null?null:Math.max(1,Math.trunc(Number(fn.toNight)||1)),
    effectIds:Array.isArray(fn?.effectIds)?fn.effectIds.map(String).slice(0,8):[],
    usageCount:Math.max(1,Math.min(100,Math.trunc(Number(fn?.usageCount)||1)))
  })):null;
  const flags=x.flags&&typeof x.flags.allowMultipleActions==="boolean"?
    {allowMultipleActions:x.flags.allowMultipleActions}:null;
  const artworkAssetId=x.artworkAssetId==null?(x.artworkId==null?null:String(x.artworkId).slice(0,180)):String(x.artworkAssetId).slice(0,180);
  return{version:Number(x.version||x.playerCardVersion||7),name:String(x.name||x.roleName||"").slice(0,120),faction:x.faction==null?null:String(x.faction).slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),objective:x.objective==null?null:String(x.objective).slice(0,3000),actions,functions,flags,limits:x.limits??null,artworkAssetId,artworkId:artworkAssetId}
}
export function mergePlayerRoleCard(base,over){
  const b=(base&&typeof base==="object")?base:{},o=(over&&typeof over==="object")?over:{};
  const artworkAssetId=o.artworkAssetId??o.artworkId??b.artworkAssetId??b.artworkId??null;
  return{version:Number(o.version||b.version||7),name:o.name||b.name||"",faction:o.faction??b.faction??null,information:o.information??b.information??null,objective:o.objective??b.objective??null,actions:(Array.isArray(o.actions)&&o.actions.length)?o.actions:(Array.isArray(b.actions)?b.actions:[]),functions:o.functions??b.functions??null,flags:o.flags??b.flags??null,limits:o.limits??b.limits??null,artworkAssetId,artworkId:artworkAssetId}
}
export function privateRole(r){return{matchId:r.matchId||null,matchRevision:Number(r.matchRevision||0),roleId:r.roleId,roleName:r.roleName,faction:r.faction,description:r.description,order:r.order,roleImage:r.roleImage||null,artworkAssetId:r.artworkAssetId||r.artworkId||null,artworkId:r.artworkAssetId||r.artworkId||null,artworkAvailable:r.artworkAvailable!==false,playerCardVersion:r.playerCardVersion||7,roleCard:r.roleCard||null,deliveredAt:r.deliveredAt,viewedAt:r.viewedAt||null}}
