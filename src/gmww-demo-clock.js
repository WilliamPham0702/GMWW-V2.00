// Virtual milliseconds use the saved game durations. Ordinary rooms never use this clock.
export function projectDemoClock(clock,now){
 const speed=Math.max(1,Number(clock?.speed)||1),at=Number(clock?.at)||now,
  until=Number(clock?.until)||0,elapsed=clock?.running?Math.max(0,Math.min(now,until)-at):0,
  remainingMs=Math.max(0,(Number(clock?.remainingMs)||0)-elapsed*speed),
  running=clock?.running===true&&until>now;
 return {...clock,speed,remainingMs,running,at:now,deadlineAt:running?now+remainingMs/speed:null};
}
export function nextDemoClock(previous,context,lease,now){
 const prior=previous?.key===context.key?projectDemoClock(previous,now):{...context,remainingMs:Math.max(0,Number(context.durationMs)||0)},
  speed=[1,2,5,10].includes(Number(lease?.speed))?Number(lease.speed):1,
  running=lease?.running===true&&Number(lease?.until)>now;
 return {...prior,...context,speed,running,until:Number(lease?.until)||0,at:now,
  deadlineAt:running?now+prior.remainingMs/speed:null};
}
