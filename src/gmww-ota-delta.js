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

/** Verified minimal patches for V3.51/V3.52 -> V3.53 on the V3.17 IPA.
 * Missing or unsafe hashes/urls, unknown base, mismatched release: fall back to full manifest.
 * Native Swift copies the previous runtime before overlaying these files.
 */
export function selectVerifiedRuntimeV353Delta(manifest,installedVersion){
  const from=String(installedVersion||'').trim().replace(/^V/i,'');
  if(!['3.51','3.52'].includes(from)||String(manifest?.releaseVersion||'')!=='3.53'
    ||String(manifest?.runtimeVersion||'')!=='3.53'||String(manifest?.shellVersion||'')!=='3.17'
    ||manifest?.releaseType!=='runtime'||!Array.isArray(manifest?.runtime?.files)
    ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
  const paths=['GMWW.html','app.js','style.css',...(from==='3.51'?['home-art/home-sea-portal-v352.svg']:[])];
  const selected=[];
  for(const path of paths){
    const matched=manifest.runtime.files.filter(f=>f?.path===path);
    if(matched.length!==1)return null;
    const file=matched[0];
    const expected=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.53/'+path;
    if(String(file?.url||'')!==expected||!/^[a-f0-9]{64}$/i.test(String(file?.sha256||'')))return null;
    selected.push({path,url:expected,sha256:String(file.sha256).toLowerCase()});
  }
  return {...manifest,runtime:{...manifest.runtime,files:selected},delete:[],
    optimizedFromVersion:from,upgradeMode:'verified-overlay',
    message:'Đồng bộ thanh bước GM với timeline phía trên; giữ nguyên dữ liệu và artwork.'};
}

/** Verified minimal V3.51/V3.52/V3.53 -> V3.54 homepage artwork overlay. */
export function selectVerifiedRuntimeV354Delta(manifest,installedVersion){
  const current=String(installedVersion||'').trim().replace(/^V/i,'');
  if(!['3.51','3.52','3.53'].includes(current)||String(manifest?.releaseVersion||'')!=='3.54'
    ||String(manifest?.runtimeVersion||'')!=='3.54'||String(manifest?.shellVersion||'')!=='3.17'
    ||manifest?.releaseType!=='runtime'||!Array.isArray(manifest?.runtime?.files)
    ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
  const names=['GMWW.html','app.js','style.css',...(current==='3.51'?['home-art/home-sea-portal-v352.svg']:[]),'home-art/home-sea-portal-v354.svg',
   'home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg'];
  const selected=[];
  for(const path of names){
    const found=manifest.runtime.files.filter(f=>f?.path===path);
    if(found.length!==1)return null;
    const value=found[0],url=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.54/'+path;
    if(value.url!==url||!/^[a-f0-9]{64}$/i.test(String(value.sha256||'')))return null;
    selected.push({path,url,sha256:String(value.sha256).toLowerCase()});
  }
  return {...manifest,runtime:{...manifest.runtime,files:selected},delete:[],
    optimizedFromVersion:current,upgradeMode:'verified-overlay',
    message:'Cập nhật V3.54 gồm 4 hình biển và đồng bộ tiến trình GM; bảo toàn dữ liệu người dùng.'};
}

/** Safe lightweight V3.57 -> V3.58 UI-only update, preserving all game media and storage. */
export function selectVerifiedRuntimeV358Delta(manifest,installedVersion){
  const current=String(installedVersion||'').trim().replace(/^V/i,'');
  if(current!=='3.57'||String(manifest?.releaseVersion||'')!=='3.58'
    ||String(manifest?.runtimeVersion||'')!=='3.58'||String(manifest?.shellVersion||'')!=='3.17'
    ||manifest?.releaseType!=='runtime'||!Array.isArray(manifest?.runtime?.files)
    ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
  const files=[];
  for(const path of ['GMWW.html','app.js','style.css']){
    const matches=manifest.runtime.files.filter(f=>f?.path===path);
    if(matches.length!==1)return null;
    const file=matches[0];
    const expected=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.58/'+path;
    if(String(file.url||'')!==expected||!/^[a-f0-9]{64}$/i.test(String(file.sha256||'')))return null;
    files.push({path,url:expected,sha256:String(file.sha256).toLowerCase()});
  }
  return {...manifest,runtime:{...manifest.runtime,files},delete:[],
    optimizedFromVersion:'3.57',upgradeMode:'verified-overlay',
    message:'Hiển thị đầy đủ 14 công cụ bảo trì dạng lưới; giữ nguyên dữ liệu và artwork.'};
}

/** Safe 3-file overlay from installed V3.58 to V3.59 (native shell V3.17). */
export function selectVerifiedRuntimeV359Delta(manifest,installedVersion){
  const current=String(installedVersion||'').trim().replace(/^V/i,'');
  if(current!=='3.58'||String(manifest?.releaseVersion||'')!=='3.59'
    ||String(manifest?.runtimeVersion||'')!=='3.59'||String(manifest?.shellVersion||'')!=='3.17'
    ||manifest?.releaseType!=='runtime'||!Array.isArray(manifest?.runtime?.files)
    ||(Array.isArray(manifest?.delete)&&manifest.delete.length>0))return null;
  const files=[];
  for(const path of INCREMENTAL_FILES){
    const matches=manifest.runtime.files.filter(f=>f?.path===path);
    if(matches.length!==1)return null;
    const file=matches[0];
    const expected=TRUSTED_ASSET_ORIGIN+'/updates/runtime/V3.59/'+path;
    if(String(file.url||'')!==expected||!/^[a-f0-9]{64}$/i.test(String(file.sha256||'')))return null;
    files.push({path,url:expected,sha256:String(file.sha256).toLowerCase()});
  }
  return {...manifest,runtime:{...manifest.runtime,files},delete:[],
    optimizedFromVersion:'3.58',upgradeMode:'verified-overlay',
    message:'V3.59: Chọn Ván 300 giây, cấu hình hạn mức Artifact, thẻ ★ vuốt ngang, nhãn nhân vật gọn.'};
}
