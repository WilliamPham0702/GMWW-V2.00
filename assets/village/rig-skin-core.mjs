// Character-01 | approved minimal Action Rig — no live Worker/IPA imports.
// 9 player-visible actions; smoothness, ground contact and skinning are engine requirements, not selectable actions.
export const RIG_SKIN_VERSION='0.2.0';
export const ACTION_GROUPS=Object.freeze([
  {name:'Di chuyển cơ bản',actions:[['idle','Đứng yên – thở tự nhiên'],['walk','Đi bộ – chân bước, tay đánh tự nhiên'],['run','Chạy nhẹ']]},
  {name:'Ngồi và đứng',actions:[['sit','Ngồi xếp bằng, chân gọn sát người'],['sit-down','Chuyển từ đứng sang ngồi'],['stand-up','Chuyển từ ngồi sang đứng']]},
  {name:'Giao tiếp',actions:[['wave','Vẫy tay chào']]},
  {name:'Gameplay Ma Sói',actions:[['vote','Giơ tay bỏ phiếu'],['result','Ăn mừng chiến thắng / buồn khi thua']]}
]);
export const ACTION_CATALOG=Object.freeze(ACTION_GROUPS.flatMap((group,i)=>group.actions.map(([id,label])=>Object.freeze({id,label,group:i+1,type:'motion'}))));
const ACTION_SET=new Set(ACTION_CATALOG.map(x=>x.id));
export const BONES=Object.freeze(['root','pelvis','torso','neck','head','shoulderL','elbowL','handL','shoulderR','elbowR','handR','hipL','kneeL','ankleL','hipR','kneeR','ankleR']);
export const SKIN_SLOTS=Object.freeze(['hair','head','eyes','torso','vest','arms','hands','shorts','legs','sandals','accessories']);
export const MASTER_RIG=Object.freeze({id:'gmww-soft-rig-muscular-v2',bones:BONES,slots:SKIN_SLOTS,upperLeg:49,lowerLeg:44,upperArm:34,forearm:28});
export const SAMPLE_SKINS=Object.freeze([
  {id:'skin-character-01-sea',name:'Bản phỏng theo Character-01',skin:'#d99261',light:'#f3c094',shade:'#9c5b39',hair:'#171d2a',vest:'#0d9dac',vestLight:'#78e2d5',shorts:'#ecf4e7',pattern:'#e99993',sandal:'#16637c',eye:'#20202b'},
  {id:'skin-character-01-night',name:'Biến thể Skin trên cùng Rig',skin:'#d18b63',light:'#edb58b',shade:'#945338',hair:'#30233a',vest:'#235d99',vestLight:'#8dd6e9',shorts:'#dbebe7',pattern:'#f1c57c',sandal:'#23344b',eye:'#272133'}
].map(Object.freeze));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
const sin=Math.sin;
const v=(x,y)=>({x,y});
const blendPoint=(a,b,t)=>v(lerp(a.x,b.x,t),lerp(a.y,b.y,t));
export function validateSkin(s){
  if(!s||!/^skin-[a-z0-9-]+$/.test(s.id||''))throw new TypeError('INVALID_SKIN_ID');
  for(const k of ['skin','light','shade','hair','vest','vestLight','shorts','pattern','sandal','eye'])if(!/^#[0-9a-fA-F]{6}$/.test(s[k]||''))throw new TypeError('INVALID_SKIN_COLOR_'+k);
  return {...s};
}
function jointPose(){
  return {
    root:v(0,0),hip:v(0,207),shoulder:v(0,141),head:v(0,100),headTilt:0,torsoTilt:0,
    elbows:{L:v(-42,167),R:v(42,167)},hands:{L:v(-41,195),R:v(41,195)},
    knees:{L:v(-17,246),R:v(17,246)},ankles:{L:v(-19,286),R:v(19,286)},
    footX:{L:-19,R:19},footY:{L:294,R:294},footLift:{L:0,R:0},
    mouth:0,eyes:0,shadow:1,alpha:1,hair:0,sitBlend:0,contact:{L:true,R:true},worldX:0
  };
}
export function basePose(){return jointPose()}
export const CLIP_DURATIONS=Object.freeze({idle:3000,walk:780,run:480,sit:3100,'sit-down':900,'stand-up':950,wave:1500,vote:1300,result:1700});
export function clipDuration(id){if(!ACTION_SET.has(id))throw new TypeError('UNKNOWN_ACTION');return CLIP_DURATIONS[id]}
export function isLoopingAction(id){return ['idle','walk','run','sit'].includes(id)}
const interpPose=(a,b,t)=>{
  if(t<=0)return a;if(t>=1)return b;
  const out=jointPose();
  for(const key of ['root','hip','shoulder','head'])out[key]=blendPoint(a[key],b[key],t);
  for(const key of ['elbows','hands','knees','ankles']){
    out[key]={L:blendPoint(a[key].L,b[key].L,t),R:blendPoint(a[key].R,b[key].R,t)};
  }
  for(const key of ['footX','footY','footLift'])out[key]={L:lerp(a[key].L,b[key].L,t),R:lerp(a[key].R,b[key].R,t)};
  for(const key of ['headTilt','torsoTilt','mouth','eyes','shadow','alpha','hair','sitBlend','worldX'])out[key]=lerp(a[key],b[key],t);
  out.contact={L:t<.5?a.contact.L:b.contact.L,R:t<.5?a.contact.R:b.contact.R};
  return out;
};
// Fixed-length 2-bone inverse kinematics. In the standing gait the knee smoothly bends
// while the stance foot remains planted on the ground as the actor travels in world space.
function kneeFor(hip,ankle,side){
  const U=MASTER_RIG.upperLeg,D=MASTER_RIG.lowerLeg,dx=ankle.x-hip.x,dy=ankle.y-hip.y;
  const d=clamp(Math.hypot(dx,dy),1, U+D-.5);
  const axial=(U*U-D*D+d*d)/(2*d),perp=Math.sqrt(Math.max(0,U*U-axial*axial));
  const ux=dx/Math.max(1,Math.hypot(dx,dy)),uy=dy/Math.max(1,Math.hypot(dx,dy));
  const kneeA=v(hip.x+ux*axial-uy*perp,hip.y+uy*axial+ux*perp);
  const kneeB=v(hip.x+ux*axial+uy*perp,hip.y+uy*axial-ux*perp);
  // bend forward in profile; oppose left/right very slightly for natural stance.
  return side==='L'?(kneeA.x<kneeB.x?kneeA:kneeB):(kneeA.x>kneeB.x?kneeA:kneeB);
}
function seatedPose(t){
  const p=jointPose(),b=Math.sin(t*TAU);
  p.hip=v(0,281);p.shoulder=v(0,218);p.head=v(0,176);p.sitBlend=1;
  p.knees={L:v(-34,291),R:v(34,291)};
  // ankle feet overlap at center, knees stay close to torso rather than spread.
  p.ankles={L:v(18,297),R:v(-18,297)};
  p.footX={L:13,R:-13};p.footY={L:302,R:302};
  p.elbows={L:v(-32,263),R:v(32,263)};
  p.hands={L:v(-28,288),R:v(28,288)};
  p.headTilt=b*1.3;p.hair=-b*1.2;
  return p;
}
function gaitPose(phase,running,personality,footLock,elapsed){
  const p=jointPose();
  const stride=(running?28:19)*(personality==='bold'?1.12:personality==='calm'?.88:1);
  const lift=running?17:11;
  const cycle=phase%1;
  // Each leg spends half a cycle in stance, other half in swing.
  // During stance local foot delta exactly cancels the root's world delta.
  p.worldX=(elapsed/CLIP_DURATIONS[running?'run':'walk'])*2*stride;
  for(const [side,offset,baseX] of [['L',0,-13],['R',.5,13]]){
    const t=(cycle+offset)%1,stance=t<.5,progress=stance?t*2:(t-.5)*2;
    const footX=baseX+(stance?lerp(stride/2,-stride/2,progress):lerp(-stride/2,stride/2,smooth(progress)));
    const y=289+(stance?0:-lift*sin(Math.PI*progress));
    const ankle=v(footX,y);
    p.ankles[side]=ankle;
    p.knees[side]=kneeFor(v(baseX,207),ankle,side);
    p.footX[side]=footX+(stance?0:3*(progress-.5));
    p.footY[side]=294+(stance?0:-lift*sin(Math.PI*progress));
    p.footLift[side]=stance?0:lift*sin(Math.PI*progress);
    p.contact[side]=stance;
    if(!footLock && stance){
      p.footX[side]+=sin(TAU*cycle)*3; // visible demonstration of disabled foot planting
    }
  }
  p.root.y=-Math.abs(sin(TAU*cycle))*(running?4:2);
  const arm=sin(TAU*cycle);
  p.elbows.L=v(-40+arm*8,163+arm*3);
  p.elbows.R=v(40+arm*8,163-arm*3);
  p.hands.L=v(-43+arm*16,188+arm*9);
  p.hands.R=v(43+arm*16,188-arm*9);
  p.shoulder.x=sin(TAU*cycle)*1.6;
  p.headTilt=sin(TAU*cycle)*1.3;
  p.hair=-sin(TAU*cycle)*3;
  p.shadow=running?.87:.94;
  return p;
}
function sampleInternal(actionId,elapsedMs,options={}){
  const p=jointPose(),d=CLIP_DURATIONS[actionId],elapsed=Math.max(0,elapsedMs);
  const t=isLoopingAction(actionId)?((elapsed%d)/d):clamp(elapsed/d,0,1);
  const w=sin(t*TAU);
  switch(actionId){
    case 'idle':p.hip.y+=sin(t*TAU)*1.15;p.shoulder.y+=sin(t*TAU)*.6;p.head.y+=sin(t*TAU)*.9;p.headTilt=sin(t*TAU)*1.4;p.hair=sin(t*TAU+.5)*1.3;break;
    case 'walk':return gaitPose(t,false,options.personality,options.footLock!==false,elapsed);
    case 'run':return gaitPose(t,true,options.personality,options.footLock!==false,elapsed);
    case 'sit':return seatedPose(t);
    case 'sit-down':return interpPose(jointPose(),seatedPose(0),smooth(t));
    case 'stand-up':return interpPose(seatedPose(0),jointPose(),smooth(t));
    case 'wave':
      p.elbows.R=v(52,121);p.hands.R=v(50+6*sin(TAU*t*3),92+6*sin(TAU*t*3));
      p.headTilt=-3;p.mouth=1;break;
    case 'vote':
      p.elbows.R=v(33,111);p.hands.R=v(28,76);p.headTilt=-2;
      break;
    case 'result':
      if(options.outcome==='lose'){
        p.head.y+=11*smooth(t);p.headTilt=10*smooth(t);p.shoulder.y+=6*smooth(t);p.hands.L.y+=6*smooth(t);p.hands.R.y+=6*smooth(t);p.mouth=-1;
      }else{
        const pulse=Math.abs(sin(Math.PI*3*t))*(1-.55*t);
        p.root.y=-12*pulse;p.elbows.L=v(-49,109);p.elbows.R=v(49,109);
        p.hands.L=v(-55,76);p.hands.R=v(55,76);p.mouth=1;
      }
      break;
  }
  return p;
}
export function sampleRigAction(actionId,elapsedMs,{speed=1,personality='balanced',footLock=true,previousAction=null,transitionElapsedMs=Infinity,blendMs=220,outcome='win'}={}){
  if(!ACTION_SET.has(actionId))throw new TypeError('UNKNOWN_ACTION');
  const runtime=Math.max(0,Number(elapsedMs)||0)*clamp(Number(speed)||1,.25,3);
  const target=sampleInternal(actionId,runtime,{personality,footLock,outcome});
  if(previousAction && ACTION_SET.has(previousAction)&&previousAction!==actionId){
    const prev=sampleInternal(previousAction,Math.min(clipDuration(previousAction),runtime),{personality,footLock,outcome});
    return interpPose(prev,target,smooth((Number(transitionElapsedMs)||0)/Math.max(1,blendMs)));
  }
  return target;
}
export function sampleSynchronizedAction(command,localNowMs,serverClockOffsetMs=0){
  const now=Number(localNowMs)+Number(serverClockOffsetMs||0),age=Math.max(0,now-Number(command?.startedAt||0));
  return sampleRigAction(command?.actionId||'idle',age,{speed:command?.speed??1,personality:command?.personality||'balanced',
    outcome:command?.outcome||'win',previousAction:command?.previousAction||null,
    transitionElapsedMs:Math.max(0,now-Number(command?.transitionAt??command?.startedAt??0)),
    blendMs:command?.blendMs??220});
}
