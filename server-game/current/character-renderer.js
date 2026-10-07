(function(g){
  'use strict';
  const VERSION='0.3.0';
  const MASTER='character-01';
  const PROOF=Object.freeze(Array.from({length:20},(_,i)=>'character-'+String(i+1).padStart(2,'0')));
  const SEGMENTS=Object.freeze([
    ['leg-back','leg-back'],['leg-front','leg-front'],['torso','torso'],
    ['arm-back','arm-back'],['arm-front','arm-front'],['head','head']
  ]);
  const STATES=new Set(['idle','walking','running','ready','playing','reaction','dead']);
  const MOTIONS=new Set(['idle-breathe','blink','look-around','stretch','walk','run','turn','ready','cheer','surprised','sad','dead']);
  const LIVE_IDLE_SLOT_MS=7000,LIVE_IDLE_ROOTS=new Set();let liveIdleTimer=0;
  function hash32(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function unit(seed){return (hash32(seed)%1000000)/1000000}
  function liveIdleMotionAt(characterId,now=Date.now()){
    const id=/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(String(characterId||''))?String(characterId):MASTER;
    const t=Math.max(0,Number(now)||0),phase=hash32(id+':idle-phase')%LIVE_IDLE_SLOT_MS,shifted=t+phase,slot=Math.floor(shifted/LIVE_IDLE_SLOT_MS),local=shifted%LIVE_IDLE_SLOT_MS,roll=unit(id+':'+slot+':idle-live');
    const motion=roll<.38?'blink':roll<.64?'look-around':roll<.76?'stretch':'idle-breathe',duration=motion==='blink'?520:motion==='look-around'?1500:motion==='stretch'?1700:0;
    return local<duration?motion:'idle-breathe';
  }
  function tickLiveIdle(now=Date.now()){for(const root of [...LIVE_IDLE_ROOTS]){if(!root?.isConnected){LIVE_IDLE_ROOTS.delete(root);continue}if(root.dataset.state==='idle')root.dataset.motion=liveIdleMotionAt(root.dataset.characterId,now)}return LIVE_IDLE_ROOTS.size}
  function ensureLiveIdleTicker(){if(liveIdleTimer||typeof setInterval!=='function')return;liveIdleTimer=setInterval(()=>tickLiveIdle(Date.now()),240)}
  function idlePhaseMsFor(characterId){const m=String(characterId||'').match(/(\d{1,2})$/),n=m?Number(m[1]):1;return -((n*431+137)%6800)}
  function motionProfileFor(state='idle',rigId='rig-male-muscular-v1'){
    const normal=String(rigId)==='rig-male-normal-v1';
    if(state==='running')return{cycleMs:normal?360:390,legForward:normal?15:14,legBack:normal?-17:-16,arm:normal?14:13,lift:normal?3.3:3.1,lean:normal?-1.6:-2.1};
    if(state==='walking')return{cycleMs:normal?610:660,legForward:normal?11:9,legBack:normal?-12:-10,arm:normal?10:8,lift:normal?2.2:1.9,lean:normal?-.5:-.9};
    return{cycleMs:760,legForward:8,legBack:-9,arm:7,lift:1.5,lean:0};
  }
  function applyMotionProfile(root,state,rigId){
    const p=motionProfileFor(state,rigId);
    root.style.setProperty('--rig-cycle',p.cycleMs+'ms');
    root.style.setProperty('--rig-leg-forward',p.legForward+'deg');
    root.style.setProperty('--rig-leg-back',p.legBack+'deg');
    root.style.setProperty('--rig-arm-swing',p.arm+'deg');
    root.style.setProperty('--rig-body-lift',p.lift+'%');
    root.style.setProperty('--rig-body-lean',p.lean+'deg');
    root.dataset.gait=state==='running'?'run':state==='walking'?'walk':'rest';
  }
  function defaultRigIdFor(characterId){const m=String(characterId||'').match(/^character-(\d{2})$/),n=m?Number(m[1]):1;return n<=12?'rig-male-muscular-v1':n<=24?'rig-male-normal-v1':n<=36?'rig-female-v1':'rig-special-v1'}
  function normalize(command={},fallback=MASTER){
    const characterId=/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(String(command.characterId||''))?String(command.characterId):fallback;
    const state=STATES.has(String(command.state||''))?String(command.state):'idle';
    const motion=MOTIONS.has(String(command.motion||''))?String(command.motion):(state==='walking'?'walk':state==='running'?'run':state==='ready'?'ready':state==='dead'?'dead':'idle-breathe');
    return{characterId,rigId:String(command.rigId||defaultRigIdFor(characterId)),state,motion,facing:command.facing==='left'?'left':'right',loop:command.loop!==false,engineVersion:String(command.engineVersion||''),activity:String(command.activity||'idle')};
  }
  function rendererKind(id,{sitting=false}={}){return PROOF.includes(String(id))&&!sitting?'segmented-skeletal':'fallback'}
  function apply(root,command,textureUrl){
    if(!root)return false;
    const c=normalize(command,root.dataset.characterId||MASTER);
    root.dataset.characterId=c.characterId;root.dataset.state=c.state;root.dataset.motion=c.state==='idle'?liveIdleMotionAt(c.characterId,Date.now()):c.motion;root.dataset.facing=c.facing;root.dataset.activity=c.activity;root.dataset.rigId=c.rigId;root.dataset.engineVersion=c.engineVersion;applyMotionProfile(root,c.state,c.rigId);
    if(root.dataset.textureFacing!==c.facing){
      root.dataset.textureFacing=c.facing;
      const src=typeof textureUrl==='function'?textureUrl(c.characterId,c.facing):'';
      if(src)root.querySelectorAll('img[data-rig-texture]').forEach(img=>{img.src=src});
    }
    return true;
  }
  function mount(host,{characterId=MASTER,command={},sitting=false,textureUrl}={}){
    if(!host||rendererKind(characterId,{sitting})!=='segmented-skeletal')return null;
    host.replaceChildren();
    const root=document.createElement('span');root.className='gmww-character-renderer gmww-segmented-rig';root.dataset.characterRenderer='segmented-skeletal';root.dataset.characterId=characterId;root.style.setProperty('--rig-idle-delay',idlePhaseMsFor(characterId)+'ms');
    const shadow=document.createElement('span');shadow.className='gmww-rig-shadow';root.append(shadow);
    const c=normalize({...command,characterId},characterId),src=typeof textureUrl==='function'?textureUrl(characterId,c.facing):'';
    for(const [id,cls] of SEGMENTS){
      const part=document.createElement('span');part.className='gmww-rig-part gmww-rig-'+cls;part.dataset.rigPart=id;
      const img=document.createElement('img');img.src=src;img.alt='';img.decoding='async';img.dataset.rigTexture='1';part.append(img);root.append(part);
    }
    host.append(root);LIVE_IDLE_ROOTS.add(root);ensureLiveIdleTicker();apply(root,c,textureUrl);return root;
  }
  function update(host,command,{textureUrl}={}){
    const root=host?.querySelector?.('[data-character-renderer="segmented-skeletal"]');if(!root)return false;
    return apply(root,command,textureUrl);
  }
  g.GMWW_CHARACTER_RENDERER=Object.freeze({version:VERSION,masterCharacterId:MASTER,proofIds:PROOF,segments:SEGMENTS,normalize,rendererKind,mount,update,liveIdleMotionAt,tickLiveIdle,motionProfileFor});
})(window);
