// This bootstrap must execute independently, before app.js. It never edits game
// data. The existing Native bridge switches back to the bundled Runtime.
(()=>{'use strict';
  const runtime=String(document.currentScript?.dataset.runtime||'');
  const shell=String(window.GMWW_NATIVE_SHELL_VERSION||'');
  const bridge=window.webkit?.messageHandlers?.gmwwUpdater;
  const valid=v=>/^\d+(?:\.\d+)+$/.test(v);
  const compare=(a,b)=>{
    const left=a.split('.').map(Number),right=b.split('.').map(Number);
    for(let i=0;i<Math.max(left.length,right.length);i++){
      if((left[i]||0)!==(right[i]||0))return (left[i]||0)>(right[i]||0)?1:-1;
    }
    return 0;
  };
  let ready=false,attempted=false;
  const key='GMWW_RUNTIME_RECOVERY_'+runtime;
  const recover=()=>{
    if(ready||attempted||!bridge||!valid(runtime)||!valid(shell)||compare(runtime,shell)<=0)return;
    attempted=true;
    try{
      // Persist BEFORE calling Native: a failed bridge or restart cannot loop.
      // If marker storage is unavailable, leave the active Runtime untouched.
      if(localStorage.getItem(key))return;
      localStorage.setItem(key,'attempted');
    }catch{return}
    try{bridge.postMessage({action:'rollbackRuntime'})}catch{/* Keep data and existing Runtime untouched. */}
  };
  const timer=setTimeout(recover,45000);
  window.GMWWRuntimeRecovery=Object.freeze({ready(version){
    if(String(version)!==runtime)return;
    ready=true;clearTimeout(timer);
  }});
})();
