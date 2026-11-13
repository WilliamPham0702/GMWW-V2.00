// Tiện ích HTTP: JSON, CORS, bearer token.

export function bearer(r){const h=r.headers.get("Authorization")||"";return h.startsWith("Bearer ")?h.slice(7).trim():""}
export async function safeJson(r){try{return await r.json()}catch{return null}}
export function j(data,status=200){return Response.json(data,{status,headers:{...corsHeaders(),"cache-control":"no-store"}})}
export function corsHeaders(){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,PUT,DELETE,OPTIONS","access-control-allow-headers":"content-type,authorization,x-gmww-demo-owner","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}}
