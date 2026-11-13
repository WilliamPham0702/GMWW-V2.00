// Kiểm tra và trả ảnh dạng data URL.

export function gmwwStoredArtworkResponse(data){
  if(!validImageDataUrl(data))return new Response("Artwork not found",{status:404,headers:{"cache-control":"no-store"}});
  const match=String(data).match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/i);
  if(!match)return new Response("Invalid artwork",{status:404});
  try{
    const bin=atob(match[2]);
    return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":match[1],"cache-control":"no-store","x-content-type-options":"nosniff"}});
  }catch{return new Response("Invalid artwork",{status:404})}
}
export function validImageDataUrl(v){return typeof v==="string"&&/^data:image\/(?:webp|png|jpeg);base64,/i.test(v)&&v.length<1900000}
export function normalizeRoleImage(v){
  if(typeof v!=="string")return null;let s=v.trim();if(!s)return null;
  if(validImageDataUrl(s))return s;
  if(/^https:\/\/[^\s]+$/i.test(s)&&s.length<4096)return s;
  if(/^[A-Za-z0-9+/=\r\n]+$/.test(s)&&s.replace(/\s/g,"").length>256){const raw=s.replace(/\s/g,"");try{const h=atob(raw.slice(0,64));let mime="";if(h.startsWith("\x89PNG"))mime="image/png";else if(h.startsWith("RIFF")&&h.includes("WEBP"))mime="image/webp";else if(h.charCodeAt(0)===0xff&&h.charCodeAt(1)===0xd8)mime="image/jpeg";if(mime){const d="data:"+mime+";base64,"+raw;return validImageDataUrl(d)?d:null}}catch{}}
  return null
}
export function extractRoleImage(obj,depth=0){
  if(depth>5)return null;const direct=normalizeRoleImage(obj);if(direct)return direct;
  if(!obj||typeof obj!=="object")return null;
  const keys=["roleImage","image","imageUrl","imageData","imageDataUrl","artwork","art","cardImage","cardArtwork","avatar","avatarUrl","photo","thumbnail","cover","src","url","data","base64","value"];
  for(const k of keys){if(Object.prototype.hasOwnProperty.call(obj,k)){const hit=extractRoleImage(obj[k],depth+1);if(hit)return hit}}
  for(const [k,v] of Object.entries(obj)){if(/image|art|avatar|photo|cover|thumb|media|asset/i.test(k)){const hit=extractRoleImage(v,depth+1);if(hit)return hit}}
  return null
}
