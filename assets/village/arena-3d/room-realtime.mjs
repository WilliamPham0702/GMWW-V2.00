// Server-authoritative, public-only room/ballot adapter used by Arena 3D staging.
// No private role data, auth tokens or player voting internals enter the renderer.
import {createPublicRendererFrame,shouldAcceptRendererFrame} from '../dual-renderer-core.mjs';
export function publicRoomSnapshot(payload){
  if(!payload?.room||!Array.isArray(payload.players))throw new TypeError('INVALID_PUBLIC_ROOM');
  return createPublicRendererFrame({room:payload.room,players:payload.players});
}
export function publicGallowsScene(gallows,room){
  if(!gallows||!room||!['morning','day'].includes(String(room.cyclePhase||'')))return null;
  const stage=String(gallows.stage||'');
  if(!['ready','nominating','selecting','voting','resolved','completed'].includes(stage))return null;
  return {stage,mode:gallows.mode==='gm'?'gm':'auto',
    candidateId:typeof gallows.candidateId==='string'?gallows.candidateId.slice(0,80):null,
    nominationTotals:Array.isArray(gallows.nominationTotals)?gallows.nominationTotals.slice(0,30).map(x=>({
      loginId:String(x.loginId||'').slice(0,50),votes:Math.max(0,Math.trunc(Number(x.votes)||0))
    })):[],
    save:Math.max(0,Math.trunc(Number(gallows.voteTotals?.save)||0)),
    kill:Math.max(0,Math.trunc(Number(gallows.voteTotals?.kill)||0)),
    outcome:['dead','alive'].includes(gallows.outcome)?gallows.outcome:null};
}
// Both browsers read the SAME /api/rooms/:code and /ws/:code supplied by
// isolated GMWW V2 Core. WebSocket is a hint, HTTP snapshot wins after reconnect.
// No new mutation or second player-state store.
export function connectStagingRoom({roomCode,onFrame,onGallows,onStatus,onError,fetchImpl=fetch,WebSocketImpl=WebSocket,intervalMs=4000}){
  const code=String(roomCode||'').toUpperCase().trim();
  if(!/^[A-Z0-9]{4,12}$/.test(code))throw new TypeError('INVALID_ROOM_CODE');
  let stopped=false,ws=null,timer=null,retry=null,latest=null,generation=0,ballot=null,abort=null;
  const state={get current(){return latest},get ballot(){return ballot}};
  const apply=payload=>{
    if(!payload?.room||!Array.isArray(payload.players))return;
    const next=publicRoomSnapshot(payload);
    if(latest&&!shouldAcceptRendererFrame(latest,next))return;
    latest=next;onFrame(next);
  };
  async function reloadPublicBallot(){
    if(!latest||latest.room.cyclePhase!=='morning'){ballot=null;onGallows?.(null);return;}
    try {
      const response=await fetchImpl('/api/arena-staging/rooms/'+encodeURIComponent(code)+'/gallows',{cache:'no-store'});
      if(!response.ok)throw new Error('GALLOWS_HTTP_'+response.status);
      const d=await response.json();
      if(stopped||!latest||!d?.ok||String(d.matchId)!==String(latest.room.matchId))return;
      if(String(d.cycleKey)!==String(latest.room.cycleKey||''))return;
      const next=publicGallowsScene(d.gallows,{cyclePhase:latest.room.cyclePhase});
      ballot=next;onGallows?.(next);
    }catch(error){if(!stopped)onError?.(error)}
  }
  const handle=packet=>{
    if(packet?.type==='room_state')apply(packet);
    // Authorized public projection ONLY. No private receipts / role assignment.
    if(packet?.type==='gallows_updated'&&packet.room&&latest?.room.matchId===packet.room.matchId){
      const next=publicGallowsScene(packet.gallows,packet.room);
      if(next){ballot=next;onGallows?.(next);}
    }
  };
  async function refresh(){
    const current=++generation;
    try{
      abort?.abort();abort=new AbortController();
      const response=await fetchImpl('/api/rooms/'+encodeURIComponent(code),{signal:abort.signal,cache:'no-store'});
      if(!response.ok)throw new Error('ROOM_HTTP_'+response.status);
      const data=await response.json();
      if(!stopped&&current===generation){apply(data);await reloadPublicBallot();}
    }catch(error){if(!stopped&&error.name!=='AbortError')onError?.(error);}
  }
  function connect(){
    if(stopped)return;
    const protocol=location.protocol==='https:'?'wss:':'ws:';
    ws=new WebSocketImpl(protocol+'//'+location.host+'/ws/'+encodeURIComponent(code));
    onStatus?.('connecting');
    ws.onopen=()=>{if(!stopped){onStatus?.('connected');void refresh();}};
    ws.onmessage=event=>{try{handle(JSON.parse(event.data))}catch(error){onError?.(error)}};
    ws.onclose=()=>{if(!stopped){onStatus?.('reconnecting');retry=setTimeout(connect,1800);void refresh();}};
    ws.onerror=()=>{if(!stopped)onStatus?.('reconnecting')};
  }
  void refresh();connect();
  timer=setInterval(()=>{if(!document.hidden)void refresh()},Math.max(2000,intervalMs));
  const visibility=()=>{if(!document.hidden)void refresh()};
  document.addEventListener('visibilitychange',visibility);
  return {state,refresh,close(){
    stopped=true;generation++;abort?.abort();clearInterval(timer);clearTimeout(retry);
    document.removeEventListener('visibilitychange',visibility);
    if(ws){ws.onclose=null;ws.close(1000,'ARENA_VIEW_CLOSED')}
  }};
}
