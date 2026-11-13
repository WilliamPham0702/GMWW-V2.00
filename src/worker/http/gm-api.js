// API điều hành phòng của GM.
import { GM_SYNC_TOKEN, ROOM_DIRECTORY_LEASE } from "../config.js";
import { normalizeRoomName } from "../support/member-records.js";
import { generateRoomCode, isValidRoomCode, memberStore, normalizeRoomCode, roomStub } from "../support/room-access.js";
import { bearer, j, safeJson } from "./responses.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";

export async function createRoom(env,url,request){const body=await safeJson(request)||{};if(body.demo===true&&bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"DEMO_GM_ONLY"},403);for(let i=0;i<8;i++){const code=generateRoomCode(),r=await roomStub(env,code).fetch("https://room.internal/init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code,roomName:body.roomName||"",roomMode:body.roomMode||"online",demo:body.demo===true,enabled:Object.prototype.hasOwnProperty.call(body,"enabled")?body.enabled!==false:true,seatMoveMode:body.seatMoveMode||"instant",seatCount:body.seatCount,gameConfig:body.gameConfig||null,cardBackImage:body.cardBackImage||null})});if(r.status===201){const data=await r.json(),p=url.protocol==="https:"?"wss:":"ws:";await syncRoomDirectory(env,code);return j({ok:true,roomCode:code,roomName:data.room?.roomName||normalizeRoomName(body.roomName)||("Phòng "+code),gmToken:data.gmToken,joinUrl:`${url.origin}/${code}`,websocketUrl:`${p}//${url.host}/ws/${code}`},201)}if(r.status!==409)return j({ok:false,error:"ROOM_CREATE_FAILED"},500)}return j({ok:false,error:"ROOM_CODE_EXHAUSTED"},503)}
export async function syncRoomDirectory(env,raw){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return;try{const r=await roomStub(env,c).fetch("https://room.internal/state");if(!r.ok)return;const d=await r.json();await memberStore(env).fetch("https://member.internal/directory/rooms/upsert",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...d.room,code:c,joinedCount:Array.isArray(d.players)?d.players.length:0,leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE})})}catch(e){console.warn("GMWW_ROOM_DIRECTORY_SYNC",e)}}
export async function gmReset939(env,request){const statusRes=await memberStore(env).fetch(new Request("https://member.internal/admin/reset-939",{method:"GET",headers:request.headers})),status=await statusRes.json().catch(()=>({}));if(status?.done)return j({ok:true,done:true,already:true,record:status.record||null});const roomsRes=await gmRoomsPurge(env,request),rooms=await roomsRes.clone().json().catch(()=>({}));if(!roomsRes.ok||rooms?.failed)return j({ok:false,error:"ROOM_PURGE_FAILED",rooms},500);const membersRes=await memberStore(env).fetch(new Request("https://member.internal/members/purge",{method:"DELETE",headers:request.headers})),members=await membersRes.clone().json().catch(()=>({}));if(!membersRes.ok)return j({ok:false,error:"MEMBER_PURGE_FAILED",rooms,members},500);const record={roomsDeleted:Number(rooms?.deleted||0),membersDeleted:Number(members?.membersDeleted||0),sessionsDeleted:Number(members?.sessionsDeleted||0)};const markRes=await memberStore(env).fetch(new Request("https://member.internal/admin/reset-939",{method:"POST",headers:{...Object.fromEntries(request.headers),"content-type":"application/json"},body:JSON.stringify(record)}));if(!markRes.ok)return j({ok:false,error:"RESET_MARK_FAILED",rooms,members},500);return j({ok:true,done:true,rooms,members,...record})}
export async function gmLobbyResetAll(env,request){
  // Reset all room instances, not member accounts, personal preferences or saved templates.
  // The directory includes disabled and ended rooms so no stale room can retain participants.
  const listing=await memberStore(env).fetch("https://member.internal/directory/rooms/list?includeEnded=1&includeDisabled=1");
  if(!listing.ok)return j({ok:false,error:"LOBBY_ROOM_LIST_FAILED"},502);
  const directory=await listing.json().catch(()=>({rooms:[]})),rooms=Array.isArray(directory?.rooms)?directory.rooms:[],results=[];
  const transactionId="lobby-"+Date.now().toString(36);
  for(const row of rooms){
    const code=normalizeRoomCode(row?.code);if(!isValidRoomCode(code))continue;
    try{
      const resetRequest=new Request("https://room.internal/gm/reset",{method:"POST",headers:request.headers,body:JSON.stringify({forceEnd:true,transactionId:transactionId+"-"+code})});
      const reset=await gmRoomReset(env,code,resetRequest);
      if(reset.status===404){
        await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
        results.push({code,ok:true,stale:true,playersReturned:0});continue
      }
      if(!reset.ok){results.push({code,ok:false,stage:"reset",status:reset.status});continue}
      const resetBody=await reset.json().catch(()=>({}));
      const disabled=await gmRoomEnabled(env,code,new Request("https://room.internal/gm/enabled",{method:"POST",headers:request.headers,body:'{"enabled":false}'}));
      results.push({code,ok:disabled.ok,stage:disabled.ok?"done":"disable",status:disabled.status,playersReturned:Array.isArray(resetBody.removedPlayers)?resetBody.removedPlayers.length:0});
    }catch(e){results.push({code,ok:false,stage:"exception",error:String(e?.message||e)})}
  }
  const failed=results.filter(r=>!r.ok);
  if(failed.length)return j({ok:false,error:"LOBBY_RESET_PARTIAL",roomsChecked:results.length,failed:failed.length,results},502);
  const markerResponse=await memberStore(env).fetch("https://member.internal/global-settings/lobby-reset",{method:"POST",headers:{"content-type":"application/json"},body:'{"source":"GM_LOBBY"}'});
  if(!markerResponse.ok)return j({ok:false,error:"LOBBY_RESET_MARKER_FAILED",roomsChecked:results.length},502);
  const marker=await markerResponse.json().catch(()=>({}));
  await memberStore(env).fetch("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:'{"online":true,"roomCode":null}'});
  return j({ok:true,reset:true,generation:Number(marker.generation||0),roomsReset:results.filter(r=>!r.stale).length,devicesReturned:results.reduce((n,r)=>n+Number(r.playersReturned||0),0),rooms:results});
}
export async function gmRoomsPurge(env,request){const listing=await memberStore(env).fetch("https://member.internal/directory/rooms/list"),data=await listing.json().catch(()=>({rooms:[]})),rooms=Array.isArray(data?.rooms)?data.rooms:[],results=[];for(const r of rooms){const code=normalizeRoomCode(r?.code);if(!isValidRoomCode(code))continue;try{const res=await gmRoomDelete(env,code,request),body=await res.clone().json().catch(()=>({}));if(res.status===404){await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});results.push({code,ok:true,status:404,staleDirectoryRemoved:true});continue}results.push({code,ok:res.ok,status:res.status,error:body?.error||null})}catch(e){results.push({code,ok:false,status:0,error:String(e?.message||e)})}}const failed=results.filter(x=>!x.ok);return j({ok:failed.length===0,purged:failed.length===0,deleted:results.length-failed.length,failed:failed.length,results},failed.length?500:200)}
export async function gmRoomParticipants(env,raw,request){
  const code=normalizeRoomCode(raw),body=await safeJson(request);
  const res=await roomStub(env,code).fetch("https://room.internal/gm/participants",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});
  if(!res.ok)return res;
  const data=await res.clone().json().catch(()=>({}));
  if(data?.room?.demo===true){await syncRoomDirectory(env,code);return res}
  const syncPresence=async(loginId,roomCode,ready,expectedRoomCode=null,calledByGM=false)=>{
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId,roomCode,ready,expectedRoomCode,calledByGM})});
        if(response.ok)return true;
      }catch{}
    }
    return false
  };
  const failures=[];
  // Each member's presence record is independent; bounded concurrency avoids
  // a 30-person room waiting for 30 sequential Durable Object round trips.
  const syncBatch=async(rows,roomCode,ready,expectedRoomCode=null,calledByGM=false)=>{
    for(let offset=0;offset<rows.length;offset+=6){
      const results=await Promise.all(rows.slice(offset,offset+6).map(async loginId=>({
        loginId,ok:await syncPresence(loginId,roomCode,ready,expectedRoomCode,calledByGM)
      })));
      for(const result of results)if(!result.ok)failures.push(result.loginId);
    }
  };
  const admitted=[...new Set((Array.isArray(data?.players)?data.players:[]).map(p=>normalizeLoginId(p?.loginId)).filter(Boolean))];
  await syncBatch(admitted,code,true,null,true);
  // Retry both newly removed accounts and incomplete releases from an earlier disband.
  // The storage guard preserves anyone who has already joined a different room.
  const releaseLogins=new Set((Array.isArray(data?.removedPlayers)?data.removedPlayers:[]).map(p=>normalizeLoginId(p?.loginId)).filter(Boolean));
  if(data?.disbanded)for(const loginId of (Array.isArray(data?.reconcileLogins)?data.reconcileLogins:[]))if(normalizeLoginId(loginId))releaseLogins.add(normalizeLoginId(loginId));
  await syncBatch([...releaseLogins],null,false,code);
  await syncRoomDirectory(env,code);
  if(failures.length)return j({ok:false,error:"ROSTER_PRESENCE_PENDING",message:"Phòng đã giải tán, nhưng có tài khoản chưa xác nhận trở về Sảnh chờ.",pendingCount:failures.length,removedCount:Number(data.removedCount||0)},502);
  return res
}
export async function gmRoomSettingsApi(env,raw,request){
  const code=normalizeRoomCode(raw);
  if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const response=await roomStub(env,code).fetch(new Request("https://room.internal/gm/room-settings",{method:"POST",headers:request.headers,body:request.body}));
  if(response.ok)await syncRoomDirectory(env,code);
  return response;
}
export async function gmRoomConfig(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/config",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
export async function gmRoomEnabled(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/enabled",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.enabled===false&&data?.room?.demo!==true){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:true})})}catch{}}try{await memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({online:true,roomCode:null})}))}catch{}}await syncRoomDirectory(env,c)}return res}
export async function gmRoomLock(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/lock",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
export async function gmRoomKick(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/kick",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),p=data?.player||{};if(data?.room?.demo!==true&&p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}await syncRoomDirectory(env,c)}return res}
export async function gmRoomRename(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/rename",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
export async function gmRoomReset(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/reset",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.room?.demo===true){await syncRoomDirectory(env,c);return res}if(data?.hardReset===false&&data?.preserveParticipants===true){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:c,ready:true})})}catch{}}}else{for(const p of (Array.isArray(data?.removedPlayers)?data.removedPlayers:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:true})})}catch{}}}await syncRoomDirectory(env,c)}return res}
export async function gmRoomEnd(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/end",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),room=data?.room||{};for(const r of (room.demo===true?[]:Array.isArray(data?.memberResults)?data.memberResults:[])){try{await memberStore(env).fetch("https://member.internal/members/record-result",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,matchId:data.matchId||room.matchId,roomCode:c,roomName:room.roomName,gameName:room.gameName,roleName:r.roleName,faction:r.faction,winnerFaction:data.winnerFaction||room.winnerFaction,result:r.result,playedAt:room.endedAt})})}catch(e){console.warn("GMWW_RESULT_RECORD",r?.loginId,e)}try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,roomCode:c,ready:true})})}catch(e){console.warn("GMWW_END_LOBBY_PRESENCE",r?.loginId,e)}}if(room.demo!==true&&data?.matchHistory?.matchId)try{await memberStore(env).fetch("https://member.internal/matches/record",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data.matchHistory,roomCode:c,roomName:room.roomName||data.matchHistory.roomName,gameName:room.gameName||data.matchHistory.gameName})})}catch(e){console.warn("GMWW_MATCH_HISTORY_RECORD",e)}await syncRoomDirectory(env,c)}return res}
export async function gmRoomDelete(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);if(bearer(request)!==GM_SYNC_TOKEN){const probe=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(!probe.ok&&probe.status!==404)return probe}let res;try{res=await roomStub(env,c).fetch("https://room.internal/gm/delete",{method:"POST",headers:request.headers})}catch(e){res=null}let data={};if(res)try{data=await res.clone().json()}catch(_){}if(res&&res.status!==404&&!res.ok)return res;const players=data?.room?.demo===true?[]:Array.isArray(data?.players)?data.players:[];for(const p of players){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}}await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:c})});return j({ok:true,deleted:true,alreadyGone:!!(res&&res.status===404),code:c,room:data?.room||null})}
export async function roomProxy(env,raw,path,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);return roomStub(env,c).fetch(new Request("https://room.internal"+path,{method:request.method,headers:request.headers,body:request.method==="GET"?undefined:request.body}))}
export async function gmRoomState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const res=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(res.ok)await syncRoomDirectory(env,c);return res}
