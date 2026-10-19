export const ACTIONS=Object.freeze(['idle','walk','run','turn']);
export const SOURCE15=Object.freeze({id:'character-15',walkCycleMs:610,runCycleMs:360,turnMs:540,baseline:'049373d4ba94c4efab61822de67766096808765e'});
export function createMotion(character,{facing='right',x=0}={}){
  if(!character?.atlas||character.frames?.length!==48)throw Error('Missing 48-frame atlas');
  if(!['left','right'].includes(facing))throw Error('Invalid direction');
  return {action:'idle',facing,x,elapsed:0,distance:0};
}
export function setAction(s,action){if(!ACTIONS.includes(action))throw Error('Unknown action');s.action=action;s.elapsed=0;s.distance=0;}
export function advance(s,ms){
  if(!Number.isFinite(ms)||ms<0)throw Error('Invalid delta');
  s.elapsed+=ms;
  if(s.action==='walk'||s.action==='run'){
    const stride=s.action==='walk'?68:100, cycle=s.action==='walk'?SOURCE15.walkCycleMs:SOURCE15.runCycleMs;
    const dx=ms*stride/cycle;s.distance+=dx;s.x+=(s.facing==='left'?-dx:dx);
  }
  if(s.action==='turn'&&s.elapsed>=SOURCE15.turnMs){s.facing=s.facing==='left'?'right':'left';setAction(s,'idle');}
  return sampleFrame(s);
}
export function sampleFrame(s){
  if(s.action==='turn')return Math.min(7,Math.floor(s.elapsed/SOURCE15.turnMs*8));
  if(s.action==='idle')return 8+Math.floor(s.elapsed/250)%8;
  const run=s.action==='run', row=(run?4:2)+(s.facing==='left'?1:0),stride=run?100:68;
  return row*8+Math.floor(s.distance/stride*8)%8;
}
