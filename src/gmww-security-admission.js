// Backward-compatible admission control for public GMWW entry points.
// Policies are intentionally above the 30-player single-network onboarding flow.
export const PUBLIC_ENTRY_LIMITS=Object.freeze({
  "/api/members/login":Object.freeze({key:"member-login",method:"POST",limit:120,windowMs:60000}),
  "/api/members/register":Object.freeze({key:"member-register",method:"POST",limit:60,windowMs:60000}),
  "/api/members/reset-request":Object.freeze({key:"member-reset",method:"POST",limit:30,windowMs:60000}),
  "/api/rooms":Object.freeze({key:"room-create",method:"POST",limit:30,windowMs:60000})
});

// This quota is NOT a public entry policy; it must never change the 30-player entry gates.
export const AI_SUPPORT_REQUEST_LIMIT=Object.freeze({key:"ai-support",method:"POST",limit:8,windowMs:60000});

export function publicEntryPolicy(method,path){
  const policy=PUBLIC_ENTRY_LIMITS[String(path||"")];
  return policy&&policy.method===String(method||"").toUpperCase()?policy:null;
}

// A fixed window is deterministic, resilient to Durable Object eviction,
// and needs no per-account schema migration or client/IPA change.
export function stepPublicEntryWindow(previous,policy,now=Date.now()){
  const limit=Math.max(1,Math.trunc(Number(policy?.limit)||1));
  const windowMs=Math.max(1000,Math.trunc(Number(policy?.windowMs)||60000));
  const time=Number.isFinite(now)?Math.max(0,Math.trunc(now)):Date.now();
  const start=Number(previous?.startedAt);
  const count=Number(previous?.count);
  const fresh=!Number.isFinite(start)||start<0||time<start||time-start>=windowMs||!Number.isSafeInteger(count)||count<0;
  const startedAt=fresh?time:start;
  const used=fresh?0:count;
  const allowed=used<limit;
  return {
    allowed,
    retryAfterSeconds:allowed?0:Math.max(1,Math.ceil((startedAt+windowMs-time)/1000)),
    next:{startedAt,count:allowed?used+1:used,windowMs}
  };
}
