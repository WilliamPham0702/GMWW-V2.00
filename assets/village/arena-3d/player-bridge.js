// PR #581 GD46 - STAGING-only classic script, active ONLY inside the framed Player Web sheet.
// It exposes the current player's own action menu to the 3D parent and relays "pick action"
// and "target member" intents into the EXISTING Player Web flow (gmwwOnlinePickAction ->
// gmwwOnlineTarget -> POST /action). Core still validates every action on the server.
// It forwards only: action key/name/targetCount/noSelf/blocked, public player ids + names, and
// the user-facing notice text. No credential, role id, faction or card data leaves this page.
(function(){
  'use strict';
  if(window.top===window)return;
  var ORIGIN=location.origin,ID=/^[a-z0-9_.-]{1,80}$/i,lastHash='';
  function num(v){var n=parseInt(v,10);return isFinite(n)?Math.max(0,Math.min(5,n)):0}
  function raw(){try{return Array.isArray(state.onlineActions)?state.onlineActions:[]}catch(e){return []}}
  function actions(){
    return raw().slice(0,20).map(function(a){
      return {key:String(a&&a.key||'').slice(0,120),name:String(a&&a.name||'Hành động').slice(0,60),
        targetCount:num(a&&a.targetCount),noSelf:!!(a&&a.noSelf===true),blocked:!!(a&&a.blocked)};
    }).filter(function(a){return a.key});
  }
  function people(){
    try{return gmwwOnlinePeople().slice(0,60).map(function(p){return {id:String(p.id),name:String(p.name).slice(0,40)}})}
    catch(e){return []}
  }
  function selfId(){try{return String(state.member&&state.member.loginId||'')}catch(e){return ''}}
  function picking(){
    try{
      var p=gmwwOnlinePick;if(!p||!p.action)return null;
      return {key:String(p.action.key||''),name:String(p.action.name||'Hành động'),need:num(p.action.targetCount),
        noSelf:p.action.noSelf===true,targets:(p.targets||[]).slice(0,5).map(String)};
    }catch(e){return null}
  }
  function busy(){try{return !!state.onlineBusy}catch(e){return false}}
  function post(msg){try{window.parent.postMessage(msg,ORIGIN)}catch(e){}}
  function snapshot(){
    return {type:'gmww3d:state',actions:actions(),people:people(),selfId:selfId(),picking:picking(),busy:busy()};
  }
  function publish(force){
    var snap=snapshot(),hash=JSON.stringify(snap);
    if(!force&&hash===lastHash)return;
    lastHash=hash;post(snap);
  }
  window.addEventListener('message',function(event){
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    var d=event.data;if(!d||typeof d!=='object')return;
    try{
      if(d.type==='gmww3d:request-state'){publish(true);return}
      if(d.type==='gmww3d:cancel'){if(typeof gmwwOnlineStop==='function')gmwwOnlineStop();publish(true);return}
      if(d.type==='gmww3d:pick-action'){
        var key=String(d.key||'');
        var found=raw().filter(function(a){return a&&a.key===key&&!a.blocked})[0];
        if(found&&typeof gmwwOnlinePickAction==='function')gmwwOnlinePickAction(found);
        publish(true);return;
      }
      if(d.type==='gmww3d:target'){
        var id=String(d.id||'').replace(/^member:/,'');
        if(ID.test(id)&&typeof gmwwOnlineTarget==='function')gmwwOnlineTarget(id);
        publish(true);
      }
    }catch(e){}
  });
  // Mirror the Player Web notice text so the 3D page can show action results/errors.
  try{
    if(typeof toast==='function'&&!toast.__gmww3d){
      var original=toast;
      window.toast=function(text){
        try{post({type:'gmww3d:toast',text:String(text==null?'':text).slice(0,160)})}catch(e){}
        return original.apply(this,arguments);
      };
      window.toast.__gmww3d=true;
    }
  }catch(e){}
  setInterval(function(){publish(false)},600);
  publish(true);
})();
