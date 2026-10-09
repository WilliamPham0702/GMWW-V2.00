// Skeleton-first GMWW V4. No raster artwork, no legacy game/IPA coupling.
// Coordinates in 100x160 virtual space. Each anatomical limb is a unique joint chain.
export const SKELETON_ACTIONS=Object.freeze(['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
export const SKELETON_DIRECTIONS=Object.freeze(['front','left','right','back']);
export const SKELETON_VERSION='4.12-action-review';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const pt=(x,y)=>({x,y});
const chain=(a,b,c)=>[a,b,c];
export function skeletonPose({action='idle',direction='front',elapsedMs=0,progress=.5,outcome='win'}={}){
 if(!SKELETON_ACTIONS.includes(action))throw Error('INVALID_ACTION');
 if(!SKELETON_DIRECTIONS.includes(direction))throw Error('INVALID_DIRECTION');
 if(!['win','lose'].includes(outcome))throw Error('INVALID_OUTCOME');
 const t=Math.max(0,Number(elapsedMs)||0),p=smooth(progress),phase=t*(action==='run'?.016:.010);
 const stride=(action==='walk'||action==='run')?Math.sin(phase):0;
 const stepLift=(action==='walk'||action==='run')?Math.max(0,Math.cos(phase)):0;
 const oppositeLift=(action==='walk'||action==='run')?Math.max(0,-Math.cos(phase)):0;
 const speed=action==='run'?1.35:1;
 const sit=action==='sit'?1:action==='sit-down'?p:action==='stand-up'?1-p:0;
 const isSide=direction==='left'||direction==='right',side=direction==='left'?-1:1;
 const breathing=action==='idle'?Math.sin(t*.003)*1.1:0;
 const sway=breathing;
 const celebrate=action==='result'&&outcome==='win'?Math.abs(Math.sin(t*.009))*3:0;
 const disappointed=action==='result'&&outcome==='lose'?Math.min(1,t/650):0;
 const hipY=92+23*sit+(action==='result'&&outcome==='lose'?6:0);
 const gaitBounce=(action==='walk'||action==='run')?Math.abs(Math.sin(phase))*1.8:0;
 const shoulderY=58+20*sit+sway-gaitBounce-celebrate+disappointed*4;
 const head=pt(50,29+20*sit+sway-gaitBounce-celebrate+disappointed*4);
 const neck=pt(50,51+20*sit+sway-gaitBounce-celebrate+disappointed*4);
 const pelvis=pt(50,hipY-gaitBounce-celebrate);
 const shoulderL=pt(isSide?48:36,shoulderY),shoulderR=pt(isSide?52:64,shoulderY);
 const hipL=pt(isSide?47:44,hipY),hipR=pt(isSide?53:56,hipY);
 let elbowL=pt(24,80+20*sit),handL=pt(22,101+20*sit);
 let elbowR=pt(76,80+20*sit),handR=pt(78,101+20*sit);
 if(action==='walk'||action==='run'){
  const armSwing=action==='run'?1.35:1;
  elbowL=pt(27+stride*11*armSwing,action==='run'?73:78);handL=pt(24+stride*17*armSwing,action==='run'?85:99);
  elbowR=pt(73-stride*11*armSwing,action==='run'?73:78);handR=pt(76-stride*17*armSwing,action==='run'?85:99);
 }
 if(action==='wave'||action==='vote'){
  const rise=action==='vote'?smooth(t/520):smooth(t/360);
  const waveSwing=action==='wave'?Math.sin(t*.017)*7:0;
  elbowR=pt(mix(76,77,rise),mix(80,action==='vote'?42:48,rise));
  handR=pt(mix(78,action==='vote'?76:84+waveSwing,rise),mix(101,action==='vote'?13:22,rise));
 }
 if(action==='result'&&outcome==='win'){
  const cheer=smooth(t/420);
  elbowL=pt(mix(24,22,cheer),mix(80,43,cheer));handL=pt(mix(22,13,cheer),mix(101,22+Math.sin(t*.01)*3,cheer));
  elbowR=pt(mix(76,78,cheer),mix(80,43,cheer));handR=pt(mix(78,87,cheer),mix(101,22+Math.sin(t*.01)*3,cheer));
 }
 if(action==='result'&&outcome==='lose'){
  elbowL=pt(29,82+disappointed*7);handL=pt(38,102+disappointed*8);
  elbowR=pt(71,82+disappointed*7);handR=pt(62,102+disappointed*8);
 }
 let kneeL=pt(39,117),footL=pt(35,149),kneeR=pt(61,117),footR=pt(65,149);
 if(sit>0){
  // Knees move outward moderately, feet cross INWARD below the pelvis.
  kneeL=pt(mix(39,31,sit),mix(117,127,sit));
  kneeR=pt(mix(61,69,sit),mix(117,127,sit));
  footL=pt(mix(35,57,sit),mix(149,141,sit));
  footR=pt(mix(65,43,sit),mix(149,141,sit));
  elbowL=pt(mix(elbowL.x,31,sit),mix(elbowL.y,95+20*sit,sit));
  handL=pt(mix(handL.x,39,sit),mix(handL.y,130,sit));
  elbowR=pt(mix(elbowR.x,69,sit),mix(elbowR.y,95+20*sit,sit));
  handR=pt(mix(handR.x,61,sit),mix(handR.y,130,sit));
 }
 if(action==='walk'||action==='run'){
  // Forward stepping cycle: one foot lifts and advances while the other plants.
  // Front/back use depth (Y) and knee flexion; side views use horizontal travel.
  const depth=direction==='back'?-1:1;
  if(isSide){
   const travel=side*speed;
   kneeL=pt(46+stride*10*travel,116-stepLift*7);
   footL=pt(45+stride*18*travel,149-stepLift*15*speed);
   kneeR=pt(54-stride*10*travel,116-oppositeLift*7);
   footR=pt(55-stride*18*travel,149-oppositeLift*15*speed);
  }else{
   kneeL=pt(42,117+stride*5*depth-stepLift*6);
   footL=pt(41,149+stride*10*depth-stepLift*15*speed);
   kneeR=pt(58,117-stride*5*depth-oppositeLift*6);
   footR=pt(59,149-stride*10*depth-oppositeLift*15*speed);
  }
 }
 if(isSide){
  const projection=(action==='walk'||action==='run')?1:.45;
  for(const q of [shoulderL,shoulderR,hipL,hipR,elbowL,elbowR,handL,handR,kneeL,kneeR,footL,footR])q.x=50+(q.x-50)*projection*side;
 }
 return Object.freeze({action,direction,sit,head,neck,pelvis,
  leftArm:chain(shoulderL,elbowL,handL),rightArm:chain(shoulderR,elbowR,handR),
  leftLeg:chain(hipL,kneeL,footL),rightLeg:chain(hipR,kneeR,footR),
  torso:[neck,pelvis],headTiltDeg:0,skinApplied:false});
}
export function drawSkeleton(ctx,pose,{width=240,height=360}={}){
 ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/100,height/160);
 const line=(points,color='#69e9f2',weight=3.3)=>{
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
 };
 // Back limbs first, then torso, then foreground limbs: exactly 2 arms and 2 legs.
 line(pose.leftLeg,'#f3be82',4);line(pose.rightLeg,'#f3be82',4);
 line(pose.leftArm,'#8ce0fa',3.7);line(pose.rightArm,'#8ce0fa',3.7);
 line(pose.torso,'#fff3cb',5);
 ctx.beginPath();ctx.arc(pose.head.x,pose.head.y,15,0,Math.PI*2);
 ctx.fillStyle='#f3d2a2';ctx.fill();ctx.strokeStyle='#fff4d5';ctx.lineWidth=2;ctx.stroke();
 for(const part of [pose.leftArm,pose.rightArm,pose.leftLeg,pose.rightLeg]){
  for(const q of part){ctx.beginPath();ctx.arc(q.x,q.y,2.7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();}
 }
 // Face direction marker (never rotates head geometry).
 ctx.fillStyle='#164458';ctx.beginPath();
 const d=pose.direction==='back'?-1:1;
 ctx.arc(pose.head.x+(pose.direction==='left'?-8:pose.direction==='right'?8:0),pose.head.y+3*d,2.5,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
