// GMWW Arena 3D GĐ19–21: PRIVATE-DEVICE presentation diagnostics only.
// NO room code, player identifier, role, artifact, authentication or URLs.
// CPU paint duration is NOT GPU time; thermals/battery are not available to WebGL.
export const ARENA_STAGE19_VERSION='gmww.arena.mobile-qa.19-21';
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const round=n=>Math.round(n*10)/10;
function percentile(values,p){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return round(sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)]);
}
export function createArenaMobileDiagnostics({capacity=240}={}){
 const cap=Math.max(10,Math.min(600,Math.trunc(Number(capacity))||240));
 const samples=[],errors={contextLost:0,contextRestored:0},startedAt=Date.now();
 let lastPaint=null,hidden=false,contextLost=false,totalFrames=0;
 function sample({at,paintCpuMs,drawCalls,targetHz,characters,pixelRatio}={}){
  if(hidden||contextLost||!valid(at)||!valid(paintCpuMs)||!valid(drawCalls)||
    !valid(targetHz)||targetHz===0||!valid(characters)||!valid(pixelRatio))return;
  // Ignore background suspension and debugger breaks; these aren't real FPS.
  const interval=lastPaint===null?null:at-lastPaint;
  lastPaint=at;
  if(interval!==null&&(interval<=0||interval>1400))return;
  totalFrames++;
  samples.push(Object.freeze({interval:interval===null?null:round(interval),
    paintCpuMs:round(paintCpuMs),drawCalls:Math.trunc(drawCalls),
    targetHz:Math.trunc(targetHz),characters:Math.trunc(characters),
    pixelRatio:round(pixelRatio)}));
  if(samples.length>cap)samples.shift();
 }
 function visibility(value){
  hidden=value===true;lastPaint=null;
 }
 function lost(){
  if(!contextLost){contextLost=true;errors.contextLost++}
  lastPaint=null;
 }
 function restored(){
  if(contextLost){contextLost=false;errors.contextRestored++}
  lastPaint=null;
 }
 function reset(){
  samples.length=0;totalFrames=0;lastPaint=null;
  errors.contextLost=0;errors.contextRestored=0;
 }
 function snapshot(){
  const cpu=samples.map(x=>x.paintCpuMs), intervals=samples.map(x=>x.interval).filter(x=>x!==null);
  const latest=samples.at(-1)||null;
  return Object.freeze({
   version:ARENA_STAGE19_VERSION,
   sampleCount:samples.length,totalFrames,
   paintIntervalMedianMs:percentile(intervals,.5),
   paintIntervalP95Ms:percentile(intervals,.95),
   paintCpuMedianMs:percentile(cpu,.5),
   paintCpuP95Ms:percentile(cpu,.95),
   measuredPaintFps:intervals.length?round(1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length)):null,
   drawCalls:latest?.drawCalls??null,characterCount:latest?.characters??null,
   requestedPaintHz:latest?.targetHz??null,pixelRatio:latest?.pixelRatio??null,
   hidden,webglContextLost:contextLost,contextLosses:errors.contextLost,
   contextRestores:errors.contextRestored,
   // Report is local-only and deliberately contains no free-text sources.
   measurements:'browser-cpu-and-paint-cadence-only',thermalCelsius:null,batteryDrainPercent:null
  });
 }
 function report(){
  const {version,sampleCount,totalFrames,paintIntervalMedianMs,paintIntervalP95Ms,
   paintCpuMedianMs,paintCpuP95Ms,measuredPaintFps,drawCalls,characterCount,
   requestedPaintHz,pixelRatio,webglContextLost,contextLosses,contextRestores,
   thermalCelsius,batteryDrainPercent,measurements}=snapshot();
  return JSON.stringify({version,sampleCount,totalFrames,
   paintIntervalMedianMs,paintIntervalP95Ms,paintCpuMedianMs,paintCpuP95Ms,
   measuredPaintFps,drawCalls,characterCount,requestedPaintHz,pixelRatio,
   webglContextLost,contextLosses,contextRestores,thermalCelsius,
   batteryDrainPercent,measurements},null,2);
 }
 return Object.freeze({sample,visibility,lost,restored,reset,snapshot,report,
  get uptimeSeconds(){return Math.max(0,Math.floor((Date.now()-startedAt)/1000))}});
}
