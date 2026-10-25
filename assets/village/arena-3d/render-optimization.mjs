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
