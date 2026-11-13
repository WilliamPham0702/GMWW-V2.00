// WebSocket và phát sự kiện.
import { j } from "../http/responses.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { publicPlayer } from "../../gmww-village-player-state.js";

export class RoomRealtimeMethods {
  async websocket(request,url){if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return new Response("Expected WebSocket upgrade",{status:426});const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);const participantId=url.searchParams.get("participantId")||null;let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(participantId&&!players[participantId])return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},403);const now=new Date().toISOString();if(participantId&&players[participantId]){players[participantId].lastHeartbeatAt=Date.now();players[participantId].lastSeenAt=now;await this.ctx.storage.put("players",players)}const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({participantId,connectedAt:now});const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer),payload={type:"room_state",room,players:publicPlayers,serverTime:Date.now(),presenceChanged:true};server.send(JSON.stringify(payload));this.broadcast(payload);return new Response(null,{status:101,webSocket:client})}
  async webSocketMessage(ws,message){let d;try{d=JSON.parse(typeof message==="string"?message:new TextDecoder().decode(message))}catch{return}if(d?.type!=="ping")return;const participantId=ws.deserializeAttachment()?.participantId||null,meta=await this.ctx.storage.get("meta"),players=(await this.ctx.storage.get("players"))||{},now=new Date().toISOString();if(participantId&&players[participantId]){players[participantId].lastHeartbeatAt=Date.now();players[participantId].lastSeenAt=now;await this.ctx.storage.put("players",players)}try{ws.send(JSON.stringify({type:"pong",at:now,serverTime:Date.now()}))}catch{}}
  async markSocketDisconnected(ws){const participantId=ws?.deserializeAttachment?.()?.participantId||null;if(!participantId){this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length});return}const other=this.ctx.getWebSockets().some(s=>s!==ws&&s.deserializeAttachment?.()?.participantId===participantId);if(other)return;const players=(await this.ctx.storage.get("players"))||{},meta=await this.ctx.storage.get("meta");if(players[participantId]){players[participantId].lastHeartbeatAt=0;players[participantId].lastSeenAt=new Date().toISOString();await this.ctx.storage.put("players",players)}if(meta)this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now(),presenceChanged:true});this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length})}
  async webSocketClose(ws){await this.markSocketDisconnected(ws)}
 async webSocketError(ws){await this.markSocketDisconnected(ws)}
 broadcast(payload){
    // WOLF-01 fail closed: public WebSocket events MUST NOT carry queue members,
    // role identities, recognitionIds, or other private GM runtime fields.
    const safe=payload&&['night_turn','room_cycle'].includes(payload.type)?
      Object.fromEntries(Object.entries(payload).filter(([key])=>key!=='runtime'&&key!=='nightRuntime')):payload;
    if(this.demoBroadcastBuffer){this.demoBroadcastBuffer.push(safe);return}
    const e=JSON.stringify(safe);for(const s of this.ctx.getWebSockets())try{s.send(e)}catch{}
    // Any turn/phase change re-resolves the public turn audio for every device.
    if(safe&&['night_turn','room_cycle','room_state','auto_gm','demo_control','room_reset','room_hard_reset','game_result'].includes(safe.type))this.scheduleAnnouncementSync();
  }
}
