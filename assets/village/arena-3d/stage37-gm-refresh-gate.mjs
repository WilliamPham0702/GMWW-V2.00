// GĐ37: prevent private GM HTTP refresh bursts in Arena 3D.
// One in-flight request per session; trailing event coalescing is bounded.
// The GM bearer remains in tab memory and is never logged or sent to Player Web.
const sameSession=(a,b)=>Boolean(a&&b&&a.room===b.room&&a.token===b.token&&
  a.matchId===b.matchId&&a.cycleKey===b.cycleKey);
export function createArenaGmRefreshGate({
  minGapMs=750,now=()=>Date.now(),
  schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)
}={}){
  let active=null,lastSession=null,lastStarted=-Infinity,pending=null,timer=null;
  const clearPending=()=>{
    if(timer!==null){cancel(timer);timer=null}
    pending=null;
  };
  const queue=(session,task,delay)=>{
    pending={session,task};
    if(timer!==null)return;
    timer=schedule(()=>{
      timer=null;
      const next=pending;pending=null;
      if(next)void run(next.session,next.task).catch(()=>{});
    },Math.max(1,Math.ceil(delay)));
  };
  function run(session,task){
    if(!session?.room||!session?.token||!session?.matchId||!session?.cycleKey||
      typeof task!=='function')return Promise.resolve(false);
    const stamp=now();
    if(active&&sameSession(active.session,session)){
      // Recheck after the active response, but not on every WebSocket frame.
      queue(session,task,Math.max(250,minGapMs-(stamp-lastStarted)));
      return active.promise;
    }
    if(active){
      active.controller.abort();
      active=null;
      clearPending();
    }
    if(sameSession(lastSession,session)&&stamp-lastStarted<minGapMs){
      queue(session,task,minGapMs-(stamp-lastStarted));
      return Promise.resolve(false);
    }
    clearPending();
    const controller=new AbortController();
    const promise=Promise.resolve().then(()=>task(controller.signal)).finally(()=>{
      if(active?.promise===promise)active=null;
    });
    active={session,controller,promise};
    lastSession=session;lastStarted=stamp;
    return promise;
  }
  function reset(){
    active?.controller.abort();
    active=null;lastSession=null;lastStarted=-Infinity;
    clearPending();
  }
  return Object.freeze({run,reset});
}
