/* Signed recovery for legacy Runtime V3.38–V3.46 installed on IPA shell 3.17.
 * Used only when a full immutable manifest cannot be read at an edge. */
export async function recoverLegacyRuntimeManifest({assets,requestUrl,version,shellVersion,installedVersion}={}){
  if(!assets?.fetch||!['3.58','3.59','3.60','3.61','3.62','3.63','3.64','3.65','3.66','3.67'].includes(version)||shellVersion!=='3.17'||!['3.38','3.39','3.40','3.41','3.42','3.43','3.44','3.45','3.46','3.47','3.48','3.49'].includes(String(installedVersion).replace(/^V/i,'')))return null;
  const files=[];
  try{
    for(const path of ['GMWW.html','app.js','style.css','home-art/home-sea-portal-v354.svg','home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg']){
      const url=new URL('/updates/runtime/V'+version+'/'+path,requestUrl);
      const response=await assets.fetch(new Request(url.toString(),{method:'GET',headers:{'cache-control':'no-cache'}}));
      if(!response.ok)return null;
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength<32||bytes.byteLength>2000000)return null;
      const content=new TextDecoder().decode(bytes);
      if(path==='GMWW.html'&&!content.includes('<title>GMWW V'+version+'</title>'))return null;
      if(path==='app.js'&&!content.includes("const VERSION='"+version+"'"))return null;
      const hash=await crypto.subtle.digest('SHA-256',bytes);
      files.push({path,url:url.toString(),sha256:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')});
    }
    return {ok:true,schema:1,releaseVersion:version,releaseType:'runtime',runtimeVersion:version,
      serverVersion:version,webVersion:version,shellVersion,minimumShellVersion:shellVersion,
      required:false,restartRequired:true,recovery:true,runtime:{files},
      message:'Khôi phục cập nhật Runtime V'+version+' trên IPA V'+shellVersion+'.',checkedAt:new Date().toISOString()};
  }catch{return null}
}
