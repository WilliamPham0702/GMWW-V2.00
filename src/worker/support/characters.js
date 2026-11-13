// Bộ 40 nhân vật: catalog, sprite, khung hình.
import { character40Catalog, character40Image } from "../../gmww-character40-catalog.js";
import { GAME_CHARACTER_COUNT } from "../../gmww-player-identity-rules.js";

export function gameCharacterCatalog(){return character40Catalog()}
// Character V4: serve the two user-approved artworks on Player Web without changing IPA files.
export async function gameCharacterV4Sprite(env,id,request){
 if(!env.ASSETS||!/^character-0[12]$/.test(String(id)))return null;
 try{
  const atlasUrl=new URL('/characters/v4/approved-two-characters.avif',request.url);
  const image=await env.ASSETS.fetch(new Request(atlasUrl.toString(),{method:'GET'}));
  if(!image.ok)return null;
  const src=new Uint8Array(await image.arrayBuffer());
  if(src.byteLength<3000||src.byteLength>60000)return null;
  let raw='';for(let i=0;i<src.length;i+=2048)raw+=String.fromCharCode(...src.subarray(i,i+2048));
  const base64=btoa(raw);
  const dir=new URL(request.url).searchParams.get('dir')||'front';
  const cols={front:0,left:1,back:2,right:3};
  const x=-100*(cols[dir]??0),y=id==='character-02'?-145:0;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="145" viewBox="0 0 100 145"><image x="'+x+'" y="'+y+'" width="400" height="290" href="data:image/avif;base64,'+base64+'"/></svg>';
  return new Response(svg,{status:200,headers:{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff','x-gmww-character-v4':'preview'}});
 }catch{return null}
}
export async function gameCharacterFrame(env,id,frame,request){const m=String(id||"").match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/),f=Math.max(1,Math.min(6,Number(frame)||1));if(!m)return new Response("Not found",{status:404});const number=Number(m[1]);if(number>GAME_CHARACTER_COUNT){if(env.ASSETS){try{const u=new URL(request.url);u.pathname="/characters/v253/chibi-"+m[1]+".webp";u.search="";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}return new Response("Chibi frame not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}const source=m[1];if(env.ASSETS){try{const u=new URL(request.url),left=u.searchParams.get("dir")==="left";u.pathname=(left?"/characters/walk-v266-left/":"/characters/walk-v263/")+"character-"+source+"/frame-"+String(f).padStart(2,"0")+".webp";u.search="";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}if(number<=2){const preview=await gameCharacterV4Sprite(env,id,request);if(preview)return preview;}return new Response("Walk frame not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}
export async function gameCharacterImage(env,id,request){return character40Image(env,id,request)}
export async function gameCharacterImageLegacy(env,id,request){const m=String(id||"").match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/);if(!m)return new Response("Not found",{status:404});if(Number(m[1])<=2){const portrait=await gameCharacterV4Sprite(env,id,request);if(portrait)return portrait;}if(Number(m[1])<=20)return gameCharacterFrame(env,id,1,request);if(env.ASSETS){try{const u=new URL(request.url);u.pathname="/characters/v253/chibi-"+m[1]+".webp";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}return new Response("Chibi not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}
