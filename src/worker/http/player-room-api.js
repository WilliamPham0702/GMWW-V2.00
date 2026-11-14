// API phòng do người chơi tạo.
import { PLAYER_ROOM_ROLE_CATALOG } from "../../player-room-role-catalog.js";
import { GM_SYNC_TOKEN } from "../config.js";
import { randomToken, sha256 } from "../support/crypto.js";
import { normalizeRoomName } from "../support/member-records.js";
import { generateRoomCode, isValidRoomCode, memberStore, normalizeRoomCode, roomStub } from "../support/room-access.js";
import { syncRoomDirectory } from "./gm-api.js";
import { j, safeJson } from "./responses.js";
import { notifyGmPlayerRoomCreated } from "./gm-push-api.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { gmPreloadSharedArtifacts } from "./gm-assets-api.js";

// Player-created online room. Requires a member session; never returns the room's gmToken.
// The owner only receives an ownerToken (set-up rights are added in a later step), and the
// 5-room / one-room-per-owner limits are enforced atomically in the member store.
export async function createPlayerRoom(env,url,request){
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const own=await session.json().catch(()=>({})),ownerLoginId=normalizeLoginId(own?.member?.loginId);
  if(!ownerLoginId)return j({ok:false,error:"UNAUTHORIZED"},401);
  const body=await safeJson(request)||{},ownerToken=randomToken(32),ownerTokenHash=await sha256(ownerToken),json={"content-type":"application/json"};
  for(let i=0;i<8;i++){
    const code=generateRoomCode(),rsv=await memberStore(env).fetch("https://member.internal/directory/player-rooms/reserve",{method:"POST",headers:json,body:JSON.stringify({code,ownerLoginId,roomName:body.roomName||"",seatCount:body.seatCount})});
    if(rsv.status===409){const d=await rsv.clone().json().catch(()=>({}));if(d.error==="CODE_TAKEN")continue;return rsv}
    if(rsv.status!==201)return rsv;
    const r=await roomStub(env,code).fetch("https://room.internal/init",{method:"POST",headers:json,body:JSON.stringify({code,roomName:body.roomName||"",roomMode:"online",demo:false,enabled:true,seatMoveMode:"instant",seatCount:body.seatCount,gameConfig:body.gameConfig||null,cardBackImage:null,playerRoom:true,quickPlay:body.quickPlay===true,ownerLoginId,ownerTokenHash})});
    if(r.status===201){const data=await r.json(),p=url.protocol==="https:"?"wss:":"ws:";await syncRoomDirectory(env,code);const createdName=data.room?.roomName||normalizeRoomName(body.roomName)||("Phòng "+code);await notifyGmPlayerRoomCreated(env,{code,roomName:createdName,ownerName:own?.member?.displayName||own?.member?.name||ownerLoginId});return j({ok:true,roomCode:code,roomName:createdName,ownerToken,joinUrl:`${url.origin}/${code}`,websocketUrl:`${p}//${url.host}/ws/${code}`},201)}
    await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:json,body:JSON.stringify({code})});
    if(r.status!==409)return j({ok:false,error:"ROOM_CREATE_FAILED"},500)
  }
  return j({ok:false,error:"ROOM_CODE_EXHAUSTED"},503)
}
// Ván Mẫu published by the GM; any logged-in member may list them when creating a room.
export async function playerRoomTemplates(env,request){
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const store=memberStore(env),list=await store.fetch("https://member.internal/game-templates/list");if(!list.ok)return list;
  const data=await list.json().catch(()=>({})),sessionData=await session.json().catch(()=>({})),loginId=normalizeLoginId(sessionData?.member?.loginId||''),templates=[];
  for(const meta of Array.isArray(data?.templates)?data.templates:[]){
    const detail=await store.fetch('https://member.internal/game-templates/get?id='+encodeURIComponent(meta.id));
    const template=detail.ok?(await detail.json().catch(()=>({})))?.template:null;
    templates.push(template?{...meta,compiledConfig:template.compiledConfig,canEdit:meta.source==='PLAYER'&&normalizeLoginId(template.ownerLoginId||'')===loginId}:meta);
  }
  return j({ok:true,count:templates.length,templates})
}
// Every role that has a published card (from the GM's Ván Mẫu), so an owner can build a deck from them.
export async function playerRoomSourceRoles(env){
  const store=memberStore(env),lr=await store.fetch("https://member.internal/game-templates/list");
  const metas=lr.ok?(((await lr.json().catch(()=>({})))?.templates||[]).slice(0,40)):[],roles=new Map(PLAYER_ROOM_ROLE_CATALOG.map(r=>[String(r.roleId),{...r,templateId:''}])),bases=new Map();
  for(const m of metas){
    const tr=await store.fetch("https://member.internal/game-templates/get?id="+encodeURIComponent(m.id));if(!tr.ok)continue;
    const t=(await tr.json().catch(()=>({})))?.template,cfg=t?.compiledConfig;if(!cfg||!Array.isArray(cfg.roles))continue;
    const {roles:_r,...base}=cfg;bases.set(m.id,base);
    for(const r of cfg.roles){const id=String(r?.roleId||"");if(id&&!roles.has(id))roles.set(id,{...r,roleId:id,templateId:String(m.id)});else if(id&&roles.has(id)&&!roles.get(id).templateId)roles.set(id,{...roles.get(id),templateId:String(m.id)})}
  }
  return{ok:true,roles,bases}
}
export async function playerRoomSourceArtifacts(env){
  const r=await memberStore(env).fetch('https://member.internal/artifacts/shared/status');if(!r.ok)return{ok:false,res:r};
  const rows=(await r.json().catch(()=>({})))?.artifacts||[];
  return{ok:true,artifacts:rows.map(x=>({assetId:String(x.assetId||''),roleCard:x.package?.roleCard||null})).filter(x=>x.assetId.startsWith('artifact:')&&x.roleCard)}
}
export async function playerRoomRoleList(env,request){
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const src=await playerRoomSourceRoles(env);if(!src.ok)return src.res;
  const arts=await playerRoomSourceArtifacts(env);
  return j({ok:true,roles:[...src.roles.values()].map(r=>({roleId:r.roleId,roleName:String(r.roleName||r.name||r.roleId),faction:String(r.faction||""),order:Number(r.order)||0})).sort((a,b)=>a.faction.localeCompare(b.faction,"vi")||a.roleName.localeCompare(b.roleName,"vi")),artifacts:arts.ok?arts.artifacts.map(x=>({artifactId:x.assetId.slice(9),name:String(x.roleCard.name||x.assetId.slice(9)),information:String(x.roleCard.information||''),singleUse:x.roleCard.singleUse===true,priorityFirst:x.roleCard.priorityFirst===true})).sort((a,b)=>a.name.localeCompare(b.name,'vi')):[],artifactError:arts.ok?'':String(arts.res?.status||'unavailable')})
}
// Owner-only set-up. The DO verifies the owner token itself; only the actions below exist for owners.
export async function playerRoomOwnerApi(env,rawCode,action,request){
  const code=normalizeRoomCode(rawCode);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  if(!["state","room-lock","quick-start","seat-lock","seats-randomize","kick","room-settings","template","template-save","template-delete","roles-shuffle","start","end","replay","auto","stage","close"].includes(action))return j({ok:false,error:"NOT_FOUND"},404);
  const stub=roomStub(env,code),auth={authorization:request.headers.get("authorization")||""},json={...auth,"content-type":"application/json"};
  if(action==="state"){if(request.method!=="GET")return j({ok:false,error:"METHOD_NOT_ALLOWED"},405);return stub.fetch("https://room.internal/owner/state",{headers:auth})}
  if(request.method!=="POST")return j({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  const body=await safeJson(request)||{};
  if(action==="template-delete"){
    const gate=await stub.fetch("https://room.internal/owner/state",{headers:auth});if(!gate.ok)return gate;
    const ownerLoginId=normalizeLoginId((await gate.clone().json().catch(()=>({})))?.ownerLoginId||'');
    const id=String(body.templateId||"").trim().slice(0,120);if(!id||id.includes("/")||id.includes(".."))return j({ok:false,error:"INVALID_TEMPLATE_ID"},400);
    const existing=await memberStore(env).fetch("https://member.internal/game-templates/get?id="+encodeURIComponent(id));if(!existing.ok)return existing;
    const record=(await existing.json().catch(()=>({})))?.template;if(record?.source!=="PLAYER"||normalizeLoginId(record.ownerLoginId||'')!==ownerLoginId)return j({ok:false,error:"TEMPLATE_DELETE_FORBIDDEN",message:"Chỉ xóa được Ván Mẫu do bạn tạo."},403);
    return memberStore(env).fetch("https://member.internal/game-templates/delete?id="+encodeURIComponent(id),{method:"DELETE"})
  }
  if(action==="template-save"){
    const gate=await stub.fetch("https://room.internal/owner/state",{headers:auth});if(!gate.ok)return gate;
    const gateData=await gate.clone().json().catch(()=>({})),ownerLoginId=normalizeLoginId(gateData.ownerLoginId||''),templateId=String(body.templateId||'').trim().slice(0,120);
    if(templateId){const saved=await memberStore(env).fetch('https://member.internal/game-templates/get?id='+encodeURIComponent(templateId));if(!saved.ok)return saved;const record=(await saved.json().catch(()=>({})))?.template;if(record?.source!=="PLAYER"||normalizeLoginId(record.ownerLoginId||'')!==ownerLoginId)return j({ok:false,error:"TEMPLATE_EDIT_FORBIDDEN"},403)}
    const name=String(body.name||"").trim().slice(0,48)||"Ván của tôi",picked=new Map(),secs=new Map(),orders=new Map();
    for(const r of Array.isArray(body.roles)?body.roles.slice(0,100):[]){const rid=String(r?.roleId||"").slice(0,80),n=Math.max(0,Math.min(30,Math.floor(Number(r?.count)||0)));if(rid&&n){picked.set(rid,(picked.get(rid)||0)+n);if(r.actionDurationSec!=null&&r.actionDurationSec!=="")secs.set(rid,Math.max(0,Math.min(3600,Math.trunc(Number(r.actionDurationSec)||0))));if(r.order!=null)orders.set(rid,Math.max(0,Math.trunc(Number(r.order)||0)))}}
    const total=[...picked.values()].reduce((a,b)=>a+b,0);
    if(!picked.size||total<1||total>30)return j({ok:false,error:"INVALID_CUSTOM_DECK",message:"Chọn từ 1 đến 30 lá bài."},400);
    const src=await playerRoomSourceRoles(env);if(!src.ok)return src.res;
    const rows=[],copyAssets=[];
    for(const [rid,n] of picked){const r=src.roles.get(rid);if(!r)return j({ok:false,error:"ROLE_NOT_AVAILABLE",message:"Có vai chưa có lá bài."},400);
      const row={...r,count:n};if(secs.has(rid))row.actionDurationSec=secs.get(rid);if(orders.has(rid))row.order=orders.get(rid);rows.push(row);if(r.templateId)copyAssets.push({from:r.templateId,roleId:rid})}
    const t=body.timing&&typeof body.timing==="object"?body.timing:{},timing={};
    for(const k of ["villageDiscussionSec","gallowsNominationSec","gallowsVoteSec","wolfDiscussionSec","earlyArtifactSec","defaultActionSec","artifactActionSec"])if(t[k]!=null&&t[k]!=="")timing[k]=Math.max(k.startsWith('gallows')?1:0,Math.min(3600,Math.trunc(Number(t[k])||0)));
    if(Object.prototype.hasOwnProperty.call(t,'autoAdvance'))timing.autoAdvance=t.autoAdvance!==false;
    const artifactEnabled=body.artifactsEnabled===true;
    const artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number(body.artifactLimitPerCycle??3)||0)));
    const baseId=rows[0].templateId,base=src.bases.get(baseId)||{},compiledConfig={...base,name,playerCount:total,timing:{...(base.timing||{}),...timing},roles:rows.map(({templateId:_t,...r})=>r),artifactsEnabled:artifactEnabled,artifacts:[],artifactPool:"shared",artifactLimitPerCycle};
    return memberStore(env).fetch("https://member.internal/game-templates/player-save",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({id:templateId||undefined,ownerLoginId,compiledConfig,copyAssets})})
  }
  if(action==="template"){
    const gate=await stub.fetch("https://room.internal/owner/state",{headers:auth});if(!gate.ok)return gate;
    if(body.custom&&typeof body.custom==="object"){
      const name=String(body.custom.name||"").trim().slice(0,48)||"Ván của tôi",picked=new Map();
      for(const r of Array.isArray(body.custom.roles)?body.custom.roles.slice(0,100):[]){const rid=String(r?.roleId||"").slice(0,80),n=Math.max(0,Math.min(30,Math.floor(Number(r?.count)||0)));if(rid&&n)picked.set(rid,(picked.get(rid)||0)+n)}
      const total=[...picked.values()].reduce((a,b)=>a+b,0);
      if(!picked.size||total<1||total>30)return j({ok:false,error:"INVALID_CUSTOM_DECK",message:"Chọn từ 1 đến 30 lá bài."},400);
      const src=await playerRoomSourceRoles(env);if(!src.ok)return src.res;
      const rows=[];for(const [rid,n] of picked){const r=src.roles.get(rid);if(!r)return j({ok:false,error:"ROLE_NOT_AVAILABLE",message:"Có vai chưa có lá bài."},400);rows.push({...r,count:n})}
      const baseId=rows[0].templateId,id="custom-"+Date.now().toString(36),packages=[];
      for(const r of rows){
        if(!r.templateId)continue;
        const ar=await memberStore(env).fetch("https://member.internal/game-templates/assets?id="+encodeURIComponent(r.templateId)+"&assetId="+encodeURIComponent("role:"+r.roleId));if(!ar.ok)continue;
        const d=await ar.json().catch(()=>null);if(d?.package)packages.push({...d.package,roleId:r.roleId})
      }
      const template={id,name,playerCount:total,compiledConfig:{...(src.bases.get(baseId)||{}),id,name,playerCount:total,roles:rows.map(({templateId:_t,...r})=>r)}};
      return stub.fetch("https://room.internal/owner/apply-template",{method:"POST",headers:json,body:JSON.stringify({template,packages})})
    }
    const id=String(body.templateId||"").trim().slice(0,120);if(!id)return j({ok:false,error:"INVALID_TEMPLATE_ID"},400);
    const tr=await memberStore(env).fetch("https://member.internal/game-templates/get?id="+encodeURIComponent(id));if(!tr.ok)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    let template=(await tr.json().catch(()=>({}))).template;const packages=[];
    if(body.quickPlayRevision!=null&&Number(template?.revision)!==Number(body.quickPlayRevision)){
      return j({ok:false,error:"QUICK_PLAY_TEMPLATE_CHANGED",message:"Ván Mẫu đã đổi. Hãy tải lại danh sách Ván Mẫu."},409);
    }
    let cfg=template?.compiledConfig||{};
    const override=body.matchOverrides&&typeof body.matchOverrides==='object'?body.matchOverrides:null;
    if(override){
      const timing={...(cfg.timing||{})};for(const k of ["villageDiscussionSec","gallowsNominationSec","gallowsVoteSec","wolfDiscussionSec","earlyArtifactSec","defaultActionSec","artifactActionSec"]){const n=Number(override.timing?.[k]);if(Number.isFinite(n))timing[k]=Math.max(k.startsWith('gallows')?1:0,Math.min(3600,Math.trunc(n)))}
      const roleTimes=override.roleDurations&&typeof override.roleDurations==='object'?override.roleDurations:{};
      const roles=(Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>Object.prototype.hasOwnProperty.call(roleTimes,String(r.roleId))?{...r,actionDurationSec:Math.max(0,Math.min(3600,Math.trunc(Number(roleTimes[r.roleId])||0)))}:r);
      const artifactsEnabled=override.artifactsEnabled===true;
      cfg={...cfg,timing,roles,artifactsEnabled};template={...template,compiledConfig:cfg};
    }
    if(cfg.artifactsEnabled===true){
      const pool=await playerRoomSourceArtifacts(env);if(!pool.ok)return pool.res;
      if(!pool.artifacts.length)return j({ok:false,error:"SHARED_ARTIFACT_NOT_READY",message:"Kho Artifact chung của Server chưa có lá bài."},409);
      cfg={...cfg,artifactPool:"shared",artifacts:pool.artifacts.map((a,i)=>({artifactId:a.assetId.slice(9),order:i+1}))};
      template={...template,compiledConfig:cfg};
    }
    if(cfg.artifactsEnabled===true&&Array.isArray(cfg.artifacts)&&cfg.artifacts.length){
      const prep=await gmPreloadSharedArtifacts(env,code,new Request('https://room.internal/gm/shared-artifacts',{method:'POST',headers:{authorization:'Bearer '+GM_SYNC_TOKEN,'content-type':'application/json'},body:JSON.stringify({assetIds:cfg.artifacts.map(a=>'artifact:'+String(a?.artifactId||''))})}));
      if(!prep.ok)return prep;
    }
    for(const roleId of [...new Set((template?.compiledConfig?.roles||[]).map(r=>String(r?.roleId||"")).filter(Boolean))].slice(0,100)){
      const ar=await memberStore(env).fetch("https://member.internal/game-templates/assets?id="+encodeURIComponent(id)+"&assetId="+encodeURIComponent("role:"+roleId));if(!ar.ok)continue;
      const d=await ar.json().catch(()=>null);if(d?.package)packages.push({...d.package,roleId})
    }
    return stub.fetch("https://room.internal/owner/apply-template",{method:"POST",headers:json,body:JSON.stringify({template,packages})})
  }
  return stub.fetch("https://room.internal/owner/"+action,{method:"POST",headers:json,body:JSON.stringify(body)})
}
