// Arena 3D GĐ7: deterministic cosmetic expression & motion layers.
// Pure render-side values; no role, faction, vote or private state.
export const STAGE7_VERSION='gmww.arena.expression-motion.7';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function expressionFrame({time=0,index=0,casting=false,moving=false,reducedMotion=false}={}){
 const t=Number.isFinite(time)?time:0,i=Number.isFinite(index)?index:0;
 const blink=reducedMotion?0:Math.pow(Math.max(0,Math.cos(t*.0017+i*1.9)),32);
 return Object.freeze({
  blink:clamp(blink,0,1),
  smile:casting?.25:.11+.06*Math.sin(t*.0009+i),
  cheekLift:casting?.08:.02,
  eyeFocus:casting?.11:0,
  headNod:reducedMotion?0:Math.sin(t*.002+i)*.025,
  hairSway:reducedMotion?0:Math.sin(t*.004+i*.71)*(moving?.07:.018),
  sleeveSway:reducedMotion?0:Math.sin(t*.005+i*.53)*(casting?.12:moving?.065:.015),
  footLift:reducedMotion?0:moving?.065*Math.abs(Math.sin(t*.011+i)):0
 });
}
export function renderQualityBudget({characters=6,fps=60,lowPower=false,reducedMotion=false}={}){
 const n=clamp(Math.round(Number(characters)||6),6,30);
 const f=Number.isFinite(fps)?fps:60;
 const tier=lowPower||f<20?'eco':f<35||n>20?'balanced':'quality';
 return Object.freeze({tier,particles:tier==='eco'?4:tier==='balanced'?8:16,
  animationHz:reducedMotion?12:tier==='eco'?24:tier==='balanced'?30:60,
  // Crowd framebuffer cap applies even in Smooth mode, without hiding status/VFX.
  pixelRatioCap:Math.min(tier==='eco'?1:tier==='balanced'?1.25:1.75,
    n>=24?.85:n>=20?1:Infinity),
  maxCharacters:n});
}
