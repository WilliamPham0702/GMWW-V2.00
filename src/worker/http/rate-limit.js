// Giới hạn tần suất cho cổng công khai.
import { sha256 } from "../support/crypto.js";
import { corsHeaders, j } from "./responses.js";

export async function applyPublicEntryRateLimit(env,request,policy){
  // Cloudflare sets CF-Connecting-IP at the trusted edge. Never trust X-Forwarded-For.
  // Hash before using the identity as a Durable Object name; never store raw addresses.
  const clientAddress=request.headers.get("CF-Connecting-IP")||"local-development";
  const digest=await sha256("public-entry-v1:"+policy.key+":"+clientAddress);
  try{
    const limiter=env.ROOMS.get(env.ROOMS.idFromName("__GMWW_RATE_V1__"+digest));
    const res=await limiter.fetch("https://rate.internal/security/rate-limit",{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key:policy.key})
    });
    if(res.ok)return null;
    if(res.status===429){
      const detail=await res.json().catch(()=>({}));
      const retry=Math.max(1,Math.min(60,Number(detail?.retryAfterSeconds)||60));
      return new Response(JSON.stringify({ok:false,error:"TOO_MANY_REQUESTS",message:"Quá nhiều yêu cầu. Vui lòng thử lại sau."}),{
        status:429,headers:{...corsHeaders(),"content-type":"application/json; charset=UTF-8","cache-control":"no-store","retry-after":String(retry)}
      });
    }
  }catch{}
  return j({ok:false,error:"ADMISSION_UNAVAILABLE",message:"Tạm thời không thể xác nhận yêu cầu. Vui lòng thử lại."},503);
}
