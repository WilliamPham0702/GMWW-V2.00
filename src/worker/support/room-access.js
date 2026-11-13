// Truy cập Durable Object phòng/kho thành viên và mã phòng.
import { MEMBER_STORE_NAME, ROOM_ALPHABET, ROOM_CODE_LENGTH } from "../config.js";

export function publicGmPresence(rec,online=true){
  if(!online)return{online:false,sessionId:"",sessionStartedAt:0,lastSeenAt:0,roomCode:""};
  const num=k=>Number.isFinite(Number(rec?.[k]))?Number(rec[k]):null;
  const roomCode=normalizeRoomCode(rec?.roomCode||"");return{online:true,sessionId:String(rec?.sessionId||""),sessionStartedAt:Math.max(0,Number(rec?.sessionStartedAt||rec?.lastSeenAt||0)),lastSeenAt:Math.max(0,Number(rec?.lastSeenAt||0)),roomCode:isValidRoomCode(roomCode)?roomCode:"",moveFromX:num("moveFromX"),moveFromY:num("moveFromY"),moveToX:num("moveToX"),moveToY:num("moveToY"),moveStartedAt:Math.max(0,Number(rec?.moveStartedAt||0)),moveDurationMs:Math.max(0,Number(rec?.moveDurationMs||0)),manualUntil:Math.max(0,Number(rec?.manualUntil||0))};
}
export function roomStub(env,c){return env.ROOMS.get(env.ROOMS.idFromName(c))}
export function memberStore(env){return env.ROOMS.get(env.ROOMS.idFromName(MEMBER_STORE_NAME))}
export function generateRoomCode(){const b=new Uint8Array(ROOM_CODE_LENGTH);crypto.getRandomValues(b);let c="";for(const x of b)c+=ROOM_ALPHABET[x%ROOM_ALPHABET.length];return c}
export function secureShuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const limit=Math.floor(0x100000000/(i+1))*(i+1);let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0]}while(n>=limit);const j=n%(i+1),tmp=out[i];out[i]=out[j];out[j]=tmp}return out}
export function normalizeRoomCode(v){return String(v||"").trim().toUpperCase()}
export function isValidRoomCode(c){return new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(c)}
