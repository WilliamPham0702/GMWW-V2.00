// GĐ48 - chế độ hiển thị của MỘT phòng: '2d' (mặc định, như hiện nay) hoặc '3d'.
// Chỉ là lựa chọn cách hiển thị; Core V2.00 vẫn là nơi quyết định luật và kết quả.
export const VIEW_MODE_KEY='arena:viewMode';
export const VIEW_MODES=Object.freeze(['2d','3d']);
export function normalizeViewMode(v){return String(v||'').trim().toLowerCase()==='3d'?'3d':'2d'}
// Trả null nếu giá trị không hợp lệ (để POST từ chối thay vì âm thầm đổi về 2d).
export function parseViewModeInput(v){
  const s=String(v||'').trim().toLowerCase();
  return VIEW_MODES.includes(s)?s:null;
}
export function viewModePayload(stored,now=Date.now()){
  const mode=normalizeViewMode(stored?.mode);
  return {ok:true,mode,updatedAt:Number(stored?.updatedAt)||0,serverTime:now};
}
