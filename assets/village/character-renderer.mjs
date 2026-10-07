export const CHARACTER_RENDERER_VERSION='0.2.0';
export const MASTER_CHARACTER_ID='character-01';
export const SHARED_RIG_BATCH_IDS=Object.freeze(Array.from({length:20},(_,i)=>`character-${String(i+1).padStart(2,'0')}`));
export const SHARED_RIG_PROOF_IDS=SHARED_RIG_BATCH_IDS;

const STATES=new Set(['idle','walking','running','ready','playing','reaction','dead']);
const MOTIONS=new Set(['idle-breathe','blink','look-around','stretch','walk','run','turn','ready','cheer','surprised','sad','dead']);
const LIVE_IDLE_SLOT_MS=7000;
const LIVE_IDLE_ROOTS=new Set();
let liveIdleTimer=0;
function hash32(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function unit(seed){return (hash32(seed)%1000000)/1000000}
export function liveIdleMotionAt(characterId,now=Date.now()){
  const id=/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(String(characterId||''))?String(characterId):MASTER_CHARACTER_ID;
  const t=Math.max(0,Number(now)||0),phase=hash32(id+':idle-phase')%LIVE_IDLE_SLOT_MS,shifted=t+phase,slot=Math.floor(shifted/LIVE_IDLE_SLOT_MS),local=shifted%LIVE_IDLE_SLOT_MS,roll=unit(id+':'+slot+':idle-live');
  const motion=roll<.38?'blink':roll<.64?'look-around':roll<.76?'stretch':'idle-breathe';
  const duration=motion==='blink'?520:motion==='look-around'?1500:motion==='stretch'?1700:0;
  return local<duration?motion:'idle-breathe';
}
export function tickLiveIdle(now=Date.now()){
  for(const root of [...LIVE_IDLE_ROOTS]){
    if(!root?.isConnected){LIVE_IDLE_ROOTS.delete(root);continue}
    if(root.dataset.state==='idle')root.dataset.motion=liveIdleMotionAt(root.dataset.characterId,now);
  }
  return LIVE_IDLE_ROOTS.size;
}
function ensureLiveIdleTicker(){
  if(liveIdleTimer||typeof setInterval!=='function')return;
  liveIdleTimer=setInterval(()=>tickLiveIdle(Date.now()),240);
}

export const MASTER_RIG_SEGMENTS=Object.freeze([
  Object.freeze({id:'leg-back',className:'leg-back'}),
  Object.freeze({id:'leg-front',className:'leg-front'}),
  Object.freeze({id:'torso',className:'torso'}),
  Object.freeze({id:'arm-back',className:'arm-back'}),
  Object.freeze({id:'arm-front',className:'arm-front'}),
  Object.freeze({id:'head',className:'head'})
]);

export function idlePhaseMsFor(characterId){
  const m=String(characterId||'').match(/(\d{1,2})$/),n=m?Number(m[1]):1;
  return -((n*431+137)%6800);
}

export function defaultRigIdFor(characterId){
  const m=String(characterId||'').match(/^character-(\d{2})$/),n=m?Number(m[1]):1;
  return n<=12?'rig-male-muscular-v1':n<=24?'rig-male-normal-v1':n<=36?'rig-female-v1':'rig-special-v1';
}

export function normalizeRendererCommand(command={},fallbackCharacterId=MASTER_CHARACTER_ID){
  const characterId=/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(String(command.characterId||''))?String(command.characterId):fallbackCharacterId;
  const state=STATES.has(String(command.state||''))?String(command.state):'idle';
  const motion=MOTIONS.has(String(command.motion||''))?String(command.motion):(state==='walking'?'walk':state==='running'?'run':state==='ready'?'ready':state==='dead'?'dead':'idle-breathe');
  return{
    characterId,
    rigId:String(command.rigId||defaultRigIdFor(characterId)),
    state,
    motion,
    facing:command.facing==='left'?'left':'right',
    loop:command.loop!==false,
    engineVersion:String(command.engineVersion||''),
    activity:String(command.activity||'idle')
  };
}

export function masterTextureUrl(characterId=MASTER_CHARACTER_ID,facing='right'){
  const id=/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(String(characterId))?String(characterId):MASTER_CHARACTER_ID;
  return '/api/game-characters/'+encodeURIComponent(id)+'/frame/1'+(facing==='left'?'?dir=left':'');
}

export function rendererKind(characterId,{sitting=false}={}){
  return SHARED_RIG_BATCH_IDS.includes(String(characterId))&&!sitting?'segmented-skeletal':'fallback';
}

function applyCommand(root,command){
  if(!root)return;
  const c=normalizeRendererCommand(command,root.dataset.characterId||MASTER_CHARACTER_ID);
  root.dataset.characterId=c.characterId;
  root.dataset.state=c.state;
  root.dataset.motion=c.state==='idle'?liveIdleMotionAt(c.characterId,Date.now()):c.motion;
  root.dataset.facing=c.facing;
  root.dataset.activity=c.activity;
  root.dataset.rigId=c.rigId;
  root.dataset.engineVersion=c.engineVersion;
  if(root.dataset.textureFacing!==c.facing){
    root.dataset.textureFacing=c.facing;
    const src=masterTextureUrl(c.characterId,c.facing);
    root.querySelectorAll('img[data-rig-texture]').forEach(img=>{if(img.src!==src)img.src=src});
  }
}

function fallbackImage(host,{characterId,command,sources=[]}){
  const root=document.createElement('span');
  root.className='gmww-character-renderer gmww-character-fallback';
  root.dataset.characterRenderer='fallback';
  root.dataset.characterId=characterId;
  const img=document.createElement('img');
  img.alt='';
  img.loading='eager';
  img.decoding='async';
  img.dataset.walkCharacter=characterId;
  let sourceIndex=0;
  const safeSources=sources.filter(Boolean);
  img.src=safeSources[0]||masterTextureUrl(characterId,command?.facing);
  img.addEventListener('error',()=>{
    sourceIndex++;
    if(sourceIndex<safeSources.length)img.src=safeSources[sourceIndex];
  });
  root.append(img);
  host.append(root);
  return root;
}

export function mountCharacterRenderer(host,{characterId=MASTER_CHARACTER_ID,command={},sources=[],sitting=false}={}){
  const normalized=normalizeRendererCommand({...command,characterId},characterId);
  if(rendererKind(characterId,{sitting})!=='segmented-skeletal')return fallbackImage(host,{characterId,command:normalized,sources});

  const root=document.createElement('span');
  root.className='gmww-character-renderer gmww-segmented-rig';
  root.dataset.characterRenderer='segmented-skeletal';
  root.dataset.characterId=characterId;
  root.style.setProperty('--rig-idle-delay',idlePhaseMsFor(characterId)+'ms');

  const shadow=document.createElement('span');
  shadow.className='gmww-rig-shadow';
  root.append(shadow);

  const texture=masterTextureUrl(characterId,normalized.facing);
  for(const segment of MASTER_RIG_SEGMENTS){
    const part=document.createElement('span');
    part.className='gmww-rig-part gmww-rig-'+segment.className;
    part.dataset.rigPart=segment.id;
    const img=document.createElement('img');
    img.src=texture;
    img.alt='';
    img.loading='eager';
    img.decoding='async';
    img.dataset.rigTexture='1';
    part.append(img);
    root.append(part);
  }
  host.append(root);
  LIVE_IDLE_ROOTS.add(root);ensureLiveIdleTicker();
  applyCommand(root,normalized);
  return root;
}

export function updateCharacterRenderer(host,command){
  const root=host?.querySelector?.('[data-character-renderer]');
  if(!root)return false;
  if(root.dataset.characterRenderer==='segmented-skeletal'){
    applyCommand(root,command);
    return true;
  }
  return false;
}
