// PR #581 — STAGING-only Player entry into the 3D village.
// The Core Player Web page is unchanged; the STAGING Worker appends this small
// classic script. Once the player has joined a room it opens the public 3D scene
// (/village/arena-3d/player.html), whose sheet hosts the SAME Player Web for
// private role card / actions / chat / votes. Inside that sheet (framed) the
// script does nothing, so there is no redirect loop.
export const ARENA3D_PLAYER_ENTRY_ID='gmww-arena3d-player-entry';
export const ARENA3D_PLAYER_ENTRY_SCRIPT=`<script id="${ARENA3D_PLAYER_ENTRY_ID}">
(function(){
  'use strict';
  if(window.top!==window)return;
  var KEY='gmww_arena3d_auto_room';
  function joinedRoom(){
    try{
      var code=String(state&&state.roomCode||'').toUpperCase();
      return code&&state.participantId&&/^[A-Z0-9]{4,12}$/.test(code)?code:'';
    }catch(e){return ''}
  }
  function go(code){location.href='/village/arena-3d/player.html?room='+encodeURIComponent(code)}
  var btn=document.createElement('button');
  btn.type='button';btn.id='gmwwArena3dPlayerEnter';btn.hidden=true;
  btn.textContent='🌊 Làng 3D';
  btn.setAttribute('aria-label','Mở làng 3D của phòng đang tham gia');
  btn.style.cssText='position:fixed;right:10px;top:calc(env(safe-area-inset-top) + 64px);z-index:2147483000;'+
    'font:700 12px system-ui,-apple-system,sans-serif;color:#fff;background:#19546bee;border:1px solid #8ad2d9;'+
    'border-radius:999px;padding:7px 12px;box-shadow:0 4px 14px rgba(0,0,0,.3)';
  btn.addEventListener('click',function(){var c=joinedRoom();if(c)go(c)});
  document.body.appendChild(btn);
  setInterval(function(){
    var code=joinedRoom();btn.hidden=!code;
    if(!code)return;
    var seen='';try{seen=sessionStorage.getItem(KEY)||''}catch(e){}
    if(seen!==code){try{sessionStorage.setItem(KEY,code)}catch(e){}go(code)}
  },1200);
})();
</script>`;
// GD46: classic external script, active only inside the framed 3D sheet (see player-bridge.js).
export const ARENA3D_PLAYER_BRIDGE_ID='gmww-arena3d-player-bridge';
export const ARENA3D_PLAYER_BRIDGE_TAG=`<script id="${ARENA3D_PLAYER_BRIDGE_ID}" src="/village/arena-3d/player-bridge.js" defer></script>`;
export function injectArena3dPlayerEntry(html){
  html=String(html);
  if(html.includes('id="'+ARENA3D_PLAYER_ENTRY_ID+'"'))return html;
  const add=ARENA3D_PLAYER_ENTRY_SCRIPT+ARENA3D_PLAYER_BRIDGE_TAG;
  const at=html.lastIndexOf('</body>');
  return at<0?html+add:html.slice(0,at)+add+html.slice(at);
}
export function isPlayerPagePath(pathname){
  return pathname==='/'||/^\/join\/[A-Za-z0-9]+$/.test(pathname);
}
