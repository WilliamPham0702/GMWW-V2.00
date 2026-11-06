/* GMWW Arena 3D GĐ52 - CHỈ có trong Runtime STAGING 3D (build-arena3d-staging-runtime.mjs).
 * Màn vận hành GM vẫn là màn 2D cũ (ghế, hành động, Lên Giàn, đồng hồ... do Core điều khiển).
 * File này chỉ thay NỀN làng bằng cảnh 3D thật (iframe backdrop, không nhận thao tác) và gửi pha Ngày/Đêm.
 * Không đọc/ghi dữ liệu game; chỉ gửi chế độ 2D/3D lên STAGING (cần quyền GM) để Player Web đi theo. */
(function(){
  'use strict';
  var KEY='gmww.play3d.mode',BASE=(typeof GMWW_SERVER_BASE==='string'?GMWW_SERVER_BASE:'');
  if(!/arena3d-stage14-staging/.test(BASE))return; // không bao giờ chạy ở Runtime Production
  var CSS='#start #playWorld.gmww-3d-on{isolation:isolate;background-image:none!important;background-color:#0b2430!important}'
    +'#start #playWorld.gmww-3d-on::after{content:none!important;display:none!important}'
    +'#gmww3dBackdrop{position:absolute;inset:0;width:100%;height:100%;border:0;z-index:-1;pointer-events:none;background:#0b2430}'
    +'#gmww3dToggle{position:absolute;right:8px;top:96px;z-index:7;min-width:44px;min-height:34px;padding:4px 10px;border-radius:999px;'
    +'border:1px solid #bfeef0;background:#1d6b82ee;color:#fff;font:800 13px system-ui,-apple-system,sans-serif;box-shadow:0 3px 10px #0006}';
  function mode(){try{return localStorage.getItem(KEY)==='2d'?'2d':'3d'}catch(e){return '3d'}}
  function save(m){try{localStorage.setItem(KEY,m)}catch(e){}}
  function world(){return document.getElementById('playWorld')}
  function night(){var s=document.getElementById('playShell');return !!s&&s.dataset.phase==='night'}
  function fire(){try{if(typeof villageFirePosition==='function'){var p=villageFirePosition();if(p&&isFinite(p[0])&&isFinite(p[1]))return{x:+p[0],y:+p[1]}}}catch(e){}return null}
  function send(){var f=document.getElementById('gmww3dBackdrop');
    if(f&&f.contentWindow)try{f.contentWindow.postMessage({kind:'gmww-backdrop-phase',night:night(),fire:fire()},BASE)}catch(e){}}
  function announce(m){ // Player Web STAGING đi theo lựa chọn của GM (chỉ khi có phòng + quyền GM)
    try{var s=(typeof playSceneState!=='undefined'&&playSceneState)||{},code=String(s.roomCode||''),tok=String(s.gmToken||'');
      if(!/^[A-Za-z0-9]{4,12}$/.test(code)||!tok)return;
      fetch(BASE+'/api/arena-staging/rooms/'+code+'/view-mode',{method:'POST',
        headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify({mode:m})}).catch(function(){});
    }catch(e){}}
  function apply(){
    var w=world();if(!w)return;
    var on=mode()==='3d',f=document.getElementById('gmww3dBackdrop'),b=document.getElementById('gmww3dToggle');
    if(!b){b=document.createElement('button');b.id='gmww3dToggle';b.type='button';
      b.addEventListener('click',function(){var m=mode()==='3d'?'2d':'3d';save(m);apply();announce(m)});
      w.appendChild(b)}
    b.textContent=on?'3D':'2D';b.setAttribute('aria-label',on?'Đang chơi 3D. Bấm để về 2D':'Đang chơi 2D. Bấm để vào 3D');
    w.classList.toggle('gmww-3d-on',on);
    if(on&&!f){f=document.createElement('iframe');f.id='gmww3dBackdrop';f.title='Làng 3D';f.tabIndex=-1;
      f.setAttribute('aria-hidden','true');f.setAttribute('referrerpolicy','no-referrer');f.setAttribute('allow','autoplay');
      f.addEventListener('load',send);f.src=BASE+'/village/arena-3d/backdrop.html';w.insertBefore(f,w.firstChild)}
    if(!on&&f)f.remove(); // nhả GPU khi về 2D
  }
  function boot(){
    var st=document.createElement('style');st.id='gmww3dStyle';st.textContent=CSS;document.head.appendChild(st);
    apply();setInterval(apply,2000); // idempotent: giữ nền nếu app dựng lại sân chơi
    var shell=document.getElementById('playShell');
    if(shell)new MutationObserver(send).observe(shell,{attributes:true,attributeFilter:['data-phase']});
    window.addEventListener('message',function(e){if(e.origin===new URL(BASE).origin&&e.data&&e.data.kind==='gmww-backdrop-ready')send()});
  }
  window.GMWW_PLAY3D={apply:apply,mode:mode};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
