// Trang Player Web và ảnh avatar.
import { corsHeaders } from "./responses.js";
import { GMWW_MEMBER_AVATARS } from "../../gmww-avatars.js";
import { gmwwMembersPage } from "../../gmww-members-page.js";

export function playerPage(code){return new Response(gmwwMembersPage(code),{headers:{...corsHeaders(),"content-type":"text/html; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"}})}
export function avatarImage(id){const a=GMWW_MEMBER_AVATARS.find(x=>x.id===id);if(!a)return new Response("Not found",{status:404});const m=a.img.match(/^data:(image\/[^;]+);base64,(.+)$/);if(!m)return new Response("Invalid asset",{status:500});const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}
