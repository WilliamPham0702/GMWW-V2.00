// Artwork-only changes must leave gameplay, dependencies and persisted mappings unchanged.
const policyPaths=new Set([
 '.github/scripts/verify-icon-artwork-production.mjs','.github/scripts/icon-artwork-scope.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/prepare-runtime-v3202-candidate.yml','.github/workflows/check-player-web.yml','.github/workflows/deploy-production.yml',
 '.github/workflows/build-server-game-ipa.yml','.github/workflows/check-dual-renderer.yml',
 'tests/icon-artwork-ci.test.mjs','docs/superpowers/plans/2026-10-26-approved-icon-artwork.md'
]);
export function isIconArtworkPolicyScope(changes){
 const paths=new Set(changes?.map(x=>x.path));
 return paths.has('.github/scripts/icon-artwork-scope.mjs')&&paths.has('.github/scripts/ci-browser-scope.mjs')&&paths.has('tests/icon-artwork-ci.test.mjs')&&changes.every(x=>policyPaths.has(x.path)&&['A','M'].includes(x.status));
}
function normalizePicture(s){
 return s.replace("'action-icons/v3/'+encodeURIComponent(icon.assetId.replace(/\\.png$/,'.webp'))", "'action-icons/v2/'+encodeURIComponent(icon.assetId)");
}
function normalizeRuntime(s){
 return s.replace(/const VERSION='[0-9.]+';/,"const VERSION='VERSION';")
 .replace("assetId:'50_yeu_tinh_xoay.png',image:'',isRotation:true","assetId:'',image:'',isRotation:true")
 .replace("const visual=icon.isRotation?'<span class=\"gmww-icon-rotation\" aria-hidden=\"true\">🔄</span>':\n    ","const visual=");
}
const safeFiles=new Set(['tests/icon-artwork-v3.test.mjs','tests/action-icon-library.test.mjs','tests/gmww-action-icons-in-battle.test.mjs','tests/gmww-action-icon-stacking.test.mjs','tools/icons/package-approved-artwork.py']);
export function isIconArtworkScope(changes){
 if(!Array.isArray(changes)||!changes.length)return false;
 const paths=new Set(changes.map(x=>x.path));
 if(!paths.has('server-game/current/action-icon-library.js')||!paths.has('assets/action-icons/v3/manifest.json'))return false;
 if(!changes.some(x=>/^assets\/action-icons\/v3\/\d{2}_[a-z_]+\.webp$/.test(x.path)))return false;
 for(const {path,before,after,status} of changes){
  if(!['A','M'].includes(status))return false;
  if(/^(assets|server-game\/current)\/action-icons\/v3\/(\d{2}_[a-z_]+\.webp|manifest\.json)$/.test(path))continue;
  if(safeFiles.has(path)||/^docs\/releases\/GMWW-V3\.\d+-approved-icons-20261026\.md$/.test(path))continue;
  if(typeof before!=='string'||typeof after!=='string')return false;
  if(path==='server-game/current/action-icon-library.js'){
   if(!after.includes("'action-icons/v3/'")||normalizePicture(before)!==normalizePicture(after))return false;
  }else if(['server-game/current/app.js','server-game/src/00-core-and-library.part','server-game/src/40-battle-and-timeline.part'].includes(path)){
   if(normalizeRuntime(before)!==normalizeRuntime(after))return false;
  }else if(path==='src/index.js'){
   const norm=s=>s.replace(/\bVERSION="V[0-9.]+"/,'VERSION="VERSION"').replace(/UPDATE_CHANNEL_REV="runtime-\d+"/,'UPDATE_CHANNEL_REV="REV"');
   if(norm(before)!==norm(after))return false;
  }else if(path==='server-game/current/GMWW.html'){
   const norm=s=>s.replace(/<title>GMWW V[0-9.]+<\/title>/,'<title>GMWW VERSION</title>').replace(/action-icon-library\.js\?v=[^"<>]+/,'action-icon-library.js?v=ART');
   if(norm(before)!==norm(after))return false;
  }else if(path==='package.json'||path==='package-lock.json'){
   try{const norm=s=>{const o=JSON.parse(s);o.version='VERSION';if(o.packages?.[''])o.packages[''].version='VERSION';return JSON.stringify(o)};if(norm(before)!==norm(after))return false}catch{return false}
  }else if(path==='.github/scripts/prepare-update-channel.mjs'){
   if(after.replace(/(releaseNotes:\[)"V3\.\d+: Bộ icon minh họa[^"\n]*",/,'$1')!==before)return false;
  }else return false;
 }
 return true;
}
