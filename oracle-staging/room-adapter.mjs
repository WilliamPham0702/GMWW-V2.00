/** Oracle STAGING fixture-only room snapshot adapter; never a production backend. */
import {createHash} from 'node:crypto';
import {open,readFile,realpath,lstat,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';

export const ROOM_SNAPSHOT_SCHEMA='gmww-oracle-staging-room-v1';
const MARKER='GMWW-ORACLE-STAGING-ONLY';
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
function roomCode(value){
  if(typeof value!=='string'||!CODE.test(value))throw new Error('INVALID_ROOM_CODE');
  return value;
}
function canonical(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
    const keys=Object.keys(value).sort();
    return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  }
  throw new Error('INVALID_SNAPSHOT_VALUE');
}
function sha(value){return createHash('sha256').update(value).digest('hex')}
export function snapshotFixture({code,revision,phase,matchId=null,activeMatch=false,sourceSha,engineVersion,data}){
  roomCode(code);
  if(!Number.isSafeInteger(revision)||revision<0)throw new Error('INVALID_REVISION');
  if(!['lobby','setup','ended','day','night'].includes(phase))throw new Error('INVALID_PHASE');
  if(typeof activeMatch!=='boolean'||(activeMatch&& !['day','night'].includes(phase)))throw new Error('INVALID_MATCH_STATE');
  if(!/^[a-f0-9]{40}$/.test(sourceSha||''))throw new Error('INVALID_SOURCE_SHA');
  if(typeof engineVersion!=='string'||!/^[A-Za-z0-9._-]{1,32}$/.test(engineVersion))throw new Error('INVALID_ENGINE_VERSION');
  if(data===null||!data||Array.isArray(data)||typeof data!=='object')throw new Error('INVALID_ROOM_DATA');
  const payload={schema:ROOM_SNAPSHOT_SCHEMA,code,revision,phase,matchId,activeMatch,sourceSha,engineVersion,data};
  return {...payload,digest:sha(canonical(payload))};
}
export function verifySnapshot(snapshot){
  try{
    const expected=['schema','code','revision','phase','matchId','activeMatch','sourceSha','engineVersion','data','digest'];
    if(!snapshot||snapshot.schema!==ROOM_SNAPSHOT_SCHEMA||Object.keys(snapshot).length!==expected.length||
       expected.some(key=>!Object.prototype.hasOwnProperty.call(snapshot,key)))return false;
    const {digest,...p}=snapshot;
    return typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest)&&
      snapshotFixture(p).digest===digest;
  }catch{return false}
}
/** Simulation only: never authorizes routing, DNS, token reuse or live failover. */
export function simulateFailover({primary,standby,gmApproved=false,activeSockets=0}={}){
  const blockers=[];
  if(!verifySnapshot(primary)||!verifySnapshot(standby))blockers.push('INVALID_OR_MISSING_SNAPSHOT');
  else {
    for(const key of ['schema','code','revision','sourceSha','engineVersion','digest'])
      if(primary[key]!==standby[key])blockers.push('MISMATCH_'+key.toUpperCase());
    if(primary.activeMatch||standby.activeMatch||!['lobby','setup','ended'].includes(primary.phase)||!['lobby','setup','ended'].includes(standby.phase))blockers.push('MATCH_ACTIVE');
    if(primary.matchId!==standby.matchId)blockers.push('MATCH_ID_MISMATCH');
  }
  if(!gmApproved)blockers.push('GM_APPROVAL_REQUIRED');
  if(!Number.isSafeInteger(activeSockets)||activeSockets!==0)blockers.push('CONNECTED_CLIENTS');
  return {simulationPass:blockers.length===0,productionSwitchAllowed:false,blockers};
}
/** Only for deliberately isolated test fixtures under an existing marked directory. */
export async function fixtureStore(root){
  if(process.env.GMWW_ORACLE_STAGING!=='1'||process.env.GMWW_ORACLE_FIXTURE_ONLY!=='1')throw new Error('STAGING_FIXTURE_OPT_IN_REQUIRED');
  if(typeof root!=='string'||!root.startsWith('/')||root==='/')throw new Error('UNSAFE_FIXTURE_ROOT');
  if((await lstat(root)).isSymbolicLink())throw new Error('SYMLINK_FIXTURE_ROOT');
  const dir=await realpath(root);
  const marker=await lstat(join(dir,'.gmww-oracle-staging-only'));
  if(!marker.isFile()||marker.isSymbolicLink()||(await readFile(join(dir,'.gmww-oracle-staging-only'),'utf8')).trim()!==MARKER)throw new Error('MISSING_STAGING_MARKER');
  const file=code=>join(dir,roomCode(code)+'.json');
  async function read(code){
    try{
      const p=file(code),st=await lstat(p);
      if(!st.isFile()||st.isSymbolicLink())throw new Error('INVALID_FIXTURE_FILE');
      const obj=JSON.parse(await readFile(p,'utf8'));
      if(!verifySnapshot(obj)||obj.code!==code)throw new Error('FIXTURE_CHECKSUM_MISMATCH');
      return obj;
    }catch(e){if(e.code==='ENOENT')return null;throw e}
  }
  async function write(snapshot){
    if(!verifySnapshot(snapshot))throw new Error('INVALID_SNAPSHOT');
    const path=file(snapshot.code),lock=path+'.lock',tmp=path+'.tmp';
    const lh=await open(lock,'wx',0o600);
    try{
      const previous=await read(snapshot.code);
      if(previous){
        if(previous.digest===snapshot.digest)return previous;
        if(previous.revision>=snapshot.revision)throw new Error('STALE_OR_CONFLICTING_REVISION');
      }
      const th=await open(tmp,'wx',0o600);
      try{await th.writeFile(JSON.stringify(snapshot));await th.sync()}finally{await th.close()}
      await rename(tmp,path);
      return snapshot;
    }finally{
      await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e});
      await lh.close();
      await unlink(lock);
    }
  }
  return Object.freeze({read,write});
}
