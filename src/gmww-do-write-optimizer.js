// Durable Objects free tier: only suppress periodic identical heartbeats.
// Never coalesce game actions, membership changes, deletes, or room lifecycle events.
export const GMWW_MEMBER_HEARTBEAT_MIN_MS = 45000; // shorter than PRESENCE_TTL (90000)
export const GMWW_GM_HEARTBEAT_MIN_MS = 35000; // shorter than GM_PRESENCE_TTL (75000)
export const GMWW_DIRECTORY_LEASE_MIN_MS = 100000; // directory lease is 180000
export const GMWW_WRITE_OPTIMIZER_VERSION = 1;

export function shouldSkipMemberHeartbeat(before, after, now, windowMs=GMWW_MEMBER_HEARTBEAT_MIN_MS) {
  if(!before||!after||!Number.isFinite(Number(before.presenceAt)))return false;
  const age=now-Number(before.presenceAt);
  if(age<0||age>=windowMs)return false;
  const keys=['currentRoomCode','ready','gmCalledRoomCode'];
  return keys.every(key=>(before[key]??null)===(after[key]??null));
}
export function shouldSkipMemberSessionTouch(member, now, windowMs=GMWW_MEMBER_HEARTBEAT_MIN_MS) {
  if(!member)return false;
  const last=Number(member.presenceAt);
  return Number.isFinite(last)&&last>0&&now>=last&&now-last<windowMs;
}
export function shouldSkipGmHeartbeat(previous, online, hasRoomCode, roomCode, now, windowMs=GMWW_GM_HEARTBEAT_MIN_MS){
  if(!online||!previous||previous.online!==true)return false;
  const last=Number(previous.lastSeenAt);
  if(!Number.isFinite(last)||last<=0||now<last||now-last>=windowMs)return false;
  return !hasRoomCode||String(previous.roomCode||'')===String(roomCode||'');
}
const DIRECTORY_STATE_FIELDS=[
  'code','roomName','gameName','phase','status','locked','enabled','demo',
  'roomMode','seatMoveMode','seatCount','playerCount','joinedCount','resetVersion'
];
export function shouldSkipDirectoryHeartbeat(previous, next, now, minRemaining=GMWW_DIRECTORY_LEASE_MIN_MS){
  if(!previous||!next||!Number.isFinite(Number(previous.leaseUntil)))return false;
  if(Number(previous.leaseUntil)-now<=minRemaining)return false;
  return DIRECTORY_STATE_FIELDS.every(key=>previous[key]===next[key]);
}
