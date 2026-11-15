// GitHub Releases is a read-only, content-addressed Audio library.
// The game room stores only a pinned template tag, NEVER a copy of 74 files.
// No arbitrary URL, redirect target, template title or client-supplied host is trusted.
export const GMWW_SHARED_AUDIO_REPO='WilliamPham0702/GMWW-V2.00';
export const GMWW_SHARED_AUDIO_DEFAULT='gmww-audio-v1';
const RELEASE_RE=/^gmww-audio-v[1-9][0-9]{0,3}$/;
const TARGET_RE=/^(cards|system|artifacts|actions):[A-Za-z0-9_.:-]{1,120}$/;
const SHA_RE=/^[a-f0-9]{64}$/;
const MP3_RE=/^audio\/mpeg$/;
const LIMIT=2*1024*1024;
export function pinnedAudioReleaseTag(value){
 const tag=String(value||'');return RELEASE_RE.test(tag)?tag:'';
}
export function sharedAudioBase(tag){
 return 'https://github.com/'+GMWW_SHARED_AUDIO_REPO+'/releases/download/'+tag+'/';
}
export function validateSharedAudioManifest(input,tag){
 if(!pinnedAudioReleaseTag(tag)||!input||input.format!=='gmww-shared-audio-v1'||input.version!==1||input.releaseTag!==tag||
     !input.clips||typeof input.clips!=='object'||Array.isArray(input.clips))return null;
 const entries=Object.entries(input.clips);if(!entries.length||entries.length>300)return null;
 const clips=Object.create(null);
 for(const [key,raw] of entries){
  if(!TARGET_RE.test(key)||!raw||typeof raw!=='object'||!SHA_RE.test(String(raw.sha256||''))||
      !MP3_RE.test(String(raw.mime||''))||!Number.isSafeInteger(raw.size)||raw.size<8||raw.size>LIMIT||
      raw.file!==raw.sha256+'.mp3'||raw.url!==sharedAudioBase(tag)+raw.file)return null;
  clips[key]={sha256:raw.sha256,mime:'audio/mpeg',size:raw.size,file:raw.file};
 }
 return {releaseTag:tag,clips};
}
export async function fetchSharedAudioManifest(tag,doFetch=fetch){
 if(!pinnedAudioReleaseTag(tag))return null;
 try{
  const response=await doFetch(sharedAudioBase(tag)+'manifest.json',{redirect:'follow',signal:AbortSignal.timeout(3500)});
  if(!response?.ok)return null;
  const length=Number(response.headers?.get?.('content-length')||0);
  if(length>256*1024)return null;
  const text=await response.text();if(text.length>256*1024)return null;
  return validateSharedAudioManifest(JSON.parse(text),tag);
 }catch{return null}
}
export function audioHashForTarget(manifest,target){
 const clip=manifest?.clips?.[target];return clip?clip.sha256.slice(0,32):'';
}
export function sharedClipForCue(manifest,targets,hash){
 if(!/^[a-f0-9]{32}$/.test(String(hash||'')))return null;
 for(const target of Array.isArray(targets)?targets:[]){
  const clip=manifest?.clips?.[target];
  if(clip?.sha256?.slice(0,32)===hash)return clip;
 }
 return null;
}
export async function fetchVerifiedSharedAudio(tag,clip,doFetch=fetch){
 if(!pinnedAudioReleaseTag(tag)||!clip||!SHA_RE.test(String(clip.sha256||''))||
     clip.file!==clip.sha256+'.mp3'||clip.mime!=='audio/mpeg'||!Number.isSafeInteger(clip.size)||clip.size<8||clip.size>LIMIT)
   return new Response(null,{status:404});
 try{
  const response=await doFetch(sharedAudioBase(tag)+clip.file,{redirect:'follow',signal:AbortSignal.timeout(5500)});
  if(!response?.ok)return new Response(null,{status:404});
  const size=Number(response.headers?.get?.('content-length')||0);if(size>LIMIT)return new Response(null,{status:404});
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==clip.size||bytes.byteLength>LIMIT||
    !(bytes[0]===73&&bytes[1]===68&&bytes[2]===51)&&!(bytes[0]===255&&(bytes[1]&224)===224))
     return new Response(null,{status:404});
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const hash=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==clip.sha256)return new Response(null,{status:404});
  return new Response(bytes,{status:200,headers:{'content-type':'audio/mpeg','cache-control':'private, max-age=86400, immutable','x-content-type-options':'nosniff'}});
 }catch{return new Response(null,{status:404})}
}
