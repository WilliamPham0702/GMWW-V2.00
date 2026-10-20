// Server-authoritative daytime clock. Never mutate the saved game template.
const MAX_DAY_MS=24*60*60*1000;
export function dayClockRemainingMs(meta,config,nowMs=Date.now()){
  const paused=Number(meta?.autoPausedRemainingMs);
  if(meta?.autoGM===false&&meta?.autoPausedRemainingMs!=null&&Number.isFinite(paused))
    return Math.max(0,Math.min(MAX_DAY_MS,paused));
  const deadline=Date.parse(meta?.dayDeadlineAt||'');
  if(Number.isFinite(deadline))return Math.max(0,Math.min(MAX_DAY_MS,deadline-nowMs));
  const duration=Math.max(0,Number(config?.timing?.villageDiscussionSec)||0)*1000;
  const started=Date.parse(meta?.cycleStartedAt||'');
  return Math.max(0,Math.min(MAX_DAY_MS,Number.isFinite(started)?started+duration-nowMs:duration));
}
export function shiftDayClock(meta,config,deltaMinutes,nowMs=Date.now()){
  if(deltaMinutes!==1&&deltaMinutes!==-1)return null;
  const ms=Math.max(0,Math.min(MAX_DAY_MS,dayClockRemainingMs(meta,config,nowMs)+deltaMinutes*60000));
  return {remainingMs:ms,dayDeadlineAt:new Date(nowMs+ms).toISOString(),
    autoPausedRemainingMs:meta?.autoGM===false?ms:null};
}
