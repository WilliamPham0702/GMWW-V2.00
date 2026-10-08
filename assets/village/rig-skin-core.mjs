// GMWW Rig + Skin proof, isolated from the production renderer.
// Only joint transforms are shared; visual skins are independent of actions.
export const RIG_SKIN_VERSION='0.1.0';
export const ACTION_GROUPS=Object.freeze([
  {name:'Chuyển động cơ bản',actions:[
    ['idle','Đứng yên – thở tự nhiên'],['head-motion','Lắc đầu, gật đầu'],
    ['walk','Đi bộ – tay chân bước thực tế'],['run','Chạy – có nhấc chân và đánh tay'],
    ['turn','Xoay người trái, phải'],['stop','Dừng lại tự nhiên']]},
  {name:'Ngồi – đứng – nghỉ ngơi',actions:[
    ['sit','Ngồi xếp bằng tự nhiên'],['sit-down','Chuyển từ đứng sang ngồi'],
    ['stand-up','Đứng dậy từ tư thế ngồi'],['stretch','Vươn vai, giãn cơ']]},
  {name:'Giao tiếp – cảm xúc',actions:[
    ['wave','Vẫy tay chào'],['agree','Gật đầu đồng ý'],['disagree','Lắc đầu từ chối'],
    ['clap','Vỗ tay'],['cheer','Giơ tay ăn mừng'],['jump-happy','Nhảy vui mừng'],
    ['sad','Buồn, cúi đầu'],['think','Suy nghĩ, chống cằm'],['talk','Cử động khi nói chuyện']]},
  {name:'Hoạt động trong làng',actions:[['wander','Đi dạo ngẫu nhiên']]},
  {name:'Gameplay Ma Sói',actions:[
    ['ready','Ra hiệu sẵn sàng'],['vote','Giơ tay bỏ phiếu'],['accuse','Chỉ tay buộc tội'],
    ['explain','Giơ tay giải thích'],['fear','Sợ hãi, run rẩy'],
    ['attack','Ra đòn tấn công'],['hurt','Trúng đòn, lùi người'],
    ['die','Gục xuống khi chết'],['revive','Đứng dậy khi hồi sinh'],
    ['freeze','Bị đóng băng'],['defend','Tư thế phòng thủ'],
    ['victory','Ăn mừng chiến thắng'],['defeat','Thất vọng khi thua']]},
  {name:'Chuyển động nâng cao',actions:[
    ['secondary-motion','Tóc, trang phục chuyển động theo cơ thể'],
    ['foot-lock','Bàn chân bám mặt đất, không trượt'],
    ['blend','Chuyển mượt giữa các Action'],
    ['speed-control','Điều chỉnh tốc độ animation'],
    ['personality','Dáng đi và biểu cảm theo tính cách'],
    ['sync','Đồng bộ animation giữa GM và Player Web']]}
]);
const SYSTEM_IDS=new Set(['secondary-motion','foot-lock','blend','speed-control','personality','sync']);
export const ACTION_CATALOG=Object.freeze(ACTION_GROUPS.flatMap((g,i)=>g.actions.map(([id,label])=>Object.freeze({id,label,group:i+1,type:SYSTEM_IDS.has(id)?'system':'motion'}))));
const ACTION_BY_ID=new Map(ACTION_CATALOG.map(a=>[a.id,a]));
export const BONES=Object.freeze(['root','torso','head','upperArmL','forearmL','upperArmR','forearmR','thighL','shinL','footL','thighR','shinR','footR','hair']);
export const SKIN_SLOTS=Object.freeze(['head','hair','face','torso','upperArmL','forearmL','handL','upperArmR','forearmR','handR','thighL','shinL','footL','thighR','shinR','footR','cloth']);
export const MASTER_RIG=Object.freeze({id:'rig-humanoid-muscular-v1',bones:BONES,slots:SKIN_SLOTS,hipY:-79,upperLeg:45,lowerLeg:43,upperArm:33,forearm:29});
export const SAMPLE_SKINS=Object.freeze([
  Object.freeze({id:'skin-character-01-demo',name:'Chiến binh biển',body:'#f2ba88',shadow:'#ce805d',hair:'#f9f5e6',top:'#258aa6',trim:'#efd69b',pants:'#274e81',boots:'#60482f',eye:'#173b55',belt:'#885a37'}),
  Object.freeze({id:'skin-character-01-alt-demo',name:'Chiến binh rừng',body:'#d49c73',shadow:'#925d40',hair:'#492d36',top:'#287b66',trim:'#f7c87c',pants:'#493c64',boots:'#49352e',eye:'#35282c',belt:'#623e24'})
]);
const PI=Math.PI, TAU=PI*2;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const once=t=>ease(clamp(t,0,1));
const pulse=t=>Math.sin(t*PI);
const sin=t=>Math.sin(TAU*t);
const wave=t=>Math.sin(TAU*t);
const degrees=Object.freeze({});
export function validateSkin(skin){
  if(!skin || typeof skin!=='object' || !/^skin-[a-z0-9-]+$/.test(String(skin.id||'')))throw new TypeError('INVALID_SKIN_ID');
  for(const slot of ['body','shadow','hair','top','trim','pants','boots','eye','belt']){
    if(!/^#[0-9a-fA-F]{6}$/.test(String(skin[slot]||'')))throw new TypeError('INVALID_SKIN_COLOR_'+slot);
  }
  return {...skin};
}
export function basePose(){return{
  rootX:0,rootY:0,rootRotation:0,torso:0,head:0,
  upperArmL:-9,forearmL:-5,upperArmR:9,forearmR:5,
  thighL:0,shinL:0,footL:0,thighR:0,shinR:0,footR:0,
  hair:0,eyesClosed:0,mouth:0,scaleX:1,alpha:1,shadowScale:1,
  footCompL:0,footCompR:0
};}
function mixPose(a,b,weight){
  const t=clamp(Number(weight)||0,0,1),out={};
  for(const key of Object.keys(a))out[key]=lerp(a[key],b[key],t);
  return out;
}
export function clipDuration(id){
  if(!ACTION_BY_ID.has(id))throw new TypeError('UNKNOWN_ACTION');
  if(SYSTEM_IDS.has(id))return 0;
  if(['walk','wander'].includes(id))return 700;
  if(id==='run')return 425;
  if(id==='idle')return 2800;
  if(['die','revive'].includes(id))return 1150;
  if(['sit-down','stand-up'].includes(id))return 1000;
  if(['attack','hurt'].includes(id))return 550;
  return 1500;
}
export function isLoopingAction(id){
  return ['idle','walk','run','sit','talk','wander','fear','freeze','defend','ready','sad'].includes(id);
}
function computePose(id,time,personality='balanced',opts={}){
  const p=basePose(),w=wave(time),half=Math.sin(PI*time),bounce=Math.abs(w);
  const bold=personality==='bold'?1.18:personality==='calm'?.83:1;
  const walk=(running=false)=>{
    const factor=(running?1.4:1)*bold;
    p.thighL=w*28*factor;p.thighR=-w*28*factor;
    p.shinL=clamp(-w,0,1)*48*factor;p.shinR=clamp(w,0,1)*48*factor;
    p.upperArmL=-w*23*factor;p.upperArmR=w*23*factor;
    p.forearmL=12;p.forearmR=12;p.torso=-w*2;p.head=w*1.6;
    p.rootY=-Math.abs(Math.sin(TAU*time))* (running?8:3.4);
    p.hair=-w*4*factor;p.shadowScale=1-Math.abs(p.rootY)*.008;
    // Counter-translation during the planted half-cycle, in local rig space.
    // Full world-space locking requires the scene movement velocity at integration time.
    p.footCompL=Math.max(0,-w)*8*factor;
    p.footCompR=Math.max(0,w)*8*factor;
  };
  const crossLegged=()=>{
    p.rootY=36;p.thighL=74;p.shinL=-134;p.footL=-15;
    p.thighR=-74;p.shinR=134;p.footR=15;
    p.upperArmL=-21;p.forearmL=-35;p.upperArmR=21;p.forearmR=35;
  };
  switch(id){
    case 'idle':p.rootY=-1.5*Math.sin(TAU*time);p.torso=Math.sin(TAU*time)*.85;p.head=Math.sin(TAU*time)*1.1;break;
    case 'head-motion':p.head=Math.sin(TAU*time*1.7)*12;break;
    case 'walk':case 'wander':walk();break;
    case 'run':walk(true);p.torso=5+p.torso;break;
    case 'turn':p.scaleX=Math.max(.14,Math.abs(Math.cos(PI*time)));p.head=Math.sin(TAU*time)*8;break;
    case 'stop':walk();Object.assign(p,mixPose(p,basePose(),once(time)));break;
    case 'sit':crossLegged();p.torso=Math.sin(TAU*time)*1;break;
    case 'sit-down':Object.assign(p,mixPose(basePose(),(()=>{const a=basePose();a.rootY=36;a.thighL=74;a.shinL=-134;a.thighR=-74;a.shinR=134;return a})(),once(time)));break;
    case 'stand-up':{crossLegged();Object.assign(p,mixPose(p,basePose(),once(time)));break}
    case 'stretch':p.rootY=-8*pulse(time);p.upperArmL=-130*pulse(time);p.upperArmR=130*pulse(time);p.head=-6*pulse(time);break;
    case 'wave':p.upperArmR=-145;p.forearmR=35+27*sin(time*3);p.head=-4;break;
    case 'agree':p.head=Math.sin(TAU*time*2)*12;p.mouth=1;break;
    case 'disagree':p.head=Math.sin(TAU*time*3)*-17;break;
    case 'clap':p.upperArmL=-45-12*Math.abs(w);p.upperArmR=45+12*Math.abs(w);p.forearmL=-65;p.forearmR=65;break;
    case 'cheer':p.upperArmL=-160;p.upperArmR=160;p.rootY=-3*Math.abs(w);p.mouth=1;break;
    case 'jump-happy':p.upperArmL=-160;p.upperArmR=160;p.rootY=-22*Math.max(0,w);p.thighL=10;p.thighR=-10;p.mouth=1;break;
    case 'sad':p.head=19;p.torso=7;p.upperArmL=18;p.upperArmR=-18;break;
    case 'think':p.upperArmR=-50;p.forearmR=-116;p.head=-11;break;
    case 'talk':p.upperArmR=-20+sin(time*2)*22;p.forearmR=-48;p.head=sin(time*2)*3;p.mouth=sin(time*4)>0?1:0;break;
    case 'ready':p.upperArmR=-145;p.forearmR=-12;p.rootY=-2*bounce;break;
    case 'vote':p.upperArmR=-178;p.forearmR=2;break;
    case 'accuse':p.upperArmR=-86;p.forearmR=-88;p.torso=-5;break;
    case 'explain':p.upperArmL=-50+sin(time)*14;p.upperArmR=50-sin(time)*14;p.forearmL=-36;p.forearmR=36;p.mouth=1;break;
    case 'fear':p.rootX=sin(time*5)*2;p.head=sin(time*4)*5;p.upperArmL=-34;p.upperArmR=34;p.forearmL=-88;p.forearmR=88;break;
    case 'attack':p.upperArmR=-130+135*once(time);p.forearmR=-75;p.torso=-10+19*once(time);p.rootX=11*once(time);break;
    case 'hurt':p.torso=25*pulse(time);p.rootX=-12*pulse(time);p.head=19*pulse(time);break;
    case 'die':p.rootRotation=80*once(time);p.rootY=28*once(time);p.alpha=1-.18*once(time);break;
    case 'revive':p.rootRotation=80*(1-once(time));p.rootY=28*(1-once(time));p.upperArmR=75*(1-once(time));break;
    case 'freeze':p.upperArmL=-21;p.upperArmR=21;p.torso=0;break;
    case 'defend':p.upperArmL=-73;p.forearmL=-80;p.upperArmR=73;p.forearmR=80;p.torso=-4;break;
    case 'victory':p.upperArmL=-158;p.upperArmR=158;p.rootY=-10*Math.abs(w);p.mouth=1;break;
    case 'defeat':p.head=20;p.torso=12;p.upperArmL=25;p.upperArmR=-25;p.rootY=6;break;
    default:break;
  }
  if(opts.secondaryMotion!==false && id!=='freeze'){
    p.hair+=Math.sin(TAU*time*1.65)*2.4;
  }
  if(opts.footLock===false){p.footCompL=0;p.footCompR=0;}
  return p;
}
export function sampleRigAction(actionId,elapsedMs,{speed=1,personality='balanced',secondaryMotion=true,footLock=true,previousAction=null,transitionElapsedMs=Infinity,blendMs=180}={}){
  const action=ACTION_BY_ID.get(actionId);
  if(!action)throw new TypeError('UNKNOWN_ACTION');
  const id=action.type==='system'?'idle':actionId;
  const velocity=clamp(Number(speed)||1,.25,3);
  const duration=clipDuration(id);
  const seconds=Math.max(0,Number(elapsedMs)||0)*velocity;
  const phase=isLoopingAction(id)?(seconds%duration)/duration:clamp(seconds/duration,0,1);
  const current=computePose(id,phase,personality,{secondaryMotion,footLock});
  if(previousAction && previousAction!==id && ACTION_BY_ID.get(previousAction)?.type==='motion'){
    const prevDuration=clipDuration(previousAction);
    const prevPhase=isLoopingAction(previousAction)?(seconds%prevDuration)/prevDuration:1;
    const previous=computePose(previousAction,prevPhase,personality,{secondaryMotion,footLock});
    const amount=ease(clamp((Number(transitionElapsedMs)||0)/Math.max(1,Number(blendMs)||1),0,1));
    return mixPose(previous,current,amount);
  }
  return current;
}
export function sampleSynchronizedAction(command,localNowMs,serverClockOffsetMs=0){
  const serverNow=Number(localNowMs)+Number(serverClockOffsetMs||0);
  const age=Math.max(0,serverNow-Number(command?.startedAt||0));
  return sampleRigAction(command?.actionId||'idle',age,{
    speed:command?.speed??1,personality:command?.personality||'balanced',
    previousAction:command?.previousAction||null,
    transitionElapsedMs:Math.max(0,serverNow-Number(command?.transitionAt??command?.startedAt??0)),
    blendMs:command?.blendMs??180
  });
}
