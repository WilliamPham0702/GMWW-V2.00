/**
 * Issue #773 / Stage 4C: portable encrypted backup chunk envelope.
 * Pure WebCrypto: no network, no Cloudflare account, no data collection.
 * Encryption keys are provisioned separately as Cloudflare Secrets; never in Git.
 * Caller must perform authoritative DO snapshot/export and safety checks first.
 */
const encoder = new TextEncoder();
const SCHEMA = 'gmww-a-b-encrypted-chunk-v1';
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const IDENT = /^[a-f0-9]{32}$/;
const META_FIELDS = ['backupId','objectDigest','sourceSha','revision','index','count','quiescent','connectedSockets'];
const KEYS = ['schema','metadata','nonce','ciphertext','cipherSha256'];
const MAX_PLAINTEXT = 65536;

function exactKeys(obj, keys) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).length === keys.length && keys.every(k => Object.hasOwn(obj,k));
}
export function normalizeBackupMeta(input) {
  if (!exactKeys(input,META_FIELDS) || !IDENT.test(input.backupId) ||
      !SHA64.test(input.objectDigest) || !SHA40.test(input.sourceSha) ||
      !Number.isSafeInteger(input.revision) || input.revision < 0 ||
      !Number.isSafeInteger(input.index) || !Number.isSafeInteger(input.count) ||
      input.count < 1 || input.count > 1024 ||
      input.index < 0 || input.index >= input.count ||
      input.quiescent !== true || input.connectedSockets !== 0)
    throw Error('BACKUP_CHECKPOINT_NOT_QUIESCENT_OR_INVALID');
  return {
    backupId:input.backupId,objectDigest:input.objectDigest,sourceSha:input.sourceSha,
    revision:input.revision,index:input.index,count:input.count,
    quiescent:true,connectedSockets:0
  };
}
function toBase64url(bytes) {
  let txt='';
  for(let i=0;i<bytes.length;i+=8192)
    txt+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(txt).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64url(value, maximum) {
  if(typeof value!=='string'||!value.length||value.length>maximum||
     !/^[A-Za-z0-9_-]+$/.test(value)) throw Error('BACKUP_INVALID_BASE64URL');
  const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
  const out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  if(toBase64url(out)!==value)throw Error('BACKUP_INVALID_BASE64URL');
  return out;
}
function toHex(buffer) {
  return Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,'0')).join('');
}
async function importArchiveKey(archiveKey, usage) {
  const key=fromBase64url(archiveKey,43);
  if(key.length!==32)throw Error('BACKUP_AES256_KEY_REQUIRED');
  return crypto.subtle.importKey('raw',key,{name:'AES-GCM'},false,[usage]);
}
function associatedData(metadata){
  return encoder.encode(JSON.stringify({schema:SCHEMA,metadata}));
}
export async function sealBackupChunk(plaintext, metadata, archiveKey) {
  const meta=normalizeBackupMeta(metadata);
  if(!(plaintext instanceof Uint8Array)||plaintext.length===0||plaintext.length>MAX_PLAINTEXT)
    throw Error('BACKUP_PLAINTEXT_CHUNK_SIZE_INVALID');
  const key=await importArchiveKey(archiveKey,'encrypt');
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt(
    {name:'AES-GCM',iv:nonce,additionalData:associatedData(meta),tagLength:128},
    key,plaintext));
  return {
    schema:SCHEMA,metadata:meta,nonce:toBase64url(nonce),
    ciphertext:toBase64url(ciphertext),
    cipherSha256:toHex(await crypto.subtle.digest('SHA-256',ciphertext))
  };
}
export async function openBackupChunk(envelope, archiveKey) {
  if(!exactKeys(envelope,KEYS)||envelope.schema!==SCHEMA||
     !SHA64.test(envelope.cipherSha256))throw Error('BACKUP_ENVELOPE_INVALID');
  const meta=normalizeBackupMeta(envelope.metadata);
  const nonce=fromBase64url(envelope.nonce,16);
  if(nonce.length!==12)throw Error('BACKUP_NONCE_INVALID');
  const ciphertext=fromBase64url(envelope.ciphertext,88000);
  if(ciphertext.length<17||ciphertext.length>MAX_PLAINTEXT+16)
    throw Error('BACKUP_CIPHERTEXT_SIZE_INVALID');
  if(toHex(await crypto.subtle.digest('SHA-256',ciphertext))!==envelope.cipherSha256)
    throw Error('BACKUP_CHECKSUM_MISMATCH');
  const key=await importArchiveKey(archiveKey,'decrypt');
  let plaintext;
  try {
    plaintext=new Uint8Array(await crypto.subtle.decrypt(
      {name:'AES-GCM',iv:nonce,additionalData:associatedData(meta),tagLength:128},
      key,ciphertext));
  } catch {
    throw Error('BACKUP_AUTHENTICATION_FAILED');
  }
  return {metadata:meta,plaintext};
}
export const BACKUP_ENVELOPE_SCHEMA=SCHEMA;
