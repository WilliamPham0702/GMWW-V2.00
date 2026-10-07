export const CHARACTER_ENGINE_VERSION='0.1.0';

export const CHARACTER_STATES=Object.freeze({
  IDLE:'idle',
  WALKING:'walking',
  RUNNING:'running',
  READY:'ready',
  PLAYING:'playing',
  REACTION:'reaction',
  DEAD:'dead'
});

export const CHARACTER_ARCHETYPES=Object.freeze({
  MALE_MUSCULAR:'male-muscular',
  MALE_NORMAL:'male-normal',
  FEMALE:'female',
  SPECIAL:'special'
});

const RIG_BONES=Object.freeze([
  'root','hips','spine','chest','neck','head',
  'upperArm.L','forearm.L','hand.L',
  'upperArm.R','forearm.R','hand.R',
  'thigh.L','shin.L','foot.L',
  'thigh.R','shin.R','foot.R'
]);

export const SHARED_RIGS=Object.freeze({
  [CHARACTER_ARCHETYPES.MALE_MUSCULAR]:Object.freeze({id:'rig-male-muscular-v1',bones:RIG_BONES,scale:1}),
  [CHARACTER_ARCHETYPES.MALE_NORMAL]:Object.freeze({id:'rig-male-normal-v1',bones:RIG_BONES,scale:.98}),
  [CHARACTER_ARCHETYPES.FEMALE]:Object.freeze({id:'rig-female-v1',bones:RIG_BONES,scale:.96}),
  [CHARACTER_ARCHETYPES.SPECIAL]:Object.freeze({id:'rig-special-v1',bones:RIG_BONES,scale:1})
});

export const SHARED_MOTIONS=Object.freeze({
  idle:Object.freeze({id:'idle-breathe',loop:true,priority:0}),
  blink:Object.freeze({id:'blink',loop:false,priority:1}),
  look:Object.freeze({id:'look-around',loop:false,priority:1}),
  stretch:Object.freeze({id:'stretch',loop:false,priority:1}),
  walk:Object.freeze({id:'walk',loop:true,priority:2}),
  run:Object.freeze({id:'run',loop:true,priority:3}),
  turn:Object.freeze({id:'turn',loop:false,priority:3}),
  ready:Object.freeze({id:'ready',loop:true,priority:2}),
  cheer:Object.freeze({id:'cheer',loop:false,priority:4}),
  surprised:Object.freeze({id:'surprised',loop:false,priority:4}),
  sad:Object.freeze({id:'sad',loop:true,priority:4}),
  dead:Object.freeze({id:'dead',loop:true,priority:5})
});

const TRANSITIONS=Object.freeze({
  idle:new Set(['walking','running','ready','playing','reaction','dead']),
  walking:new Set(['idle','running','ready','playing','reaction','dead']),
  running:new Set(['idle','walking','ready','playing','reaction','dead']),
  ready:new Set(['idle','walking','playing','reaction','dead']),
  playing:new Set(['idle','walking','running','reaction','dead']),
  reaction:new Set(['idle','ready','playing','dead']),
  dead:new Set([])
});

export const CHARACTER_MASTER=Object.freeze({
  id:'character-01',
  archetype:CHARACTER_ARCHETYPES.MALE_MUSCULAR,
  rigId:SHARED_RIGS[CHARACTER_ARCHETYPES.MALE_MUSCULAR].id,
  renderer:'adapter',
  fallback:Object.freeze({
    idle:'/avatars/character-01',
    walkRight:'/characters/walk/character-01?dir=right',
    walkLeft:'/characters/walk/character-01?dir=left'
  }),
  motionSet:Object.freeze(Object.keys(SHARED_MOTIONS))
});

function hash32(value){
  let h=2166136261;
  for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}
function unit(seed){return (hash32(seed)%1000000)/1000000}

export function normalizeCharacterId(id){
  const m=String(id||'').match(/^(?:character-)?(\d{1,2})$/i);
  if(!m)return null;
  const n=Number(m[1]);
  if(n<1||n>42)return null;
  return `character-${String(n).padStart(2,'0')}`;
}

export function defaultArchetypeFor(id){
  const normalized=normalizeCharacterId(id);
  if(!normalized)return CHARACTER_ARCHETYPES.SPECIAL;
  const n=Number(normalized.slice(-2));
  if(n<=12)return CHARACTER_ARCHETYPES.MALE_MUSCULAR;
  if(n<=24)return CHARACTER_ARCHETYPES.MALE_NORMAL;
  if(n<=36)return CHARACTER_ARCHETYPES.FEMALE;
  return CHARACTER_ARCHETYPES.SPECIAL;
}

export function createCharacterModel({id='character-01',archetype,personality='balanced',now=0}={}){
  const normalized=normalizeCharacterId(id);
  if(!normalized)throw new TypeError('INVALID_CHARACTER_ID');
  const chosen=archetype||defaultArchetypeFor(normalized);
  if(!SHARED_RIGS[chosen])throw new TypeError('INVALID_CHARACTER_ARCHETYPE');
  return {
    id:normalized,
    archetype:chosen,
    rigId:SHARED_RIGS[chosen].id,
    personality:String(personality||'balanced'),
    state:CHARACTER_STATES.IDLE,
    motion:'idle',
    facing:'right',
    x:0,
    y:0,
    target:null,
    stateChangedAt:Number(now)||0,
    behaviorIndex:0,
    nextBehaviorAt:Number(now)||0,
    reaction:null
  };
}

export function canTransition(from,to){
  return from===to||Boolean(TRANSITIONS[from]?.has(to));
}

export function motionForState(state,reaction){
  if(state===CHARACTER_STATES.WALKING)return 'walk';
  if(state===CHARACTER_STATES.RUNNING)return 'run';
  if(state===CHARACTER_STATES.READY)return 'ready';
  if(state===CHARACTER_STATES.DEAD)return 'dead';
  if(state===CHARACTER_STATES.REACTION)return SHARED_MOTIONS[reaction] ? reaction : 'surprised';
  return 'idle';
}

export function transitionCharacter(model,next,{now=Date.now(),reaction=null}={}){
  if(!model||!TRANSITIONS[model.state])throw new TypeError('INVALID_CHARACTER_MODEL');
  if(!TRANSITIONS[next])throw new TypeError('INVALID_CHARACTER_STATE');
  if(!canTransition(model.state,next))return {...model,transitionRejected:true};
  return {
    ...model,
    state:next,
    motion:motionForState(next,reaction),
    stateChangedAt:Number(now)||0,
    reaction:next===CHARACTER_STATES.REACTION?(reaction||'surprised'):null,
    transitionRejected:false
  };
}

export function facingForDelta(dx,current='right'){
  const n=Number(dx)||0;
  if(Math.abs(n)<.0001)return current==='left'?'left':'right';
  return n<0?'left':'right';
}

export function beginCharacterMove(model,{x,y,run=false,now=Date.now()}={}){
  const tx=Number(x),ty=Number(y);
  if(!Number.isFinite(tx)||!Number.isFinite(ty))throw new TypeError('INVALID_CHARACTER_TARGET');
  const next=transitionCharacter(model,run?CHARACTER_STATES.RUNNING:CHARACTER_STATES.WALKING,{now});
  return {...next,target:{x:tx,y:ty},facing:facingForDelta(tx-Number(model.x||0),model.facing)};
}

export function arriveCharacter(model,{x,y,now=Date.now(),nextState=CHARACTER_STATES.IDLE}={}){
  const px=Number.isFinite(Number(x))?Number(x):Number(model?.target?.x??model?.x??0);
  const py=Number.isFinite(Number(y))?Number(y):Number(model?.target?.y??model?.y??0);
  const base={...model,x:px,y:py,target:null};
  return transitionCharacter(base,nextState,{now});
}

const IDLE_BEHAVIORS=Object.freeze(['blink','look','idle','stretch','look','blink']);

export function scheduleIdleBehavior(model,{now=Date.now(),minDelayMs=2200,maxDelayMs=6200}={}){
  if(model.state!==CHARACTER_STATES.IDLE)return model;
  const index=Math.max(0,Number(model.behaviorIndex)||0);
  const pick=Math.floor(unit(`${model.id}:${index}:behavior`)*IDLE_BEHAVIORS.length);
  const behavior=IDLE_BEHAVIORS[pick];
  const span=Math.max(0,Number(maxDelayMs)-Number(minDelayMs));
  const delay=Math.max(0,Number(minDelayMs))+Math.round(unit(`${model.id}:${index}:delay`)*span);
  return {...model,motion:behavior,behaviorIndex:index+1,nextBehaviorAt:Number(now)+delay};
}

export function tickCharacter(model,{now=Date.now()}={}){
  if(!model)return model;
  if(model.state===CHARACTER_STATES.IDLE&&Number(now)>=Number(model.nextBehaviorAt||0)){
    return scheduleIdleBehavior(model,{now});
  }
  return model;
}

export function createCharacterManifest(ids=Array.from({length:42},(_,i)=>`character-${String(i+1).padStart(2,'0')}`)){
  return ids.map(id=>{
    const normalized=normalizeCharacterId(id);
    if(!normalized)throw new TypeError('INVALID_CHARACTER_ID');
    const archetype=defaultArchetypeFor(normalized);
    return {id:normalized,archetype,rigId:SHARED_RIGS[archetype].id,motions:Object.keys(SHARED_MOTIONS)};
  });
}

export function characterRendererCommand(model){
  const motion=SHARED_MOTIONS[model?.motion]||SHARED_MOTIONS.idle;
  return {
    characterId:model?.id||CHARACTER_MASTER.id,
    rigId:model?.rigId||CHARACTER_MASTER.rigId,
    state:model?.state||CHARACTER_STATES.IDLE,
    motion:motion.id,
    facing:model?.facing==='left'?'left':'right',
    loop:motion.loop,
    x:Number(model?.x||0),
    y:Number(model?.y||0)
  };
}


export function characterStateFromPlayer(player,{now=Date.now()}={}){
  const id=normalizeCharacterId(player?.gameCharacterId)||CHARACTER_MASTER.id;
  let model=createCharacterModel({id,now});
  model={...model,
    x:Number(player?.positionX??player?.moveFromX??0)||0,
    y:Number(player?.positionY??player?.moveFromY??0)||0
  };
  if(player?.movementStatus==='moving'){
    const tx=Number(player?.moveToX),ty=Number(player?.moveToY);
    if(Number.isFinite(tx)&&Number.isFinite(ty)){
      model=beginCharacterMove(model,{x:tx,y:ty,run:String(player?.villageActivity||'')==='running',now:Number(player?.moveStartedAt||now)});
    }
  }else if(player?.ready){
    model=transitionCharacter(model,CHARACTER_STATES.READY,{now});
  }
  const command=characterRendererCommand(model);
  return {
    ...command,
    activity:String(player?.villageActivity||'idle'),
    sourceMoveId:player?.moveId||null,
    engineVersion:CHARACTER_ENGINE_VERSION
  };
}
