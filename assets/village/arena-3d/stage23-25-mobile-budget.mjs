// Arena3D GĐ23–25 — bounded, public presentation-only performance controls.
// Neither rendering LOD nor device measurements may read Core roles/GM secrets.
export const ARENA_STAGE23_25_VERSION='gmww.arena.crowd-session.23-25';
// Keep heads, eyes, limbs, silhouettes, status markers and all Core VFX at any tier.
// Reduce distant decorative draw calls only when the number of actors grows.
const CROWD_20=Object.freeze(['shineL','shineR','cheekL','cheekR']);
const CROWD_24=Object.freeze([...CROWD_20,'pearl','shell','shellpin','ribbon','hairTail']);
const ECO=Object.freeze([...CROWD_24,'waistSash','shellCrown','cape','sailorCollar']);
const ESSENTIAL=Object.freeze(['tunic','skirt','head','hair','fringe','sidehairL','sidehairR',
  'eyeL','eyeR','armL','armR','shoeL','shoeR','stool']);
export function arenaCrowdDetailPolicy({characters=6,lowPower=false}={}){
 const count=Math.max(0,Math.min(30,Math.trunc(Number(characters)||0)));
 const hidden=lowPower?ECO:count>=24?CROWD_24:count>=20?CROWD_20:[];
 return Object.freeze({tier:lowPower?'eco':count>=24?'crowd30':count>=20?'crowd20':'full',
   hiddenParts:hidden,hiddenCount:hidden.length,characterCount:count,
   // Rendering-only result. No gameplay flags or player data.
   essentialParts:ESSENTIAL});
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=n=>Math.round(n*10)/10;
// Record one constant-size summary per minute, never individual frames or players.
// Data remains in the Safari tab memory and is copied only on user action.
export function createArenaSessionTrend({maxMinutes=30}={}){
 const cap=clamp(Math.trunc(Number(maxMinutes)||30),5,120);
 const buckets=[];
 let current=null,hidden=false,contextLost=false,minutesObserved=0,slowMinutes=0;
 const safe=n=>Number.isFinite(n)&&n>=0;
 function advance(minute){
  if(current&&minute!==current.minute){flush();current=null;}
  if(!current)current={minute,frames:0,drawSum:0,cpuMax:0,intervalMax:0,slow:0,active:0,charactersMax:0};
 }
 function flush(){
  if(!current||!current.frames)return;
  const x=current,entry=Object.freeze({
   frames:x.frames,drawCallsMean:round(x.drawSum/x.frames),
   cpuMaxMs:round(x.cpuMax),intervalMaxMs:round(x.intervalMax),
   slowFrameShare:round(x.slow/x.frames*100),
   activeFrameShare:round(x.active/x.frames*100),
   charactersMax:x.charactersMax
  });
  buckets.push(entry);if(buckets.length>cap)buckets.shift();
  minutesObserved++;if(entry.slowFrameShare>=20)slowMinutes++;
 }
 function observe({at,drawCalls,paintCpuMs,intervalMs,targetHz,characters,active=false}={}){
  if(hidden||contextLost||![at,drawCalls,paintCpuMs,targetHz,characters].every(safe)||targetHz<=0)return;
  const minute=Math.floor(at/60000);
  advance(minute);
  current.frames++;current.drawSum+=drawCalls;
  current.cpuMax=Math.max(current.cpuMax,paintCpuMs);
  if(safe(intervalMs)&&intervalMs<=1400){
   current.intervalMax=Math.max(current.intervalMax,intervalMs);
   if(intervalMs>1000/targetHz*1.5)current.slow++;
  }
  if(active)current.active++;
  current.charactersMax=Math.max(current.charactersMax,Math.trunc(characters));
 }
 function suspend(value){hidden=value===true;if(hidden){flush();current=null}}
 function gpuLost(){contextLost=true;flush();current=null}
 function gpuRestored(){contextLost=false;current=null}
 function reset(){buckets.length=0;current=null;minutesObserved=0;slowMinutes=0}
 function summary(){
  const list=current&&current.frames?[...buckets.slice(-(cap-1)),{
   frames:current.frames,drawCallsMean:round(current.drawSum/current.frames),
   cpuMaxMs:round(current.cpuMax),intervalMaxMs:round(current.intervalMax),
   slowFrameShare:round(current.slow/current.frames*100),
   activeFrameShare:round(current.active/current.frames*100),
   charactersMax:current.charactersMax
  }]:buckets;
  return Object.freeze({minutesObserved,storedWindows:list.length,windowCapacity:cap,
   observedFrames:list.reduce((s,x)=>s+x.frames,0),
   maxCharacters:list.reduce((s,x)=>Math.max(s,x.charactersMax),0),
   maxPaintCpuMs:list.reduce((s,x)=>Math.max(s,x.cpuMaxMs),0),
   maxFrameIntervalMs:list.reduce((s,x)=>Math.max(s,x.intervalMaxMs),0),
   slowMinutes,hidden,webglContextLost:contextLost,
   // Physical thermal and battery instrumentation is not available in Safari.
   thermalCelsius:null,batteryDrainPercent:null});
 }
 return Object.freeze({observe,suspend,gpuLost,gpuRestored,reset,summary});
}
