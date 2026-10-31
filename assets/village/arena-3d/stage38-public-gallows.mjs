// Public-only Arena 3D gallows presentation. No rule resolution, GM bearer or hidden cards.
const ID=/^[a-z0-9._-]{1,80}$/i;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const smooth=t=>t*t*(3-2*t);
export const ARENA_STAGE38_VERSION='gmww.arena.gallows-public.38';
export function gallowsCandidateActorId(ballot,frame){
 const room=frame?.room;
 if(room?.phase!=='running'||room.cyclePhase!=='morning'||
   !['voting','resolved'].includes(String(ballot?.stage||'')))return null;
 const raw=String(ballot.candidateId||'');
 const login=raw.startsWith('member:')?raw.slice(7):raw;
 if(!ID.test(login)||!Array.isArray(frame?.players))return null;
 const actorId='member:'+login;
 return frame.players.some(p=>p?.id===actorId)?actorId:null;
}
// Reuse existing InstancedMesh actor, with no new geometry or draw calls.
// Walking happens before lift: character hangs over fire only on a public Core ballot.
export function gallowsWorldPose(seat,{progress=0,now=0,reducedMotion=false}={}){
 const t=clamp(Number(progress)||0,0,1);
 const walk=smooth(clamp(t/.68,0,1));
 const rise=smooth(clamp((t-.52)/.48,0,1));
 const x=Number(seat?.x)||0,z=Number(seat?.z)||0;
 return Object.freeze({
  x:walk===1?0:x+(0-x)*walk,
  z:walk===1?1.35:z+(1.35-z)*walk,
  lift:rise*(1.32+(reducedMotion||t<1?0:.035*Math.sin(now*.0032))),
  suspended:rise>.05
 });
}
