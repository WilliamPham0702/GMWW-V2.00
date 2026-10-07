/* GMWW lobby state guard: before a room exists, the GM view is the shared lobby. */
(()=>{
  'use strict';
  const ROOM_RE=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
  function hasLiveRoom(){
    try{
      if(typeof isLivePlayRoom==='function')return !!isLivePlayRoom();
      if(typeof playSceneState!=='undefined')return ROOM_RE.test(String(playSceneState?.roomCode||''));
      const saved=JSON.parse(localStorage.getItem('GMWW_V264_PLAY_SCENE')||'{}');
      return ROOM_RE.test(String(saved?.roomCode||''));
    }catch{return false}
  }
  function syncLobbyState(){
    if(hasLiveRoom())return;
    try{
      if(typeof playSceneState!=='undefined'){
        let changed=false;
        const set=(k,v)=>{if(playSceneState[k]!==v){playSceneState[k]=v;changed=true}};
        set('roomCode','—');set('gmToken','');set('roomEnabled',false);set('step','room');set('phase','lobby');set('activePlayerId','');
        if(Array.isArray(playSceneState.selectedMemberIds)&&playSceneState.selectedMemberIds.length){playSceneState.selectedMemberIds=[];changed=true}
        if(Array.isArray(playSceneState.assignmentsPreview)&&playSceneState.assignmentsPreview.length){playSceneState.assignmentsPreview=[];changed=true}
        if(changed&&typeof savePlayScene==='function')savePlayScene();
      }
    }catch{}
    const title=document.getElementById('playPhaseTitle');
    if(title&&title.textContent!=='SẢNH CHỜ')title.textContent='SẢNH CHỜ';
  }
  const start=()=>{
    syncLobbyState();
    const title=document.getElementById('playPhaseTitle');
    if(title)new MutationObserver(syncLobbyState).observe(title,{childList:true,subtree:true,characterData:true});
    window.addEventListener('focus',syncLobbyState);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncLobbyState()});
    setInterval(syncLobbyState,1000);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
