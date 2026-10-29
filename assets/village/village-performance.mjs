export function startVillagePerformanceReporter({target=window.parent,targetOrigin=window.location.origin,sampleMs=5000}={}){
  let stopped=false,frameId=0,frames=0,lastFrame=performance.now(),fps=60,longTasks=0,worstLongTask=0;
  const frame=now=>{frameId=0;if(stopped||document.hidden)return;frames++;const span=now-lastFrame;if(span>=1000){fps=Math.round(frames*1000/span);frames=0;lastFrame=now}frameId=requestAnimationFrame(frame)};
  const resumeFrames=()=>{if(stopped||document.hidden||frameId)return;frames=0;lastFrame=performance.now();frameId=requestAnimationFrame(frame)};
  const visibility=()=>{if(document.hidden){if(frameId)cancelAnimationFrame(frameId);frameId=0;return}resumeFrames()};
  document.addEventListener('visibilitychange',visibility);
  resumeFrames();
  let observer=null;
  try{
    if("PerformanceObserver" in window){
      observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){longTasks++;worstLongTask=Math.max(worstLongTask,Math.round(e.duration))}});
      observer.observe({entryTypes:["longtask"]});
    }
  }catch{}
  const report=()=>{
    if(stopped)return;
    const mem=performance.memory;
    const scene=window.GMWWVillageRenderMetrics||{};
    const payload={type:"gmww:village-perf",fps,longTasks,worstLongTask,
      sceneRenders:Number(scene.renders||0),sceneNodesCreated:Number(scene.created||0),
      sceneNodesReused:Number(scene.reused||0),movementFrames:Number(scene.movementFrames||0),
      mountedCharacters:Number(scene.mounted||0),
      nodes:document.getElementsByTagName("*").length,
      width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,
      heapMB:mem&&Number.isFinite(mem.usedJSHeapSize)?Math.round(mem.usedJSHeapSize/1048576):null,
      at:Date.now()};
    try{if(target&&target!==window)target.postMessage(payload,targetOrigin)}catch{}
  };
  const timer=setInterval(report,Math.max(3000,sampleMs));setTimeout(report,1200);
  return()=>{stopped=true;if(frameId)cancelAnimationFrame(frameId);frameId=0;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);observer?.disconnect?.()};
}
