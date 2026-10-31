// Voice notes use the existing room Durable Object: no third-party service or new binding.
export const VOICE_LIMITS=Object.freeze({durationMs:20000,bytes:240*1024,clipsPerRoom:32,rateMs:5000,retentionMs:24*60*60*1000});
export function voiceMime(raw){
  const t=String(raw||'').toLowerCase().replace(/\s/g,'');
  if(t==='audio/mp4'||t==='audio/x-m4a')return'audio/mp4';
  if(t==='audio/webm'||t==='audio/webm;codecs=opus')return'audio/webm';
  if(t==='audio/ogg'||t==='audio/ogg;codecs=opus')return'audio/ogg';
  return'';
}
export function decodeVoiceMessage(raw){
  const mime=voiceMime(raw?.mime),durationMs=Number(raw?.durationMs),b64=raw?.data;
  if(!mime||!Number.isInteger(durationMs)||durationMs<300||durationMs>VOICE_LIMITS.durationMs||
    typeof b64!=='string'||b64.length<20||b64.length>Math.ceil(VOICE_LIMITS.bytes/3)*4+8||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)||b64.length%4!==0)
    return null;
  let binary;
  try{binary=atob(b64)}catch{return null}
  if(binary.length<12||binary.length>VOICE_LIMITS.bytes)return null;
  const bytes=Uint8Array.from(binary,x=>x.charCodeAt(0));
  const has=(offset,...values)=>values.every((v,i)=>bytes[offset+i]===v);
  const valid=mime==='audio/webm'?has(0,0x1a,0x45,0xdf,0xa3):
    mime==='audio/ogg'?has(0,0x4f,0x67,0x67,0x53):
    has(4,0x66,0x74,0x79,0x70);
  return valid?{mime,durationMs,bytes}:null;
}
export function voiceClipMeta(message,now=Date.now()){
  const voice=message?.voice;
  return voice&&typeof voice.id==='string'&&voice.expiresAt>now?voice:null;
}
export function nextVoiceIndex(index,entry,now=Date.now()){
  const prior=Array.isArray(index)?index.filter(x=>x&&typeof x.key==='string'):[];
  const keep=[...prior.filter(x=>x.expiresAt>now),entry];
  return {keep:keep.slice(-VOICE_LIMITS.clipsPerRoom),remove:prior.filter(x=>!keep.slice(-VOICE_LIMITS.clipsPerRoom).some(k=>k.key===x.key)).map(x=>x.key)};
}
