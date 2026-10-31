// Arena 3D Stage 5: pure, public-scene optimization for isolated STAGING.
// Only presentation fields are considered. Never inspect role, faction or GM token.
export function arenaSceneSignature(room, players) {
  return JSON.stringify([
    room?.code ?? null, room?.matchId ?? null, room?.seatCount ?? null, room?.seatLayout ?? null,
    (Array.isArray(players) ? players : []).map(p => [
      p.id, p.seatId, p.characterId, p.movementStatus,
      p.position?.x ?? null, p.position?.z ?? null,
      (p.statusTags || []).map(tag => tag.statusId).sort()
    ])
  ]);
}

// Samples requestAnimationFrame cadence (not the capped render FPS), so the
// quality tier can recover while rendering at the low-power 20 FPS cap.
export function createArenaAdaptiveQuality({windowSize=75,slowFrameMs=36,fastFrameMs=24,
  slowWindows=2,fastWindows=4,cooldownMs=12000,severeFrames=3}={}) {
  let previous=null,elapsed=0,count=0,slow=0,fast=0,severe=0,lowPower=false,lastChange=-Infinity;
  function clearSamples(){elapsed=0;count=0;slow=0;fast=0;severe=0;previous=null}
  function observe(now,visible=true) {
    if(!visible || !Number.isFinite(now)){clearSamples();return lowPower}
    if(previous!==null){
      const dt=now-previous;
      // One long frame can mean sleep/resume. Multiple long VISIBLE frames
      // indicate low-end mobile GPU overload: do not stay at high resolution.
      if(dt<=0||dt>1400){clearSamples()}
      else if(dt>250){
        elapsed=0;count=0;slow=0;fast=0;severe++;
        if(!lowPower&&severe>=severeFrames&&now-lastChange>=cooldownMs){
          lowPower=true;lastChange=now;severe=0;
        }
      }else{severe=0;elapsed+=dt;count++}
    }
    previous=now;
    if(count>=windowSize){
      const average=elapsed/count;elapsed=0;count=0;
      if(average>=slowFrameMs){slow++;fast=0}
      else if(average<=fastFrameMs){fast++;slow=0}
      else {slow=0;fast=0}
      if(now-lastChange>=cooldownMs){
        if(!lowPower && slow>=slowWindows){lowPower=true;lastChange=now;slow=0;fast=0}
        else if(lowPower && fast>=fastWindows){lowPower=false;lastChange=now;slow=0;fast=0}
      }
    }
    return lowPower;
  }
  return {observe,reset(){clearSamples();lowPower=false;lastChange=-Infinity},
    get lowPower(){return lowPower}};
}

/**
 * GĐ18: render cadence is presentation-only. Always keep Core networking and
 * WebSocket reconciliation running; cap GPU painting only, not the simulation.
 * An idle scene retains a 12Hz breathing animation instead of burning 30 FPS.
 */
export const ARENA_STAGE18_VERSION='gmww.arena.mobile-frame-pacing.18';
export function arenaTargetFrameHz({
 visible=true,active=false,interacting=false,lowPower=false,reducedMotion=false
}={}){
 if(!visible)return 0;
 if(lowPower)return active||interacting?20:8;
 if(reducedMotion)return active||interacting?20:10;
 return active||interacting?30:12;
}

/**
 * GĐ22: deadline-based animation pacing.
 * A naive "now-lastPaint >= interval" quantizes 12Hz to 10Hz on common
 * 60Hz Safari requestAnimationFrame. Advancing the absolute deadline,
 * instead of resetting it to actual paint time, compensates for 16.7ms ticks
 * while never attempting to "catch up" by rendering multiple frames.
 * Presentation only: Core / WebSocket / action timers are not throttled.
 */
export const ARENA_STAGE22_VERSION='gmww.arena.deadline-frame-pacing.22';
export function createArenaPaintScheduler(){
 let nextDue=null,previousTime=null,previousHz=0;
 function reset(){nextDue=null;previousTime=null;previousHz=0}
 function shouldPaint(now,targetHz,{paused=false}={}){
  if(paused||!Number.isFinite(now)||!Number.isFinite(targetHz)||targetHz<=0){
   reset();return false;
  }
  const interval=1000/targetHz;
  if(nextDue===null||previousHz!==targetHz||previousTime===null||
   now<previousTime||now-previousTime>1400){
   nextDue=now;previousHz=targetHz;
  }
  previousTime=now;
  // One-millisecond tolerance prevents floating-point near-boundary jitter.
  if(now+1<nextDue)return false;
  const missed=Math.max(1,Math.floor((now+1-nextDue)/interval)+1);
  nextDue+=missed*interval;
  return true;
 }
 return Object.freeze({shouldPaint,reset});
}

/** GĐ42: Player-only public crowd framebuffer policy. No Core or private data. */
export function arenaPlayerPixelRatio({characters=0,devicePixelRatio=1}={}){
 const count=Number.isFinite(characters)?Math.max(0,Math.trunc(characters)):0;
 const dpr=Number.isFinite(devicePixelRatio)&&devicePixelRatio>0?devicePixelRatio:1;
 return Math.min(dpr,count>=20?.85:1.1);
}
