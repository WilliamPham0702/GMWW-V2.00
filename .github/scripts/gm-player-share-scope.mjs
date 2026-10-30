// GĐ3 GitHub-first: accept only the isolated GM Player Web share-link UI.
// This policy may not narrow a real game, Worker, OTA or data change.
const featurePaths=new Map([
  ['server-game/current/GMWW.html','M'],
  ['tests/gm-player-web-share-link.test.mjs','A'],
  ['.github/workflows/check-gm-player-link-share.yml','A']
]);
const ciPaths=new Map([
  ['.github/scripts/ci-browser-scope.mjs','M'],
  ['.github/scripts/gm-player-share-scope.mjs','A'],
  ['.github/workflows/check-player-web.yml','M'],
  ['.github/workflows/check-gm-free-icons-501.yml','M'],
  ['.github/workflows/check-gallows-redesign.yml','M'],
  ['.github/workflows/build-server-game-ipa.yml','M'],
  ['.github/workflows/prepare-runtime-v3202-candidate.yml','M'],
  ['.github/workflows/ci-policy-gate.yml','M'],
  ['.github/workflows/deploy-production.yml','M'],
  ['tests/gm-player-share-scope.test.mjs','A'],
  ['docs/releases/GMWW-GITHUB-FIRST-GM-LINK-SHARE-CI-20261030.md','A']
]);
function hasExactPaths(changes, allowed){
  return Array.isArray(changes)&&changes.length===allowed.size&&
    new Set(changes.map(c=>c.path)).size===allowed.size&&
    changes.every(c=>c && allowed.get(c.path)===c.status);
}
function onlyOnce(s,marker){
  return typeof s==='string'&&s.split(marker).length===2;
}
export function isGMPlayerShareScope(changes){
  if(!hasExactPaths(changes,featurePaths))return false;
  const html=changes.find(x=>x.path==='server-game/current/GMWW.html');
  if(typeof html.before!=='string'||typeof html.after!=='string')return false;
  const before=html.before,after=html.after;
  const pairs=[
    ['<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->','<!-- END GMWW_PLAYER_SHARE_STYLE -->'],
    ['<!-- BEGIN GMWW_PLAYER_SHARE_UI -->','<!-- END GMWW_PLAYER_SHARE_UI -->'],
    ['/* BEGIN GMWW_PLAYER_SHARE_SCRIPT */','/* END GMWW_PLAYER_SHARE_SCRIPT */']
  ];
  if(!pairs.every(([start,end])=>onlyOnce(after,start)&&onlyOnce(after,end)&&!before.includes(start)&&!before.includes(end)))return false;
  const style=after.match(/\n<!-- BEGIN GMWW_PLAYER_SHARE_STYLE -->\n<style>([\s\S]*?)<\/style>\n<!-- END GMWW_PLAYER_SHARE_STYLE -->\n/);
  const ui=after.match(/        <!-- BEGIN GMWW_PLAYER_SHARE_UI -->\n([\s\S]*?)        <!-- END GMWW_PLAYER_SHARE_UI -->\n/);
  const script=after.match(/\n\n<script>\n\/\* BEGIN GMWW_PLAYER_SHARE_SCRIPT \*\/([\s\S]*?)\/\* END GMWW_PLAYER_SHARE_SCRIPT \*\/\n<\/script>\n/);
  if(!style||!ui||!script)return false;
  if(!style[1].includes('#gmwwPlayerWebShareSettings')||style[1].includes('@import'))return false;
  if(!ui[1].includes('id="gmwwPlayerWebShareSettings"')||
     !ui[1].includes('id="gmwwShareLegacy"')||
     !ui[1].includes('id="gmwwShareAlias"')||
     !ui[1].includes('value="alias" disabled')||
     !ui[1].includes('id="gmwwShareCopy"')||
     !ui[1].includes('id="gmwwShareSend"')||
     /<script\b|<iframe\b/i.test(ui[1]))return false;
  if(!script[1].includes('GMWW_PLAYER_WEB_ALIAS_CONFIG')||
     !script[1].includes('config.verified!==true')||
     !script[1].includes("parsed.protocol!=='https:'")||
     !script[1].includes('GMWW_PLAYER_SHARE_LINK_CHOICE_V1')||
     /fetch\s*\(|XMLHttpRequest|eval\s*\(|innerHTML|import\s*\(/.test(script[1]))return false;
  const restored=after
    .replace(style[0],'')
    .replace(ui[0],'')
    .replace(script[0],'');
  const workflow=changes.find(x=>x.path==='.github/workflows/check-gm-player-link-share.yml')?.after;
  const regression=changes.find(x=>x.path==='tests/gm-player-web-share-link.test.mjs')?.after;
  return restored===before&&
    typeof workflow==='string'&&workflow.includes('node --test tests/gm-player-web-share-link.test.mjs')&&
    typeof regression==='string'&&regression.includes('verified HTTPS alias');
}
export function isGMPlayerShareCIPolicyScope(changes){
  if(!hasExactPaths(changes,ciPaths))return false;
  const path=n=>changes.find(c=>c.path===n)?.after||'';
  return path('.github/scripts/ci-browser-scope.mjs').includes("gm-player-link-share")&&
    path('.github/workflows/check-player-web.yml').includes("gm-player-link-share")&&
    path('.github/workflows/deploy-production.yml').includes('gm-player-share-scope.mjs')&&
    path('tests/gm-player-share-scope.test.mjs').includes('fail-closed')&&
    path('.github/workflows/ci-policy-gate.yml').includes('tests/gm-player-share-scope.test.mjs');
}
