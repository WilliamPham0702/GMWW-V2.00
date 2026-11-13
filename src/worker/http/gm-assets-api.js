// API nạp trước ảnh bảo vật và tài nguyên ván mẫu.
import { GM_SYNC_TOKEN, VERSION } from "../config.js";
import { validImageDataUrl } from "../support/images.js";
import { isValidRoomCode, memberStore, normalizeRoomCode, roomStub } from "../support/room-access.js";
import { bearer, j, safeJson } from "./responses.js";
import { fetchCanonicalRoleArtwork } from "../../gmww-template-artwork-source.js";

export async function gmPreloadSharedArtifacts(env,raw,request){
  if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
  const roomCode=normalizeRoomCode(raw);if(!isValidRoomCode(roomCode))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const body=await safeJson(request),assetIds=[...new Set(Array.isArray(body?.assetIds)?body.assetIds.map(String):[])];
  if(!assetIds.length||assetIds.length>100||!assetIds.every(id=>/^artifact:[A-Za-z0-9._:-]{1,120}$/.test(id)))
    return j({ok:false,error:"INVALID_SHARED_ARTIFACT_SELECTION",message:"Hãy chọn từ 1 đến 100 Artifact hợp lệ."},400);
  // One metadata-only call: no Base64 download/upload for every new room.
  const response=await memberStore(env).fetch("https://member.internal/artifacts/shared/status");
  if(!response.ok)return j({ok:false,error:"SHARED_ARTIFACT_NOT_READY"},424);
  const status=await response.json(),available=new Map((status?.artifacts||[]).map(x=>[String(x.assetId),x]));
  const missing=assetIds.filter(id=>!available.get(id)?.signature||!available.get(id)?.package);
  if(missing.length)return j({ok:false,error:"SHARED_ARTIFACT_NOT_READY",missing},409);
  const refs=assetIds.map(assetId=>({assetId,roleId:assetId.slice(9),signature:available.get(assetId).signature,roleCard:available.get(assetId).package.roleCard}));
  const push=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-refs",{method:"POST",headers:request.headers,body:JSON.stringify({kind:"artifact",refs})}));
  if(!push.ok)return j({ok:false,error:"SHARED_ARTIFACT_REFERENCE_FAILED"},424);
  const check=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-manifest",{headers:request.headers}));
  const manifest=await check.json().catch(()=>null);
  if(!check.ok||!assetIds.every(id=>manifest?.assetIds?.includes(id)))
    return j({ok:false,error:"SHARED_ARTIFACT_VERIFY_FAILED"},424);
  return j({ok:true,ready:true,mode:"reference",assetIds,count:assetIds.length});
}
// Package the exact clean role artwork within the Worker, without fetching a local
// file:// URL or decoding/canvas-encoding high-resolution images in iOS WKWebView.
export async function gmPackageCanonicalTemplateRole(env,raw,request){
  if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
  if(!env.ASSETS)return j({ok:false,error:"ROLE_ARTWORK_SOURCE_NOT_READY"},503);
  const id=String(raw||"").slice(0,120),body=await safeJson(request);
  const assetId=String(body?.assetId||"").slice(0,180);
  if(!/^role:[A-Za-z0-9_-]{1,120}$/.test(assetId))return j({ok:false,error:"INVALID_ROLE_ASSET"},400);
  const roleId=assetId.slice(5),statusUrl="https://member.internal/game-templates/assets/status?id="+encodeURIComponent(id);
  const statusResponse=await memberStore(env).fetch(statusUrl);
  if(!statusResponse.ok)return statusResponse;
  const status=await statusResponse.json();
  if(!status?.assets?.includes(assetId))return j({ok:false,error:"ROLE_NOT_IN_TEMPLATE"},400);
  if(!status.missing?.includes(assetId))return j({ok:true,assetId,cached:true,hasImage:true});
  try{
    const asset=await fetchCanonicalRoleArtwork(env.ASSETS,request.url,roleId,VERSION);
    if(!asset.ok)return j({ok:false,error:"CANONICAL_ROLE_ARTWORK_MISSING",assetId,message:"Server không tìm thấy artwork gốc của "+roleId},asset.status===404?404:503);
    const mime=String(asset.headers.get("content-type")||"").toLowerCase();
    if(mime&&!mime.includes("image/")&&!mime.includes("octet-stream"))return j({ok:false,error:"INVALID_ROLE_ARTWORK_MIME"},424);
    const bytes=new Uint8Array(await asset.arrayBuffer());
    // The template storage contract accepts up to 1.9 MB of base64 data.
    if(bytes.length<32||bytes.length>1380000||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"
      ||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")
      return j({ok:false,error:"INVALID_ROLE_ARTWORK_BYTES",message:"Artwork "+roleId+" không phải WEBP hợp lệ hoặc quá lớn."},424);
    let binary="";
    for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    const imageDataUrl="data:image/webp;base64,"+btoa(binary);
    if(!validImageDataUrl(imageDataUrl))return j({ok:false,error:"ROLE_ARTWORK_TOO_LARGE"},424);
    const pkg=body?.package||{},save=await memberStore(env).fetch(new Request(
      "https://member.internal/game-templates/assets",{method:"PUT",
      headers:{"content-type":"application/json"},body:JSON.stringify({id,assetId,imageDataUrl,package:pkg})}));
    const saved=await save.json().catch(()=>null);
    if(!save.ok||saved?.ok!==true||saved?.hasImage!==true)
      return j({ok:false,error:"CANONICAL_ROLE_PACKAGE_FAILED",message:saved?.message||saved?.error||"Không thể lưu ảnh Vai Trò."},424);
    return j({ok:true,assetId,hasImage:true,cached:false,source:"canonical_server_artwork"});
  }catch(err){return j({ok:false,error:"ROLE_ARTWORK_SOURCE_UNAVAILABLE",message:"Server không đọc được artwork "+roleId+". Vui lòng thử lại."},503)}
}
export async function gmPreloadTemplateAssets(env,raw,request){
  if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
  const roomCode=normalizeRoomCode(raw);if(!isValidRoomCode(roomCode))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const body=await safeJson(request),id=String(body?.templateId||"").slice(0,120);
  const statusResponse=await memberStore(env).fetch("https://member.internal/game-templates/assets/status?id="+encodeURIComponent(id));
  if(!statusResponse.ok)return statusResponse;
  const status=await statusResponse.json();
  if(!status.ready)return j({ok:false,error:"TEMPLATE_ASSETS_NOT_READY",missing:status.missing||[],message:"Artwork của Ván Mẫu chưa được đóng gói đầy đủ."},409);
  const requested=Array.isArray(body?.assetIds)?[...new Set(body.assetIds.map(String))]:status.assets;
  if(!requested.length||!requested.every(assetId=>status.assets.includes(assetId)&&status.packages?.[assetId]))
    return j({ok:false,error:"INVALID_TEMPLATE_ASSET_SELECTION"},400);
  const refs=requested.map(assetId=>({assetId,roleId:assetId.slice(5),templateId:id,revision:status.revision,roleCard:status.packages[assetId].roleCard,roleName:status.packages[assetId].roleName,faction:status.packages[assetId].faction,description:status.packages[assetId].description}));
  const push=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-refs",{method:"POST",headers:request.headers,body:JSON.stringify({kind:"template",refs,merge:requested.length===1&&status.assets.length>1})}));
  if(!push.ok)return j({ok:false,error:"ROOM_ARTWORK_REFERENCE_FAILED",message:"Không đăng ký được tham chiếu artwork Vai Trò."},424);
  const verify=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-manifest",{headers:request.headers}));
  const manifest=await verify.json().catch(()=>null);
  if(!verify.ok||!requested.every(assetId=>manifest?.assetIds?.includes(assetId)))
    return j({ok:false,error:"ROOM_ARTWORK_VERIFY_FAILED",message:"Artwork chưa được xác thực đầy đủ trong Phòng."},424);
  return j({ok:true,ready:true,mode:"reference",templateId:id,revision:status.revision,count:requested.length,assetIds:requested});
}
