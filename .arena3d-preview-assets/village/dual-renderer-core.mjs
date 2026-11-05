// GMWW Dual Renderer v1: pure presentation contract. No network, storage or game rules.
// Receives ONLY the room/player DTO already authorized by the GMWW core.
export const DUAL_RENDERER_SCHEMA = 'gmww.dual-renderer.v1';
const KNOWN_EFFECTS=new Set(['dead','expelled','frozen','protected','wolf_bitten','marked','infected','mute','disabled_permanent','disabled_2n','linked','recover','transform','attack','inspect','hunt','visited']);
const EVENT_KINDS=new Set(['protect','attack','inspect','recover','vote','nomination','status','result']);
const finite=(value)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const limited=(value,max=100)=>String(value??'').slice(0,max);
const bound=(value,min,max,fallback)=>{const n=finite(value);return n===null?fallback:Math.min(max,Math.max(min,n))};

function roomProjection(room={}){
  return {
    code:limited(room.code,12),matchId:room.matchId==null?null:limited(room.matchId,128),
    matchRevision:bound(room.matchRevision,0,1e12,0),
    gmStageRevision:bound(room.gmStageRevision,0,1e12,0),
    deliveryVersion:bound(room.deliveryVersion,0,1e12,0),
    resetVersion:bound(room.resetVersion,0,1e12,0),
    phase:limited(room.phase||'lobby',32),gmStage:limited(room.gmStage||'room',32),
    cyclePhase:room.cyclePhase==null?null:limited(room.cyclePhase,32),
    cycleKey:room.cycleKey==null?null:limited(room.cycleKey,128),
    cycleNight:bound(room.cycleNight,0,1000,0),
    roomMode:limited(room.roomMode||'online',16),
    seatCount:Math.trunc(bound(room.seatCount,6,30,12)),
    seatLayout:limited(room.seatLayout||'circle',24)
  };
}
function playerProjection(player){
  if(!player||typeof player!=='object')return null;
  const id=limited(player.participantId||player.id,128);
  if(!id)return null;
  const gm=player.isGM===true||player.kind==='gm';
  const seat=finite(player.seatId);
  const x=finite(player.positionX),y=finite(player.positionY);
  const statuses=Array.isArray(player.statusTags)?player.statusTags.filter(tag=>KNOWN_EFFECTS.has(String(tag?.statusId||''))).slice(0,20).map(tag=>({
    statusId:limited(tag.statusId,40),label:limited(tag.label,70),icon:limited(tag.icon,12)
  })):[];
  return {
    id,kind:gm?'gm':'player',displayName:limited(player.displayName||player.name||'Người chơi',80),
    characterId:limited(player.gameCharacterId,40),
    seatId:Number.isInteger(seat)&&seat>=1&&seat<=30?seat:null,
    x:x!==null&&x>=0&&x<=100?x:null,
    y:y!==null&&y>=0&&y<=100?y:null,
    ready:player.ready===true,online:player.online!==false,
    movementStatus:player.movementStatus==='moving'?'moving':'idle',
    statusTags:statuses
  };
}

// The allowlist intentionally EXCLUDES hidden role, faction, token, GM credentials,
// interaction receipts, private cards and private night targets.
export function createPublicRendererFrame(payload){
  if(!payload||!payload.room||!Array.isArray(payload.players))throw new TypeError('INVALID_PUBLIC_FRAME');
  const room=roomProjection(payload.room),seen=new Set(),players=[];
  let gmSeen=false,regular=0;
  for(const raw of payload.players){
    const player=playerProjection(raw);
    if(!player||seen.has(player.id))continue;
    if(player.kind==='gm'){if(gmSeen)continue;gmSeen=true;}
    else{if(regular===30)continue;regular++;}
    seen.add(player.id);players.push(player);
  }
  return {schema:DUAL_RENDERER_SCHEMA,room,players};
}
// Both viewers must use the SAME frame. Only their coordinates / materials differ.
export function rendererCommands(frame,renderer){
  if(frame?.schema!==DUAL_RENDERER_SCHEMA||!['2d','3d'].includes(renderer))throw new TypeError('INVALID_RENDERER_COMMAND');
  return {
    renderer,room:frame.room,
    players:frame.players.map(p=>({
      id:p.id,kind:p.kind,seatId:p.seatId,characterId:p.characterId,
      displayName:p.displayName,ready:p.ready,online:p.online,
      statusTags:p.statusTags,
      movementStatus:p.movementStatus,
      position:p.x===null||p.y===null?null:
        renderer==='2d'?{x:p.x,y:p.y}:{x:(p.x-50)/10,y:0,z:(p.y-50)/10}
    }))
  };
}
// A new renderer MUST NOT resurrect the previous match/role delivery.
export function shouldAcceptRendererFrame(previous,next){
  if(next?.schema!==DUAL_RENDERER_SCHEMA)return false;
  if(!previous)return true;
  if(previous.schema!==DUAL_RENDERER_SCHEMA||previous.room?.code!==next.room?.code)return false;
  if(next.room.matchRevision<previous.room.matchRevision)return false;
  if(next.room.matchRevision>previous.room.matchRevision)return true;
  return next.room.resetVersion>=previous.room.resetVersion&&
    next.room.gmStageRevision>=previous.room.gmStageRevision&&
    next.room.deliveryVersion>=previous.room.deliveryVersion;
}
// Only the SERVER may pass authorizePrivate (after authenticating room GM/member).
// Browser code NEVER receives raw private events and MUST NOT use a viewer toggle
// as proof of GM status.
export function projectAuthorizedVisualEvents(events,{matchId,authorizePrivate}={}){
  if(!Array.isArray(events))return [];
  const result=[],seen=new Set();
  for(const event of events){
    if(!event||typeof event!=='object')continue;
    const id=limited(event.eventId,128),kind=limited(event.kind,32);
    if(!id||seen.has(id)||!EVENT_KINDS.has(kind))continue;
    if(String(event.matchId??'')!==String(matchId??''))continue;
    const publicAllowed=event.visibility==='public'&&event.released===true;
    if(!publicAllowed&&!(typeof authorizePrivate==='function'&&authorizePrivate(event)===true))continue;
    seen.add(id);
    result.push({
      eventId:id,matchId:limited(event.matchId,128),kind,
      targetId:limited(event.targetId,128),
      label:limited(event.label,120),
      cycleKey:limited(event.cycleKey,128)
    });
  }
  return result;
}
