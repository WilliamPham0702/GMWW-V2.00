/**
 * Dual Cloudflare Phase 1: LOCAL, synthetic-only SQLite recovery adapter.
 * Not importable into Worker gameplay; never reaches A/B Cloudflare accounts.
 * A and B use separate test databases. No real users, roles, sessions or tokens.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {lstat,readFile,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {verifyFixtureProof,evaluateStandbyFixture} from './fixture-contract.mjs';

const MARKER='GMWW-CF-STANDBY-FIXTURE-ONLY';
const SCHEMA='gmww-cf-standby-recovery-checkpoint-v1';
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
const HEX=/^[a-f0-9]{64}$/;
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&
 keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const clone=v=>JSON.parse(JSON.stringify(v));
function keyCheck(key){
 if(typeof key!=='string'||Buffer.byteLength(key,'utf8')<32)throw Error('TEST_KEY_REQUIRED');
 return key;
}
function tag(data,key){
 return createHmac('sha256',keyCheck(key)).update(JSON.stringify(data)).digest('hex');
}
function equalHex(a,b){
 if(typeof a!=='string'||!HEX.test(a)||typeof b!=='string'||!HEX.test(b))return false;
 return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
function validProof(proof,testKey){
 if(Buffer.byteLength(JSON.stringify(proof),'utf8')>16384||
    !verifyFixtureProof(proof,{testKey}))throw Error('INVALID_OR_PRIVATE_FIXTURE_PROOF');
 return clone(proof);
}
function sealed(proof){
 const p=proof.payload;
 if(p.activeMatch||p.connectedSockets!==0||!['lobby','setup','ended'].includes(p.phase))
   throw Error('MATCH_OR_SOCKETS_STILL_ACTIVE');
}
function verifyCheckpoint(checkpoint,testKey){
 if(!exact(checkpoint,['schema','sourceAccount','targetAccount','proof','signature'])||
    checkpoint.schema!==SCHEMA||checkpoint.sourceAccount!=='A'||checkpoint.targetAccount!=='B')
   throw Error('INVALID_CHECKPOINT_ENVELOPE');
 const proof=validProof(checkpoint.proof,testKey);
 const body={schema:SCHEMA,sourceAccount:'A',targetAccount:'B',proof};
 if(!equalHex(checkpoint.signature,tag(body,testKey)))throw Error('CHECKPOINT_SIGNATURE_MISMATCH');
 return {body,proof};
}
export async function openSyntheticFixtureStore({root,account,testKey,fixtureOnly=false,env=process.env}={}){
 if(fixtureOnly!==true||env.GMWW_CF_STANDBY_FIXTURE_ONLY!=='1')
   throw Error('SYNTHETIC_STORAGE_OPT_IN_REQUIRED');
 if(!['A','B'].includes(account))throw Error('INVALID_ACCOUNT');
 keyCheck(testKey);
 if(typeof root!=='string'||!root.startsWith('/')||root==='/')throw Error('INVALID_STORAGE_ROOT');
 const dir=resolve(root),stat=await lstat(root);
 if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)
   throw Error('INSECURE_STORAGE_DIRECTORY');
 if(await realpath(root)!==dir)throw Error('STORAGE_SYMLINK_FORBIDDEN');
 const markerPath=join(dir,'.gmww-cloudflare-standby-only');
 const marker=await lstat(markerPath);
 if(!marker.isFile()||marker.isSymbolicLink()||
    (await readFile(markerPath,'utf8')).trim()!==MARKER)
   throw Error('STAGING_MARKER_REQUIRED');
 const path=join(dir,'synthetic-'+account+'.sqlite');
 for(const file of [path,path+'-wal',path+'-shm']){
   try {
     const f=await lstat(file);
     if(!f.isFile()||f.isSymbolicLink())throw Error('UNSAFE_SQLITE_FILE');
   }catch(error){if(error.code!=='ENOENT')throw error}
 }
 const db=new DatabaseSync(path,{timeout:2000});
 try{
   db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000;');
   db.exec('CREATE TABLE IF NOT EXISTS fixture_rooms (room TEXT PRIMARY KEY, revision INTEGER NOT NULL, digest TEXT NOT NULL, proof TEXT NOT NULL)');
   const get=db.prepare('SELECT revision,digest,proof FROM fixture_rooms WHERE room=?');
   const put=db.prepare('INSERT INTO fixture_rooms (room,revision,digest,proof) VALUES (?,?,?,?) ON CONFLICT(room) DO UPDATE SET revision=excluded.revision,digest=excluded.digest,proof=excluded.proof');
   let closed=false;
   function read(room){
     if(closed)throw Error('STORE_CLOSED');
     if(typeof room!=='string'||!CODE.test(room))throw Error('INVALID_ROOM_CODE');
     const row=get.get(room);
     if(!row)return null;
     let proof;
     try{proof=JSON.parse(row.proof)}catch{throw Error('CORRUPT_STORED_JSON')}
     try{validProof(proof,testKey)}catch{throw Error('CORRUPT_STORED_PROOF')}
     if(row.revision!==proof.payload.revision||row.digest!==proof.sha256||
        proof.payload.roomCode!==room)throw Error('CORRUPT_STORED_METADATA');
     return proof;
   }
   function atomicWrite(proof,expectedRevision){
     db.exec('BEGIN IMMEDIATE');
     try{
       const prev=read(proof.payload.roomCode);
       const oldRevision=prev?.payload.revision??null;
       if(oldRevision!==expectedRevision)throw Error('REVISION_CAS_MISMATCH');
       if(prev){
         if(prev.sha256===proof.sha256){db.exec('COMMIT');return {status:'UNCHANGED',revision:oldRevision};}
         if(proof.payload.revision<=oldRevision)throw Error('STALE_OR_DIVERGENT_REVISION');
         if(prev.payload.sourceSha!==proof.payload.sourceSha||
            prev.payload.engineVersion!==proof.payload.engineVersion)throw Error('ENGINE_IDENTITY_CHANGED');
       }
       put.run(proof.payload.roomCode,proof.payload.revision,proof.sha256,JSON.stringify(proof));
       db.exec('COMMIT');
       return {status:'STORED',revision:proof.payload.revision};
     }catch(e){db.exec('ROLLBACK');throw e}
   }
   function capture(proof,{expectedRevision=null}={}){
     if(account!=='A')throw Error('ONLY_A_MAY_CAPTURE');
     const checked=validProof(proof,testKey);
     return atomicWrite(checked,expectedRevision);
   }
   function exportCheckpoint(room){
     if(account!=='A')throw Error('ONLY_A_MAY_EXPORT');
     const proof=read(room);
     if(!proof)throw Error('MISSING_SOURCE_ROOM');
     const body={schema:SCHEMA,sourceAccount:'A',targetAccount:'B',proof};
     return clone({...body,signature:tag(body,testKey)});
   }
   function restoreCheckpoint(checkpoint,{expectedRevision=null,dryRun=true,confirmSyntheticRestore=false}={}){
     if(account!=='B')throw Error('ONLY_B_MAY_RESTORE');
     const {proof}=verifyCheckpoint(checkpoint,testKey);
     sealed(proof);
     const prev=read(proof.payload.roomCode);
     const oldRevision=prev?.payload.revision??null;
     if(oldRevision!==expectedRevision)throw Error('REVISION_CAS_MISMATCH');
     if(prev&&(prev.sha256!==proof.sha256&&proof.payload.revision<=oldRevision))
       throw Error('STALE_OR_DIVERGENT_REVISION');
     if(prev&&(prev.payload.sourceSha!==proof.payload.sourceSha||
       prev.payload.engineVersion!==proof.payload.engineVersion))throw Error('ENGINE_IDENTITY_CHANGED');
     if(dryRun!==false)return {status:'DRY_RUN_OK',revision:proof.payload.revision,productionSwitchAllowed:false};
     if(confirmSyntheticRestore!==true)throw Error('SYNTHETIC_RESTORE_CONFIRMATION_REQUIRED');
     const res=atomicWrite(proof,expectedRevision);
     return {...res,productionSwitchAllowed:false};
   }
   function close(){if(!closed){closed=true;db.close()}}
   return Object.freeze({account,syntheticOnly:true,productionSwitchAllowed:false,
     read,capture,exportCheckpoint,restoreCheckpoint,close});
 }catch(error){db.close();throw error}
}
export function reconcileSyntheticStores(a,b,room,{testKey}={}){
 if(a.account!=='A'||b.account!=='B'||!a.syntheticOnly||!b.syntheticOnly)
   throw Error('INVALID_STANDBY_ACCOUNT_PAIR');
 const primary=a.read(room),standby=b.read(room);
 return evaluateStandbyFixture({primary,standby,testKey,gmApproved:false,loginSessionE2E:false,websocketE2E:false});
}
