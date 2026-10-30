// Exact share blocks only; all existing HTML and scripts must remain byte-identical.
export const sharePolicyPaths=new Set([
 '.github/workflows/github-runtime-ota.yml','.github/scripts/gm-player-share-scope.mjs','.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml','.github/workflows/build-server-game-ipa.yml',
 '.github/workflows/prepare-runtime-v3202-candidate.yml','.github/workflows/check-gallows-redesign.yml',
 '.github/workflows/check-gm-free-icons-501.yml','.github/workflows/deploy-production.yml',
 'tests/gm-player-share-ci.test.mjs','docs/releases/GMWW-PLAYER-SHARE-CI-20261030.md'
]);
const featurePaths=new Set(['server-game/current/GMWW.html','tests/gm-player-web-share-link.test.mjs',
 '.github/workflows/check-gm-player-link-share.yml','tests/gm-player-web-share-browser.mjs',
 'docs/releases/GMWW-PLAYER-SHARE-20261030.md']);
function strip(source){
 if(typeof source!=='string')return null;
 let result=source;
 for(const kind of ['STYLE','UI','SCRIPT']){
  const begin='BEGIN GMWW_PLAYER_SHARE_'+kind,end='END GMWW_PLAYER_SHARE_'+kind;
  if(!result.includes(begin)&&!result.includes(end))continue;
  if(result.split(begin).length!==2||result.split(end).length!==2)return null;
  const re=kind==='STYLE'?/\n\n<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->[\s\S]*?<!-- END GMWW_PLAYER_SHARE_STYLE -->/:kind==='UI'?/        <!-- BEGIN GMWW_PLAYER_SHARE_UI -->[\s\S]*?<!-- END GMWW_PLAYER_SHARE_UI -->\n/:/\n<script>\n\/\* BEGIN GMWW_PLAYER_SHARE_SCRIPT \*\/[\s\S]*?\/\* END GMWW_PLAYER_SHARE_SCRIPT \*\/\n<\/script>\n\n/;
  if(!re.test(result))return null;
  result=result.replace(re,'');
 }
 return result;
}
export function gmPlayerShareScope(changes){
 if(!Array.isArray(changes)||!changes.length||changes.some(c=>!['A','M'].includes(c.status)))return null;
 if(changes.some(c=>c.path==='.github/scripts/gm-player-share-scope.mjs')&&changes.every(c=>sharePolicyPaths.has(c.path)))return 'gm-player-share-ci';
 if(changes.some(c=>!featurePaths.has(c.path)))return null;
 const html=changes.find(c=>c.path==='server-game/current/GMWW.html');
 if(!html||html.status!=='M'||strip(html.before)===null||strip(html.before)!==strip(html.after))return null;
 if(!['STYLE','UI','SCRIPT'].every(k=>html.after.includes('BEGIN GMWW_PLAYER_SHARE_'+k)))return null;
 return 'gm-player-share';
}
