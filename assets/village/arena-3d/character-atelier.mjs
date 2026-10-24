// Arena 3D v3: compact 3D chibi characters. Technical procedural art, no texture downloads.
// All 6–30 actors share InstancedMesh geometries/materials; status/VFX are projections.
// No player role, faction, secret target, account token or game rule is stored here.
export const ARENA_ATELIER_VERSION='arena-chibi-instanced-v3';
const MAX=30,TAU=Math.PI*2;
const PALETTE=['#22b6b0','#60b9d9','#f5b769','#d9a4f0','#9bcf79','#ffa6b6','#8ca9ea','#f2cd83'];
const HAIR=['#1b6477','#31546e','#68456c','#bb7b53','#486652','#54588b','#774b4f','#a3698e'];
const SKIN=['#fbd8b8','#f5c8a7','#eab58e','#f8d2ba'];
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function numberOf(id){const value=Number(String(id||'').match(/(\d+)$/)?.[1]);return Number.isFinite(value)&&value>0?value-1:0}
function color(i,series){return series[((i%series.length)+series.length)%series.length]}
export function atelierPalette(characterId){const i=numberOf(characterId);return {cloth:color(i,PALETTE),hair:color(Math.floor(i/2)+i,HAIR),skin:color(i,SKIN)}}
export function createArenaCharacterField(THREE,scene,{capacity=MAX}={}){
  const limit=clamp(Math.trunc(capacity)||MAX,1,MAX),root=new THREE.Group();
  root.name='arena-chibi-atelier';scene.add(root);
  const meshes=[],sphere=new THREE.SphereGeometry(1,9,7),
    cone=new THREE.ConeGeometry(1,1,9),cylinder=new THREE.CylinderGeometry(1,1,1,8),
    torus=new THREE.TorusGeometry(1,.07,4,20);
  const white=new THREE.Color('#fff5e8'),dark=new THREE.Color('#19273c');
  const temp=new THREE.Matrix4(),pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3(),turn=new THREE.Quaternion();
  const colorTemp=new THREE.Color();
  const parts=[
    // Rounded anime/chibi silhouette: head, hair fringe, tunic, pearl, shells, tiny shoes.
    ['tunic',sphere,'cloth',[0,.66,0],[.34,.42,.28]],
    ['skirt',cone,'cloth',[0,.37,0],[.44,.49,.39]],
    ['head',sphere,'skin',[0,1.35,0],[.41,.39,.36]],
    ['hair',sphere,'hair',[0,1.59,-.055],[.43,.22,.36]],
    ['fringe',sphere,'hair',[-.14,1.48,.28],[.24,.14,.12]],
    ['sidehairL',sphere,'hair',[-.38,1.30,-.10],[.13,.29,.17]],
    ['sidehairR',sphere,'hair',[.38,1.30,-.10],[.13,.29,.17]],
    ['eyeL',sphere,'eye',[-.145,1.36,.325],[.068,.092,.025]],
    ['eyeR',sphere,'eye',[.145,1.36,.325],[.068,.092,.025]],
    ['shineL',sphere,'shine',[-.16,1.40,.349],[.022,.027,.012]],
    ['shineR',sphere,'shine',[.13,1.40,.349],[.022,.027,.012]],
    ['armL',sphere,'skin',[-.35,.71,.03],[.12,.29,.13]],
    ['armR',sphere,'skin',[.35,.71,.03],[.12,.29,.13]],
    ['shoeL',sphere,'shoe',[-.16,.105,.08],[.16,.11,.23]],
    ['shoeR',sphere,'shoe',[.16,.105,.08],[.16,.11,.23]],
    ['pearl',sphere,'shine',[0,1.71,.06],[.09,.09,.08]],
    ['shell',sphere,'shine',[0,.88,.265],[.13,.085,.046]]
  ];
  const matOf=key=>new THREE.MeshLambertMaterial({color:key==='eye'?'#19273c':key==='shine'?'#fff4d5':key==='shoe'?'#35526a':'white'});
  for(const [name,geometry,kind,offset,size] of parts){
    const mesh=new THREE.InstancedMesh(geometry,matOf(kind),limit);
    mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;mesh.name='arena-chibi-'+name;
    root.add(mesh);meshes.push({name,kind,mesh,offset,size});
  }
  const effects=[
    ['shield','#56e0e0',torus,1.05],
    ['inspect','#d2b5ff',torus,1.4],
    ['heal','#5ff0ac',torus,1.22],
    ['attack','#ec84ca',torus,1.32],
    ['vote','#fbd07b',torus,.87]
  ].map(([name,hex,geometry,size])=>{
    const material=new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:.7,depthWrite:false});
    const mesh=new THREE.InstancedMesh(geometry,material,limit);mesh.count=0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
    root.add(mesh);return {name,mesh,size};
  });
  const byId=new Map(),actors=[],up=new THREE.Vector3(0,1,0);
  let reducedMotion=false,lastDraw=-1,updates=0;
  function setActors(players){
    actors.length=0;byId.clear();const used=new Set();
    for(const source of (Array.isArray(players)?players:[])){
      const id=String(source?.id||'');if(!id||used.has(id)||actors.length>=limit)continue;
      used.add(id);
      const i=actors.length,style=atelierPalette(source.characterId),
        x=Number(source?.position?.x),z=Number(source?.position?.z),theta=-Math.PI/2+TAU*i/Math.max(6,players.length);
      const actor={id,index:i,position:{x:Number.isFinite(x)?x:Math.cos(theta)*6.5,
        z:Number.isFinite(z)?z:Math.sin(theta)*5.1},
        characterId:source.characterId,yaw:0,targetYaw:0,gestureEnd:0,walk:source.movementStatus==='moving',
        statusIds:new Set((source.statusTags||[]).map(t=>t.statusId)),effects:new Map()};
      actors.push(actor);byId.set(id,actor);
      for(const part of meshes){
        const hex=part.kind==='cloth'?style.cloth:part.kind==='hair'?style.hair:
          part.kind==='skin'?style.skin:part.kind==='eye'?'#19273c':
          part.kind==='shoe'?'#35526a':'#fff4d5';
        if(part.kind!=='cloth'&&part.kind!=='hair'&&part.kind!=='skin'&&part.kind!=='eye'&&part.kind!=='shoe'&&part.kind!=='shine')throw Error('UNKNOWN_ATELIER_MATERIAL');
        part.mesh.setColorAt(i,colorTemp.set(hex));
      }
    }
    for(const part of meshes){
      part.mesh.count=actors.length;
      if(part.mesh.instanceColor)part.mesh.instanceColor.needsUpdate=true;
    }
    for(const effect of effects)effect.mesh.count=actors.length;
    draw(performance.now(),true);
  }
  function turnActor(id,step=Math.PI/2){
    const actor=byId.get(id);if(!actor)return false;actor.targetYaw+=step;actor.gestureEnd=performance.now()+650;return true;
  }
  function interact(id,{effect='vote',durationMs=1500}={}){
    const actor=byId.get(id);if(!actor)return false;
    if(!['shield','inspect','heal','attack','vote'].includes(effect))return false;
    actor.effects.set(effect,performance.now()+clamp(durationMs,250,6000));actor.gestureEnd=performance.now()+800;return true;
  }
  function setServerEffects(authorized){
    // Call ONLY with server-approved filtered effects. No UI is allowed to self-authorize.
    if(!Array.isArray(authorized))return;
    for(const effect of authorized){
      const target=byId.get(String(effect?.targetId||''));if(!target)continue;
      if(!['shield','inspect','heal','attack','vote'].includes(effect.kind))continue;
      const expires=Number(effect.expiresAt);
      target.effects.set(effect.kind,Number.isFinite(expires)?Math.min(performance.now()+3500,Math.max(performance.now()+200,performance.now()+expires-Date.now())):performance.now()+1800);
    }
  }
  function setReducedMotion(value){reducedMotion=value===true}
  function draw(time,force=false){
    if(!force&&time-lastDraw<1000/(reducedMotion?12:30))return false;
    const dt=lastDraw<0?0:Math.min(60,time-lastDraw);lastDraw=time;
    for(const actor of actors){
      actor.yaw+=clamp(actor.targetYaw-actor.yaw,-dt*.009,dt*.009);
      turn.setFromAxisAngle(up,actor.yaw);
      const moving=actor.walk&&!reducedMotion;
      const bounce=reducedMotion?0:(moving?.065*Math.sin(time*.014+actor.index):.024*Math.sin(time*.0025+actor.index));
      const gesturing=actor.gestureEnd>time&&!reducedMotion;
      for(const part of meshes){
        let [x,y,z]=part.offset,[sx,sy,sz]=part.size;
        if(part.name==='head'||part.name==='hair'||part.name==='fringe'||part.name==='sidehairL'||part.name==='sidehairR'||part.name.startsWith('eye')||part.name.startsWith('shine')||part.name==='pearl'){y+=bounce;x+=gesturing?.024*Math.sin(time*.016):0}
        if(part.name==='armL'||part.name==='armR'){y+=gesturing?.15*Math.sin(time*.015):moving?.06*Math.sin(time*.009+actor.index):0}
        if(part.name==='shoeL'||part.name==='shoeR')y+=moving?.05*Math.abs(Math.sin(time*.014+actor.index)):0;
        pos.set(x,y,z).applyQuaternion(turn).add(new THREE.Vector3(actor.position.x,0,actor.position.z));
        scale.set(sx,sy,sz);
        temp.compose(pos,turn,scale);part.mesh.setMatrixAt(actor.index,temp);
      }
      const status=actor.statusIds;
      for(const effect of effects){
        const active=(effect.name==='shield'&&status.has('protected'))||
          (effect.name==='attack'&&(status.has('dead')||status.has('wolf_bitten')))||
          (effect.name==='vote'&&status.has('marked'))||
          Number(actor.effects.get(effect.name)||0)>time;
        const size=active?effect.size*(1+(reducedMotion?0:.05*Math.sin(time*.005+actor.index))):.00001;
        pos.set(actor.position.x,.78,actor.position.z);scale.set(size,size,size);
        quat.setFromAxisAngle(up,time*.0005);
        temp.compose(pos,quat,scale);effect.mesh.setMatrixAt(actor.index,temp);
      }
    }
    for(const item of [...meshes,...effects])item.mesh.instanceMatrix.needsUpdate=true;
    updates++;return true;
  }
  function pick(raycaster){
    // Uses instanced character HEAD; maps exact instanceId back to public player ID.
    const headMesh=meshes.find(p=>p.name==='head')?.mesh;
    const hits=headMesh?raycaster.intersectObject(headMesh,false):[];
    return hits.length?actors[hits[0].instanceId]?.id||null:null;
  }
  function dispose(){
    scene.remove(root);
    for(const part of meshes)part.mesh.material.dispose();
    for(const item of effects)item.mesh.material.dispose();
    // Each geometry may be shared by multiple instanced meshes; dispose only once.
    for(const geo of new Set([...meshes.map(x=>x.mesh.geometry),...effects.map(x=>x.mesh.geometry)]))geo.dispose();
    actors.length=0;byId.clear();
  }
  return {setActors,turnActor,interact,setServerEffects,setReducedMotion,draw,pick,dispose,
    get actorCount(){return actors.length},get drawUpdates(){return updates},get drawBudget(){return meshes.length+effects.length},
    get actors(){return actors.map(a=>({id:a.id,position:a.position,yaw:a.yaw,statusIds:[...a.statusIds]}))}};
}
