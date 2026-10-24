// Arena 3D / Staging: 3D spell staging uses authorized Core casting cues only.
// Geometry reused across up to 30 actors; a fixed 4 draw calls when casting.
// Never determines gameplay, roles, results, permissions, or target identities.
export const SPELL_VFX_VERSION='arena-spell-glyph-v1';
export const SPELL_KINDS=Object.freeze(['shield','inspect','heal','attack','vote']);
const COLORS=Object.freeze({
  shield:'#70f2ec',inspect:'#cab9ff',heal:'#74f1b6',attack:'#fd9ac7',vote:'#ffdfa0'
});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function spellAppearance(kind){
  if(!SPELL_KINDS.includes(kind))return null;
  return {kind,color:COLORS[kind],
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
  for(const [index,ring] of rings){
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
    scale=new THREE.Vector3(),position=new THREE.Vector3(),color=new THREE.Color();
  let active=false,reducedMotion=false,lowPower=false,kind=null;
  function setReducedMotion(value){reducedMotion=value===true}
  function setLowPower(value){lowPower=value===true}
  function clear(){
    active=false;kind=null;
    for(const ring of rings)ring.visible=false;
    glow.visible=false;pearls.count=0;
  }
  function update({type,from,to,start,end},now){
    if(!SPELL_KIN.includes(type)||!from||!to||!Number.isFinite(start)||!Number.isFinite(end)||
      now<start||now>=end){
      clear();return false;
    }
    if(![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite)){
      clear();return false;
    }
    kind=type;active=true;
    const remaining=clamp((end-now)/Math.max(1,end-start),0,1);
    const pulse=reducedMotion?1:1+.08*Math.sin(now*.009);
    color.set(COLORS[type]);
    for(const [i,ring] of rings.entries()){
      ring.visible=true;ring.material.color.copy(color);
      ring.material.opacity=(reducedMotion?.48:.68)*Math.min(1,remaining*5);
      ring.position.set(i?from.x:to.x,(i?from.y:to.y)-.45,i?from.z:to.z);
      ring.rotation.z=reducedMotion?0:now*.0018*(i?1:-1);
      ring.scale.setScalar(pulse*(i?.72:1.03));
    }
    glow.visible=true;glow.position.set(to.x,to.y,to.z);
    glow.scale.setScalar((reducedMotion?.85:1.06+.14*Math.sin(now*.008))*Math.min(1,remaining*4));
    glow.material.color.copy(color);glow.material.opacity=.53*remaining;
    const count=reducedMotion?4:lowPower?7:maxPearls;
    pearls.count=count;pearls.material.color.copy(color);
    pearls.material.opacity=reducedMotion?.55:.85*remaining;
    for(let i=0;i<count;i++){
      const ratio=i/count,angle=ratio*Math.PI*2+(reducedMotion?0:now*.003);
      const ringRadius=(i%2? .61:.8)*(reducedMotion?1:pulse);
      const travel=reducedMotion?.5:(now-start)/(Math.max(1,end-start));
      const x=to.x+Math.cos(angle)*ringRadius,z=to.z+Math.sin(angle)*ringRadius;
      const y=to.y-.5+.28*Math.sin(angle*2+travel*7);
      position.set(x,y,z);scale.setScalar(.65+(i%3)*.19);
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
    get active(){return active},get effectKind(){return kind},
    get visiblePearls(){return pearls.count},get drawBudget(){return 4}};
}
