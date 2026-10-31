// GMWW Arena 3D Stage 6 — VFX art direction for confirmed casting kinds.
// This file has NO access to roles, faction, targets, tokens or gameplay outcomes.
// Core + GM authorization must filter the cue before the renderer invokes a ritual.
export const RITUAL_ART_VERSION='gmww.arena.rituals.sea-v6';
const TAU=Math.PI*2;
const MOTIFS=Object.freeze({
  shield:Object.freeze({color:'#70e9e2',motif:'pearl-shell-ward',label:'Bảo vệ',petals:6}),
  inspect:Object.freeze({color:'#c7b1ff',motif:'star-oracle',label:'Tiên Tri',petals:5}),
  heal:Object.freeze({color:'#8deeb8',motif:'sea-lotus',label:'Phù Thủy cứu',petals:7}),
  attack:Object.freeze({color:'#f4a1d5',motif:'lunar-wave',label:'Tấn công',petals:3}),
  vote:Object.freeze({color:'#ffdc8a',motif:'golden-sigil',label:'Bỏ phiếu',petals:8})
});
const clamp01=x=>Math.min(1,Math.max(0,x));
export const ritualArt=kind=>MOTIFS[kind]||null;
export const ritualKinds=Object.freeze(Object.keys(MOTIFS));
export function ritualFrame(kind,time,{start=time-200,end=time+800,reducedMotion=false}={}){
  const config=ritualArt(kind);if(!config)return null;
  const duration=Math.max(1,end-start),progress=clamp01((time-start)/duration);
  const pulse=reducedMotion?1:1+.065*Math.sin(time*.006);
  return Object.freeze({kind,motif:config.motif,color:config.color,
    progress,pulse,
    targetRingRotation:reducedMotion?0:((kind==='inspect'?1:-1)*time*.0012),
    casterRingRotation:reducedMotion?0:time*.0018,
    glowScale:reducedMotion?.9:1+.12*Math.sin(time*.009),
    ringTilt:kind==='inspect'?.34:kind==='shield'?0:kind==='heal'?.14:kind==='attack'?.23:.08});
}
export function ritualPearlPoint(kind,index,count,time,{start=0,end=1,reducedMotion=false}={}){
  const profile=ritualArt(kind);if(!profile)return null;
  const n=Math.max(1,Math.trunc(count)||1),idx=((Math.trunc(index)||0)%n+n)%n;
  const t=clamp01((time-start)/Math.max(1,end-start));
  const angle=TAU*idx/n+(reducedMotion?0:time*.0020);
  const star=Math.cos(angle*5),petal=Math.cos(angle*profile.petals);
  let radius=.7,height=0;
  switch(kind){
    case 'shield': radius=.65+.10*Math.cos(angle*6);height=.15*Math.abs(Math.sin(angle*3));break;
    case 'inspect':radius=.62+.19*star;height=.12*Math.sin(angle*5+t*TAU);break;
    case 'heal':radius=.58+.16*petal;height=.24*Math.sin(angle+t*TAU*2);break;
    case 'attack':radius=.54+.26*t;height=.22*Math.sin(angle*3-t*TAU*2);break;
    case 'vote':radius=.68+.08*Math.cos(angle*8);height=.12*Math.cos(angle*4);break;
  }
  return {x:Math.cos(angle)*radius,y:height,z:Math.sin(angle)*radius,
    scale:(.60+(idx%3)*.16)*(reducedMotion?1:1+.08*Math.sin(time*.01+idx))};
}
