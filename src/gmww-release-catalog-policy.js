// Catalog is generated from the bytes shipped with this Worker. Its checksum is
// an integrity check, not a signature or substitute for the native file checks.
const ORIGIN='https://gmww-v2-00.williampham0702.workers.dev';
const CORE=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css','gm/gm-white-wolf.webp','home-art/home-fantasy-hero-v337.webp','home-art/home-v1-book.webp','home-art/home-v1-members.webp','home-art/home-v1-action.webp'];
const hashPattern=/^[a-f0-9]{64}$/;
async function digest(bytes){
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function valid(manifest,version,shell){
  if(!/^\d+(?:\.\d+)+$/.test(String(version))||!/^\d+(?:\.\d+)+$/.test(String(shell))||manifest?.schema!==1||
    manifest.releaseType!=='runtime'||manifest.releaseVersion!==version||
    manifest.runtimeVersion!==version||manifest.shellVersion!==shell||
    manifest.minimumShellVersion!==shell||!Array.isArray(manifest.delete)||manifest.delete.length)return false;
  const files=manifest.runtime?.files;
  if(!Array.isArray(files)||!files.length)return false;
  const seen=new Set();
  for(const file of files){
    const path=file?.path;
    if(typeof path!=='string'||!path||path.split('/').some(s=>!s||s==='.'||s==='..')||
      /[\\%?#\x00-\x1f]/.test(path)||seen.has(path)||!hashPattern.test(file.sha256))return false;
    const expected=ORIGIN+'/updates/runtime/V'+version+'/'+path.split('/').map(encodeURIComponent).join('/');
    if(file.url!==expected)return false;
    seen.add(path);
  }
  return CORE.every(path=>seen.has(path));
}
export async function buildReleaseCatalog(manifest,readFile){
  // Snapshot before awaiting to prevent mutation between verification and hashing.
  const snapshot=JSON.parse(JSON.stringify(manifest));
  if(!valid(snapshot,snapshot.releaseVersion,snapshot.shellVersion))throw Error('Invalid release catalog metadata');
  for(const file of snapshot.runtime.files){
    if(await digest(await readFile(file.path))!==file.sha256)throw Error('Catalog checksum mismatch: '+file.path);
  }
  return {schema:1,manifest:snapshot,sha256:await digest(new TextEncoder().encode(JSON.stringify(snapshot)))};
}
export async function selectBuildVerifiedManifest(catalog,version,shell){
  try{
    if(catalog?.schema!==1||!hashPattern.test(catalog.sha256)||!valid(catalog.manifest,version,shell))return null;
    const snapshot=JSON.parse(JSON.stringify(catalog.manifest));
    if(await digest(new TextEncoder().encode(JSON.stringify(snapshot)))!==catalog.sha256)return null;
    return snapshot;
  }catch{return null}
}
