// GMWW Character 2.5D V5.00 -- deterministic articulated movement core.
// No DOM, network, room state, or dependency on game characters in production.
export const V500_ACTIONS=Object.freeze(['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
export const V500_DIRECTIONS=Object.freeze(['front','front-right','right','back-right','back','back-left','left','front-left']);
export const V500_VERSION='5.00-master-01-webgl-lab';
export const V500_WALK_SPEED=1.65;
export const V500_RUN_SPEED=3.05;
const PI=Math.PI;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const relax=(a,b,dt,rate=11)=>a+(b-a)*(1-Math.exp(-rate*dt));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const angleTo=(a,b,dt)=>a+wrap(b-a)*(1-Math.exp(-9*dt));
export function facingAngle(direction){
 const i=V500_DIRECTIONS.indexOf(direction);
 if(i<0)throw Error('INVALID_DIRECTION');
 return wrap(i*PI/4);
}
const poseZero=()=>({hipY:0,hipRoll:0,hipLean:0,armL:0,armR:0,legL:0,legR:0,kneeL:0,kneeR:0,headRoll:0,headPitch:0,armLOut:0,armROut:0,bodyTilt:0});
export function createMotionState(id='character-01',x=0,z=0,offset=0){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('INVALID_POSITION');
 return {id,x,z,yaw:0,targetYaw:0,goal:null,run:false,pendingAction:null,action:'idle',time:0,actionTime:0,phase:offset,travelled:0,
  velocity:0,seated:false,pose:poseZero(),seed:offset};
}
export function setFacing(state,direction){
 state.targetYaw=facingAngle(direction);return state;
}
export function setAction(state,action){
 if(!V500_ACTIONS.includes(action))throw Error('INVALID_ACTION');
 state.goal=null;
 if(state.seated&&!['sit','sit-down','stand-up'].includes(action)){
  state.pendingAction=action;state.seated=false;state.action='stand-up';state.actionTime=0;return state;
 }
 state.pendingAction=null;
 if(state.action!==action){state.action=action;state.actionTime=0;}
 if(action==='sit')state.seated=true;
 if(action==='stand-up')state.seated=false;
 return state;
}
export function setDestination(state,x,z,run=false){
 if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('INVALID_DESTINATION');
 state.goal={x:clamp(x,-5.2,5.2),z:clamp(z,-3.6,3.6)};
 state.run=!!run;
 if(state.seated){state.pendingAction=null;state.seated=false;state.action='stand-up';state.actionTime=0;}
 return state;
}
export function tickMotion(state,delta){
 const dt=clamp(Number(delta)||0,0,0.05);
 state.time+=dt;state.actionTime+=dt;
 if(state.action==='sit-down'&&state.actionTime>.62){
  state.seated=true;state.action='sit';state.actionTime=0;
 }
 if(state.action==='stand-up'&&state.actionTime>.55){
  const afterStand=state.pendingAction;
  state.pendingAction=null;
  state.action=afterStand||(state.goal?(state.run?'run':'walk'):'idle');state.actionTime=0;
 }
 let intended=0,dx=0,dz=0,goalDistance=0;
 const locked=['sit','sit-down','stand-up','wave','vote','result'].includes(state.action);
 if(state.goal&&!locked){
  dx=state.goal.x-state.x;dz=state.goal.z-state.z;
  goalDistance=Math.hypot(dx,dz);
  if(goalDistance<=0.05){state.goal=null;state.action='idle';state.actionTime=0;}
  else {
   state.targetYaw=Math.atan2(dx,dz);
   intended=state.run?V500_RUN_SPEED:V500_WALK_SPEED;
   if(state.action!==(state.run?'run':'walk')){state.action=state.run?'run':'walk';state.actionTime=0;}
  }
 }
 // The preview can play locomotion in place without a requested destination.
 if(!state.goal&&(state.action==='walk'||state.action==='run'))intended=state.action==='run'?V500_RUN_SPEED:V500_WALK_SPEED;
 state.yaw=angleTo(state.yaw,state.targetYaw,dt);
 state.velocity=relax(state.velocity,intended,dt,intended?9:13);
 if(state.goal&&goalDistance>0.05&&intended){
  const distance=Math.min(state.velocity*dt,goalDistance);
  state.x+=dx/goalDistance*distance;state.z+=dz/goalDistance*distance;
  state.travelled+=distance;
  if(distance>=goalDistance-.001){state.x=state.goal.x;state.z=state.goal.z;state.goal=null;state.action='idle';state.actionTime=0;}
 }
 const moving=(state.action==='walk'||state.action==='run')&&state.velocity>.025;
 state.phase+=dt*(state.action==='run'?13.1:8.6)*(moving?Math.max(.25,state.velocity/(state.action==='run'?V500_RUN_SPEED:V500_WALK_SPEED)):0);
 const gait=moving?smooth(clamp(state.velocity/(state.action==='run'?V500_RUN_SPEED:V500_WALK_SPEED),0,1)):0;
 const swing=Math.sin(state.phase),other=Math.sin(state.phase+PI);
 let next=poseZero();
 next.hipY=Math.sin(state.time*2.25+state.seed)*.023;
 next.headRoll=Math.sin(state.time*1.6+state.seed)*.025;
 if(moving){
  next.legL=swing*.54*gait;next.legR=other*.54*gait;
  next.kneeL=Math.max(0,-swing)*.72*gait;next.kneeR=Math.max(0,-other)*.72*gait;
  next.armL=-swing*.47*gait;next.armR=-other*.47*gait;
  next.hipRoll=Math.sin(state.phase)*.052*gait;
  next.hipY+=Math.abs(Math.sin(state.phase))*(state.action==='run'?.105:.052)*gait;
  next.hipLean=state.action==='run'?.13:.055;
  next.headRoll=Math.sin(state.phase)*.028*gait;
  if(state.action==='run'){next.armL-=.25;next.armR-=.25;next.kneeL+=.14;next.kneeR+=.14;}
 }
 const sitAmount=state.action==='sit'||state.seated?1:state.action==='sit-down'?smooth(state.actionTime/.62):state.action==='stand-up'?1-smooth(state.actionTime/.55):0;
 if(sitAmount){
  next.hipY-=.46*sitAmount;
  next.legL=-1.26*sitAmount;next.legR=-1.26*sitAmount;
  next.kneeL=1.65*sitAmount;next.kneeR=1.65*sitAmount;
  next.armL=-.22*sitAmount;next.armR=-.22*sitAmount;
  next.hipLean=.14*sitAmount;
 }
 if(state.action==='wave'){
  next.armR=-2.45+Math.sin(state.actionTime*9)*.32;next.armROut=-.32;
  next.headRoll=-.065;next.hipRoll=Math.sin(state.actionTime*2)*.025;
 }
 if(state.action==='vote'){
  next.armR=-2.92;next.armROut=.07;next.headPitch=-.09;
 }
 if(state.action==='result'){
  next.armR=-2.9;next.armL=-2.9;next.armLOut=-.22;next.armROut=.22;
  next.hipY+=Math.abs(Math.sin(state.actionTime*8))*.13;
 }
 const alpha=1-Math.exp(-Math.min(dt,.05)*12);
 for(const k of Object.keys(next))state.pose[k]+=alpha*(next[k]-state.pose[k]);
 return state;
}
export function poseSnapshot(state){return {...state.pose};}
