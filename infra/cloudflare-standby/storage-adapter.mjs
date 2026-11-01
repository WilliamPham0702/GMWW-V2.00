/** Cloudflare B synthetic-only local filesystem adapter. NOT a deployed backend. */
import {open,readFile,realpath,lstat,rename,unlink} from 'node:fs/promises';
import {join,sep,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {verifyFixtureProof} from './fixture-contract.mjs';

export const STANDBY_MARKER='GMWW-CF-B-STAGING-FIXTURE-ONLY-V1';
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
export async function openStandbyFixtureStore(root,{testKey}={}){
  if(process.env.GMWW_CLOUDFLARE_STANDBY!=='1'||process.env.GMWW_CF_STANDBY_FIXTURE_ONLY!=='1')
    throw Error('STANDBY_FIXTURE_OPT_IN_REQUIRED');
  if(typeof root!=='string'||!root.startsWith('/'))throw Error('ABSOLUTE_FIXTURE_DIR_REQUIRED');
  if((await lstat(root)).isSymbolicLink())throw Error('SYMLINK_ROOT_FORBIDDEN');
  const dir=await realpath(root);
  if(!dir.startsWith(resolve(tmpdir())+sep))throw Error('OUTSIDE_TEMP_FIXTURE_DIR');
  const marker=join(dir,'.gmww-cf-standby-fixture-only');
  const info=await lstat(marker);
  if(!info.isFile()||info.isSymbolicLink()||(await readFile(marker,'utf8')).trim()!==STANDBY_MARKER)
    throw Error('MISSING_STANDBY_MARKER');
  const filename=code=>{
    if(typeof code!=='string'||!CODE.test(code))throw Error('INVALID_ROOM_CODE');
    return join(dir,code+'.json');
  };
  async function read(code){
    const path=filename(code);
    let info;try{info=await lstat(path)}catch(error){if(error.code==='ENOENT')return null;throw error}
    if(!info.isFile()||info.isSymbolicLink())throw Error('INVALID_FIXTURE_PATH');
    const data=JSON.parse(await readFile(path,'utf8'));
    if(data?.payload?.roomCode!==code||!verifyFixtureProof(data,{testKey}))throw Error('CORRUPT_OR_UNAUTHENTICATED_FIXTURE');
    return data;
  }
  async function write(proof){
    if(!verifyFixtureProof(proof,{testKey}))throw Error('INVALID_SIGNED_FIXTURE');
    const path=filename(proof.payload.roomCode),lock=path+'.lock',tmp=path+'.'+randomUUID()+'.tmp';
    const guard=await open(lock,'wx',0o600);
    try{
      const prior=await read(proof.payload.roomCode);
      if(prior){
        if(prior.sha256===proof.sha256)return prior;
        if(proof.payload.revision<=prior.payload.revision)throw Error('STALE_OR_CONFLICTING_REVISION');
      }
      const stream=await open(tmp,'wx',0o600);
      try{await stream.writeFile(JSON.stringify(proof));await stream.sync()}finally{await stream.close()}
      await rename(tmp,path);
      return proof;
    }finally{
      await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e});
      await guard.close();
      await unlink(lock);
    }
  }
  return Object.freeze({read,write,fixtureOnly:true,productionWriteAllowed:false});
}
