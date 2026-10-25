// Stage 9: public-only gameplay projection, independent from GM secrets and 2D state.
export const STAGE9_VERSION='gmww.arena.gameplay-sync.9';
const text=v=>typeof v==='string'?v:'';
const finite=v=>Number.isFinite(Number(v))?Number(v):0;
export function publicGameplaySnapshot(frame,ballot=null){
 const room=frame?.room||{};
 const players=Array.isArray(frame?.players)?frame.players:[];
 const matchId=text(room.matchId),cycleKey=text(room.cycleKey);
 const roomCode=text(room.code);
 const stage=text(ballot?.stage);
 return Object.freeze({
  roomCode,matchId,cycleKey,phase:text(room.phase)||'lobby',
  cyclePhase:text(room.cyclePhase),cycleNight:finite(room.cycleNight),
  playerIds:Object.freeze([...new Set(players.map(p=>text(p.id)).filter(Boolean))].slice(0,30)),
  ballotStage:stage,ballotCandidate:text(ballot?.candidateId),
  ballotOutcome:text(ballot?.outcome),
  ballotSave:finite(ballot?.save),ballotKill:finite(ballot?.kill)
 });
}
export function reduceGameplaySync(previous,next){
 if(!next)return {accept:false,reason:'empty',reset:false,changed:false};
 if(!previous)return {accept:true,reason:'initial',reset:true,changed:true};
 if(previous.roomCode!==next.roomCode||previous.matchId!==next.matchId)
  return {accept:true,reason:'room-or-match',reset:true,changed:true};
 const sameCycle=previous.cycleKey===next.cycleKey;
 const prevPhase=previous.phase,nextPhase=next.phase;
 // Never resurrect a stale lobby frame after the same match is running.
 if(prevPhase==='running'&&nextPhase!=='running'&&sameCycle)
  return {accept:false,reason:'stale-lobby',reset:false,changed:false};
 if(previous.cycleNight>next.cycleNight&&nextPhase==='running')
  return {accept:false,reason:'stale-cycle',reset:false,changed:false};
 if(previous.cycleNight===next.cycleNight&&previous.cyclePhase==='morning'&&next.cyclePhase==='night'&&sameCycle)
  return {accept:false,reason:'stale-night',reset:false,changed:false};
 const changed=JSON.stringify(previous)!==JSON.stringify(next);
 return {accept:true,reason:changed?'update':'duplicate',reset:false,changed};
}
export function gallowsVisual(snapshot){
 const stage=snapshot?.ballotStage||'';
 return {active:Boolean(stage&&stage!=='closed'&&stage!=='none'),
  candidateId:snapshot?.ballotCandidate||null,
  outcome:snapshot?.ballotOutcome||null,
  save:snapshot?.ballotSave||0,kill:snapshot?.ballotKill||0};
}
export function gameplaySceneStatus(snapshot){
 if(!snapshot)return {label:'Chưa kết nối',night:false};
 const night=snapshot.cyclePhase==='night';
 return {label:snapshot.phase==='running'?(night?'Đêm ':'Ngày ')+snapshot.cycleNight:
   snapshot.phase==='lobby'?'Tập hợp':'Chờ vào trận',night};
}
