// Four-way village navigation: face the destination BEFORE applying world displacement.
// Navigation is a system behavior, NOT another selectable Character action.
export const DIRECTION_LABELS=Object.freeze({left:'Trái',right:'Phải',up:'Lên · nhìn từ sau',down:'Xuống · nhìn từ trước'});
export const DIRECTIONS=Object.freeze(Object.keys(DIRECTION_LABELS));
export const TURN_MS=320;
export const WALK_SEGMENT_MS=2050;
export const RUN_SEGMENT_MS=1250;
export const ROUTE_POINTS=Object.freeze([
  Object.freeze({x:-.20,y:.055}),
  Object.freeze({x:.20,y:.055}),
  Object.freeze({x:.20,y:-.07}),
  Object.freeze({x:-.20,y:-.07}),
  Object.freeze({x:-.20,y:.055})
]);
export const ROUTE_DIRECTIONS=Object.freeze(['right','up','left','down']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const easing=t=>{const u=clamp(t,0,1);return u*u*(3-2*u)};
const pos=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
export function sampleVillageRoute(elapsedMs,{mode='auto',run=false,speed=1}={}){
  const delta=Number(elapsedMs),t=Math.max(0,Number.isFinite(delta)?delta:0)*clamp(Number(speed)||1,.25,3);
  const stride=run?RUN_SEGMENT_MS:WALK_SEGMENT_MS;
  const duration=TURN_MS+stride;
  if(mode!=='auto'&&!DIRECTIONS.includes(mode))throw new TypeError('UNKNOWN_DIRECTION');
  if(mode==='auto'){
    const segment=Math.floor(t/duration)%4,offset=t%duration,face=ROUTE_DIRECTIONS[segment];
    const turning=offset<TURN_MS;
    const progress=turning?0:clamp((offset-TURN_MS)/stride,0,1);
    return{direction:face,position:pos(ROUTE_POINTS[segment],ROUTE_POINTS[segment+1],progress),
      turning,moving:!turning,motionElapsedMs:Math.max(0,offset-TURN_MS),progress,segment,animation:turning?'idle':run?'run':'walk'};
  }
  const endpoints={left:{x:-.20,y:0},right:{x:.20,y:0},up:{x:0,y:-.105},down:{x:0,y:.055}};
  const turning=t<TURN_MS,progress=turning?0:easing((t-TURN_MS)/stride);
  const moving=!turning&&t<TURN_MS+stride;
  return{direction:mode,position:pos({x:0,y:0},endpoints[mode],progress),
    turning,moving,motionElapsedMs:Math.max(0,t-TURN_MS),progress,segment:0,animation:moving?(run?'run':'walk'):'idle'};
}
