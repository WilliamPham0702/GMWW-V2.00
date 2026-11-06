// GĐ51 - Chế độ TOÀN MÀN HÌNH của Arena 3D (giống màn chơi 2D): làng chiếm cả màn hình,
// mọi nút kỹ thuật/GM nằm trong ngăn kéo "Điều hành". Chỉ bật khi trang chạy trong app (khung nhúng)
// hoặc có ?immersive=1; trang QA/CI đứng riêng vẫn giữ nguyên bố cục cũ. Không đổi id, không đổi logic Core.
export function immersiveWanted(loc=globalThis.location,win=globalThis.window){
  try{
    const q=new URL(loc.href).searchParams.get('immersive');
    if(q==='0')return false;
    if(q==='1')return true;
    return Boolean(win&&win.parent&&win.parent!==win);
  }catch{return false}
}
const CSS=`
body.immersive{overflow:hidden;background:#0b2430}
body.immersive>header,body.immersive #note{display:none!important}
body.immersive #scene{position:fixed;inset:0;width:100%;height:100dvh;min-height:0;z-index:1}
body.immersive #hud{display:none}
body.immersive #state{left:50%;right:auto;top:calc(env(safe-area-inset-top) + 8px);transform:translateX(-50%);max-width:86%;
  text-align:center;border-radius:999px;padding:7px 16px;background:#0d2a3de0;border:1px solid #8fd0d6;font-weight:700}
#gm-dock{position:fixed;left:0;right:0;bottom:0;z-index:30;display:none;justify-content:center;gap:10px;
  padding:10px 12px calc(env(safe-area-inset-bottom) + 10px);background:linear-gradient(0deg,#07202ce6,#07202c00)}
body.immersive #gm-dock{display:flex}
#gm-dock button{min-height:44px;border-radius:999px;padding:8px 20px;font-weight:800;background:#1d6b82;border:1px solid #bfeef0;
  box-shadow:0 4px 14px #0007}
#gm-dock #dock-ballot{flex:1;max-width:430px;background:#0f3141d9;font-weight:600;font-size:12px;text-align:center;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
#gm-drawer{position:fixed;left:0;right:0;bottom:0;max-height:78dvh;overflow:auto;z-index:40;background:#0e2937f2;
  border-radius:20px 20px 0 0;border:1px solid #5aa0aa;transform:translateY(105%);transition:transform .25s ease;
  padding:8px 0 calc(env(safe-area-inset-bottom) + 14px);-webkit-overflow-scrolling:touch}
body.drawer-open #gm-drawer{transform:none}
#gm-drawer-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:6px 14px;background:#0e2937}
#gm-drawer .toolbar{background:transparent}
#gm-drawer details.dev-tools{margin:8px 10px;padding:8px 10px;border:1px solid #477c85;border-radius:12px;background:#113344}
@media(prefers-reduced-motion:reduce){#gm-drawer{transition:none}}
`;
export function installImmersive(doc=document){
  if(doc.getElementById('gm-drawer'))return null;
  const style=doc.createElement('style');style.id='immersive-style';style.textContent=CSS;doc.head.append(style);
  const drawer=doc.createElement('aside');drawer.id='gm-drawer';drawer.setAttribute('aria-label','Điều hành Arena 3D');
  const head=doc.createElement('div');head.id='gm-drawer-head';
  const title=doc.createElement('strong');title.textContent='Điều hành';
  const close=doc.createElement('button');close.type='button';close.textContent='Đóng ✕';close.id='gm-drawer-close';
  head.append(title,close);drawer.append(head);
  // Chuyển (không nhân bản) các khối hiện có để giữ nguyên id và trình xử lý sự kiện.
  const main=[...doc.querySelectorAll('body > .toolbar:not(#gallery-toolbar):not(#sample-vfx)')];
  const tools=doc.createElement('details');tools.className='dev-tools';
  const sum=doc.createElement('summary');sum.textContent='Công cụ thử nghiệm (không dùng khi chơi thật)';tools.append(sum);
  for(const id of ['gallery-toolbar','sample-vfx','arena-mobile-diagnostics']){const n=doc.getElementById(id);if(n)tools.append(n)}
  for(const n of main)drawer.append(n);
  for(const id of ['ballot','gm-console','log'])doc.getElementById(id)&&drawer.append(doc.getElementById(id));
  drawer.append(tools);
  const dock=doc.createElement('div');dock.id='gm-dock';
  const open=doc.createElement('button');open.type='button';open.id='gm-dock-open';open.textContent='⚙ Điều hành';
  const ballot=doc.createElement('button');ballot.type='button';ballot.id='dock-ballot';ballot.tabIndex=-1;
  dock.append(open,ballot);
  doc.body.append(drawer,dock);
  doc.body.classList.add('immersive');
  const set=on=>{doc.body.classList.toggle('drawer-open',on);open.setAttribute('aria-expanded',String(on))};
  open.onclick=()=>set(!doc.body.classList.contains('drawer-open'));close.onclick=()=>set(false);
  // Dòng Lên Giàn rút gọn nằm cạnh nút Điều hành để GM/Player thấy trạng thái mà không mở ngăn kéo.
  const src=doc.getElementById('ballot');
  const sync=()=>{ballot.textContent=(src?.textContent||'').trim()};
  sync();if(src&&globalThis.MutationObserver)new MutationObserver(sync).observe(src,{childList:true,characterData:true,subtree:true});
  return {drawer,dock,open:()=>set(true),close:()=>set(false)};
}
