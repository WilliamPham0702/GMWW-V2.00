// Only public timing information. Never expose actors, targets or secret night actions.
export function projectPublicTurnClock(runtime,serverTime=Date.now()){
  if(!runtime||runtime.completed||!Number.isFinite(serverTime))return null;
  const current=Array.isArray(runtime.queue)?runtime.queue[Math.max(0,Number(runtime.cursor)||0)]:null;
  if(!current)return null;
  const paused=runtime.autoAdvance===false&&runtime.autoPausedRemainingMs!=null;
  const remainingWhenPaused=Number(runtime.autoPausedRemainingMs);
  const deadline=Date.parse(runtime.deadlineAt||"");
  const seconds=Number(current.durationSec);
  const started=Date.parse(current.startedAt||runtime.startedAt||"");
  let remainingMs=paused&&Number.isFinite(remainingWhenPaused)?remainingWhenPaused:
    Number.isFinite(deadline)?deadline-serverTime:
    Number.isFinite(seconds)&&seconds>0?
      (Number.isFinite(started)?seconds*1000-(serverTime-started):seconds*1000):NaN;
  if(!Number.isFinite(remainingMs))return null;
  return {remainingMs:Math.max(0,Math.ceil(remainingMs)),serverTime,paused};
}
