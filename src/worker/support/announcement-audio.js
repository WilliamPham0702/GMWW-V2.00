// Âm thanh thông báo: mục tiêu theo lượt, cue, lưu/đọc bản ghi.

// BEGIN RECORDED PUBLIC ANNOUNCEMENTS
// V3.303: public turn audio is server-driven. The GM uploads each configured clip once
// per room (library keyed by audio target, stored by content hash). Every turn change
// resolves the clips on the Server and pushes an opaque URL + Server start time to all
// devices, so Players hear the same point even if the GM app is in background.
export const ANNOUNCE_WOLF_ROLES=['role_wolf','role_alpha_wolf'];
export function announcementTargetsForTurn(turn){
  if(!turn)return [];
  const rid=r=>String(r?.roleId||'');
  if(turn.kind==='village-wakeup')return ['system:audio_system_day_wakeup'];
  // Tráng Gương gọi lại chủ sở hữu: phát audio của chính lá Tráng Gương, không phải audio của vai bị sao chép (tránh lộ người đã chết).
  if(turn.mirror===true)return ['artifacts:artifact_23'];
  if(turn.kind==='early-artifact-window')return ['system:audio_system_early_artifacts'];
  if(turn.kind==='wolf-introduction'||turn.kind==='wolf-pack-bite')return ['cards:audio_group_wolves'];
  if(['artifact-main','early-artifact'].includes(turn.kind))return turn.artifactId?['artifacts:'+String(turn.artifactId)]:[];
  if(turn.kind==='role-group'){
    const roles=Array.isArray(turn.roles)?turn.roles:[],out=[],seen=new Set(),wolves=roles.some(r=>ANNOUNCE_WOLF_ROLES.includes(rid(r)));
    if(wolves)out.push('cards:audio_group_wolves');
    for(const r of roles){const id=rid(r);if(!id||seen.has(id)||wolves&&ANNOUNCE_WOLF_ROLES.includes(id))continue;seen.add(id);out.push('cards:'+id)}
    return out.slice(0,6);
  }
  if(ANNOUNCE_WOLF_ROLES.includes(rid(turn)))return ['cards:audio_group_wolves'];
  return rid(turn)?['cards:'+rid(turn)]:[];
}
// Daytime clips are public system announcements only (never role cards/artifacts).
export const ANNOUNCE_DAY_MAX=12,DAY_COUNTDOWN_MS=30000;
export function dayAnnouncementTargets(list){
  const out=[];for(const t of Array.isArray(list)?list:[]){const v=String(t||'');
    if(/^system:audio_system_[A-Za-z0-9_]{1,100}$/.test(v)&&!out.includes(v))out.push(v);if(out.length>=ANNOUNCE_DAY_MAX)break}
  return out;
}
export function announcementCue(meta,runtime,day){
  if(meta?.phase!=='running')return null;
  if(meta.cyclePhase!=='night'&&day&&day.matchId===String(meta.matchId||'')&&day.cycleKey===String(meta.cycleKey||'')&&Array.isArray(day.targets)&&day.targets.length)
    return {key:String(meta.matchId)+':'+String(meta.cycleKey)+':day:'+Number(day.seq||1),
      label:day.targets[0]==='system:audio_system_day_wakeup'?'Làng ơi dậy đi':'Thông báo Làng',
      targets:dayAnnouncementTargets(day.targets),startedAt:Number(day.startedAt)||0};
  const turn=runtime?.queue?.[runtime.cursor];
  if(meta.cyclePhase==='night'&&turn)return {key:String(meta.matchId)+':'+String(meta.cycleKey)+':'+String(turn.id),label:String(turn.label||'Đến lượt Vai Trò').slice(0,120),
    targets:announcementTargetsForTurn(turn),startedAt:Date.parse(turn.startedAt||runtime.startedAt||'')||0};
  if(meta.cyclePhase==='morning')return {key:String(meta.matchId)+':'+String(meta.cycleKey)+':wakeup',label:'Làng ơi dậy đi',
    targets:['system:audio_system_day_wakeup'],startedAt:Date.parse(meta.cycleStartedAt||'')||0};
  return null;
}
export const chunkSize=60000,maxBytes=2*1024*1024,ANNOUNCE_TARGET_RE=/^(cards|system|artifacts):[A-Za-z0-9_.:-]{1,120}$/,ANNOUNCE_HASH_RE=/^[a-f0-9]{32}$/,ANNOUNCE_MAX_TARGETS=200;
export function decodeRecording(body){
  if(typeof body?.base64!=='string'||body.base64.length>Math.ceil(maxBytes/3)*4||!body.base64.length||!/^[-A-Za-z0-9+/]*={0,2}$/.test(body.base64))return null;
  try{
    const raw=atob(body.base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    if(!bytes.length||bytes.length>maxBytes)return null;
    const text=(a,b)=>String.fromCharCode(...bytes.slice(a,b)),mime=String(body.mime||'').split(';')[0].toLowerCase();
    const valid=mime==='audio/mpeg'&&(text(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224)||
      ['audio/mp4','audio/x-m4a'].includes(mime)&&text(4,8)==='ftyp'||
      mime==='audio/ogg'&&text(0,4)==='OggS'||
      ['audio/wav','audio/x-wav'].includes(mime)&&text(0,4)==='RIFF'&&text(8,12)==='WAVE';
    return valid?{bytes,mime}:null;
  }catch{return null}
}
export async function announcementHash(bytes){
  const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...d.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function announcementLibrary(storage){
  const out={};for(const [k,v] of await storage.list({prefix:'annTarget:'}))if(v?.hash)out[k.slice(10)]=v.hash;return out;
}
// Store one clip for a target; old bytes are removed once no target references them.
export async function saveAnnouncementTarget(storage,target,recording){
  if(!ANNOUNCE_TARGET_RE.test(String(target||'')))return Response.json({ok:false,error:'INVALID_AUDIO_TARGET'},{status:400});
  if(!recording)return Response.json({ok:false,error:'INVALID_RECORDED_AUDIO'},{status:400});
  const hash=await announcementHash(recording.bytes),lib=await announcementLibrary(storage),old=lib[target];
  if(old===hash)return Response.json({ok:true,target,hash,unchanged:true});
  if(!old&&Object.keys(lib).length>=ANNOUNCE_MAX_TARGETS)return Response.json({ok:false,error:'AUDIO_LIBRARY_FULL'},{status:409});
  await storage.transaction(async tx=>{
    if(!await tx.get('annBlob:'+hash)){
      const count=Math.ceil(recording.bytes.length/chunkSize);
      for(let i=0;i<count;i++)await tx.put('annBlob:'+hash+':'+i,recording.bytes.slice(i*chunkSize,(i+1)*chunkSize));
      await tx.put('annBlob:'+hash,{mime:recording.mime,count,size:recording.bytes.length});
    }
    await tx.put('annTarget:'+target,{hash,updatedAt:Date.now()});
    if(old&&!Object.entries(lib).some(([t,h])=>t!==target&&h===old)){
      const prev=await tx.get('annBlob:'+old);
      for(let i=0;i<Number(prev?.count||0);i++)await tx.delete('annBlob:'+old+':'+i);
      await tx.delete('annBlob:'+old);
    }
  });
  return Response.json({ok:true,target,hash});
}
export async function readAnnouncementBlob(storage,hash){
  if(!ANNOUNCE_HASH_RE.test(String(hash||'')))return new Response(null,{status:404});
  return storage.transaction(async tx=>{
    const meta=await tx.get('annBlob:'+hash);if(!meta)return new Response(null,{status:404});
    const bytes=new Uint8Array(meta.size);let offset=0;
    for(let i=0;i<meta.count;i++){const chunk=await tx.get('annBlob:'+hash+':'+i);if(!chunk)return new Response(null,{status:404});bytes.set(chunk,offset);offset+=chunk.length}
    // Content-addressed: the URL changes when the GM changes the clip.
    return new Response(bytes,{headers:{'content-type':meta.mime,'cache-control':'private, max-age=86400, immutable','x-content-type-options':'nosniff'}});
  });
}
