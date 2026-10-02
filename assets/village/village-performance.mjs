export function startVillagePerformanceReporter({target=window.parent,targetOrigin=window.location.origin,sampleMs=5000}={}){
  let stopped=false,frames=0,lastFrame=performance.now(),fps=60,longTasks=0,worstLongTask=0;
  const frame=now=>{if(stopped)return;frames++;const span=now-lastFrame;if(span>=1000){fps=Math.round(frames*1000/span);frames=0;lastFrame=now}requestAnimationFrame(frame)};
  requestAnimationFrame(frame);
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
    const payload={type:"gmww:village-perf",fps,longTasks,worstLongTask,
      nodes:document.getElementsByTagName("*").length,
      width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,
      heapMB:mem&&Number.isFinite(mem.usedJSHeapSize)?Math.round(mem.usedJSHeapSize/1048576):null,
      at:Date.now()};
    try{if(target&&target!==window)target.postMessage(payload,targetOrigin)}catch{}
  };
  const timer=setInterval(report,Math.max(3000,sampleMs));setTimeout(report,1200);
  return()=>{stopped=true;clearInterval(timer);observer?.disconnect?.()};
}
