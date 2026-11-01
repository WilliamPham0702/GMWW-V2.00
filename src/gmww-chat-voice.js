// Private voice clips for GMWW Chat. No external storage service and no public voice URLs.
export const VOICE_MAX_MS=30_000;
export const VOICE_MAX_BYTES=512*1024;
export const VOICE_MAX_REQUEST_BYTES=710_000;
export const VOICE_TTL_MS=72*60*60*1000;
export const VOICE_ROOM_MAX=80;
export function gmwwVoiceDecode(value){
  const durationMs=Number(value?.durationMs),mime=String(value?.mime||'').split(';')[0].toLowerCase();
  const encoded=value?.base64;
  if(!Number.isInteger(durationMs)||durationMs<250||durationMs>VOICE_MAX_MS||
     !['audio/mp4','audio/webm','audio/ogg','audio/mpeg'].includes(mime)||
     typeof encoded!=='string'||!encoded||encoded.length>Math.ceil(VOICE_MAX_BYTES/3)*4||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))return null;
  let bytes;
  try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}catch{return null}
  if(bytes.length<12||bytes.length>VOICE_MAX_BYTES)return null;
  const head=(a,b)=>String.fromCharCode(...bytes.subarray(a,b));
  const valid=(mime==='audio/mp4'&&head(4,8)==='ftyp')||
    (mime==='audio/webm'&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)||
    (mime==='audio/ogg'&&head(0,4)==='OggS')||
    (mime==='audio/mpeg'&&(head(0,3)==='ID3'||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0));
  return valid?{bytes,mime,durationMs}:null;
}
// Read a strict upper bound even when transfer-encoding is chunked or Content-Length is forged.
export async function gmwwVoiceReadJson(request){
  const length=Number(request.headers.get('content-length'));
  if(Number.isFinite(length)&&length>VOICE_MAX_REQUEST_BYTES)return null;
  if(!request.body)return null;
  const reader=request.body.getReader(),parts=[];let size=0;
  try{
    while(true){
      const {value,done}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>VOICE_MAX_REQUEST_BYTES){await reader.cancel();return null}
      parts.push(value);
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
    const obj=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:null;
  }catch{return null}finally{reader.releaseLock()}
}
export function gmwwVoiceStorageKey(id){return 'onlineChatVoice:'+id}
export function gmwwVoicePublicMeta(message){return {id:message.id,senderId:message.senderId,senderName:message.senderName,isGM:message.isGM===true,
  text:'',at:message.at,scope:message.scope,voice:{durationMs:message.voice.durationMs,mime:message.voice.mime}}}
