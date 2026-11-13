// API của người chơi trong phòng.
import { isValidRoomCode, memberStore, normalizeRoomCode, roomStub } from "../support/room-access.js";
import { syncRoomDirectory } from "./gm-api.js";
import { j, safeJson } from "./responses.js";

export async function joinRoom(env,raw,request){const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const body=await safeJson(request);if(body?.token){const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:{Authorization:"Bearer "+body.token}}));if(!me.ok)return me;const data=await me.json();const joined=await roomStub(env,code).fetch("https://room.internal/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({member:data.member})});if(joined.ok){await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:data.member.loginId,roomCode:code,ready:false})});await syncRoomDirectory(env,code)}return joined}const joined=await roomStub(env,code).fetch("https://room.internal/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guest:body?.guest})});if(joined.ok)await syncRoomDirectory(env,code);return joined}
export async function readyRoom(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/ready",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(res.ok){if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:code,ready:!!body.ready})});await syncRoomDirectory(env,code)}return res}
export async function heartbeatRoom(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(res.ok){if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:code,ready:!!body.ready})});await syncRoomDirectory(env,code)}return res}
export async function leaveRoomApi(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/leave",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:null,ready:false})});if(res.ok)await syncRoomDirectory(env,code);return res}
export async function playerRoomPostApi(env,raw,request,path,pick){
  const code=normalizeRoomCode(raw);
  if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);
  const session=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));
  if(!session.ok)return session;
  const me=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch('https://room.internal'+path,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({...pick(body),loginId:me.member.loginId})});
}
export async function playerThiefChooseApi(env,raw,request){
  const code=normalizeRoomCode(raw);
  if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);
  const session=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));
  if(!session.ok)return session;
  const me=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch('https://room.internal/player/thief/choose',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({loginId:me.member.loginId,roleId:body.keep===true?'':String(body.roleId||''),keep:body.keep===true})});
}
export async function playerDrunkDrawApi(env,raw,request){
  const code=normalizeRoomCode(raw);
  if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);
  const session=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));
  if(!session.ok)return session;
  const me=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch('https://room.internal/player/drunk/draw',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({loginId:me.member.loginId,cardId:body.cardId})});
}
export async function playerRoomChatAudioApi(env,raw,id,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json();
  return roomStub(env,code).fetch(new Request("https://room.internal/player/chat/audio/"+id,{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({loginId:data.member.loginId})
  }));
}
export async function playerRoomChatApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  // The external client controls neither loginId nor channel membership.
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=request.method==="POST"?await safeJson(request)||{}:{channel:new URL(request.url).searchParams.get("channel")};
  const route=request.method==="POST"?"/player/chat/send":"/player/chat";
  return roomStub(env,code).fetch(new Request("https://room.internal"+route,{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({loginId:data.member.loginId,text:body.text,voice:body.voice,channel:body.channel==="gm"?"gm":"room"})
  }));
}
export async function playerPrivateState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),res=await roomStub(env,c).fetch("https://room.internal/player/state",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:data.member.loginId,member:data.member})});if(res.ok)await syncRoomDirectory(env,c);return res}
export async function playerRoomSetupApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;
  const data=await me.json(),body=await safeJson(request)||{},res=await roomStub(env,code).fetch("https://room.internal/player/setup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})});
  if(res.ok)await syncRoomDirectory(env,code);return res
}
export async function playerRoomMoveApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;
  const data=await me.json(),body=await safeJson(request)||{},res=await roomStub(env,code).fetch("https://room.internal/player/move",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})});
  if(res.ok)await syncRoomDirectory(env,code);return res
}
export async function playerRoomMoveCompleteApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;
  const data=await me.json(),body=await safeJson(request)||{},res=await roomStub(env,code).fetch("https://room.internal/player/move-complete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})});
  if(res.ok)await syncRoomDirectory(env,code);return res
}
export async function playerDeliveryReceivedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/delivery-received",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
export async function playerRoleViewedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/role-viewed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
export async function playerArtifactViewedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/artifact-viewed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
export async function playerArtifactActivateApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/artifact-activate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
export async function playerDemoActionApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/demo-action",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
export async function playerOnlineActionApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/action",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
export async function playerOnlineUndoApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/undo-action",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
export async function playerGallowsApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/gallows",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
export async function playerInteractionRespondApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/interaction/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
export async function publicRoomState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const res=await roomStub(env,c).fetch("https://room.internal/state");if(res.ok)await syncRoomDirectory(env,c);return res}
export async function playerSeatSwapApi(env,raw,request){const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);const me=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,code).fetch('https://room.internal/player/seat-swap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,loginId:data.member.loginId})})}
