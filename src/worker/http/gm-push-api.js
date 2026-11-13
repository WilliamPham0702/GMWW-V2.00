// Thông báo đẩy cho GM qua Bark: cài đặt mã thiết bị, gửi thử, báo khi người chơi tạo phòng.
import { memberStore } from "../support/room-access.js";
import { j, safeJson } from "./responses.js";
import { GM_PUSH_BARK_ENDPOINT, buildRoomCreatedPush, buildTestPush, maskBarkKey, normalizeBarkKey } from "../../gmww-gm-push-rules.js";

const SETTING_URL="https://member.internal/global-settings/gm-push";
async function storedBarkKey(env){
  const r=await memberStore(env).fetch(SETTING_URL);if(!r.ok)return "";
  return normalizeBarkKey((await r.json().catch(()=>({})))?.barkKey);
}
async function sendBark(payload){
  if(!payload)return{ok:false,error:"PUSH_NOT_CONFIGURED"};
  try{
    const r=await fetch(GM_PUSH_BARK_ENDPOINT,{method:"POST",headers:{"content-type":"application/json; charset=utf-8"},body:JSON.stringify(payload),signal:AbortSignal.timeout(4000)});
    const data=await r.json().catch(()=>({}));
    return r.ok&&Number(data?.code||200)===200?{ok:true}:{ok:false,error:"PUSH_REJECTED",status:r.status,message:String(data?.message||"").slice(0,160)};
  }catch(e){return{ok:false,error:"PUSH_UNREACHABLE",message:String(e?.message||e).slice(0,160)}}
}
export async function gmPushSettingsGet(env){
  const key=await storedBarkKey(env);return j({ok:true,enabled:!!key,barkKeyMasked:maskBarkKey(key)});
}
export async function gmPushSettingsPut(env,request){
  const body=await safeJson(request)||{},raw=String(body.barkKey??"").trim(),key=normalizeBarkKey(raw);
  if(raw&&!key)return j({ok:false,error:"INVALID_BARK_KEY",message:"Mã Bark không hợp lệ. Hãy dán mã hoặc link lấy từ app Bark."},400);
  const r=await memberStore(env).fetch(SETTING_URL,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({barkKey:key})});
  if(!r.ok)return j({ok:false,error:"PUSH_SETTING_SAVE_FAILED"},502);
  return j({ok:true,enabled:!!key,barkKeyMasked:maskBarkKey(key)});
}
export async function gmPushTest(env){
  const result=await sendBark(buildTestPush(await storedBarkKey(env)));
  return j(result,result.ok?200:result.error==="PUSH_NOT_CONFIGURED"?409:502);
}
// Never throws and never blocks room creation for more than the Bark timeout.
export async function notifyGmPlayerRoomCreated(env,info){
  try{const key=await storedBarkKey(env);if(!key)return{ok:false,error:"PUSH_NOT_CONFIGURED"};
    const result=await sendBark(buildRoomCreatedPush(key,info));if(!result.ok)console.warn("GMWW_GM_PUSH",JSON.stringify(result));return result
  }catch(e){console.warn("GMWW_GM_PUSH",e);return{ok:false,error:"PUSH_FAILED"}}
}
