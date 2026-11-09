// Policy for rooms created by players (online mode only).
// Pure functions: no storage, no network. The member-store Durable Object calls
// evaluatePlayerRoomCreate() inside one handler so check + reserve stay atomic.
export const PLAYER_ROOM_MAX_ACTIVE=5;
export const PLAYER_ROOM_MAX_SEATS=30;
export const PLAYER_ROOM_STALE_MS=30*60*1000;

const CLOSED_PHASES=new Set(['ended','deleted']);

export function isActivePlayerRoom(row,nowMs=Date.now(),staleMs=PLAYER_ROOM_STALE_MS){
  if(!row||row.playerRoom!==true||row.enabled===false)return false;
  if(CLOSED_PHASES.has(String(row.phase||'').toLowerCase()))return false;
  const last=Date.parse(row.updatedAt||row.createdAt||'');
  return Number.isFinite(last)?nowMs-last<staleMs:true;
}

// rows: directory records, each optionally carrying ownerLoginId (joined by the caller).
export function evaluatePlayerRoomCreate(rows,ownerLoginId,nowMs=Date.now(),{maxActive=PLAYER_ROOM_MAX_ACTIVE,staleMs=PLAYER_ROOM_STALE_MS}={}){
  const owner=String(ownerLoginId||'');
  if(!owner)return{ok:false,status:400,error:'INVALID_REQUEST'};
  const active=(Array.isArray(rows)?rows:[]).filter(r=>isActivePlayerRoom(r,nowMs,staleMs));
  const own=active.find(r=>String(r.ownerLoginId||'')===owner);
  if(own)return{ok:false,status:409,error:'OWNER_ALREADY_HAS_ROOM',roomCode:own.code};
  if(active.length>=maxActive)return{ok:false,status:429,error:'PLAYER_ROOM_LIMIT',max:maxActive};
  return{ok:true,active:active.length};
}

// ---- Empty-room expiry (PR-B) ----
// A player room with nobody present for 30 minutes is deleted. "Present" uses the same
// heartbeat window as publicPlayer().online (ROOM_PLAYER_TTL = 70 s); seats are kept while
// players are merely offline, so only the whole room being empty starts the clock.
export const PLAYER_ROOM_EMPTY_TTL_MS=30*60*1000;
export const PLAYER_ROOM_CHECK_MS=5*60*1000;
export const PLAYER_ROOM_PRESENT_MS=70*1000;

export function playerRoomOccupied(players,nowMs=Date.now(),presentMs=PLAYER_ROOM_PRESENT_MS){
  return Object.values(players||{}).some(p=>{
    const hb=Number(p?.lastHeartbeatAt||0)||Date.parse(p?.lastSeenAt||'')||0;
    return hb>0&&nowMs-hb<=presentMs;
  });
}

// Returns the new emptySince (ISO string or null). Keeps the old value while the room stays empty.
export function nextEmptySince(meta,occupied,nowMs=Date.now()){
  if(occupied)return null;
  const prev=Date.parse(meta?.emptySince||'');
  return Number.isFinite(prev)?String(meta.emptySince):new Date(nowMs).toISOString();
}

// Timestamp (ms) when an empty player room expires, or null when it is not empty / not a player room.
export function playerRoomEmptyDue(meta){
  if(meta?.playerRoom!==true)return null;
  const since=Date.parse(meta.emptySince||'');
  return Number.isFinite(since)?since+PLAYER_ROOM_EMPTY_TTL_MS:null;
}
