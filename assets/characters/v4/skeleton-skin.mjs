// GMWW V4.13 - skin follows approved skeleton joints. Web-only approval prototype.
// Real approved atlas is sampled ONLY in the head region (never whole static bodies/arms/legs).
// Everything below the head is painted from the same unique shoulder/elbow/wrist/hip/knee/ankle chains.
export const V4_SKIN_VERSION='4.13-skeleton-skin-review';
export const V4_SKIN_IDS=Object.freeze(['character-01','character-02']);
const SRC={front:0,left:1,back:2,right:3};
const palette={
 'character-01':{skin:'#e6a36c',light:'#ffd9a2',shade:'#a96848',hair:'#3c2525',top:'#18b6d4',topLight:'#6ee7ea',bottom:'#ecf8f6',shoe:'#1763aa',trim:'#116983'},
 'character-02':{skin:'#f8c5a1',light:'#ffe5c9',shade:'#d9947e',hair:'#dbad6b',top:'#f4fbff',topLight:'#ffffff',bottom:'#f8fcff',shoe:'#77b9ef',trim:'#4b9cc6'}
};
const mix=(a,b,t)=>a+(b-a)*t;
function line(ctx,a,b,width,color,border='#1f5063'){
 ctx.lineCap='round';ctx.lineJoin='round';
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
 if(border){ctx.strokeStyle=border;ctx.lineWidth=width+1.3;ctx.stroke();}
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function circle(ctx,x,y,r,color,border=null){
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
 ctx.fillStyle=color;ctx.fill();
 if(border){ctx.strokeStyle=border;ctx.lineWidth=.8;ctx.stroke();}
}
function path(ctx,points,fill,stroke='#356981'){
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke();}
}
function oval(ctx,x,y,rx,ry,color,border=null){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
 if(border){ctx.lineWidth=.9;ctx.strokeStyle=border;ctx.stroke();}
}
function limb(ctx,parts,p,isArm){
 const [start,joint,end]=parts;
 const radius=isArm?7.2:9.2;
 line(ctx,start,joint,radius,p.skin,p.shade);
 line(ctx,joint,end,isArm?6.1:7.1,p.skin,p.shade);
 // One rounded anatomical hand/foot attached to the terminal joint, never an extra arm.
 if(isArm)oval(ctx,end.x,end.y,4.6,5,p.light,p.shade);
 else{
  const dx=Math.max(-3,Math.min(3,(end.x-joint.x)*.17));
  oval(ctx,end.x+dx,end.y+1.4,6.4,3.1,p.shoe,p.trim);
  line(ctx,{x:end.x-2,y:end.y+1},{x:end.x+3,y:end.y+1},.9,'#ddf8fa',null);
 }
}
function printFlower(ctx,x,y,size=2.2){
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5;
  oval(ctx,x+Math.cos(a)*size*.64,y+Math.sin(a)*size*.64,size*.55,size*.46,'#fff4dd');
 }
 circle(ctx,x,y,size*.4,'#efac65');
}
function headFallback(ctx,pose,id,direction){
 const girl=id==='character-02',h=pose.head;
 // Fallback if the approved avatar atlas cannot load. No photo-static limbs.
 if(girl){
  oval(ctx,h.x,h.y+5,23,24,'#dda96c','#9d7655');
  oval(ctx,h.x,h.y+4,18,20,'#f7c8a7','#b98973');
  path(ctx,[[h.x-30,h.y-11],[h.x-21,h.y-18],[h.x+21,h.y-18],[h.x+30,h.y-11],[h.x+26,h.y-6],[h.x-26,h.y-6]],'#efcf90','#8b7561');
  oval(ctx,h.x,h.y-17,19,8,'#f8dca7','#947b53');
  line(ctx,{x:h.x-20,y:h.y-12},{x:h.x+20,y:h.y-12},3.5,'#4ea7da',null);
 }else{
  oval(ctx,h.x,h.y,21,21,'#e7a876','#9d7054');
  for(let i=-3;i<=3;i++)circle(ctx,h.x+i*6,h.y-17+(i%2)*3,7,'#382522');
 }
 if(direction==='back')return;
 const faceX=direction==='left'?h.x-6:direction==='right'?h.x+6:h.x;
 circle(ctx,faceX-6,h.y+1,2.1,'#29232c');circle(ctx,faceX+6,h.y+1,2.1,'#29232c');
 line(ctx,{x:faceX-3,y:h.y+9},{x:faceX+3,y:h.y+9},1.3,'#8e4d52',null);
}
function sourceHead(ctx,pose,id,direction,atlas){
 if(!atlas||!atlas.complete||atlas.naturalWidth<400||atlas.naturalHeight<290)return false;
 const col=SRC[direction],row=id==='character-02'?1:0;
 const isGirl=row===1,face=pose.head;
 // Crops stop above the original avatar arms: no old shoulders, hands, clothes or legs survive.
 const sx=col*100+(isGirl?1:6),sy=row*145+(isGirl?0:0);
 const sw=isGirl?98:88,sh=isGirl?80:65;
 const w=isGirl?66:50,h=isGirl?59:43;
 ctx.drawImage(atlas,sx,sy,sw,sh,face.x-w/2,face.y-(isGirl?34:28),w,h);
 return true;
}
function torso(ctx,pose,id,p){
 const girl=id==='character-02',side=pose.direction==='left'||pose.direction==='right';
 const cy=(pose.leftArm[0].y+pose.rightArm[0].y)/2;
 const bottom=pose.pelvis.y,ctr=pose.pelvis.x;
 const half=side?12:18,lower=side?11:15;
 if(girl){
  // Flared beach dress covers upper thighs as an attached torso garment (no extra limbs).
  const skirt=pose.sit?3:11;
  path(ctx,[[ctr-lower, bottom-5],[ctr+lower,bottom-5],[ctr+lower+skirt,bottom+12],
            [ctr-lower-skirt,bottom+12]],p.bottom,p.trim);
  path(ctx,[[ctr-half,cy-1],[ctr+half,cy-1],[ctr+lower,bottom],
            [ctr-lower,bottom]],p.top,p.trim);
  line(ctx,{x:ctr-half+2,y:cy+11},{x:ctr+half-2,y:cy+11},2,'#80c3eb',null);
  line(ctx,{x:ctr-lower+3,y:bottom+3},{x:ctr+lower-3,y:bottom+3},2,'#80c3eb',null);
  path(ctx,[[ctr-4,cy+1],[ctr,cy+8],[ctr+4,cy+1]],'#53b8e3','#53b8e3');
  circle(ctx,ctr,bottom-6,2.3,'#84cfe9');
  // Sleeve cuffs anchored to the only two shoulders.
  for(const arm of [pose.leftArm,pose.rightArm]){
   const a=arm[0],b=arm[1];
   line(ctx,a,{x:mix(a.x,b.x,.26),y:mix(a.y,b.y,.26)},9,p.topLight,p.trim);
  }
 }else{
  // Separate shorts + hibiscus Hawaiian shirt, following pelvis and shoulder attachments.
  path(ctx,[[ctr-lower-1,bottom-8],[ctr+lower+1,bottom-8],
            [ctr+lower+2,bottom+8],[ctr+1,bottom+8],[ctr,bottom+2],
            [ctr-1,bottom+8],[ctr-lower-2,bottom+8]],p.bottom,p.trim);
  line(ctx,{x:ctr-lower+2,y:bottom-5},{x:ctr+lower-2,y:bottom-5},1.8,'#4db4c9',null);
  path(ctx,[[ctr-half,cy-1],[ctr+half,cy-1],[ctr+lower,bottom-5],
            [ctr-lower,bottom-5]],p.top,p.trim);
  // Open Hawaiian collar and contrasting tropical print.
  path(ctx,[[ctr-8,cy+1],[ctr,cy+12],[ctr,cy+1]],'#ebfbf4',null);
  path(ctx,[[ctr+8,cy+1],[ctr,cy+12],[ctr,cy+1]],'#ecfff0',null);
  for(const [dx,dy] of [[-10,15],[10,17],[-7,27],[9,28]]){
   if(side&&Math.abs(dx)>8)continue;
   printFlower(ctx,ctr+dx,cy+dy,2.5);
  }
  for(const arm of [pose.leftArm,pose.rightArm]){
   const a=arm[0],b=arm[1];
   line(ctx,a,{x:mix(a.x,b.x,.30),y:mix(a.y,b.y,.30)},10,p.top,p.trim);
   line(ctx,{x:mix(a.x,b.x,.27),y:mix(a.y,b.y,.27)},
            {x:mix(a.x,b.x,.32),y:mix(a.y,b.y,.32)},1.2,p.topLight,null);
  }
 }
}
function boneOverlay(ctx,pose){
 const joints=[...pose.leftArm,...pose.rightArm,...pose.leftLeg,...pose.rightLeg,pose.head,pose.neck,pose.pelvis];
 for(const j of joints)circle(ctx,j.x,j.y,1.9,'#f9f9ec','#043951');
}
export function renderV4Skin(ctx,pose,{characterId='character-01',atlas=null,width=240,height=360,showJoints=false}={}){
 if(!V4_SKIN_IDS.includes(characterId))throw Error('INVALID_CHARACTER_SKIN');
 if(!pose||!pose.head||!pose.leftArm||!pose.rightArm||!pose.leftLeg||!pose.rightLeg)throw Error('INVALID_SKELETON_POSE');
 const p=palette[characterId];ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/100,height/160);
 oval(ctx,50,154,23,3.2,'rgba(5,44,53,.17)');
 // Exactly one chain for each anatomical limb; all garment pieces anchor to that chain.
 limb(ctx,pose.leftLeg,p,false);limb(ctx,pose.rightLeg,p,false);
 limb(ctx,pose.leftArm,p,true);limb(ctx,pose.rightArm,p,true);
 torso(ctx,pose,characterId,p);
 const headFromSource=sourceHead(ctx,pose,characterId,pose.direction,atlas);
 if(!headFromSource)headFallback(ctx,pose,characterId,pose.direction);
 if(showJoints)boneOverlay(ctx,pose);
 ctx.restore();
 return Object.freeze({characterId,headFromSource,armChains:2,legChains:2,skinApplied:true});
}
