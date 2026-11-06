// GĐ48 - Player 3D theo dõi chế độ 2D/3D của phòng do GM chọn.
// Chỉ đọc endpoint công khai (trả '2d'|'3d'); không lưu trữ, không gửi dữ liệu người chơi.
export function watchViewMode({code,onMode,intervalMs=3000,fetchImpl=globalThis.fetch,timers=globalThis}){
  let stopped=false,last='';
  async function tick(){
    if(stopped)return;
    try{
      const r=await fetchImpl('/api/arena-staging/rooms/'+encodeURIComponent(code)+'/view-mode',{cache:'no-store'});
      const d=r.ok?await r.json():null;
      const mode=d&&d.mode==='3d'?'3d':'2d';
      if(mode!==last){last=mode;onMode(mode)}
    }catch(e){}
  }
  tick();
  const id=timers.setInterval(tick,intervalMs);
  return {stop(){stopped=true;timers.clearInterval(id)}};
}
