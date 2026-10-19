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
  const early=steps.flatMap(step=>step?.kind==="early-artifact-window"?(step.actions||[]):step?.kind==="early-artifact"?[step]:[]);
  const withoutEarly=steps.filter(step=>step?.kind!=="early-artifact"&&step?.kind!=="early-artifact-window"&&step?.kind!=="village-wakeup");
  const intro=withoutEarly.filter(step=>step?.kind==="wolf-introduction");
  const turns=withoutEarly.filter(step=>step?.kind!=="wolf-introduction");
  // The source queue is authoritative. Later nights intentionally omit the wolf introduction.
  return [...intro,...(steps.some(step=>step?.kind==="early-artifact-window"||step?.kind==="early-artifact")?[{kind:"early-artifact-window",label:"Artifact đầu ván",actions:early}]:[]),...turns,{kind:"village-wakeup",label:"Làng ơi dậy đi"}];
}

/** One waking turn per configured order, preserving every owner and role action.
 * This is a transient scheduling projection, never a change to saved templates.
 */
export function groupConfiguredRoleTurns(roles){
  const ordered=new Map();
  for(const role of Array.isArray(roles)?roles:[]){
    const key=Number.isFinite(Number(role?.order))?Number(role.order):9999;
    const rows=ordered.get(key)||[];rows.push(role);ordered.set(key,rows);
  }
  return [...ordered.entries()].sort((a,b)=>a[0]-b[0]).map(([order,rows])=>{
    if(rows.length===1)return rows[0];
    const uniq=xs=>[...new Set(xs.map(String).filter(Boolean))];
    return {
      id:"role-group:"+order,kind:"role-group",order,
      label:uniq(rows.map(row=>row.label)).join(" + "),
      roles:rows,
      loginIds:uniq(rows.flatMap(row=>row.loginIds||[])),
      playerIds:uniq(rows.flatMap(row=>row.playerIds||[])),
      durationSec:Math.max(...rows.map(row=>Math.max(0,Number(row.durationSec)||0))),
      status:"pending"
    };
  });
}
