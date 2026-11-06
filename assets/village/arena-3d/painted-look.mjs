// GĐ53 - Kiểu "tranh" cho trang Arena 3D khi chạy trong app: tranh làng thật (backdrop.html) nằm sau canvas trong suốt,
// làng dựng bằng code bị ẩn (giữ đèn để nhân vật có sáng), nhân vật 3D đứng trên sàn tranh. Không đổi luật game.
export function installPaintedBackdrop(scene,village,render,{doc=document,base=new URL('./backdrop.html',import.meta.url).href}={}){
  const lights=[];village.root.traverse(o=>{if(o.isLight)lights.push(o)});
  for(const l of lights)scene.add(l); // giữ ánh sáng (lửa, mặt trời, môi trường) khi ẩn làng
  village.root.visible=false;render.setClearColor(0x000000,0);scene.background=null;
  const style=doc.createElement('style');
  style.textContent='#gmww-painting{position:fixed;inset:0;width:100%;height:100dvh;border:0;z-index:0;pointer-events:none;background:#0b2430}'
    +'body.immersive #scene,#stage{background:transparent!important}body.immersive{background:#0b2430}';
  doc.head.appendChild(style);
  const f=doc.createElement('iframe');f.id='gmww-painting';f.title='Làng 3D';f.tabIndex=-1;f.setAttribute('aria-hidden','true');
  f.src=base;doc.body.insertBefore(f,doc.body.firstChild);
  let night=null;const send=()=>{if(night!==null)try{f.contentWindow.postMessage({kind:'gmww-backdrop-phase',night},'*')}catch{}};
  f.addEventListener('load',send);
  village.onNight(n=>{night=!!n;send()});
  return {frame:f,lights:lights.length};
}
