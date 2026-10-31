// Short-lived authenticated voice clips only; no paid transcription/RTC/storage provider.
// Data is stored separately from chat history and NEVER sent in room_state/WebSocket.
export const CHAT_VOICE_MAX_BYTES=192*1024;
export const CHAT_VOICE_MAX_DURATION_MS=20000;
export const CHAT_VOICE_TTL_MS=24*60*60*1000;
export const CHAT_VOICE_MAX_CLIPS_PER_ROOM=20;
const MIMES=new Set(['audio/mp4','audio/webm','audio/ogg']);
export function decodeChatVoice(raw){
  if(!raw||typeof raw!=='object'||typeof raw.base64!=='string')return null;
  const mime=String(raw.mime||'').split(';')[0].trim().toLowerCase(),base64=raw.base64;
  const durationMs=Number(raw.durationMs);
  if(!MIMES.has(mime)||!Number.isFinite(durationMs)||durationMs<500||durationMs>CHAT_VOICE_MAX_DURATION_MS||
     base64.length<16||base64.length>Math.ceil(CHAT_VOICE_MAX_BYTES/3)*4||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)||base64.length%4!==0)return null;
  let bytes;
  try{bytes=atob(base64)}catch{return null}
  if(bytes.length<12||bytes.length>CHAT_VOICE_MAX_BYTES)return null;
  const signature=(at,length)=>bytes.slice(at,at+length);
  if(!(mime==='audio/mp4'&&signature(4,4)==='ftyp'||
       mime==='audio/webm'&&bytes.charCodeAt(0)===0x1a&&bytes.charCodeAt(1)===0x45&&bytes.charCodeAt(2)===0xdf&&bytes.charCodeAt(3)===0xa3||
       mime==='audio/ogg'&&signature(0,4)==='OggS'))return null;
  return {mime,base64,durationMs,bytes:bytes.length};
}
export function pruneChatVoiceIndex(index,now=Date.now(),max=CHAT_VOICE_MAX_CLIPS_PER_ROOM){
  const rows=Array.isArray(index)?index.filter(v=>v&&typeof v.key==='string'&&Number(v.at)>now-CHAT_VOICE_TTL_MS&&Number(v.at)<=now+60000):[];
  const keep=rows.slice(-max),keys=new Set(keep.map(v=>v.key));
  const toDelete=(Array.isArray(index)?index:[]).filter(v=>v?.key&&!keys.has(v.key)).map(v=>v.key);
  return {keep,toDelete:[...new Set(toDelete)]};
}
export function validChatVoiceId(id){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||''))}
