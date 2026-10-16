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
  // Validate all immutable metadata before touching the asset binding.
  const required=[];
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
    }catch{return false}
    required.push({path,mime,sha256:String(file.sha256).toLowerCase(),target});
  }
  // Cloudflare edges and phones can reach different caches. Verifying ten
  // immutable files sequentially on EVERY OTA check may exceed the installed
  // IPA's 6.5-second HTTP timeout, making a published Runtime appear pending.
  // Bound concurrency to four and retry a transient failed asset fetch once;
  // never accept a wrong MIME type or SHA-256 digest.
  const verifyOne=async({path,mime,sha256,target})=>{
    for(let attempt=0;attempt<2;attempt++){
      try{
        const response=await assets.fetch(new Request(target.toString(),{
          method:'GET',headers:{'cache-control':'no-cache'}
        }));
        if(!response.ok){if(attempt===0)continue;return false}
        const type=String(response.headers.get('content-type')||'').toLowerCase();
        if(!type.includes(mime))return false;
        const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
        const observed=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
        return observed===sha256;
      }catch{
        if(attempt===1)return false;
      }
    }
    return false;
  };
  let next=0,ready=true;
  await Promise.all(Array.from({length:Math.min(4,required.length)},async()=>{
    while(ready&&next<required.length){
      const file=required[next++];
      if(!await verifyOne(file)){ready=false;break}
    }
  }));
  return ready;
}
