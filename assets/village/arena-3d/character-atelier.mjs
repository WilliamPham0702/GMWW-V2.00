// Arena 3D v3: compact 3D chibi characters. Technical procedural art, no texture downloads.
// All 6–30 actors share InstancedMesh geometries/materials; status/VFX are projections.
// No player role, faction, secret target, account token or game rule is stored here.
export const ARENA_ATELIER_VERSION='arena-chibi-instanced-v6-sea-art';
import {characterArtProfile,accessoryPartVisible,characterMotionFrame,CHARACTER_ART_VERSION} from './character-art-direction.mjs';
import {choreographyPose,approachPoint,renderWalkPosition,travelProgress,WALK_TIMING} from './casting-choreography.mjs';
import {createArenaSpellVfx} from './spell-vfx.mjs';
const MAX=30,TAU=Math.PI*2;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const atelierPalette=characterArtProfile;
export function createArenaCharacterField(THREE,scene,{capacity=MAX}={}){
  const limit=clamp(Math.trunc(capacity)||MAX,1,MAX),root=new THREE.Group();
  root.name='arena-chibi-atelier';scene.add(root);
  const meshes=[],sphere=new THREE.SphereGeometry(1,9,7),
    cone=new THREE.ConeGeometry(1,1,9),cylinder=new THREE.CylinderGeometry(1,1,1,8),
    torus=new THREE.TorusGeometry(1,.07,4,20);
  const white=new THREE.Color('#fff5e8'),dark=new THREE.Color('#19273c');
  const temp=new THREE.Matrix4(),pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3(),turn=new THREE.Quaternion();
  const colorTemp=new THREE.Color(),base=new THREE.Vector3();
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
    ['shell',sphere,'shine',[0,.88,.265],[.13,.085,.046]],
    ['waistSash',sphere,'trim',[0,.78,.045],[.37,.073,.28]],
    ['shellCrown',sphere,'accessory',[0,1.79,-.02],[.20,.09,.22]],
    // Five silhouette variants cycle over forty IDs: hairpin, ribbon, cloak.
    ['shellpin',sphere,'accessory',[.29,1.68,.12],[.15,.13,.075]],
    ['ribbon',sphere,'accessory',[-.39,1.53,-.03],[.20,.11,.13]],
    ['cape',sphere,'accessory',[0,.76,-.29],[.39,.48,.12]],
    ['cheekL',sphere,'blush',[-.25,1.25,.286],[.10,.055,.028]],
    ['cheekR',sphere,'blush',[.25,1.25,.286],[.10,.055,.028]],
    ['sailorCollar',sphere,'accessory',[0,1.05,.1],[.26,.10,.29]],
    ['hairTail',sphere,'hair',[.30,1.47,-.28],[.16,.36,.17]],
    ['stool',cylinder,'seat',[0,.15,-.12],[.48,.29,.46]]
  ];
  const matOf=key=>new THREE.MeshLambertMaterial({color:key==='eye'?'#19273c':key==='shine'?'#fff4d5':key==='shoe'?'#35526a':key==='seat'?'#b99167':'white'});
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
  // One lightweight spell ribbon from authorized caster to target.
  // The beam only appears after a Core-confirmed private cue, never on public replay.
  const beamMaterial=new THREE.MeshBasicMaterial({color:'#82edec',transparent:true,opacity:.82,depthWrite:false});
  const beamGeometry=new THREE.CylinderGeometry(.047,.08,1,6);
  const spellBeam=new THREE.Mesh(beamGeometry,beamMaterial);spellBeam.visible=false;
  spellBeam.frustumCulled=false;root.add(spellBeam);
  const beamDir=new THREE.Vector3(),beamFrom=new THREE.Vector3(),beamTo=new THREE.Vector3();
  const beamUp=new THREE.Vector3(0,1,0);
  let activeBeam=null;
  const spellVfx=createArenaSpellVfx(THREE,root);
  const byId=new Map(),actors=[],up=new THREE.Vector3(0,1,0);
  let reducedMotion=false,lastDraw=-1,updates=0;
  function setActors(players,{seatCount=players?.length||6,seatLayout='circle'}={}){
    const previous=new Map(byId);actors.length=0;byId.clear();const used=new Set();
    for(const source of (Array.isArray(players)?players:[])){
      const id=String(source?.id||'');if(!id||used.has(id)||actors.length>=limit)continue;
      used.add(id);
      const i=actors.length,style=atelierPalette(source.characterId),
        x=Number(source?.position?.x),z=Number(source?.position?.z),
        seat=Number(source.seatId),
        count=clamp(Math.trunc(Number(seatCount))||players.length||6,6,30),
        theta=-Math.PI/2+TAU*(Number.isInteger(seat)&&seat>0&&seat<=count?seat-1:i)/count,
        radius=count<=8?4.15:count<=12?5.1:count<=18?6.15:count<=24?7.2:8.35,
        circle=seatLayout==='circle'&&Number.isInteger(seat)&&seat>0&&seat<=count,
        seatX=circle?Math.cos(theta)*radius:(Number.isFinite(x)?x:Math.cos(theta)*radius),
        seatZ=circle?Math.sin(theta)*radius*.89:(Number.isFinite(z)?z:Math.sin(theta)*radius*.89);
      const actor={id,index:i,look:style,position:{x:seatX,z:seatZ},
        characterId:source.characterId,style:style.style,yaw:0,targetYaw:0,gesture:'idle',gestureEnd:0,walk:source.movementStatus==='moving',
        approach:approachPoint({x:seatX,z:seatZ}),travel:previous.get(id)?.travel||null,
        standAt:previous.get(id)?.standAt||0,standUntil:previous.get(id)?.standUntil||0,
        castStartedAt:previous.get(id)?.castStartedAt||0,castUntil:previous.get(id)?.castUntil||0,
        statusIds:new Set((source.statusTags||[]).map(t=>t.statusId)),effects:new Map(previous.get(id)?.effects||[])};
      actor.yaw=previous.get(id)?.yaw??Math.atan2(-actor.position.x,1.8-actor.position.z);
      actor.targetYaw=previous.get(id)?.targetYaw??actor.yaw;
      actors.push(actor);byId.set(id,actor);
      for(const part of meshes){
        const hex=part.kind==='seat'?'#b99167':part.kind==='cloth'?style.cloth:part.kind==='hair'?style.hair:part.kind==='accessory'?style.accessory:
          part.kind==='skin'?style.skin:part.kind==='trim'?style.trim:part.kind==='eye'?'#19273c':
          part.kind==='shoe'?'#35526a':part.kind==='blush'?'#ed9b98':'#fff4d5';
        if(part.kind!=='cloth'&&part.kind!=='hair'&&part.kind!=='skin'&&part.kind!=='eye'&&part.kind!=='shoe'&&part.kind!=='shine'&&part.kind!=='accessory'&&part.kind!=='seat'&&part.kind!=='blush'&&part.kind!=='trim')throw Error('UNKNOWN_ATELIER_MATERIAL');
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
  function performGesture(id,gesture){
    const actor=byId.get(id);
    if(!actor||!['wave','nod','cheer','turn'].includes(gesture))return false;
    if(gesture==='turn')return turnActor(id,Math.PI/2);
    actor.gesture=gesture;actor.gestureEnd=performance.now()+850;return true;
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
  let currentTurn='',currentCast='';
  function moveActor(actor,to,now){
    if(actor.travel?.to===to)return;
    actor.travel={from:travelProgress(actor.travel,now),to,startedAt:now,
      duration:to?WALK_TIMING.approachMs:WALK_TIMING.returnMs};
    if(to===0){
      actor.standUntil=now+WALK_TIMING.returnMs+WALK_TIMING.seatMs;
      actor.castUntil=now;actor.gesture='idle';
    }
  }
  function setCastingTurn(cue,now=performance.now()){
    const turn=cue&&typeof cue.turnId==='string'?cue.turnId:'';
    const authorizedIds=new Set((cue?.actorIds||[]).filter(id=>byId.has(id)));
    const changed=turn!==currentTurn;
    if(changed){
      currentTurn=turn;currentCast='';activeBeam=null;spellBeam.visible=false;spellVfx.clear();
      for(const actor of actors)actor.effects.clear();
    }
    for(const actor of actors){
      if(turn&&authorizedIds.has(actor.id)){
        if(changed||actor.standUntil<=now){
          actor.standAt=now;actor.standUntil=now+3600000;
          moveActor(actor,1,now);
          actor.targetYaw=Math.atan2(-actor.position.x,1.8-actor.position.z);
        }
      }else if(changed&&actor.travel?.to===1)moveActor(actor,0,now);
    }
    const cast=cue?.cast;
    const castKey=cast?String(cue.turnId)+':'+cast.startedAt+':'+cast.kind:'';
    if(cast&&castKey!==currentCast&&authorizedIds.has(cast.actorId)&&Number(cast.expiresAt)>Date.now()){
      currentCast=castKey;
      const caster=byId.get(cast.actorId),target=(cast.targetIds||[]).map(id=>byId.get(id)).find(Boolean);
      if(caster){
        const elapsed=Math.max(250,Math.min(4000,Number(cast.expiresAt)-Date.now()));
        const walkEnd=(caster.travel?.startedAt||now)+(caster.travel?.duration||0);
        const spellStart=Math.max(now,Math.min(now+WALK_TIMING.approachMs,walkEnd));
        caster.gesture='cheer';caster.gestureEnd=spellStart+elapsed;
        caster.castStartedAt=spellStart;caster.castUntil=spellStart+elapsed;
        caster.standUntil=Math.max(caster.standUntil,spellStart+elapsed+WALK_TIMING.returnMs);
        if(target)caster.targetYaw=Math.atan2(target.position.x-caster.approach.x,target.position.z-caster.approach.z);
        const kind=['shield','inspect','heal','attack','vote'].includes(cast.kind)?cast.kind:'vote';
        caster.effects.set(kind,spellStart+elapsed);
        if(target)target.effects.set(kind,spellStart+elapsed);
        activeBeam=target?{actorId:caster.id,targetId:target.id,start:spellStart,until:spellStart+elapsed,kind}:null;
      }
    }
  }
  function clearEffects(){
    currentTurn='';currentCast='';activeBeam=null;spellBeam.visible=false;spellVfx.clear();
    const now=performance.now();
    for(const actor of actors){actor.effects.clear();if(actor.travel?.to===1)moveActor(actor,0,now);actor.castUntil=0}
  }
  function setReducedMotion(value){reducedMotion=value===true;spellVfx.setReducedMotion(reducedMotion)}
  function setLowPower(value){spellVfx.setLowPower(value===true)}
  function draw(time,force=false){
    if(!force&&time-lastDraw<1000/(reducedMotion?12:30))return false;
    const dt=lastDraw<0?0:Math.min(60,time-lastDraw);lastDraw=time;
    for(const actor of actors){
      actor.yaw+=clamp(actor.targetYaw-actor.yaw,-dt*.009,dt*.009);
      turn.setFromAxisAngle(up,actor.yaw);
      const inTransit=Boolean(actor.travel&&time>=actor.travel.startedAt&&
        time<actor.travel.startedAt+actor.travel.duration&&
        Math.abs(actor.travel.from-actor.travel.to)>.01);
      const moving=(actor.walk||inTransit)&&!reducedMotion;
      const pose=choreographyPose(actor,time,{lowMotion:reducedMotion});
      const walkPos=renderWalkPosition(actor.position,actor.approach,actor.travel,
        reducedMotion?time+WALK_TIMING.approachMs:time);
      const motion=characterMotionFrame({time,index:actor.index,moving,casting:Boolean(pose.casting),standing:Boolean(pose.stand),reducedMotion});
      base.set(walkPos.x,0,walkPos.z);
      const bounce=reducedMotion?0:(moving?.065*Math.sin(time*.014+actor.index):.024*Math.sin(time*.0025+actor.index));
      const gesturing=actor.gestureEnd>time&&!reducedMotion;
      if(!gesturing)actor.gesture='idle';
      for(const part of meshes){
        let [x,y,z]=part.offset,[sx,sy,sz]=part.size;
        if(part.name==='head'||part.name==='hair'||part.name==='fringe'||part.name==='sidehairL'||part.name==='sidehairR'||part.name.startsWith('eye')||part.name.startsWith('shine')||part.name==='pearl'||part.name.startsWith('cheek')||part.name==='hairTail'){y+=bounce+motion.breath;x+=motion.headTilt+(gesturing?.024*Math.sin(time*.016):0)}
        if(part.name==='head')sx*=actor.look.headScale;
        if(part.name==='hair'||part.name==='fringe'||part.name==='hairTail')sy*=actor.look.hairHeight;
        if(part.name.startsWith('eye')){sx*=actor.look.eyeScale;sy*=actor.look.eyeScale}
        if(part.name==='tunic'||part.name==='waistSash')sx*=actor.look.outfitWidth;
        if(part.name==='skirt')sy*=actor.look.skirtLength;
        if(part.name==='cape'){z-=motion.capeSway;sy*=1+Math.abs(motion.capeSway)}
        if(part.name==='tunic'||part.name==='skirt')x+=motion.robeSway;
        if(part.name==='armL'||part.name==='armR'){
          if(gesturing&&actor.gesture==='wave'&&part.name==='armR')y+=.23+.15*Math.sin(time*.018);
          else if(gesturing&&actor.gesture==='cheer')y+=.25+.09*Math.sin(time*.016);
          else y+=motion.armLift;
        }
        if(gesturing&&actor.gesture==='nod'&&(part.name==='head'||part.name==='hair'||part.name.startsWith('eye')))y-=.055*Math.sin(time*.017);
        if(!accessoryPartVisible(part.name,actor.look))sx=sy=sz=.00001;
        if(part.name==='shellpin'&&actor.look.badgeSide==='left')x=-Math.abs(x);
        if(part.name==='shellCrown')sy*=actor.look.hairHeight;
        if(part.name==='shoeL'||part.name==='shoeR')y+=motion.step;
        if(part.name!=='stool'){
          y*=.69+.31*pose.stand;
          if(part.name==='skirt'||part.name==='tunic')sy*=.90+.1*pose.stand;
          if(part.name.startsWith('shoe'))z+=(1-pose.stand)*.21;
          if(pose.casting&&part.name==='armR')y+=.24*Math.abs(Math.sin(time*.015));
        }
        if(part.name==='stool')base.set(actor.position.x,0,actor.position.z);
        else base.set(walkPos.x,0,walkPos.z);
        pos.set(x,y,z).applyQuaternion(turn).add(base);
        scale.set(sx,sy,sz);
        temp.compose(pos,turn,scale);part.mesh.setMatrixAt(actor.index,temp);
      }
      base.set(walkPos.x,0,walkPos.z);
      const status=actor.statusIds;
      for(const effect of effects){
        const active=(effect.name==='shield'&&status.has('protected'))||
          (effect.name==='attack'&&(status.has('dead')||status.has('wolf_bitten')))||
          (effect.name==='vote'&&status.has('marked'))||
          Number(actor.effects.get(effect.name)||0)>time;
        const size=active?effect.size*(1+(reducedMotion?0:.05*Math.sin(time*.005+actor.index))):.00001;
        pos.set(walkPos.x,.78,walkPos.z);scale.set(size,size,size);
        quat.setFromAxisAngle(up,time*.0005);
        temp.compose(pos,quat,scale);effect.mesh.setMatrixAt(actor.index,temp);
      }
    }
    if(activeBeam&&time>=activeBeam.start&&time<activeBeam.until){
      const caster=byId.get(activeBeam.actorId),target=byId.get(activeBeam.targetId);
      if(caster&&target){
        const casterWorld=renderWalkPosition(caster.position,caster.approach,caster.travel,time);
        const targetWorld=renderWalkPosition(target.position,target.approach,target.travel,time);
        beamFrom.set(casterWorld.x,1.4,casterWorld.z);
        beamTo.set(targetWorld.x,.82,targetWorld.z);
        beamDir.subVectors(beamTo,beamFrom);
        const distance=beamDir.length();
        if(distance>.25){
          spellBeam.position.copy(beamFrom).add(beamTo).multiplyScalar(.5);
          spellBeam.quaternion.setFromUnitVectors(beamUp,beamDir.multiplyScalar(1/distance));
          spellBeam.scale.set(1,distance,1);
          beamMaterial.color.set({shield:'#69f2ed',heal:'#72f4af',inspect:'#d0b4ff',attack:'#ff94cb',vote:'#ffd680'}[activeBeam.kind]||'#82edec');
          beamMaterial.opacity=reducedMotion?.55:.69+.13*Math.sin(time*.015);
          spellBeam.visible=true;
          spellVfx.update({type:activeBeam.kind,from:beamFrom,to:beamTo,
            start:activeBeam.start,end:activeBeam.until},time);
        }else {spellBeam.visible=false;spellVfx.clear();}
      }else {spellBeam.visible=false;spellVfx.clear();}
    }else{spellBeam.visible=false;spellVfx.clear();if(activeBeam&&time>=activeBeam.until)activeBeam=null;}
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
    spellBeam.geometry.dispose();spellBeam.material.dispose();spellVfx.dispose();
    actors.length=0;byId.clear();
  }
  return {setActors,turnActor,performGesture,interact,setServerEffects,setCastingTurn,clearEffects,setReducedMotion,setLowPower,draw,pick,dispose,
    artVersion:CHARACTER_ART_VERSION,
    get actorCount(){return actors.length},get drawUpdates(){return updates},get drawBudget(){return meshes.length+effects.length+1+spellVfx.drawBudget},
    get spellVfxActive(){return spellVfx.active},get spellVfxKind(){return spellVfx.effectKind},
    get spellVfxPearls(){return spellVfx.visiblePearls},
    get beamVisible(){return spellBeam.visible},
    get actors(){const now=performance.now();return actors.map(a=>({id:a.id,position:a.position,
      renderPosition:renderWalkPosition(a.position,a.approach,a.travel,now),
      progress:travelProgress(a.travel,now),yaw:a.yaw,statusIds:[...a.statusIds],
      standing:a.standUntil>now,casting:a.castUntil>now&&a.castStartedAt<=now}))},
    get activeCaster(){return actors.find(a=>a.travel?.to===1&&a.standUntil>performance.now())?.id||null},
    get activeCasterWorld(){const a=actors.find(x=>x.travel?.to===1&&x.standUntil>performance.now());
      return a?renderWalkPosition(a.position,a.approach,a.travel,performance.now()):null}};
}
