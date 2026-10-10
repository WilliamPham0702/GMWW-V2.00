// GMWW Character V4.14 — an independent, illustrated joint-layer SKIN PROTOTYPE.
// Every body part is drawn separately against the approved V4.12 skeleton.
// No old atlas head, static body overlay, toy block geometry or live-room import.
// This is an on-web visual study, NOT approved production artwork.
export const V414_SKIN_VERSION='4.14-joint-bound-preview';
export const V414_CHARACTERS=Object.freeze(['character-01','character-02']);
export const V414_DIRECTIONS=Object.freeze(['front','left','right','back']);
export const V414_LAYERS=Object.freeze([
 'hair_back','head','hair_front','torso','pelvis',
 'upper_arm_left','forearm_left','hand_left',
 'upper_arm_right','forearm_right','hand_right',
 'thigh_left','shin_left','foot_left',
 'thigh_right','shin_right','foot_right'
]);
const PI=Math.PI,TAU=PI*2;
const P={
 'character-01':{
  skin:'#f0bc96',skinDark:'#cf866c',skinBright:'#ffe0ba',
  ink:'#243344',hair:'#172f41',hairHigh:'#46657b',
  shirt:'#20bcb7',shirtDark:'#08777f',shirtLight:'#8bf4d6',
  detail:'#fff0c9',bottom:'#e6cda1',bottomDark:'#a78c70',
  shoe:'#f4f5dc',shoeDark:'#196975'
 },
 'character-02':{
  skin:'#f6caaa',skinDark:'#d7917d',skinBright:'#ffe8c8',
  ink:'#4a4051',hair:'#c88443',hairHigh:'#ffe19a',
  shirt:'#faf7e9',shirtDark:'#46aec5',shirtLight:'#ffffff',
  detail:'#1c90be',bottom:'#9ce3ef',bottomDark:'#277da7',
  shoe:'#fcf0d9',shoeDark:'#54acc0'
 }
};
/** Read-only original GMWW V4.14 design tokens. These are NOT a substitute for
 * the original multi-view PNG skin layers, which are not yet in the repo. */
export const V414_SKIN_PALETTES=Object.freeze(Object.fromEntries(
 Object.entries(P).map(([id,colors])=>[id,Object.freeze({...colors})])
));
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function skinBinding(pose,characterId='character-01'){
 if(!V414_CHARACTERS.includes(characterId))throw Error('UNKNOWN_CHARACTER');
 if(!pose||!V414_DIRECTIONS.includes(pose.direction)||pose.headTiltDeg!==0)throw Error('INVALID_SKIN_SKELETON');
 for(const side of ['leftArm','rightArm','leftLeg','rightLeg']){
  if(!Array.isArray(pose[side])||pose[side].length!==3||!pose[side].every(finite))throw Error('INVALID_LIMB_JOINTS');
 }
 const parts={
  hair_back:[pose.head],head:[pose.head],hair_front:[pose.head],
  torso:[pose.torso?.[0],pose.pelvis],pelvis:[pose.pelvis],
  upper_arm_left:[pose.leftArm[0],pose.leftArm[1]],
  forearm_left:[pose.leftArm[1],pose.leftArm[2]],hand_left:[pose.leftArm[2]],
  upper_arm_right:[pose.rightArm[0],pose.rightArm[1]],
  forearm_right:[pose.rightArm[1],pose.rightArm[2]],hand_right:[pose.rightArm[2]],
  thigh_left:[pose.leftLeg[0],pose.leftLeg[1]],
  shin_left:[pose.leftLeg[1],pose.leftLeg[2]],foot_left:[pose.leftLeg[2]],
  thigh_right:[pose.rightLeg[0],pose.rightLeg[1]],
  shin_right:[pose.rightLeg[1],pose.rightLeg[2]],foot_right:[pose.rightLeg[2]]
 };
 if(Object.values(parts).flat().some(v=>!finite(v)))throw Error('INVALID_SKIN_ANCHOR');
 return {characterId,direction:pose.direction,parts,layerNames:V414_LAYERS,sit:pose.sit||0,headTiltDeg:0};
}
function fill(ctx,color){
 ctx.fillStyle=color;ctx.fill();
}
function line(ctx,color,width=1,alpha=1){
 ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();ctx.restore();
}
function grad(ctx,x0,y0,x1,y1,stops){
 const g=ctx.createLinearGradient(x0,y0,x1,y1);
 for(const [stop,color] of stops)g.addColorStop(stop,color);
 return g;
}
function oval(ctx,x,y,rx,ry,color){
 ctx.beginPath();ctx.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,TAU);fill(ctx,color);
}
function path(ctx,ops,color,stroke=null,width=.8){
 ctx.beginPath();
 for(const v of ops){
  if(v[0]==='M')ctx.moveTo(v[1],v[2]);
  else if(v[0]==='L')ctx.lineTo(v[1],v[2]);
  else if(v[0]==='Q')ctx.quadraticCurveTo(v[1],v[2],v[3],v[4]);
  else if(v[0]==='C')ctx.bezierCurveTo(v[1],v[2],v[3],v[4],v[5],v[6]);
  else if(v[0]==='Z')ctx.closePath();
 }
 fill(ctx,color);
 if(stroke)line(ctx,stroke,width);
}
function curve(ctx,points,color,width=.8){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++){
  const p=points[i];if(p.length===4)ctx.quadraticCurveTo(...p);else ctx.lineTo(...p);
 }line(ctx,color,width);
}
function segment(ctx,a,b,r0,r1,colors,details){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
 if(len<.01)return;
 ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx)-PI/2);
 const width=Math.max(r0,r1);
 // Curved, smoothly tapered shape; neither straight-sided blocks nor circles at joints.
 const ops=[
  ['M',-r0,-1.1],['C',-r0-1,len*.20,-r1-.65,len*.70,-r1,len+.9],
  ['Q',0,len+2.2,r1,len+.9],
  ['C',r1+.5,len*.70,r0+.8,len*.23,r0,-1.1],
  ['Q',0,-2,-r0,-1.1],['Z']
 ];
 path(ctx,ops,grad(ctx,-width,0,width,len*.4,[[0,colors[1]],[.40,colors[0]],[.74,colors[0]],[1,colors[1]]]),colors[1],.52);
 curve(ctx,[[-r0*.42,1],[-r1*.37,len*.64],[-r1*.12,len*.90]],colors[2]||'#fff7e8',.65);
 if(details)details(ctx,len,r0,r1);
 ctx.restore();
}
function hairBehind(ctx,pose,c,id){
 const {x,y}=pose.head,isGirl=id==='character-02',d=pose.direction;
 if(isGirl){
  const g=grad(ctx,x-18,y-18,x+17,y+29,[[0,c.hairHigh],[.43,c.hair],[1,'#9f5d40']]);
  path(ctx,[['M',x-17,y-10],['Q',x-23,y+5,x-16,y+19],
   ['C',x-20,y+34,x-9,y+38,x-4,y+30],['Q',x+4,y+41,x+12,y+32],
   ['C',x+24,y+40,x+23,y+13,x+17,y-13],['Q',x,y-27,x-17,y-10],['Z']],g,c.ink,.55);
  for(let i=0;i<3;i++)curve(ctx,[[x-12+i*11,y+14],[x-14+i*11,y+23],[x-11+i*11,y+29]],'#f7d28a',.85);
 }else{
  oval(ctx,x,y-8,18,18,grad(ctx,x-17,y-22,x+18,y+12,[[0,c.hairHigh],[.65,c.hair],[1,'#102739']]));
  if(d==='back')for(let i=0;i<4;i++)curve(ctx,[[x-12+i*8,y-13],[x-13+i*8,y-3],[x-11+i*8,y+8]],'#51677b',.75);
 }
}
function head(ctx,pose,c,id){
 const {x,y}=pose.head,d=pose.direction;
 const isGirl=id==='character-02',side=d==='left'||d==='right';
 // Head and neck are one clean illustration, without a pasted bitmap.
 path(ctx,[['M',x-5,y+13],['Q',x-4,y+21,x-5,y+26],['L',x+5,y+26],['Q',x+4,y+19,x+5,y+13],['Z']],c.skinDark);
 path(ctx,[['M',x-15,y-10],['C',x-19,y-3,x-18,y+11,x-10,y+17],
  ['Q',x,y+22,x+10,y+17],['C',x+19,y+10,x+19,y-4,x+15,y-10],
  ['C',x+9,y-22,x-9,y-22,x-15,y-10],['Z']],
  grad(ctx,x-19,y,x+15,y+9,[[0,c.skinDark],[.23,c.skin],[.78,c.skinBright],[1,c.skin]]),
  c.skinDark,.6);
 if(d==='back')return;
 if(side){
  const dir=d==='right'?1:-1;
  oval(ctx,x+dir*14,y+4,2.5,4.4,c.skin);
  oval(ctx,x+dir*5,y+2,2.1,3.1,c.ink);
  oval(ctx,x+dir*5.5,y+1,0.72,1,'#ffffff');
  curve(ctx,[[x+dir*9,y+5],[x+dir*15,y+8],[x+dir*10,y+10]],c.skinDark,.7);
  curve(ctx,[[x+dir*5,y+13],[x+dir*8,y+14],[x+dir*10,y+12]],'#ae6e65',.8);
 }else{
  for(const s of [-1,1]){
   oval(ctx,x+s*7,y+3,3.1,isGirl?4.2:3.5,'#fffef9');
   oval(ctx,x+s*7.1,y+3.3,2.15,isGirl?3.4:2.8,isGirl?'#3c6176':'#27526b');
   oval(ctx,x+s*6.4,y+1.4,.85,1.15,'#faffff');
   curve(ctx,[[x+s*4,y-3],[x+s*8,y-3.5],[x+s*10,y-2.4]],c.ink,1.05);
   oval(ctx,x+s*11,y+9,2.6,1.5,'#f0a9a0');
  }
  curve(ctx,[[x-2,y+10],[x,y+11],[x+2,y+10]],c.skinDark,.6);
  curve(ctx,[[x-3,y+13],[x,y+14.5],[x+3,y+13]],'#a96363',.86);
 }
 // Tiny specular on cheek prevents flat vector face.
 oval(ctx,x-10,y+7,1.4,.65,'#fff5db');
}
function hairFront(ctx,pose,c,id){
 const {x,y}=pose.head,d=pose.direction,girl=id==='character-02';
 if(girl){
  // Artist-shaped fringe, two separate temple locks, and a woven straw hat.
  if(d!=='back'){
   path(ctx,[['M',x-15,y-12],['Q',x-10,y-24,x+3,y-21],
    ['Q',x+16,y-19,x+17,y-9],['Q',x+9,y-13,x+4,y-9],
    ['Q',x-2,y-16,x-8,y-8],['Q',x-12,y-9,x-15,y-12],['Z']],
    grad(ctx,x-15,y-19,x+16,y-7,[[0,c.hair],[.55,c.hairHigh],[1,c.hair]]));
   for(const s of [-1,1])path(ctx,[['M',x+s*14,y-7],['Q',x+s*20,y+8,x+s*14,y+17],
    ['Q',x+s*12,y+12,x+s*13,y+2],['Z']],c.hairHigh);
  }
  path(ctx,[['M',x-24,y-17],['Q',x-17,y-22,x-13,y-30],
   ['Q',x-9,y-38,x+9,y-38],['Q',x+16,y-35,x+15,y-24],
   ['Q',x+20,y-21,x+25,y-16],['Q',x+21,y-12,x+7,y-12],
   ['Q',x-10,y-10,x-24,y-17],['Z']],
   grad(ctx,x-20,y-32,x+18,y-14,[[0,'#ba864b'],[.30,'#ffe7a5'],[.75,'#f8c979'],[1,'#bd884b']]),
   '#a87945',.8);
  curve(ctx,[[x-19,y-20],[x,y-16],[x+19,y-19]],'#56b7ca',2.2);
  curve(ctx,[[x-8,y-35],[x-6,y-25],[x-4,y-20]],'#fff1be',.75);
 }else{
  // Tousled layered hair with distinct side/back silhouette.
  if(d==='back'){
   for(const q of [-12,-4,5,12]){
    path(ctx,[['M',x+q-4,y-13],['Q',x+q+2,y-20,x+q+5,y-12],
     ['Q',x+q+7,y-4,x+q+1,y+9],['Q',x+q-6,y+4,x+q-4,y-13],['Z']],c.hair);
   }
  }else{
   path(ctx,[['M',x-18,y-9],['Q',x-22,y-19,x-16,y-24],
    ['L',x-14,y-29],['Q',x-10,y-27,x-8,y-28],
    ['Q',x-3,y-34,x+3,y-29],['Q',x+11,y-34,x+13,y-25],
    ['L',x+21,y-23],['Q',x+19,y-14,x+16,y-10],
    ['Q',x+8,y-15,x+3,y-10],['Q',x-5,y-16,x-10,y-7],
    ['Q',x-14,y-9,x-18,y-9],['Z']],
    grad(ctx,x-19,y-27,x+15,y-9,[[0,'#1b3548'],[.55,c.hairHigh],[1,c.hair]]),c.ink,.6);
   for(const q of [-9,0,8])curve(ctx,[[x+q,y-24],[x+q+4,y-17],[x+q+2,y-13]],'#81a0a4',.68);
  }
 }
}
function torso(ctx,pose,c,id){
 const left=pose.leftArm[0],right=pose.rightArm[0],neck=pose.neck,hip=pose.pelvis;
 const cx=(left.x+right.x)/2,top=(left.y+right.y)/2-3,bottom=hip.y+2;
 const half=Math.max(9,Math.abs(right.x-left.x)*.5),girl=id==='character-02',d=pose.direction;
 const color=grad(ctx,cx-half,top,cx+half,bottom,[[0,c.shirtDark],[.18,c.shirt],[.65,c.shirtLight],[1,c.shirtDark]]);
 path(ctx,[['M',left.x-1,top],['Q',cx-9,top-5,neck.x,neck.y+2],
  ['Q',cx+9,top-5,right.x+1,top],['C',right.x+5,top+12,cx+half*.85,bottom-8,cx+10,bottom],
  ['Q',cx,bottom+3,cx-10,bottom],['C',cx-half*.85,bottom-8,left.x-5,top+12,left.x-1,top],['Z']],
  color,c.shirtDark,.72);
 if(girl){
  if(d!=='back'){
   path(ctx,[['M',cx-11,top+1],['L',cx,top+12],['L',cx+11,top+1],
    ['L',cx+8,top+9],['L',cx,top+17],['L',cx-8,top+9],['Z']],c.shirtDark,'#e4fdff',.7);
   path(ctx,[['M',cx-2,top+13],['L',cx+2,top+13],['L',cx+4,bottom-3],
    ['Q',cx,bottom-2,cx-4,bottom-3],['Z']],c.detail);
  }else{
   path(ctx,[['M',cx-13,top+3],['Q',cx,top+14,cx+13,top+3],
    ['L',cx+11,top+12],['Q',cx,top+19,cx-11,top+12],['Z']],c.shirtDark);
  }
  curve(ctx,[[cx-11,bottom-6],[cx-4,bottom-5],[cx+7,bottom-6]],'#f5ffff',.9);
 }else{
  // Open beach shirt lapels, dark undertop, printed hand-drawn floral motifs.
  if(d!=='back'){
   path(ctx,[['M',cx-8,top+2],['L',cx,top+12],['L',cx+8,top+2],
    ['L',cx+4,top+14],['L',cx-2,bottom-1],['L',cx-5,top+15],['Z']], '#f5f7e3');
   for(const s of [-1,1])path(ctx,[['M',cx+s*4,top+3],['L',cx+s*9,top+10],
    ['L',cx+s*6,top+14],['L',cx+s*2,top+13],['Z']],c.shirtLight);
  }
  for(const [dx,dy] of [[-8,18],[9,27],[-10,33],[7,40]]){
   const xx=cx+dx,yy=top+dy;
   if(yy<bottom-5){
    for(let a=0;a<5;a++){const u=a*TAU/5;oval(ctx,xx+Math.cos(u)*2,yy+Math.sin(u)*2,1.65,1.1,'#f7eac5');}
    oval(ctx,xx,yy,.9,.9,'#e2af67');
   }
  }
  curve(ctx,[[cx,bottom-23],[cx-.6,bottom-11],[cx,bottom-3]],'#e4f5dc',.8);
 }
}
function pelvis(ctx,pose,c,id){
 const h=pose.pelvis,{x,y}=h,girl=id==='character-02';
 if(girl){
  path(ctx,[['M',x-11,y-4],['Q',x,y-1,x+11,y-4],
   ['C',x+14,y+3,x+20,y+12,x+18,y+17],
   ['Q',x,y+24,x-18,y+17],['C',x-20,y+11,x-14,y+3,x-11,y-4],['Z']],
   grad(ctx,x-20,y,x+18,y+20,[[0,c.bottomDark],[.30,c.bottom],[.70,'#dffaff'],[1,c.bottomDark]]),
   c.bottomDark,.62);
  for(let i=-2;i<=2;i++)curve(ctx,[[x+i*6,y+4],[x+i*7,y+12],[x+i*7,y+18]],'#f8fffb',.8);
  curve(ctx,[[x-12,y+1],[x,y+2],[x+12,y+1]],c.detail,1.5);
 }else{
  path(ctx,[['M',x-10,y-2],['Q',x,y-1,x+10,y-2],['L',x+12,y+17],
   ['Q',x+5,y+19,x+1,y+16],['L',x,y+9],['L',x-1,y+16],
   ['Q',x-6,y+19,x-12,y+17],['Z']],
   grad(ctx,x-12,y,x+12,y+15,[[0,c.bottomDark],[.30,c.bottom],[.78,c.bottom],[1,c.bottomDark]]),
   c.bottomDark,.68);
  curve(ctx,[[x-10,y+2],[x,y+2],[x+10,y+2]],'#fff1d2',1);
  curve(ctx,[[x,y+5],[x,y+12]],c.bottomDark,.5);
 }
}
function jointSegment(ctx,pose,c,id,name){
 const b=skinBinding(pose,id).parts[name],[a,e]=b;
 const girl=id==='character-02',d=pose.direction;
 if(name.startsWith('upper_arm')){
  const dx=e.x-a.x,dy=e.y-a.y,L=Math.hypot(dx,dy);
  segment(ctx,a,e,girl?5:5.8,4.2,[c.skin,c.skinDark,c.skinBright],(sub,len)=>{
   path(sub,[['M',-5.4,-.8],['Q',0,-3.6,5.4,-.8],
    ['L',4.8,len*.38],['Q',0,len*.44,-4.8,len*.38],['Z']],
    grad(sub,-5,0,5,len*.42,[[0,c.shirtDark],[.4,c.shirt],[1,c.shirtLight]]),
    c.shirtDark,.6);
   curve(sub,[[-4.4,len*.38],[0,len*.43],[4.2,len*.38]],c.detail,.62);
  });
 }else if(name.startsWith('forearm')){
  segment(ctx,a,e,4.5,3.25,[c.skin,c.skinDark,c.skinBright]);
 }else if(name.startsWith('thigh')){
  segment(ctx,a,e,girl?5.2:6.1,4.9,[c.skin,c.skinDark,c.skinBright],girl?null:(sub,len)=>{
   path(sub,[['M',-6,-1],['Q',0,-3,6,-1],
    ['L',5.6,len*.37],['Q',0,len*.45,-5.6,len*.37],['Z']],c.bottom,c.bottomDark,.5);
   curve(sub,[[-5,len*.35],[0,len*.41],[5,len*.35]],'#fff0d7',.55);
  });
 }else if(name.startsWith('shin')){
  segment(ctx,a,e,5,3.6,[c.skin,c.skinDark,c.skinBright]);
 }
 // No image of complete body is drawn behind articulated limbs.
 if((d==='back')&&name.startsWith('upper_arm'))oval(ctx,a.x,a.y,1.4,1.1,c.shirtLight);
}
function hand(ctx,pose,c,name){
 const v=skinBinding(pose,c===P['character-01']?'character-01':'character-02').parts[name][0];
 ctx.save();ctx.translate(v.x,v.y);
 path(ctx,[['M',-3.5,-3.7],['Q',-5,-1,-4,3],['Q',-3.2,7,0,7.7],
  ['Q',3.5,6,4.2,2],['Q',5,-2,2.8,-4],['Z']],
  grad(ctx,-4,0,4,5,[[0,c.skinDark],[.45,c.skin],[1,c.skinBright]]),c.skinDark,.52);
 for(let i=-1;i<=1;i++)curve(ctx,[[i*2,3],[i*2,6]],c.skinDark,.4);
 ctx.restore();
}
function foot(ctx,pose,c,name){
 const v=skinBinding(pose,c===P['character-01']?'character-01':'character-02').parts[name][0];
 const d=pose.direction,side=d==='left'?-1:d==='right'?1:0;
 ctx.save();ctx.translate(v.x,v.y);
 ctx.rotate(side*.13);
 path(ctx,[['M',-4.6,-4],['Q',-5.2,-1,-6,1],
  ['Q',-8,5,-4,7],['Q',2,9,8,5],
  ['Q',9,2,4,-2],['L',3,-4],['Z']],
  grad(ctx,-6,0,8,6,[[0,c.shoeDark],[.4,c.shoe],[1,c.shoe]]),
  c.shoeDark,.65);
 curve(ctx,[[-3,-.5],[1,2],[5,1]],c.shoeDark,1.6);
 curve(ctx,[[-4,6],[1,7],[6,5]],'#ffffff',.6);
 ctx.restore();
}
function drawPart(ctx,pose,id,name){
 const c=P[id];
 switch(name){
  case 'hair_back':return hairBehind(ctx,pose,c,id);
  case 'head':return head(ctx,pose,c,id);
  case 'hair_front':return hairFront(ctx,pose,c,id);
  case 'torso':return torso(ctx,pose,c,id);
  case 'pelvis':return pelvis(ctx,pose,c,id);
  case 'hand_left':case 'hand_right':return hand(ctx,pose,c,name);
  case 'foot_left':case 'foot_right':return foot(ctx,pose,c,name);
  default:return jointSegment(ctx,pose,c,id,name);
 }
}
export function drawV414Skin(ctx,pose,{characterId='character-01',width=240,height=360,showAnchors=false}={}){
 if(!ctx||typeof ctx.save!=='function')throw Error('SKIN_CANVAS_REQUIRED');
 const binding=skinBinding(pose,characterId);
 ctx.clearRect(0,0,width,height);
 ctx.save();ctx.scale(width/100,height/160);
 // Far limbs before clothing; head/front locks after torso; hands on top.
 const far=['hair_back','thigh_left','shin_left','foot_left',
  'thigh_right','shin_right','foot_right',
  'upper_arm_left','forearm_left','hand_left',
  'pelvis','torso','head','hair_front',
  'upper_arm_right','forearm_right','hand_right'];
 const drawn=[];
 for(const name of far){drawPart(ctx,pose,characterId,name);drawn.push(name);}
 if(showAnchors){
  const anchors=[...pose.leftArm,...pose.rightArm,...pose.leftLeg,...pose.rightLeg];
  for(const a of anchors){
   ctx.beginPath();ctx.arc(a.x,a.y,1.7,0,TAU);
   ctx.fillStyle='#ffee89';ctx.fill();
  }
 }
 ctx.restore();
 return Object.freeze({characterId,direction:pose.direction,skinApplied:true,
  layersDrawn:Object.freeze(drawn),headTiltDeg:0,previewOnly:true});
}

/** Draw ONE independently transparent, skeleton-bound anatomical layer.
 * Used only for high-resolution artwork export; the approved live 9-action
 * render loop remains unchanged. Every file aligns to the same master canvas.
 */
export function drawV414SkinLayer(ctx,pose,{characterId='character-01',layerName,width=1200,height=1920}={}){
 if(!ctx||typeof ctx.save!=='function')throw Error('SKIN_CANVAS_REQUIRED');
 const binding=skinBinding(pose,characterId);
 if(!V414_LAYERS.includes(layerName))throw Error('INVALID_SKIN_LAYER');
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('INVALID_EXPORT_SIZE');
 ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/100,height/160);
 drawPart(ctx,pose,characterId,layerName);
 ctx.restore();
 return Object.freeze({characterId,direction:binding.direction,layerName,transparent:true,headTiltDeg:0,previewOnly:true});
}
