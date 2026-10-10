/* The same immutable ASSETS binding must verify a release before the app is
 * told that it can install. Public diagnostics only expose safe failure codes
 * and release asset paths, never response bodies or credentials. */
const ESSENTIAL={
  'GMWW.html':'text/html',
  'app.js':'javascript',
  'style.css':'text/css',
  'character-renderer.js':'javascript',
  'character-renderer.css':'text/css',
  'gm/gm-white-wolf.webp':'image/webp',
  'home-art/home-fantasy-hero-v337.webp':'image/webp',
  'home-art/home-v1-book.webp':'image/webp',
  'home-art/home-v1-members.webp':'image/webp',
  'home-art/home-v1-action.webp':'image/webp'
};
const failure=(code,asset=null)=>({ready:false,code,asset});
export async function diagnoseRuntimePackage({assets,requestUrl,manifest,version}={}){
  if(!assets?.fetch)return failure('ASSETS_BINDING_UNAVAILABLE');
  if(String(manifest?.releaseVersion||'')!==String(version||'')||
     String(manifest?.runtimeVersion||'')!==String(version||'')||
     String(manifest?.releaseType||'')!=='runtime')return failure('MANIFEST_VERSION_MISMATCH');
  const files=manifest?.runtime?.files;
  if(!Array.isArray(files)||files.length===0)return failure('MANIFEST_FILES_MISSING');
  for(const [path,mime] of Object.entries(ESSENTIAL)){
    const candidates=files.filter(file=>file?.path===path);
    if(candidates.length!==1)return failure('REQUIRED_FILE_NOT_LISTED',path);
    const file=candidates[0];
    if(!/^[a-f0-9]{64}$/i.test(String(file.sha256||'')))return failure('INVALID_SHA256',path);
    try{
      const target=new URL('/updates/runtime/V'+version+'/'+path,requestUrl);
      const published=new URL(file.url);
      if(published.protocol!=='https:'||published.origin!==target.origin||
         published.pathname!==target.pathname)return failure('FILE_URL_MISMATCH',path);
      const response=await assets.fetch(new Request(target.toString(),{
        method:'GET',headers:{'cache-control':'no-cache'}
      }));
      if(!response.ok)return failure('PUBLISHED_FILE_UNAVAILABLE',path);
      const type=String(response.headers.get('content-type')||'').toLowerCase();
      if(!type.includes(mime))return failure('PUBLISHED_MIME_MISMATCH',path);
      const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
      const observed=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
      if(observed!==String(file.sha256).toLowerCase())return failure('PUBLISHED_SHA256_MISMATCH',path);
    }catch{return failure('PUBLISHED_FILE_FETCH_ERROR',path)}
  }
  return {ready:true,code:'RUNTIME_READY',asset:null};
}
export async function isRuntimePackageReady(args={}){
  return (await diagnoseRuntimePackage(args)).ready;
}
