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
