// Stage 9: public-only Core projection, deterministic reconnect, no private role leakage.
export const STAGE9_VERSION='gmww.arena.full-match-sync.9';
const PHASES=new Set(['lobby','gathering','seating','roles','dealing','role_delivery','running','ended','finished']);
const safeString=value=>typeof value==='string'?value:'';
export function publicMatchKey(frame){
 const room=frame?.room||{};
 return [safeString(room.code),safeString(room.matchId),safeString(room.cycleKey)].join(':');
}
export function publicMatchView(frame){
 if(!frame?.room||!Array.isArray(frame.players))return null;
 const room=frame.room;
 const phase=safeString(room.phase)||'lobby';
 const cycle=safeString(room.cyclePhase);
 const players=frame.players.slice(0,30).map(p=>({
  id:safeString(p.participantId||p.id),seatId:Number(p.seatId)||0,
  online:p.online===true||p.isOnline===true,
  alive:p.alive!==false&&p.isAlive!==false
 })).filter(p=>p.id);
 return {key:publicMatchKey(frame),phase:PHASES.has(phase)?phase:'lobby',
  // Core can change GM stages and publish role cards without changing cycle.
  gmStage:safeString(room.gmStage),
  deliveryVersion:Math.max(0,Math.trunc(Number(room.deliveryVersion)||0)),
  cycle,night:Math.max(0,Math.trunc(Number(room.cycleNight)||0)),
  players:players.length,online:players.filter(p=>p.online).length,
  alive:players.filter(p=>p.alive).length};
}
export function createMatchSyncGate(){
 let key='',revision=0,signature='',lastSource='',lastAt=0;
 return {
  accept(frame,{source='realtime',now=Date.now()}={}){
   const view=publicMatchView(frame);
   if(!view)return {accepted:false,reason:'invalid'};
   const incomingRevision=Number(frame?.revision??frame?.room?.revision);
   const rev=Number.isSafeInteger(incomingRevision)&&incomingRevision>=0?incomingRevision:null;
   const nextSig=JSON.stringify(view);
   const same=key===view.key;
   if(same&&rev!==null&&rev<revision)return {accepted:false,reason:'stale-revision'};
   if(same&&rev===null&&nextSig===signature)return {accepted:false,reason:'duplicate'};
   if(same&&rev!==null&&rev===revision&&nextSig===signature)return {accepted:false,reason:'duplicate'};
   // Reconnect snapshots must not rewind a newer authoritative WS revision.
   if(same&&rev===null&&lastSource==='realtime'&&source==='snapshot'&&now-lastAt<5000)
    return {accepted:false,reason:'snapshot-grace'};
   const changed=!same||nextSig!==signature;
   key=view.key;signature=nextSig;revision=rev??(same?revision:0);lastSource=source;lastAt=now;
   return {accepted:true,changed,view,revision};
  },
  reset(){key='';revision=0;signature='';lastSource='';lastAt=0},
  get state(){return {key,revision,lastSource}}
 };
}
export function publicMatchStatus(view){
 if(!view)return 'Chưa kết nối';
 const cycle=view.cycle==='night'?'Đêm '+view.night:view.cycle==='morning'?'Ngày '+view.night:'';
 return [view.phase,cycle,view.players+' người chơi',view.alive+' còn sống'].filter(Boolean).join(' · ');
}
