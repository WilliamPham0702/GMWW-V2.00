/* Do not advertise an OTA until its immutable assets are readable on this edge.
 * Missing assets are a publishing state, not a broken installed game. */
export async function isRuntimePackageReady({assets,requestUrl,manifest,version}={}){
  if(!assets?.fetch||String(manifest?.releaseVersion||'')!==String(version||'')||
     String(manifest?.runtimeVersion||'')!==String(version||'')||
     String(manifest?.releaseType||'')!=='runtime')return false;
  const files=manifest?.runtime?.files;
  if(!Array.isArray(files)||files.length===0)return false;
  const expected={
    'GMWW.html':'text/html',
    'app.js':'javascript',
    'style.css':'text/css'
  };
  for(const [path,mime] of Object.entries(expected)){
    const candidates=files.filter(file=>file?.path===path);
    if(candidates.length!==1)return false;
    const file=candidates[0];
    if(!/^[a-f0-9]{64}$/i.test(String(file.sha256||'')))return false;
    const target=new URL('/updates/runtime/V'+version+'/'+path,requestUrl);
    try{
      const published=new URL(file.url);
      if(published.protocol!=='https:'||published.pathname!==target.pathname)return false;
      const response=await assets.fetch(new Request(target.toString(),{
        method:'GET',headers:{'cache-control':'no-cache'}
      }));
      if(!response.ok)return false;
      const type=String(response.headers.get('content-type')||'').toLowerCase();
      // Guard against SPA fallback returning HTML for a missing JS/CSS asset.
      if(!type.includes(mime))return false;
      if(response.body)await response.body.cancel();
    }catch{return false}
  }
  return true;
}
