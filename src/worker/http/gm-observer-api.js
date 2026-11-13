// API quan sát của tài khoản GM0702.
import { GM_SYNC_TOKEN } from "../config.js";
import { isValidRoomCode, memberStore, normalizeRoomCode, roomStub } from "../support/room-access.js";
import { j } from "./responses.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";

export const GM_OBSERVER_LOGIN_ID="gm0702";
export const GM_OBSERVER_ROUTES={state:{path:"/gm/state",method:"GET"},action:{path:"/gm/battle-action",method:"POST"},interaction:{path:"/gm/interaction",method:"POST"},"day-action":{path:"/gm/day-action",method:"POST"},"chat-mute":{path:"/gm/chat/moderate",method:"POST"},auto:{path:"/gm/auto",method:"POST"}};
// GM0702 observes a live room from Player Web without joining `players` (no role, artifact or headcount impact).
// Authority is the member session of GM0702; the room is then called with the existing GM sync token.
export async function gmObserverApi(env,rawCode,op,request){
  const route=GM_OBSERVER_ROUTES[op];if(!route)return j({ok:false,error:"NOT_FOUND"},404);
  if(request.method!==route.method)return j({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  const code=normalizeRoomCode(rawCode);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const sres=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!sres.ok)return sres;
  const sdata=await sres.json().catch(()=>null);
  if(normalizeLoginId(sdata?.member?.loginId)!==GM_OBSERVER_LOGIN_ID)return j({ok:false,error:"GM_OBSERVER_FORBIDDEN"},403);
  const headers=new Headers(request.headers);headers.set("Authorization","Bearer "+GM_SYNC_TOKEN);
  return roomStub(env,code).fetch(new Request("https://room.internal"+route.path,{method:route.method,headers,body:route.method==="GET"?undefined:request.body}))
}
