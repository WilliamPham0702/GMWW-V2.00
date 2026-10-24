// GMWW FAST G3.4 — pure room/game configuration contract.
// Extracted verbatim from the Worker; legacy values and stored schema unchanged.
export function sanitizeGameConfig(v){
  if(!v||typeof v!=="object")return null;
  const clampSec=x=>Math.max(0,Math.min(3600,Math.trunc(Number(x)||0))),defaultActionSec=clampSec(v?.timing?.defaultActionSec??v?.defaultActionSec??45);
  const roles=Array.isArray(v.roles)?v.roles.slice(0,100).map(r=>{
    const src=(r&&typeof r==="object")?r:{};
    const nested=(src.role&&typeof src.role==="object")?src.role:{};
    const roleId=String(src.roleId||src.id||nested.id||nested.roleId||"").slice(0,120);
    const roleName=String(src.roleName||src.name||nested.name||nested.roleName||"").slice(0,120);
    const faction=String(src.faction||src.factionName||nested.faction||nested.factionName||"").slice(0,120);
    const description=String(src.description||src.roleDescription||nested.description||nested.roleDescription||"").slice(0,6000);
    const actionDurationSec=clampSec(src.actionDurationSec??src.durationSec??defaultActionSec);
    return {roleId,roleName,faction,description,count:Math.max(1,Math.min(20,Number(src.count||1))),order:Number(src.order||0),actionDurationSec};
  }):[];
  const timing={villageDiscussionSec:clampSec(v?.timing?.villageDiscussionSec??v?.villageDiscussionSec??300),wolfDiscussionSec:clampSec(v?.timing?.wolfDiscussionSec??v?.wolfDiscussionSec??30),earlyArtifactSec:clampSec(v?.timing?.earlyArtifactSec??v?.earlyArtifactSec??30),defaultActionSec,artifactActionSec:clampSec(v?.timing?.artifactActionSec??30),gallowsNominationSec:Math.max(1,clampSec(v?.timing?.gallowsNominationSec??60)||60),gallowsVoteSec:Math.max(1,clampSec(v?.timing?.gallowsVoteSec??60)||60),autoAdvance:v?.timing?.autoAdvance!==false};
  return{id:String(v.id||"").slice(0,120),name:String(v.name||"Game Online").slice(0,120),playerCount:Math.max(0,Math.min(100,Number(v.playerCount||0))),roles,artifactsEnabled:v.artifactsEnabled===false?false:(v.artifactsEnabled===true||(Array.isArray(v.artifacts)&&v.artifacts.length>0)),artifacts:v.artifactsEnabled===false?[]:(Array.isArray(v.artifacts)?v.artifacts.slice(0,100).map(a=>({artifactId:String(a?.artifactId||"").slice(0,100),order:Number(a?.order||0)})):[]),artifactLimitPerCycle:Math.max(0,Math.min(30,Math.trunc(Number(v.artifactLimitPerCycle??3)||0))),timing}
}
export function normalizeRoomMode(v){return String(v||"").trim().toLowerCase()==="offline"?"offline":"online"}
export function normalizeSeatMoveMode(v){return String(v||"").trim().toLowerCase()==="walk"?"walk":"instant"}
export function normalizeSeatCount(v,fallback=12){const n=Math.trunc(Number(v));return Math.max(1,Math.min(30,Number.isFinite(n)&&n>0?n:(Math.trunc(Number(fallback))||12)))}
