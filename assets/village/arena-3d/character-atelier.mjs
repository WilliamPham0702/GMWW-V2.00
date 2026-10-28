// Arena 3D v3: compact 3D chibi characters. Technical procedural art, no texture downloads.
// All 6–30 actors share InstancedMesh geometries/materials; status/VFX are projections.
// No player role, faction, secret target, account token or game rule is stored here.
export const ARENA_ATELIER_VERSION='arena-chibi-instanced-v6-sea-art';
import {characterArtProfile,accessoryPartVisible,characterMotionFrame,CHARACTER_ART_VERSION} from './character-art-direction.mjs';
import {expressionFrame,renderQualityBudget,STAGE7_VERSION} from './stage7-expression-motion.mjs';
import {choreographyPose,approachPoint,renderWalkPosition,travelProgress,WALK_TIMING} from './casting-choreography.mjs';
import {createArenaSpellVfx} from './spell-vfx.mjs';
import {resolveRoleAnimation,animationMotion} from './stage10-role-animations.mjs';
import {arenaCrowdDetailPolicy} from './stage23-25-mobile-budget.mjs';
import {gallowsWorldPose} from './stage38-public-gallows.mjs';
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
  // GĐ18: low-power LOD removes tiny decorative mesh draw calls, but never
  // touches actor identity, seat positions, Core actions, heads or picking.
  let crowdTier='full';
  function applyVisualBudget(){
    const policy=arenaCrowdDetailPolicy({characters:actors.length,lowPower:qualityLowPower});
    if(policy.tier===crowdTier)return;
    crowdTier=policy.tier;
    const hidden=new Set(policy.hiddenParts);
    for(const part of meshes)part.mesh.visible=!hidden.has(part.name);
    // Force rematerialization before next GPU draw; restored accessories must
    // never retain stale matrices after an extended 30-player sequence.
    lastDraw=-1;
  }
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
  const spellBeams=Array.from({length:5},(_,index)=>{
    const beam=new THREE.Mesh(beamGeometry,index===0?beamMaterial:beamMaterial.clone());
    beam.visible=false;beam.frustumCulled=false;root.add(beam);return beam;
  });
  const wolfHeads=Array.from({length:5},()=>{
    const group=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:'#77dfe7'});
    const head=new THREE.Mesh(new THREE.SphereGeometry(.21,7,5),mat);group.add(head);
    for(const side of [-1,1]){
      const ear=new THREE.Mesh(new THREE.ConeGeometry(.09,.23,5),mat);
      ear.position.set(side*.13,.21,0);group.add(ear);
    }
    const muzzle=new THREE.Mesh(new THREE.ConeGeometry(.11,.22,6),mat);
    muzzle.rotation.x=Math.PI/2;muzzle.position.z=.22;group.add(muzzle);
    group.visible=false;root.add(group);return group;
  });
  const shieldDomes=Array.from({length:5},()=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.65,10,7),new THREE.MeshBasicMaterial({color:'#6cead9',wireframe:true,transparent:true,opacity:.45,depthWrite:false}));
    mesh.visible=false;root.add(mesh);return mesh;
  });
  const wand=new THREE.Mesh(new THREE.CylinderGeometry(.018,.027,.57,5),new THREE.MeshBasicMaterial({color:'#f5e2a7'}));
  wand.visible=false;root.add(wand);
  const impactRings=Array.from({length:5},()=>{
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(.44,.035,4,16),new THREE.MeshBasicMaterial({color:'#c9efff',transparent:true,opacity:.8,depthWrite:false}));
    mesh.rotation.x=Math.PI/2;mesh.visible=false;root.add(mesh);return mesh;
  });
  const spellBeam=spellBeams[0];
  const hideBeams=()=>{for(const beam of spellBeams)beam.visible=false;for(const head of wolfHeads)head.visible=false;for(const dome of shieldDomes)dome.visible=false;for(const ring of impactRings)ring.visible=false;wand.visible=false};
  const beamDir=new THREE.Vector3(),beamFrom=new THREE.Vector3(),beamTo=new THREE.Vector3();
  const beamUp=new THREE.Vector3(0,1,0);
  let activeBeam=null;
  const spellVfx=createArenaSpellVfx(THREE,root);
  const byId=new Map(),actors=[],up=new THREE.Vector3(0,1,0);
  let reducedMotion=false,lastDraw=-1,updates=0,qualityFps=60,qualityLowPower=false;
  // Public gallows projects the existing actor to the fire; no extra geometry.
  let gallowsActorId=null;
  const gallowsTravel=new Map();
  function gallowsProgress(state,now){
    if(!state)return 0;
    const from=clamp(state.startValue,0,1);
    const span=Math.max(1,1250*(state.direction==='out'?1-from:from));
    const t=clamp((now-state.startedAt)/span,0,1);
    const eased=t*t*(3-2*t);
    return state.direction==='out'?from+(1-from)*eased:from*(1-eased);
  }
  function setGallowsCandidate(id,now=performance.now()){
    const next=byId.has(String(id||''))?String(id):null;
    if(next===gallowsActorId)return false;
    if(gallowsActorId){
      const prev=gallowsTravel.get(gallowsActorId);
      gallowsTravel.set(gallowsActorId,{direction:'return',startedAt:now,
        startValue:gallowsProgress(prev,now)});
    }
    if(next){
      const prev=gallowsTravel.get(next);
      gallowsTravel.set(next,{direction:'out',startedAt:now,
        startValue:gallowsProgress(prev,now)});
    }
    gallowsActorId=next;
    return true;
  }
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
    if(gallowsActorId&&!byId.has(gallowsActorId)){gallowsActorId=null;gallowsTravel.clear();}
    for(const part of meshes){
      part.mesh.count=actors.length;
      if(part.mesh.instanceColor)part.mesh.instanceColor.needsUpdate=true;
    }
    for(const effect of effects)effect.mesh.count=actors.length;
    applyVisualBudget();
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
      currentTurn=turn;currentCast='';activeBeam=null;hideBeams();spellVfx.clear();
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
    const castKey=cast?[cue.turnId,cast.startedAt,cast.kind,cast.actorId,cast.actionId,cast.roleId,...(cast.targetIds||[])].join(':'):'';
    if(cast&&castKey!==currentCast&&authorizedIds.has(cast.actorId)&&Number(cast.expiresAt)>Date.now()){
      currentCast=castKey;
      const caster=byId.get(cast.actorId),target=(cast.targetIds||[]).map(id=>byId.get(id)).find(Boolean);
      if(caster){
        const elapsed=Math.max(250,Math.min(4000,Number(cast.expiresAt)-Date.now()));
        const walkEnd=(caster.travel?.startedAt||now)+(caster.travel?.duration||0);
        const spellStart=Math.max(now,Math.min(now+WALK_TIMING.approachMs,walkEnd));
        caster.animationProfile=resolveRoleAnimation({kind:cast.kind,roleId:cast.roleId,actionId:cast.actionId,authorizedFamily:cast.visualFamily});
        caster.gesture='cheer';caster.gestureEnd=spellStart+elapsed;
        caster.castStartedAt=spellStart;caster.castUntil=spellStart+elapsed;
        caster.standUntil=Math.max(caster.standUntil,spellStart+elapsed+WALK_TIMING.returnMs);
        if(target)caster.targetYaw=Math.atan2(target.position.x-caster.approach.x,target.position.z-caster.approach.z);
        const kind=['shield','inspect','heal','attack','vote'].includes(cast.kind)?cast.kind:'vote';
        caster.effects.set(kind,spellStart+elapsed);
        if(target)target.effects.set(kind,spellStart+elapsed);
        activeBeam=target?{actorId:caster.id,targetIds:(cast.targetIds||[]).filter(id=>byId.has(id)).slice(0,5),start:spellStart,until:spellStart+elapsed,kind,profile:caster.animationProfile}:null;
      }
    }
  }
  function clearEffects(){
    currentTurn='';currentCast='';activeBeam=null;hideBeams();spellVfx.clear();
    const now=performance.now();
    for(const actor of actors){actor.effects.clear();if(actor.travel?.to===1)moveActor(actor,0,now);actor.castUntil=0}
  }
  function setReducedMotion(value){reducedMotion=value===true;spellVfx.setReducedMotion(reducedMotion)}
  function setLowPower(value){
    const next=value===true;
    if(next===qualityLowPower)return;
    qualityLowPower=next;
    applyVisualBudget();
    spellVfx.setLowPower(next);
  }
  function setQualityFps(value){if(Number.isFinite(value)&&value>0)qualityFps=value}
  function draw(time,force=false){
    const animationHz=renderQualityBudget({characters:actors.length,fps:qualityFps,lowPower:qualityLowPower,reducedMotion}).animationHz;
    if(!force&&time-lastDraw<1000/animationHz)return false;
    const dt=lastDraw<0?0:Math.min(60,time-lastDraw);lastDraw=time;
    for(const actor of actors){
      actor.yaw+=clamp(actor.targetYaw-actor.yaw,-dt*.009,dt*.009);
      turn.setFromAxisAngle(up,actor.yaw);
      const inTransit=Boolean(actor.travel&&time>=actor.travel.startedAt&&
        time<actor.travel.startedAt+actor.travel.duration&&
        Math.abs(actor.travel.from-actor.travel.to)>.01);
      const moving=(actor.walk||inTransit)&&!reducedMotion;
      const pose=choreographyPose(actor,time,{lowMotion:reducedMotion});
      const gallowsTrack=gallowsTravel.get(actor.id);
      const gallowsFraction=gallowsProgress(gallowsTrack,time);
      if(gallowsTrack?.direction==='return'&&gallowsFraction<=0)gallowsTravel.delete(actor.id);
      const gallows=gallowsFraction>0?gallowsWorldPose(actor.position,{
        progress:gallowsFraction,now:time,reducedMotion}):null;
      const walkPos=gallows||renderWalkPosition(actor.position,actor.approach,actor.travel,
        reducedMotion?time+WALK_TIMING.approachMs:time);
      const gallowsLift=gallows?.lift||0,suspended=gallows?.suspended||false;
      const motion=characterMotionFrame({time,index:actor.index,moving,casting:Boolean(pose.casting),standing:Boolean(pose.stand),reducedMotion});
      const expression=expressionFrame({time,index:actor.index,moving,casting:Boolean(pose.casting),reducedMotion});
      base.set(walkPos.x,gallowsLift,walkPos.z);
      const bounce=reducedMotion?0:(moving?.065*Math.sin(time*.014+actor.index):.024*Math.sin(time*.0025+actor.index));
      // A long Core session must not retain stale effect deadlines or old
      // travel data after dozens of night/day cycles.
      for(const [kind,deadline] of actor.effects)if(deadline<=time)actor.effects.delete(kind);
      if(actor.travel?.to===0&&time>actor.travel.startedAt+actor.travel.duration+1000){
        actor.travel=null;
      }
      const gesturing=actor.gestureEnd>time&&!reducedMotion;
      if(!gesturing)actor.gesture='idle';
      for(const part of meshes){
        if(!part.mesh.visible)continue;
        let [x,y,z]=part.offset,[sx,sy,sz]=part.size;
        if(part.name==='head'||part.name==='hair'||part.name==='fringe'||part.name==='sidehairL'||part.name==='sidehairR'||part.name.startsWith('eye')||part.name.startsWith('shine')||part.name==='pearl'||part.name.startsWith('cheek')||part.name==='hairTail'){y+=bounce+motion.breath;x+=motion.headTilt+(gesturing?.024*Math.sin(time*.016):0)}
        if(part.name==='head')sx*=actor.look.headScale;
        if(part.name==='hair'||part.name==='fringe'||part.name==='hairTail')sy*=actor.look.hairHeight;
        if(part.name.startsWith('eye')){sx*=actor.look.eyeScale;sy*=actor.look.eyeScale*(1-.87*expression.blink);x+=expression.eyeFocus*.05}
        if(part.name==='tunic'||part.name==='waistSash')sx*=actor.look.outfitWidth;
        if(part.name==='skirt')sy*=actor.look.skirtLength;
        if(part.name==='cape'){z-=motion.capeSway;sy*=1+Math.abs(motion.capeSway)}
        if(part.name==='hair'||part.name==='fringe'||part.name==='hairTail')x+=expression.hairSway;
        if(part.name==='armL'||part.name==='armR')z+=expression.sleeveSway;
        if(part.name==='head')y+=expression.headNod;
        if(part.name==='cheekL'||part.name==='cheekR')y+=expression.cheekLift;
        if(part.name==='tunic'||part.name==='skirt')x+=motion.robeSway;
        if(part.name==='armL'||part.name==='armR'){
          if(suspended&&!reducedMotion)y+=.12*Math.sin(time*.016+(part.name==='armL'?0:Math.PI));
          if(gesturing&&actor.gesture==='wave'&&part.name==='armR')y+=.23+.15*Math.sin(time*.018);
          else if(gesturing&&actor.gesture==='cheer')y+=animationMotion(actor.animationProfile,time,{reducedMotion}).armLift;
          else y+=motion.armLift;
        }
        if(gesturing&&actor.gesture==='nod'&&(part.name==='head'||part.name==='hair'||part.name.startsWith('eye')))y-=.055*Math.sin(time*.017);
        if(!accessoryPartVisible(part.name,actor.look))sx=sy=sz=.00001;
        if(part.name==='shellpin'&&actor.look.badgeSide==='left')x=-Math.abs(x);
        if(part.name==='shellCrown')sy*=actor.look.hairHeight;
        if(part.name==='shoeL'||part.name==='shoeR')y+=motion.step;
        if(part.name!=='stool'){
          y*=.69+.31*(suspended?1:pose.stand);
          if(part.name==='skirt'||part.name==='tunic')sy*=.90+.1*(suspended?1:pose.stand);
          if(part.name.startsWith('shoe'))z+=(1-pose.stand)*.21;
          if(pose.casting&&part.name==='armR')y+=.24*Math.abs(Math.sin(time*.015));
        }
        if(part.name==='stool')base.set(actor.position.x,0,actor.position.z);
        else base.set(walkPos.x,gallowsLift,walkPos.z);
        pos.set(x,y,z).applyQuaternion(turn).add(base);
        scale.set(sx,sy,sz);
        temp.compose(pos,turn,scale);part.mesh.setMatrixAt(actor.index,temp);
      }
      base.set(walkPos.x,gallowsLift,walkPos.z);
      const status=actor.statusIds;
      for(const effect of effects){
        const active=(effect.name==='shield'&&status.has('protected'))||
          (effect.name==='attack'&&(status.has('dead')||status.has('wolf_bitten')))||
          (effect.name==='vote'&&status.has('marked'))||
          Number(actor.effects.get(effect.name)||0)>time;
        const size=active?effect.size*(1+(reducedMotion?0:.05*Math.sin(time*.005+actor.index))):.00001;
        pos.set(walkPos.x,.78+gallowsLift,walkPos.z);scale.set(size,size,size);
        quat.setFromAxisAngle(up,time*.0005);
        temp.compose(pos,quat,scale);effect.mesh.setMatrixAt(actor.index,temp);
      }
    }
    hideBeams();
    if(activeBeam&&time>=activeBeam.start&&time<activeBeam.until){
      const caster=byId.get(activeBeam.actorId);
      const profile=activeBeam.profile||resolveRoleAnimation({kind:activeBeam.kind});
      if(caster&&profile.motion==='wand-orbit'){
        const casterPos=renderWalkPosition(caster.position,caster.approach,caster.travel,time);
        wand.position.set(casterPos.x+.32,1.28+.16*Math.sin(time*.018),casterPos.z+.12);
        wand.rotation.z=.45*Math.sin(time*.015);wand.visible=true;
      }
      const casterWorld=caster&&renderWalkPosition(caster.position,caster.approach,caster.travel,time);
      let firstBeam=false;
      for(const [index,targetId] of activeBeam.targetIds.entries()){
        const target=byId.get(targetId),beam=spellBeams[index];
        if(!casterWorld||!target||!beam)continue;
        const targetWorld=renderWalkPosition(target.position,target.approach,target.travel,time);
        beamFrom.set(casterWorld.x,1.4,casterWorld.z);
        beamTo.set(targetWorld.x,.82,targetWorld.z);
        beamDir.subVectors(beamTo,beamFrom);
        const distance=beamDir.length();
        if(distance<=.25)continue;
        const ring=impactRings[index];
        ring.position.set(beamTo.x,beamTo.y+.1,beamTo.z);
        ring.material.color.set(profile.color||'#c9efff');
        ring.scale.setScalar((reducedMotion?.85:1+.13*Math.sin(time*.014))*(profile.signature?.impactScale||1));
        ring.visible=true;
        if(profile.projectile==='spectral-wolf-head'){
          const head=wolfHeads[index];
          const progress=reducedMotion?.78:Math.min(1,Math.max(0,(time-activeBeam.start)/(activeBeam.until-activeBeam.start)));
          head.position.copy(beamFrom).lerp(beamTo,progress);
          head.lookAt(beamTo);head.scale.setScalar((qualityLowPower?.8:1.2)*(profile.signature?.impactScale||1));
          head.visible=true;beam.visible=false;
          if(!firstBeam){firstBeam=true;spellVfx.clear();}
          continue;
        }
        if(profile.projectile==='pearl-shield'){
          const dome=shieldDomes[index];dome.position.copy(beamTo);dome.visible=true;
          dome.scale.setScalar(reducedMotion?1:1+.09*Math.sin(time*.012));
        }
        beam.position.copy(beamFrom).add(beamTo).multiplyScalar(.5);
        beam.quaternion.setFromUnitVectors(beamUp,beamDir.multiplyScalar(1/distance));
        beam.scale.set(1,distance,1);
        beam.material.color.set(profile.color||({shield:'#69f2ed',heal:'#72f4af',inspect:'#d0b4ff',attack:'#ff94cb',vote:'#ffd680'}[activeBeam.kind]||'#82edec'));
        beam.material.opacity=reducedMotion?.55:.69+.13*Math.sin(time*.015);
        beam.visible=true;
        if(!firstBeam){
          firstBeam=true;
          spellVfx.update({type:activeBeam.kind,from:beamFrom,to:beamTo,start:activeBeam.start,end:activeBeam.until,
            signature:profile.signature},time);
        }
      }
      if(!firstBeam)spellVfx.clear();
    }else{spellVfx.clear();if(activeBeam&&time>=activeBeam.until)activeBeam=null;}
    for(const item of meshes)if(item.mesh.visible)item.mesh.instanceMatrix.needsUpdate=true;
    for(const item of effects)item.mesh.instanceMatrix.needsUpdate=true;
    updates++;return true;
  }
  function hasActiveMotion(time=performance.now()){
    for(const motion of gallowsTravel.values()){
      const progress=gallowsProgress(motion,time);
      if(motion.direction==='out'?progress<1:progress>0)return true;
    }
    if(activeBeam&&time<activeBeam.until)return true;
    for(const actor of actors){
      if(actor.walk||actor.gestureEnd>time||actor.castUntil>time)return true;
      if(actor.travel&&time<actor.travel.startedAt+actor.travel.duration&&
        Math.abs(actor.travel.from-actor.travel.to)>.01)return true;
      for(const expires of actor.effects.values())if(expires>time)return true;
    }
    return false;
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
    spellBeam.geometry.dispose();for(const beam of spellBeams)beam.material.dispose();
    for(const head of wolfHeads){for(const part of head.children){part.geometry.dispose();part.material.dispose();}}
    for(const dome of shieldDomes){dome.geometry.dispose();dome.material.dispose();}
    for(const ring of impactRings){ring.geometry.dispose();ring.material.dispose();}
    wand.geometry.dispose();wand.material.dispose();spellVfx.dispose();
    actors.length=0;byId.clear();gallowsTravel.clear();gallowsActorId=null;
  }
  return {setActors,setGallowsCandidate,turnActor,performGesture,interact,setServerEffects,setCastingTurn,clearEffects,setReducedMotion,setLowPower,setQualityFps,draw,hasActiveMotion,pick,dispose,
    artVersion:CHARACTER_ART_VERSION,expressionVersion:STAGE7_VERSION,
    get gallowsActorId(){return gallowsActorId},get actorCount(){return actors.length},get crowdTier(){return crowdTier},get drawUpdates(){return updates},get drawBudget(){return meshes.length+effects.length+1+spellVfx.drawBudget},
    get peakVfxDrawBudget(){return spellBeams.length+wolfHeads.length*4+shieldDomes.length+impactRings.length+1},
    get spellVfxActive(){return spellVfx.active},get spellVfxKind(){return spellVfx.effectKind},
    get spellVfxPearls(){return spellVfx.visiblePearls},
    get beamVisible(){return spellBeams.some(beam=>beam.visible)},
    get visibleBeamCount(){return spellBeams.filter(beam=>beam.visible).length},
    get visibleWolfHeads(){return wolfHeads.filter(head=>head.visible).length},
    get visibleShieldDomes(){return shieldDomes.filter(dome=>dome.visible).length},
    get visibleImpactRings(){return impactRings.filter(ring=>ring.visible).length},
    get wandVisible(){return wand.visible},
    get actors(){const now=performance.now();return actors.map(a=>({id:a.id,position:a.position,
      renderPosition:renderWalkPosition(a.position,a.approach,a.travel,now),
      progress:travelProgress(a.travel,now),yaw:a.yaw,statusIds:[...a.statusIds],
      standing:a.standUntil>now,casting:a.castUntil>now&&a.castStartedAt<=now}))},
    get activeCaster(){return actors.find(a=>a.travel?.to===1&&a.standUntil>performance.now())?.id||null},
    get activeCasterWorld(){const a=actors.find(x=>x.travel?.to===1&&x.standUntil>performance.now());
      return a?renderWalkPosition(a.position,a.approach,a.travel,performance.now()):null}};
}
