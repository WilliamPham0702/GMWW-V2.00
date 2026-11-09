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
