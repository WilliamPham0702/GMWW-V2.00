/**
 * Issue #773, Cloudflare B only, isolated encrypted archive Worker.
 * No Production A calls, no automatic failover, no Pages or DNS configuration.
 * Requires independently provisioned B secrets and explicit enable flag.
 * Never stores plaintext; this is NOT a Production data backup by itself.
 */
import {DurableObject} from 'cloudflare:workers';
import {openBackupChunk} from './production-backup-envelope.mjs';
import {archiveIds,archiveSourceAllowed,archiveScope,archiveWriteDecision,
  compareArchiveSecret} from './b-backup-archive-policy.mjs';

const MAX_BODY=100000;
function j(value,status=200){
  return new Response(JSON.stringify(value),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff'
  }});
}
async function limitedJson(request) {
  const advertised=Number(request.headers.get('content-length')||0);
  if(advertised>MAX_BODY)throw Error('BACKUP_BODY_TOO_LARGE');
  const chunks=[];let size=0;
  const reader=request.body?.getReader();
  if(!reader)throw Error('BACKUP_BODY_REQUIRED');
  try {
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>MAX_BODY)throw Error('BACKUP_BODY_TOO_LARGE');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(()=>{});
  }
  const bytes=new Uint8Array(size);
  let offset=0;
  for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
function authorized(request,env){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer '))return false;
  return compareArchiveSecret(header.slice(7),env.GMWW_B_BACKUP_INGEST_KEY);
}
function enabled(env){
  return env.GMWW_B_BACKUP_ENABLED==='1'&&
    typeof env.GMWW_A_B_ARCHIVE_KEY==='string'&&
    typeof env.GMWW_B_BACKUP_INGEST_KEY==='string'&&
    typeof env.GMWW_B_BACKUP_SOURCE_SHA==='string';
}
function doStub(env,backupId,objectDigest){
  return env.BACKUP_ARCHIVE.get(env.BACKUP_ARCHIVE.idFromName(archiveIds(backupId,objectDigest)));
}
function safeHeaders(body){
  return {method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(body)};
}
export class BackupArchiveDO extends DurableObject {
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(request.method!=='POST')return j({ok:false,error:'METHOD_NOT_ALLOWED'},405);
    const body=await request.json().catch(()=>null);
    if(!body||!body.ids||!body.ids.backupId||!body.ids.objectDigest)
      return j({ok:false,error:'INVALID_ARCHIVE_REQUEST'},400);
    let scope;
    try{archiveIds(body.ids.backupId,body.ids.objectDigest);}catch{return j({ok:false,error:'INVALID_ARCHIVE_IDS'},400);}
    const key='chunk:'+String(body.index);
    if(path==='/internal/put'){
      try {
        const envelope=body.envelope;
        scope=archiveScope(envelope?.metadata);
        if(scope.backupId!==body.ids.backupId||scope.objectDigest!==body.ids.objectDigest||
           !Number.isSafeInteger(body.index)||body.index<0||body.index>=scope.count||
           envelope.metadata.index!==body.index)
          throw Error('ARCHIVE_SCOPE_INVALID');
        const state=await this.ctx.storage.transaction(async tx=>{
          const previousScope=await tx.get('scope');
          const previousChunk=await tx.get(key);
          const action=archiveWriteDecision(scope,previousScope,previousChunk,envelope);
          if(action==='SCOPE_CONFLICT'||action==='IMMUTABLE_CONFLICT')return action;
          if(action==='UNCHANGED')return action;
          if(!previousScope)await tx.put('scope',scope);
          await tx.put(key,envelope);
          const stored=Number(await tx.get('storedCount')||0);
          await tx.put('storedCount',stored+1);
          return action;
        });
        if(state==='SCOPE_CONFLICT'||state==='IMMUTABLE_CONFLICT')
          return j({ok:false,error:state},409);
        return j({ok:true,result:state,productionSwitchAllowed:false});
      }catch{return j({ok:false,error:'INVALID_ARCHIVE_ENVELOPE'},400);}
    }
    if(path==='/internal/status'){
      const storedScope=await this.ctx.storage.get('scope');
      if(!storedScope||storedScope.backupId!==body.ids.backupId||
         storedScope.objectDigest!==body.ids.objectDigest)
        return j({ok:false,error:'ARCHIVE_NOT_FOUND'},404);
      const storedCount=Number(await this.ctx.storage.get('storedCount')||0);
      return j({ok:true,count:storedCount,expected:storedScope.count,
        complete:storedCount===storedScope.count,
        sourceSha:storedScope.sourceSha,revision:storedScope.revision,
        productionSwitchAllowed:false,failoverReady:false});
    }
    if(path==='/internal/read'){
      if(!Number.isSafeInteger(body.index)||body.index<0||body.index>1023)
        return j({ok:false,error:'BAD_INDEX'},400);
      const storedScope=await this.ctx.storage.get('scope');
      if(!storedScope||storedScope.backupId!==body.ids.backupId||
         storedScope.objectDigest!==body.ids.objectDigest)
        return j({ok:false,error:'ARCHIVE_NOT_FOUND'},404);
      const envelope=await this.ctx.storage.get(key);
      return envelope?j({ok:true,envelope}):j({ok:false,error:'CHUNK_NOT_FOUND'},404);
    }
    return j({ok:false,error:'NOT_FOUND'},404);
  }
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/health'&&request.method==='GET')
      return j({ok:true,environment:'cloudflare-b',mode:'backup-archive-isolated',
        productionSwitchAllowed:false,failoverReady:false,productionDataConnected:false});
    if(!['/v1/chunk','/v1/status','/v1/ciphertext'].includes(url.pathname))
      return j({ok:false,error:'NOT_FOUND'},404);
    if(!enabled(env))return j({ok:false,error:'BACKUP_NOT_CONFIGURED'},503);
    if(!authorized(request,env))return j({ok:false,error:'UNAUTHORIZED'},401);
    try {
      if(url.pathname==='/v1/chunk'){
        if(request.method!=='POST')return j({ok:false,error:'METHOD_NOT_ALLOWED'},405);
        const envelope=await limitedJson(request);
        const meta=envelope?.metadata;
        if(!archiveSourceAllowed(meta,env.GMWW_B_BACKUP_SOURCE_SHA))
          return j({ok:false,error:'SOURCE_SHA_OR_ROOM_STATE_INVALID'},403);
        // Authenticate both ciphertext and metadata before any storage write.
        const opened=await openBackupChunk(envelope,env.GMWW_A_B_ARCHIVE_KEY);
        opened.plaintext.fill(0); // Verification buffer is not persisted.
        const ids={backupId:meta.backupId,objectDigest:meta.objectDigest};
        return doStub(env,ids.backupId,ids.objectDigest).fetch(
          'https://archive.internal/internal/put',safeHeaders({ids,index:meta.index,envelope}));
      }
      if(request.method!=='GET')return j({ok:false,error:'METHOD_NOT_ALLOWED'},405);
      const ids={backupId:url.searchParams.get('backupId'),objectDigest:url.searchParams.get('objectDigest')};
      archiveIds(ids.backupId,ids.objectDigest);
      if(url.pathname==='/v1/status')
        return doStub(env,ids.backupId,ids.objectDigest).fetch(
          'https://archive.internal/internal/status',safeHeaders({ids}));
      const index=Number(url.searchParams.get('index'));
      if(!Number.isSafeInteger(index)||index<0||index>1023)
        return j({ok:false,error:'BAD_INDEX'},400);
      return doStub(env,ids.backupId,ids.objectDigest).fetch(
        'https://archive.internal/internal/read',safeHeaders({ids,index}));
    } catch {
      return j({ok:false,error:'ARCHIVE_REQUEST_REJECTED'},400);
    }
  }
};
