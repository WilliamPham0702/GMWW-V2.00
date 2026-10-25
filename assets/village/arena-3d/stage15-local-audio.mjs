// GĐ15: connect REAL audio selected by GM on this device only.
// Never upload, persist, auto-fetch or fabricate role recordings. No secret names in public DOM.
import {SAFE_ACTION_ID} from './stage14-dynamic-actions.mjs';
export const STAGE15_VERSION='gmww.arena.local-voice.15';
const AUDIO_TYPES=new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/aac']);
export function validateArenaSoundFile(actionId,file){
 if(typeof actionId!=='string'||!SAFE_ACTION_ID.test(actionId))return {ok:false,error:'INVALID_ACTION'};
 if(!file||!AUDIO_TYPES.has(String(file.type||'').toLowerCase()))return {ok:false,error:'INVALID_AUDIO_TYPE'};
 if(!Number.isFinite(file.size)||file.size<1||file.size>10000000)return {ok:false,error:'AUDIO_TOO_LARGE'};
 return {ok:true};
}
export function createLocalArenaVoice({createURL,revokeURL,AudioCtor,maxFiles=12}={}){
 const library=new Map(),seen=new Set(),playing=new Set();
 function attach(actionId,file){
  const result=validateArenaSoundFile(actionId,file);
  if(!result.ok)return result;
  if(typeof createURL!=='function'||typeof revokeURL!=='function'||typeof AudioCtor!=='function')
    return {ok:false,error:'AUDIO_UNSUPPORTED'};
  if(!library.has(actionId)&&library.size>=maxFiles)return {ok:false,error:'AUDIO_LIMIT'};
  let url;try{url=createURL(file)}catch{return {ok:false,error:'INVALID_FILE'}};
  const old=library.get(actionId);
  if(old)revokeURL(old.url);
  library.set(actionId,{url,filename:String(file.name||'').slice(0,100)});
  return {ok:true,count:library.size};
 }
 function play(actionId,eventKey,{authorizedGM=false,enabled=false}={}){
  if(!authorizedGM||!enabled||!library.has(actionId)||typeof eventKey!=='string'||!eventKey||seen.has(eventKey))return false;
  let sound;
  try{
   sound=new AudioCtor(library.get(actionId).url);
   sound.volume=.24;sound.preload='auto';
   const key=eventKey;
   seen.add(key);
   if(seen.size>64)seen.delete(seen.values().next().value);
   playing.add(sound);
   const clean=()=>playing.delete(sound);
   sound.onended=clean;sound.onerror=clean;
   const operation=sound.play();
   if(operation&&typeof operation.catch==='function')operation.catch(clean);
   return true;
  }catch{if(sound)playing.delete(sound);return false}
 }
 function clear(){
  for(const sound of playing){try{sound.pause();sound.removeAttribute?.('src');sound.load?.()}catch{}}
  playing.clear();
  for(const item of library.values())revokeURL?.(item.url);
  library.clear();seen.clear();
 }
 return Object.freeze({attach,play,clear,has:actionId=>library.has(actionId),
  get count(){return library.size},get playingCount(){return playing.size}});
}
