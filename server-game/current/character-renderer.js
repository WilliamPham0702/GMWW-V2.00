(function(g){
  'use strict';
  const VERSION='0.1.0';
  const MASTER='character-01';
  const PROOF=Object.freeze(Array.from({length:20},(_,i)=>'character-'+String(i+1).padStart(2,'0')));
  const SEGMENTS=Object.freeze([
    ['leg-back','leg-back'],['leg-front','leg-front'],['torso','torso'],
    ['arm-back','arm-back'],['arm-front','arm-front'],['head','head']
  ]);
  const STATES=new Set(['idle','walking','running','ready','playing','reaction','dead']);
  const MOTIONS=new Set(['idle-breathe','blink','look-around','stretch','walk','run','turn','ready','cheer','surprised','sad','dead']);
  function idlePhaseMsFor(characterId){const m=String(characterId||'').match(/(\d{1,2})$/),n=m?Number(m[1]):1;return -((n*431+137)%6800)}
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
    root.dataset.characterId=c.characterId;root.dataset.state=c.state;root.dataset.motion=c.motion;root.dataset.facing=c.facing;root.dataset.activity=c.activity;root.dataset.rigId=c.rigId;root.dataset.engineVersion=c.engineVersion;
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
    host.append(root);apply(root,c,textureUrl);return root;
  }
  function update(host,command,{textureUrl}={}){
    const root=host?.querySelector?.('[data-character-renderer="segmented-skeletal"]');if(!root)return false;
    return apply(root,command,textureUrl);
  }
  g.GMWW_CHARACTER_RENDERER=Object.freeze({version:VERSION,masterCharacterId:MASTER,proofIds:PROOF,segments:SEGMENTS,normalize,rendererKind,mount,update});
})(window);
