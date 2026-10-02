// Public-room-only adapter. Does not request private roles or send game actions.
// It is opt-in: a room code must be supplied by the authenticated host UI.
export function validateRoomCode(code){
  const normalized=String(code??"").trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(normalized)?normalized:"";
}
export function normalizePublicRoomState(payload){
  if(!payload||payload.ok!==true||!Array.isArray(payload.players))throw Error("INVALID_PUBLIC_ROOM_STATE");
  return {room:payload.room||{},players:payload.players};
}
export function mergeStableSeats(previous,next){
  const incoming=new Map();
  for(const p of next){
    if(!p||!p.id||incoming.has(p.id))continue;
    incoming.set(p.id,p);
  }
  const ordered=[];
  for(const p of previous||[]){const updated=incoming.get(p.id);if(updated){ordered.push(updated);incoming.delete(p.id);}}
  return ordered.concat([...incoming.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)))).slice(0,30);
}
export function createPublicRoomPoller({roomCode,fetchImpl=fetch,onState,onError,intervalMs=5000,visibility=()=>true}){
  const code=validateRoomCode(roomCode);
  if(!code)throw Error("INVALID_ROOM_CODE");
  if(typeof onState!=="function")throw Error("MISSING_ON_STATE");
  let stopped=false,timer=null,controller=null,revision=0;
  const schedule=()=>{
    if(stopped)return;
    timer=setTimeout(tick,Math.max(3000,intervalMs));
  };
  async function tick(){
    if(stopped)return;
    if(!visibility()){schedule();return;}
    controller=new AbortController();
    const current=++revision;
    try{
      const response=await fetchImpl("/api/rooms/"+encodeURIComponent(code),{
        method:"GET",headers:{accept:"application/json"},cache:"no-store",signal:controller.signal
      });
      if(!response.ok)throw Error("ROOM_HTTP_"+response.status);
      const state=normalizePublicRoomState(await response.json());
      if(!stopped&&current===revision)onState(state);
    }catch(error){
      if(!stopped&&error?.name!=="AbortError")onError?.(error);
    }finally{
      controller=null;schedule();
    }
  }
  tick();
  return ()=>{stopped=true;revision++;if(timer!==null)clearTimeout(timer);controller?.abort()};
}
