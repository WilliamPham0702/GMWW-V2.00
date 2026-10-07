export const VILLAGE_AUTO_SIT_MS=30000;

function hash32(value){
  let h=2166136261;
  for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}

export function villageAutoPoint(id,step,layout){
  if(!layout?.clampPoint)throw new TypeError('VILLAGE_LAYOUT_REQUIRED');
  const key=String(id||'character')+':'+Math.trunc(Number(step)||0);
  const hx=hash32(key+':x'),hy=hash32(key+':y');
  const x=15+(hx%7000)/100;
  const y=35+(hy%6100)/100;
  return layout.clampPoint(x,y);
}

export function villageAutoLife({id,now=Date.now(),anchorAt=0,anchorPoint=null,stagger=true}={},layout){
  if(!layout?.clampPoint)throw new TypeError('VILLAGE_LAYOUT_REQUIRED');
  const key=String(id||'character');
  const moveMs=5200+(hash32(key+':move')%2600);
  const standMs=8000+(hash32(key+':stand')%5000);
  const sitMs=VILLAGE_AUTO_SIT_MS;
  const cycleMs=moveMs+standMs+sitMs;
  const base=Number.isFinite(Number(anchorAt))&&Number(anchorAt)>0?Number(anchorAt):Number(now);
  const phase=stagger?hash32(key+':phase')%cycleMs:0;
  const elapsed=Math.max(0,Number(now)-base)+phase;
  const step=Math.floor(elapsed/cycleMs);
  const within=elapsed%cycleMs;
  const cycleStart=Number(now)-within;
  const from=step===0&&anchorPoint?layout.clampPoint(anchorPoint.x,anchorPoint.y):villageAutoPoint(key,step-1,layout);
  const to=villageAutoPoint(key,step,layout);
  const moveId='visual:auto:'+key+':'+step;
  if(within<moveMs){
    return{positionX:from.x,positionY:from.y,movementStatus:'moving',villageActivity:'roaming',sitStartedAt:null,sitUntil:null,moveId,moveFromX:from.x,moveFromY:from.y,moveToX:to.x,moveToY:to.y,moveStartedAt:cycleStart,moveDurationMs:moveMs,moveTargetSeatId:null};
  }
  const standStartedAt=cycleStart+moveMs;
  if(within<moveMs+standMs){
    return{positionX:to.x,positionY:to.y,movementStatus:'idle',villageActivity:'idle',sitStartedAt:null,sitUntil:null,moveId:null,moveFromX:null,moveFromY:null,moveToX:null,moveToY:null,moveStartedAt:null,moveDurationMs:null,moveTargetSeatId:null,standStartedAt};
  }
  const sitStartedAt=standStartedAt+standMs;
  return{positionX:to.x,positionY:to.y,movementStatus:'idle',villageActivity:'sitting',sitStartedAt,sitUntil:sitStartedAt+sitMs,moveId:null,moveFromX:null,moveFromY:null,moveToX:null,moveToY:null,moveStartedAt:null,moveDurationMs:null,moveTargetSeatId:null};
}
