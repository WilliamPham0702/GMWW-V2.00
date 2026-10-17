// The only assets exempted from the installed GMWW Runtime version gate.
// These two files are exclusively served by the read-only Character preview
// Worker; no GMWW server, IPA or Player Web imports these paths.
const previewOnlyAssets=new Set([
 'assets/characters/v5/test-skin-v562.html',
 'assets/characters/v5/skin-v562-original-sleeves.mjs'
]);
export function isV562IsolatedPreviewAsset(path){
 return previewOnlyAssets.has(String(path||'').trim());
}
