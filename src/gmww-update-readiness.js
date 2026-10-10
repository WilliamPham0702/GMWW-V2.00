/* Never advertise an OTA before critical immutable files are readable and match
 * their manifest SHA-256 on the same ASSETS binding that serves download URLs. */
export async function isRuntimePackageReady({assets,requestUrl,manifest,version}={}){
  if(!assets?.fetch||String(manifest?.releaseVersion||'')!==String(version||'')||
     String(manifest?.runtimeVersion||'')!==String(version||'')||
     String(manifest?.releaseType||'')!=='runtime')return false;
  const files=manifest?.runtime?.files;
  if(!Array.isArray(files)||files.length===0)return false;
  const essential={
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
  if(String(version||'')==='3.82'){
    essential['gmww-ai-support.js']='javascript';
    essential['gmww-ai-support.css']='text/css';
  }
  // Files must be on the published version path, never an old or unrelated host.
  for(const [path,mime] of Object.entries(essential)){
    const candidates=files.filter(file=>file?.path===path);
    if(candidates.length!==1)return false;
    const file=candidates[0];
    if(!/^[a-f0-9]{64}$/i.test(String(file.sha256||'')))return false;
    const target=new URL('/updates/runtime/V'+version+'/'+path,requestUrl);
    try{
      const published=new URL(file.url);
      if(published.protocol!=='https:'||published.origin!==target.origin||
         published.pathname!==target.pathname)return false;
      const response=await assets.fetch(new Request(target.toString(),{
        method:'GET',headers:{'cache-control':'no-cache'}
      }));
      if(!response.ok)return false;
      const type=String(response.headers.get('content-type')||'').toLowerCase();
      // A missing static JS or CSS route can return HTML with HTTP 200.
      if(!type.includes(mime))return false;
      const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
      const observed=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
      if(observed!==String(file.sha256).toLowerCase())return false;
    }catch{return false}
  }
  return true;
}
