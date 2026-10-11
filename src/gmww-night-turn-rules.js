/* GMWW night-turn scheduling, pure and configurable.
 * One ordered timeline for roles and regular Artifacts, with early-priority window.
 * No modification to an Artifact's stock, single-use flag or stored ownership.
 */
const normalizeOrder=(value,defaultOrder=9999)=>{
  const n=Number(value);
  return value!==null&&value!==undefined&&value!==''&&Number.isFinite(n)&&n>=0?n:defaultOrder;
};
export function combineConfiguredTurns(roles,artifacts){
  const order=[];
  for(const [i,role] of (roles||[]).entries())order.push({turn:role,ordinal:i,rank:0,position:normalizeOrder(role?.order)});
  for(const [i,artifact] of (artifacts||[]).entries())order.push({turn:artifact,ordinal:i,rank:1,position:normalizeOrder(artifact?.order)});
  order.sort((a,b)=>a.position-b.position||a.rank-b.rank||a.ordinal-b.ordinal);
  return order.map(x=>x.turn);
}
export function isArtifactStep(step){return !!step&&(step.kind==='early-artifact'||step.kind==='artifact-main')}
export function isAlreadyUsedArtifact(accepted,step){
  if(!isArtifactStep(step))return false;
  return (Array.isArray(accepted)?accepted:[]).some(a=>
    String(a?.artifactId||'')===String(step.artifactId||'')&&
    String(a?.playerId||('member:'+String(a?.loginId||'').replace(/^member:/,'')))===String(step.playerId||''));
}
export function jumpTarget(queue,index){
  if(!Array.isArray(queue)||!Number.isInteger(index)||index<0||index>=queue.length)return null;
  return queue[index]||null;
}

// UI-facing schedule: preserve action ownership and never consume an Artifact merely by listing it.
export function timelineDisplaySteps(queue){
  const steps=Array.isArray(queue)?queue:[];
  const early=steps.filter(step=>step?.kind==="early-artifact");
  const withoutEarly=steps.filter(step=>step?.kind!=="early-artifact"&&step?.kind!=="village-wakeup");
  const intro=withoutEarly.filter(step=>step?.kind==="wolf-introduction");
  const turns=withoutEarly.filter(step=>step?.kind!=="wolf-introduction");
  return [...(intro.length?intro:[{kind:"wolf-introduction",label:"Bầy Sói"}]),{kind:"early-artifact-window",label:"Artifact đầu ván",actions:early},...turns,{kind:"village-wakeup",label:"Làng ơi dậy đi"}];
}
