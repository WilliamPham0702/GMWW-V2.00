// GMWW Character V4 Web-only articulated preview. Uses only the approved 01/02 4-direction atlas.
// This is a mechanical segmented-raster prototype, NOT a hand-drawn 9-action spritesheet.
export const V4_SPRITE_VERSION='v4.04-natural-sit';
export const V4_SPRITE_ACTIONS=Object.freeze(['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const DIRECTIONS={front:0,left:1,back:2,right:3};
const rect=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
function mask(ctx,poly){ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();}
function paint(ctx,img,sx,sy,poly,{pivot=[0,0],angle=0,dx=0,dy=0,sxScale=1,syScale=1}={}){
 ctx.save();ctx.translate(pivot[0]+dx,pivot[1]+dy);ctx.rotate(angle);ctx.scale(sxScale,syScale);ctx.translate(-pivot[0],-pivot[1]);mask(ctx,poly);ctx.drawImage(img,sx,sy,100,145,0,0,100,145);ctx.restore();
}
function joints(id,dir){
 if(id==='character-02')return{
  head:rect(0,0,100,90),hair:rect(6,66,95,127),body:rect(22,85,79,125),
  armL:rect(4,76,37,116),armR:rect(71,76,99,116),
  legL:rect(28,120,54,145),legR:rect(51,120,79,145),
  pl:[30,79],pr:[73,79],hl:[44,121],hr:[58,121]};
 if(dir==='left'||dir==='right')return{
  head:rect(9,0,92,68),body:rect(32,59,76,102),
  armL:rect(28,65,57,110),armR:rect(52,67,82,109),
  legL:rect(38,97,59,145),legR:rect(53,97,79,145),
  pl:[48,68],pr:[62,70],hl:[50,99],hr:[65,99]};
 return {
  head:rect(9,0,91,67),body:rect(30,59,73,103),
  armL:rect(14,64,40,112),armR:rect(68,65,90,111),
  legL:rect(27,100,53,145),legR:rect(51,100,82,145),
  pl:[35,68],pr:[70,69],hl:[43,100],hr:[59,100]};
}
export function v4ActionPose(action,elapsedMs=0,progress=0,result='win'){
 if(!V4_SPRITE_ACTIONS.includes(action))throw Error('INVALID_V4_ACTION');
 const p=smooth(progress),t=Number(elapsedMs)||0,cycle=TAU*t/(action==='run'?420:660);
 let armL=0,armR=0,legL=0,legR=0,sit=0,jump=0,breath=1;
 if(action==='idle'){breath=1+.012*Math.sin(TAU*t/1750);armL=.028*Math.sin(TAU*t/2500);armR=-armL;}
 if(action==='walk'||action==='run'){
  const a=action==='run'?.72:.48;
  legL=a*Math.sin(cycle);legR=-legL;armL=-a*.83*Math.sin(cycle);armR=-armL;
 }
 if(action==='sit'||action==='sit-down'||action==='stand-up'){
  sit=action==='sit'?1:action==='sit-down'?p:1-p;
  // Compact crossed-leg pose: feet fold INWARD, never rotate outward like a crab.
  legL=.62*sit;legR=-.62*sit;armL=.13*sit;armR=-.13*sit;
 }
 if(action==='wave'){armR=-1.8+.30*Math.sin(TAU*t/450);}
 if(action==='vote'){armR=-2.55*Math.sin(Math.PI*clamp(progress*1.6,0,1)*.5);}
 if(action==='result'){
  if(result==='win'){armL=1.75;armR=-1.75;jump=5*Math.sin(Math.PI*p);legL=.2*Math.sin(TAU*t/300);legR=-legL;}
  else{sit=.36;armL=-.22;armR=.22;}
 }
 return {armL,armR,legL,legR,sit,jump,breath,headTiltDeg:0};
}
export function createV4SpriteRenderer(canvas,src='./approved-two-characters.avif'){
 if(!canvas||typeof canvas.getContext!=='function')throw Error('V4_CANVAS_REQUIRED');
 canvas.width=200;canvas.height=290;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('V4_CONTEXT_REQUIRED');
 const atlas=new Image();let ready=false,failed=false;
 atlas.onload=()=>{ready=true;failed=false;};
 atlas.onerror=()=>{failed=true;ready=false;};
 atlas.decoding='async';atlas.src=src;
 return Object.freeze({
  get loaded(){return ready;},get failed(){return failed;},
  render({characterId='character-01',facing='front',actionId='idle',elapsedMs=0,progress=0,result='win'}={}){
   ctx.clearRect(0,0,canvas.width,canvas.height);
   if(!ready)return false;
   const row=characterId==='character-02'?1:0,col=DIRECTIONS[facing]??0,sx=col*100,sy=row*145;
   const j=joints(characterId,facing),pose=v4ActionPose(actionId,elapsedMs,progress,result),lower=16*pose.sit-pose.jump;
   const seated=clamp(pose.sit,0,1),legSpread=characterId==='character-02'?6:5;
   ctx.save();ctx.scale(2,2);ctx.imageSmoothingEnabled=true;
   ctx.fillStyle='rgba(4,35,54,.17)';ctx.beginPath();ctx.ellipse(50,141,22+8*pose.sit,3,0,0,TAU);ctx.fill();
   // Independent legs and arm rotations produce actual visible stride and gesture changes.
   // Draw folded legs close to the centre; keep the feet on the ground line.
   // Transform only the lower limbs, never the head or the whole character.
   paint(ctx,atlas,sx,sy,j.legL,{pivot:j.hl,angle:pose.legL,dx:legSpread*seated,dy:-13*seated,sxScale:1-.20*seated,syScale:1-.22*seated});
   paint(ctx,atlas,sx,sy,j.legR,{pivot:j.hr,angle:pose.legR,dx:-legSpread*seated,dy:-13*seated,sxScale:1-.20*seated,syScale:1-.22*seated});
   // Rear hair must stay behind the torso, rather than covering arms/face.
   if(j.hair)paint(ctx,atlas,sx,sy,j.hair,{dy:lower*.30});
   paint(ctx,atlas,sx,sy,j.armL,{pivot:j.pl,angle:pose.armL,dy:lower});
   paint(ctx,atlas,sx,sy,j.armR,{pivot:j.pr,angle:pose.armR,dy:lower});
   paint(ctx,atlas,sx,sy,j.body,{pivot:[51,78],dy:lower,sxScale:pose.breath,syScale:1-.10*seated});
   // Never rotate the head. It is translated vertically only for stand/sit changes.
   paint(ctx,atlas,sx,sy,j.head,{dy:lower});
   if(actionId==='result'&&result==='win'){
    ctx.fillStyle='#ffdc6c';
    for(let i=0;i<7;i++){const a=i*TAU/7+elapsedMs/380;ctx.fillRect(50+39*Math.cos(a),43+27*Math.sin(a),3,4);}
   }
   ctx.restore();
   return true;
  }
 });
}
