/** Isolated Oracle STAGING SQLite adapter for SYNTHETIC snapshots only.
 * Not connected to Cloudflare Durable Objects, sessions, routing or game traffic. */
import {DatabaseSync} from 'node:sqlite';
import {lstat,readFile,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {verifySnapshot} from './room-adapter.mjs';
const MARKER='GMWW-ORACLE-STAGING-ONLY';
const DB='oracle-fixture-audit.sqlite';
const PRIVATE=/^(?:gmToken|gmTokenHash|passwordHash|passwordSalt|password|token|sessionToken|sessionId|refreshToken|authorization|cookie|secret|privateRole|roleAssignments|assignments|artifacts|cardBackImage)$/i;
function ensurePublic(value,depth=0){
  if(depth>18)throw Error('SNAPSHOT_TOO_DEEP');
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const v of value)ensurePublic(v,depth+1);return;}
  for(const [key,v] of Object.entries(value)){
    if(PRIVATE.test(key))throw Error('PRIVATE_FIXTURE_FIELD');
    ensurePublic(v,depth+1);
  }
}
function validate(snapshot){
  if(!verifySnapshot(snapshot))throw Error('INVALID_SNAPSHOT');
  ensurePublic(snapshot.data);
  const bytes=Buffer.byteLength(JSON.stringify(snapshot),'utf8');
  if(bytes>262144)throw Error('FIXTURE_TOO_LARGE');
  return JSON.stringify(snapshot);
}
export async function openOracleFixtureSqlite(root,env=process.env){
  if(env.GMWW_ORACLE_STAGING!=='1'||env.GMWW_ORACLE_FIXTURE_ONLY!=='1')
    throw Error('STAGING_FIXTURE_OPT_IN_REQUIRED');
  if(typeof root!=='string'||!root.startsWith('/')||root==='/')throw Error('INVALID_FIXTURE_ROOT');
  const stat=await lstat(root);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('INVALID_FIXTURE_DIRECTORY');
  const real=await realpath(root);
  if(real!==resolve(root))throw Error('SYMLINK_FIXTURE_DIRECTORY');
  const marker=await lstat(join(real,'.gmww-oracle-staging-only'));
  if(!marker.isFile()||marker.isSymbolicLink()||
    (await readFile(join(real,'.gmww-oracle-staging-only'),'utf8')).trim()!==MARKER)
    throw Error('STAGING_MARKER_REQUIRED');
  const file=join(real,DB);
  try{
    const current=await lstat(file);
    if(!current.isFile()||current.isSymbolicLink())throw Error('INVALID_SQLITE_FILE');
  }catch(error){if(error.code!=='ENOENT')throw error;}
  const db=new DatabaseSync(file,{timeout:2000});
  try{
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000;');
    db.exec('CREATE TABLE IF NOT EXISTS fixture_rooms (code TEXT PRIMARY KEY, revision INTEGER NOT NULL, digest TEXT NOT NULL, body TEXT NOT NULL)');
    const select=db.prepare('SELECT revision,digest,body FROM fixture_rooms WHERE code=?');
    const insert=db.prepare('INSERT INTO fixture_rooms (code,revision,digest,body) VALUES (?,?,?,?) ON CONFLICT(code) DO UPDATE SET revision=excluded.revision,digest=excluded.digest,body=excluded.body');
    let closed=false;
    function get(code){
      if(closed)throw Error('SQLITE_CLOSED');
      if(typeof code!=='string'||!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error('INVALID_ROOM_CODE');
      const row=select.get(code);
      if(!row)return null;
      let body;
      try{body=JSON.parse(row.body)}catch{throw Error('STORAGE_CORRUPT_JSON');}
      if(!verifySnapshot(body)||body.code!==code||
        body.revision!==row.revision||body.digest!==row.digest)
        throw Error('STORAGE_CORRUPT_CHECKSUM');
      ensurePublic(body.data);
      return body;
    }
    function put(snapshot){
      if(closed)throw Error('SQLITE_CLOSED');
      const body=validate(snapshot);
      db.exec('BEGIN IMMEDIATE');
      try{
        const prev=get(snapshot.code);
        if(prev){
          if(prev.digest===snapshot.digest){db.exec('COMMIT');return prev;}
          if(prev.revision>=snapshot.revision)throw Error('STALE_OR_CONFLICTING_REVISION');
        }
        insert.run(snapshot.code,snapshot.revision,snapshot.digest,body);
        db.exec('COMMIT');
        return snapshot;
      }catch(error){db.exec('ROLLBACK');throw error;}
    }
    function close(){if(!closed){closed=true;db.close();}}
    return Object.freeze({get,put,close,fixtureOnly:true,productionSwitchAllowed:false});
  }catch(error){db.close();throw error;}
}
