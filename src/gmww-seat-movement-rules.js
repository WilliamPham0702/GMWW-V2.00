export function seatClaimConflict(players,participantId,seatId){
  const wanted=Math.trunc(Number(seatId));
  if(!Number.isFinite(wanted)||wanted<1)return null;
  for(const [id,p] of Object.entries(players||{})){
    if(String(id)===String(participantId))continue;
    if(Number(p?.seatId||0)===wanted||Number(p?.moveTargetSeatId||0)===wanted)return{id:String(id),player:p};
  }
  return null;
}
export function movementProgress(movement,now=Date.now()){
  const started=Number(movement?.moveStartedAt||0),duration=Math.max(1,Number(movement?.moveDurationMs||1));
  if(!started)return 1;
  return Math.max(0,Math.min(1,(Number(now)-started)/duration));
}
export function movementArrivalReady(movement,now=Date.now(),minFraction=.62){
  return movementProgress(movement,now)>=Math.max(0,Math.min(1,Number(minFraction)||.62));
}
export function movementRemainingMs(movement,now=Date.now(),minFraction=.62){
  const started=Number(movement?.moveStartedAt||0),duration=Math.max(1,Number(movement?.moveDurationMs||1)),threshold=started+duration*Math.max(0,Math.min(1,Number(minFraction)||.62));
  return Math.max(0,Math.ceil(threshold-Number(now)));
}
