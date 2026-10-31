// Arena 3D / Staging: 3D spell staging uses authorized Core casting cues only.
// Geometry reused across up to 30 actors; a fixed 4 draw calls when casting.
// Never determines gameplay, roles, results, permissions, or target identities.
export const SPELL_VFX_VERSION='arena-spell-glyph-v1';
import {ritualArt,ritualFrame,ritualPearlPoint,RITUAL_ART_VERSION} from './role-ritual-art.mjs';
export const SPELL_KINDS=Object.freeze(['shield','inspect','heal','attack','vote']);
const COLORS=Object.freeze({
  shield:'#70f2ec',inspect:'#cab9ff',heal:'#74f1b6',attack:'#fd9ac7',vote:'#ffdfa0'
});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
// Decorative and bounded variation per Core-confirmed action.
// Keep all hues in a marine cyan/blue/lavender palette; never imply gameplay results.
export function spellActionAccent(signature){
  if(!signature||!Number.isFinite(signature.accentHue))return null;
  const phase=((Math.floor(signature.accentHue)%360)+360)%360/360;
  const streaks=Number.isFinite(signature.streakCount)?Math.round(signature.streakCount):5;
  return Object.freeze({hue:0.47+phase*.18,pearls:clamp(5+streaks,5,12)});
}
export function spellAppearance(kind){
  const art=ritualArt(kind);if(!art)return null;
  return {kind,color:art.color,motif:art.motif,
    symbol:{shield:'shell-shield',inspect:'seer-star',heal:'tide-lotus',attack:'moon-flare',vote:'golden-glyph'}[kind]};
}
export function createArenaSpellVfx(THREE,root){
  const group=new THREE.Group();group.name='arena-spell-vfx';root.add(group);
  const ringGeometry=new THREE.TorusGeometry(.64,.046,5,24);
  const glyphGeometry=new THREE.TorusGeometry(.38,.034,5,20);
  const pearlGeometry=new THREE.SphereGeometry(.085,6,4);
  const orbGeometry=new THREE.SphereGeometry(.19,9,6);
  const common=()=>new THREE.MeshBasicMaterial({
    color:'#70f2ec',transparent:true,opacity:.8,depthWrite:false,
    blending:THREE.AdditiveBlending
  });
  const rings=[new THREE.Mesh(ringGeometry,common()),
    new THREE.Mesh(glyphGeometry,common())];
  for(const [index,ring] of rings.entries()){
    ring.visible=false;ring.frustumCulled=false;ring.rotation.x=-Math.PI/2;
    ring.name=index?'arena-spell-caster-ring':'arena-spell-target-ring';
    group.add(ring);
  }
  const glow=new THREE.Mesh(orbGeometry,common());
  glow.name='arena-spell-crest';glow.visible=false;glow.frustumCulled=false;group.add(glow);
  const maxPearls=16;
  const pearls=new THREE.InstancedMesh(pearlGeometry,common(),maxPearls);
  pearls.count=0;pearls.frustumCulled=false;
  pearls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pearls.name='arena-spell-pearls';group.add(pearls);
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),
    scale=new THREE.Vector3(),position=new THREE.Vector3(),color=new THREE.Color(),accentColor=new THREE.Color();
  let active=false,reducedMotion=false,lowPower=false,kind=null;
  function setReducedMotion(value){reducedMotion=value===true}
  function setLowPower(value){lowPower=value===true}
  function clear(){
    active=false;kind=null;
    for(const ring of rings)ring.visible=false;
    glow.visible=false;pearls.count=0;
  }
  function update({type,from,to,start,end,signature=null},now){
    if(!SPELL_KINDS.includes(type)||!from||!to||!Number.isFinite(start)||!Number.isFinite(end)||
      now<start||now>=end){
      clear();return false;
    }
    if(![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite)){
      clear();return false;
    }
    kind=type;active=true;
    const remaining=clamp((end-now)/Math.max(1,end-start),0,1);
    const ritual=ritualFrame(type,now,{start,end,reducedMotion});
    const pulse=ritual.pulse;
    color.set(ritual.color);
    const accent=spellActionAccent(signature);
    if(accent){accentColor.setHSL(accent.hue,.72,.58);color.lerp(accentColor,.28);}
    for(const [i,ring] of rings.entries()){
      ring.visible=true;ring.material.color.copy(color);
      ring.material.opacity=(reducedMotion?.48:.68)*Math.min(1,remaining*5);
      ring.position.set(i?from.x:to.x,(i?from.y:to.y)-.45,i?from.z:to.z);
      ring.rotation.z=(i?ritual.casterRingRotation:ritual.targetRingRotation)+(signature?.orbitalPhase||0);
      ring.rotation.x=-Math.PI/2+ritual.ringTilt;
      ring.scale.setScalar(pulse*(i?.72:1.03)*(signature?.impactScale||1));
    }
    glow.visible=true;glow.position.set(to.x,to.y,to.z);
    glow.scale.setScalar(ritual.glowScale*(signature?.impactScale||1)*Math.min(1,remaining*4));
    glow.material.color.copy(color);glow.material.opacity=.53*remaining;
    const count=reducedMotion?4:lowPower?7:(accent?accent.pearls:maxPearls);
    pearls.count=count;pearls.material.color.copy(color);
    pearls.material.opacity=reducedMotion?.55:.85*remaining;
    for(let i=0;i<count;i++){
      const art=ritualPearlPoint(type,i,count,now,{start,end,reducedMotion});
      const a=signature?.orbitalPhase||0;
      position.set(to.x+art.x*Math.cos(a)-art.z*Math.sin(a),to.y-.5+art.y,
        to.z+art.x*Math.sin(a)+art.z*Math.cos(a));
      scale.setScalar(art.scale);
      matrix.compose(position,quaternion,scale);
      pearls.setMatrixAt(i,matrix);
    }
    pearls.instanceMatrix.needsUpdate=true;
    return true;
  }
  function dispose(){
    root.remove(group);
    for(const o of [...rings,glow,pearls])o.material.dispose();
    ringGeometry.dispose();glyphGeometry.dispose();pearlGeometry.dispose();orbGeometry.dispose();
  }
  return {update,clear,setReducedMotion,setLowPower,dispose,
    ritualArtVersion:RITUAL_ART_VERSION,
    get active(){return active},get effectKind(){return kind},
    get visiblePearls(){return pearls.count},get drawBudget(){return 4}};
}
