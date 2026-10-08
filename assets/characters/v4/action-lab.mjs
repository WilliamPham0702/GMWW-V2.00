// GMWW V4 independent Web-only action contract. Never imported by live room/IPA.
// This is the movement/transition TEST LAB until 4-way production artwork is approved.
export const V4_ACTIONS=Object.freeze(['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
export const V4_DIRECTIONS=Object.freeze(['front','left','right','back']);
export const V4_FACE_LABELS=Object.freeze({front:'Xuống • nhìn trước',left:'Trái • mặt nghiêng trái',right:'Phải • mặt nghiêng phải',back:'Lên • nhìn sau lưng'});
export const TURN_DURATION_MS=300;
export const ACTION_DURATIONS=Object.freeze({idle:1600,walk:1300,run:850,sit:1500,'sit-down':1100,'stand-up':1000,wave:1450,vote:1250,result:1800});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=t=>{const u=clamp(t,0,1);return u*u*(3-2*u)};
const H=Object.freeze({front:0,right:90,back:180,left:270});
const directions=Object.freeze({front:{x:0,y:1},right:{x:1,y:0},back:{x:0,y:-1},left:{x:-1,y:0}});
export function headingTransition(a,b,t){
 if(!Object.hasOwn(H,a)||!Object.hasOwn(H,b))throw new Error('INVALID_FACING');
 const start=H[a],end=H[b],d=((end-start+540)%360)-180;
 return (start+d*smooth(t)+360)%360;
}
function safePoint(p){return {x:clamp(Number(p?.x)||.5,.08,.92),y:clamp(Number(p?.y)||.52,.08,.92)}}
export function startV4Action({actionId='idle',facing='front',targetFacing=facing,position={x:.5,y:.52},startAt=0,result='win',fromSeated=false,step=.28}={}){
 if(!V4_ACTIONS.includes(actionId))throw new Error('INVALID_ACTION');
 if(!V4_DIRECTIONS.includes(facing)||!V4_DIRECTIONS.includes(targetFacing))throw new Error('INVALID_FACING');
 if(!['win','lose'].includes(result))throw new Error('INVALID_RESULT');
 const from=safePoint(position),move=actionId==='walk'||actionId==='run',turnMs=move&&facing!==targetFacing?TURN_DURATION_MS:0;
 const diff=directions[targetFacing],len=clamp(Number(step)||.28,.05,.45),to=move?safePoint({x:from.x+diff.x*len,y:from.y+diff.y*len}):from;
 return Object.freeze({actionId,facing,targetFacing,from,to,startAt:Number(startAt)||0,turnMs,move,fromSeated:!!fromSeated,result,durationMs:ACTION_DURATIONS[actionId]+turnMs});
}
export function sampleV4Action(cmd,now=0){
 if(!cmd||!V4_ACTIONS.includes(cmd.actionId))throw new Error('INVALID_COMMAND');
 const elapsed=clamp((Number(now)||0)-cmd.startAt,0,cmd.durationMs),turning=cmd.turnMs>0&&elapsed<cmd.turnMs;
 const afterTurn=clamp(elapsed-cmd.turnMs,0,ACTION_DURATIONS[cmd.actionId]);
 const u=smooth(afterTurn/ACTION_DURATIONS[cmd.actionId]);
 const isMovement=cmd.move&&!turning,position=cmd.move?{x:cmd.from.x+(cmd.to.x-cmd.from.x)*u,y:cmd.from.y+(cmd.to.y-cmd.from.y)*u}:cmd.from;
 const sitBase=cmd.fromSeated?1:0;
 const seat=cmd.actionId==='sit'?1:cmd.actionId==='sit-down'?u:cmd.actionId==='stand-up'?1-u:sitBase;
 const moving=isMovement&&afterTurn<ACTION_DURATIONS[cmd.actionId];
 return Object.freeze({actionId:cmd.actionId,facing:turning?cmd.facing:cmd.targetFacing,desiredFacing:cmd.targetFacing,
  headingDeg:turning?headingTransition(cmd.facing,cmd.targetFacing,elapsed/cmd.turnMs):H[cmd.targetFacing],
  phase:turning?'turn':moving?'move':elapsed>=cmd.durationMs?'done':'pose',
  position,progress:u,pose:{headTiltDeg:0,sit:seat,handWave:cmd.actionId==='wave'?Math.sin(u*Math.PI*5):0,
  vote:cmd.actionId==='vote'?Math.sin(u*Math.PI):0,celebrate:cmd.actionId==='result'&&cmd.result==='win'?Math.sin(u*Math.PI):0,
  sad:cmd.actionId==='result'&&cmd.result==='lose'?Math.sin(u*Math.PI):0},
  completed:elapsed>=cmd.durationMs});
}
export function createV4StageController(initial={x:.5,y:.52}){
 let facing='front',position=safePoint(initial),seated=false,cmd=startV4Action({position,startAt:0});
 return Object.freeze({
  start(actionId,now,{targetFacing=facing,result='win'}={}){
   const current=sampleV4Action(cmd,now);position=current.position;
   // Mid-turn input: keep facing until turning completes; no sideways displacement.
   facing=current.phase==='turn'?cmd.facing:current.facing;
   seated=current.pose.sit>=.5;
   cmd=startV4Action({actionId,facing,targetFacing,position,startAt:now,result,fromSeated:seated,step:actionId==='run'?.34:.23});
   return cmd;
  },
  sample(now){const out=sampleV4Action(cmd,now);if(out.completed){facing=out.facing;position=out.position;seated=out.pose.sit>=.5}return out;},
  get command(){return cmd;}
 });
}
