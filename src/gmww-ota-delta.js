/**
 * Lightweight native IPA upgrade, ONLY from the verified V3.50 Runtime to V3.51.
 * V3.50 -> V3.51 changed only the three source UI files (GMWW.html/app.js/style.css).
 * Native IPA V3.17 makes a complete copy of the active runtime first, and overlays files
 * listed here. Its bundled assets, artwork, themes, settings and data remain untouched.
 *
 * Always fail CLOSED (return null -> original full manifest) for any future release,
 * unknown base, modified deletions, missing SHA-256, or unexpected download URL.
 */
const TRUSTED_ASSET_ORIGIN='https://gmww-v2-00.williampham0702.workers.dev';
const INCREMENTAL_FILES=['GMWW.html','app.js','style.css'];

export function selectLegacyV350RuntimeDelta(manifest,installedVersion){
  const from=String(installedVersion||'').trim().replace(/^V/i,'');
  if(from!=='3.50'||String(manifest?.releaseVersion||'')!=='3.51'
      ||String(manifest?.runtimeVersion||'')!=='3.51'
      ||String(manifest?.shellVersion||'')!=='3.17'
      ||manifest?.releaseType!=='runtime'
      ||!Array.isArray(manifest?.runtime?.files)
      ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
  const matched=[];
  for(const path of INCREMENTAL_FILES){
    const entries=manifest.runtime.files.filter(f=>f?.path===path);
    if(entries.length!==1)return null;
    const file=entries[0];
    if(!/^[a-f0-9]{64}$/i.test(String(file.sha256||'')))return null;
    const expected=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.51/'+path;
    if(String(file.url||'')!==expected)return null;
    matched.push({path,url:expected,sha256:String(file.sha256).toLowerCase()});
  }
  return {
    ...manifest,
    runtime:{...manifest.runtime,files:matched},
    delete:[],
    optimizedFromVersion:'3.50',
    upgradeMode:'verified-overlay',
    message:'Cập nhật 3 tệp mới lên V3.51; giữ nguyên hình ảnh, dữ liệu và cài đặt.'
  };
}

/** Fail-closed verified overlay for installed V3.51 -> V3.52. */
export function selectVerifiedRuntimeV352Delta(manifest,installedVersion){
  const from=String(installedVersion||'').trim().replace(/^V/i,'');
  if(from!=='3.51'||String(manifest?.releaseVersion||'')!=='3.52'
      ||String(manifest?.runtimeVersion||'')!=='3.52'
      ||String(manifest?.shellVersion||'')!=='3.17'
      ||manifest?.releaseType!=='runtime'||!Array.isArray(manifest?.runtime?.files)
      ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
  const paths=['GMWW.html','app.js','style.css','home-art/home-sea-portal-v352.svg'];
  const found=[];
  for(const path of paths){
    const matches=manifest.runtime.files.filter(f=>f?.path===path);
    if(matches.length!==1)return null;
    const f=matches[0],expected=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.52/'+path;
    if(!/^[a-f0-9]{64}$/i.test(String(f.sha256||''))||f.url!==expected)return null;
    found.push({path,url:expected,sha256:String(f.sha256).toLowerCase()});
  }
  return {...manifest,runtime:{...manifest.runtime,files:found},delete:[],
    optimizedFromVersion:'3.51',upgradeMode:'verified-overlay',
    message:'Cập nhật Trang Chủ biển V3.52 bằng 4 tệp; giữ nguyên dữ liệu và cài đặt.'};
}

/** Fail-closed incremental artwork update for installed Runtime V3.52. */
export function selectVerifiedRuntimeV353Delta(manifest,installedVersion){
 const from=String(installedVersion||'').trim().replace(/^V/i,'');
 if(from!=='3.52'||String(manifest?.releaseVersion||'')!=='3.53'
   ||String(manifest?.runtimeVersion||'')!=='3.53'
   ||String(manifest?.shellVersion||'')!=='3.17'
   ||manifest?.releaseType!=='runtime'||!Array.isArray(manifest?.runtime?.files)
   ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
 const names=['GMWW.html','app.js','style.css','home-art/home-sea-portal-v353.svg',
  'home-art/home-sea-cards-v353.svg','home-art/home-sea-members-v353.svg',
  'home-art/home-sea-templates-v353.svg'];
 const selected=[];
 for(const path of names){
   const hits=manifest.runtime.files.filter(f=>f?.path===path);
   if(hits.length!==1)return null;
   const f=hits[0],url=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.53/'+path;
   if(f.url!==url||!/^[a-f0-9]{64}$/i.test(String(f.sha256||'')))return null;
   selected.push({path,url,sha256:String(f.sha256).toLowerCase()});
 }
 return {...manifest,runtime:{...manifest.runtime,files:selected},delete:[],optimizedFromVersion:'3.52',
  upgradeMode:'verified-overlay',message:'Cập nhật 4 artwork Trang Chủ biển V3.53 và giao diện, giữ nguyên dữ liệu và cài đặt.'};
}
