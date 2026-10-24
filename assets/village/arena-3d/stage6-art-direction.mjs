// Arena 3D Stage 6 — 40 public character appearances and Core-cue-only spell poses.
// These are presentation variants, NEVER a mapping from character to secret role.
export const STAGE6_ART_VERSION='arena-ocean-chibi-stage6-v1';
export const SPELL_STYLES=Object.freeze(['shield','inspect','heal','attack','vote']);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function characterArtProfile(characterId){
  const m=String(characterId||'').match(/^character-(\d{1,3})$/i);
  const id=m?clamp(Number(m[1]),1,40):1;
  return Object.freeze({
    costume:id,headwear:(id-1)%5,hairShape:Math.floor((id-1)/5)%4,
    mantle:Math.floor((id-1)/10)%2===1,pearl:(id-1)%3!==2
  });
}
// No roleId, faction, actorId or targets in this function. 'kind' is accepted
// only after a Core-authorized GM visual cue, or in synthetic-only samples.
export function spellGesturePose(kind,elapsedMs,{lowMotion=false}={}){
  if(!SPELL_STYLES.includes(kind))return {left:0,right:0,lean:0,tilt:0,pulse:0};
  const t=clamp(Number(elapsedMs)||0,0,4000);
  const intensity=lowMotion?.55:1;
  const wave=lowMotion?0:Math.sin(t*.011);
  const rise=clamp(t/380,0,1);
  const p=intensity*rise;
  switch(kind){
    case 'shield':return {left:.27*p,right:.27*p,lean:0,tilt:0,pulse:.07*p};
    case 'inspect':return {left:.07*p,right:.32*p,lean:.03*p,tilt:.04*p,pulse:.09*p};
    case 'heal':return {left:.33*p,right:.33*p,lean:-.04*p,tilt:0,pulse:(.1+.025*wave)*p};
    case 'attack':return {left:.02*p,right:(.4+.05*wave)*p,lean:.09*p,tilt:-.03*p,pulse:.15*p};
    case 'vote':return {left:.12*p,right:.2*p,lean:0,tilt:0,pulse:.04*p};
  }
}
