// Read-only GitHub Release audio catalog. Release tag, path and host are fixed;
// never use a user-supplied URL or upload data to GitHub from a game room.
export const GMWW_SHARED_AUDIO_TAG='gmww-audio-v1';
export const GMWW_SHARED_AUDIO_BASE='https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/'+GMWW_SHARED_AUDIO_TAG+'/';
const TARGET=/^(cards|system|artifacts|actions):[A-Za-z0-9_.:-]{1,120}$/;
const SHA=/^[a-f0-9]{64}$/;
const MIMES={'audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg','audio/wav':'wav'};
const LIMIT=2*1024*1024;
let cached=null,cachedUntil=0;
export function verifiedSharedAudioCatalog(doc){
  if(!doc||doc.format!=='gmww-shared-audio-v1'||doc.version!==1||doc.releaseTag!==GMWW_SHARED_AUDIO_TAG||
      !doc.clips||typeof doc.clips!=='object'||Array.isArray(doc.clips))return null;
  const entries=Object.entries(doc.clips);
  if(!entries.length||entries.length>300)return null;
  const clips={};
  for(const [target,row]of entries){
    if(!TARGET.test(target)||!row||typeof row!=='object'||!SHA.test(row.sha256)||
       !Object.hasOwn(MIMES,row.mime)||!Number.isInteger(row.size)||row.size<=0||row.size>LIMIT)return null;
    const filename=row.sha256+'.'+MIMES[row.mime];
    if(row.file!==filename||row.url!==GMWW_SHARED_AUDIO_BASE+filename)return null;
    clips[target]={sha256:row.sha256,mime:row.mime,size:row.size,file:filename,url:row.url};
  }
  return {releaseTag:GMWW_SHARED_AUDIO_TAG,clips};
}
export async function getSharedAudioCatalog(fetcher=fetch,now=Date.now()){
  if(now<cachedUntil)return cached;
  // KHÔNG dùng chung một promise đang tải giữa các request: trong Durable Object,
  // await promise của request khác (vd. alarm Auto GM ↔ /me của người chơi) bị treo
  // tới khi blockConcurrencyWhile hết 30 giây → DO reset → /me 500 → người chơi không nhận vai.
  let next=null;
  try{
    const response=await fetcher(GMWW_SHARED_AUDIO_BASE+'manifest.json',{redirect:'follow',signal:AbortSignal.timeout(5000)});
    if(response.ok&&Number(response.headers.get('content-length')||0)<200000){
      const raw=await response.text();
      if(raw.length<200000)next=verifiedSharedAudioCatalog(JSON.parse(raw));
    }
  }catch(_){}
  if(Date.now()>=cachedUntil||next){cached=next;cachedUntil=Date.now()+(next?600000:30000)}
  return cached;
}
// Chơi nhanh: theo tag đã chọn. Phòng GM Online: dùng làm dự phòng khi GM chưa tải clip lên phòng
// (GM mở trên PC/web không có thư viện audio, app ở nền...) để Player Web vẫn nghe timeline.
export function sharedAudioAllowed(meta){
  if(meta?.quickPlay===true)return meta?.quickPlayAudioReleaseTag===GMWW_SHARED_AUDIO_TAG;
  return meta?.demo!==true&&String(meta?.roomMode||'online').toLowerCase()==='online';
}
export function sharedAudioTargetsForCue(meta,targets,catalog){
  if(!sharedAudioAllowed(meta)||!catalog)return [];
  return (Array.isArray(targets)?targets:[]).flatMap(t=>catalog.clips[t]?[catalog.clips[t]]:[]);
}
export async function readSharedAudioClip(meta,targets,sha,fetcher=fetch,catalog=null){
  if(!SHA.test(sha)||!sharedAudioAllowed(meta))return new Response(null,{status:404});
  const available=catalog||await getSharedAudioCatalog(fetcher);
  const matched=sharedAudioTargetsForCue(meta,targets,available).find(c=>c.sha256===sha);
  if(!matched)return new Response(null,{status:404});
  try{
    const response=await fetcher(matched.url,{redirect:'follow',signal:AbortSignal.timeout(10000)});
    if(!response.ok)return new Response(null,{status:503});
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length!==matched.size||bytes.length>LIMIT)return new Response(null,{status:503});
    const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(actual!==sha)return new Response(null,{status:503});
    return new Response(bytes,{headers:{'content-type':matched.mime,'cache-control':'private, max-age=86400, immutable','x-content-type-options':'nosniff'}});
  }catch(_){return new Response(null,{status:503})}
}
