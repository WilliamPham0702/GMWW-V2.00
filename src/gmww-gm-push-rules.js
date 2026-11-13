// Luật thông báo đẩy cho GM (qua app Bark trên iPhone) khi người chơi tạo phòng.
// Chỉ gửi tới máy chủ Bark chính thức để mã người dùng dán vào không thể trỏ Worker đi nơi khác.
export const GM_PUSH_BARK_ENDPOINT="https://api.day.app/push";
export const GM_PUSH_DEEP_LINK="gmww://rooms";

// Nhận mã thiết bị Bark dạng trần hoặc nguyên link "https://api.day.app/<mã>/..."; trả "" nếu không hợp lệ.
export function normalizeBarkKey(input){
  let raw=String(input??"").trim();if(!raw)return "";
  const link=raw.match(/^https?:\/\/api\.day\.app\/([^/?#]+)/i);
  if(link)raw=link[1];else if(/[/:?#\s]/.test(raw))return "";
  return /^[A-Za-z0-9]{8,64}$/.test(raw)?raw:"";
}
export function maskBarkKey(key){const k=String(key||"");return k?"••••"+k.slice(-4):""}
function clip(value,max){return String(value??"").replace(/\s+/g," ").trim().slice(0,max)}
export function buildRoomCreatedPush(barkKey,{code,roomName,ownerName}={}){
  const key=normalizeBarkKey(barkKey),room=clip(code,12);if(!key||!room)return null;
  const owner=clip(ownerName,40)||"Một người chơi",name=clip(roomName,60);
  return{device_key:key,title:"Ma Sói: có phòng mới",body:owner+" vừa tạo phòng "+room+(name&&name!=="Phòng "+room?" ("+name+")":"")+". Chạm để mở Quản lý phòng.",group:"GMWW",level:"timeSensitive",url:GM_PUSH_DEEP_LINK};
}
export function buildTestPush(barkKey){
  const key=normalizeBarkKey(barkKey);if(!key)return null;
  return{device_key:key,title:"Ma Sói: thử thông báo",body:"Thông báo phòng mới đã bật. Chạm để mở Quản lý phòng.",group:"GMWW",level:"active",url:GM_PUSH_DEEP_LINK};
}
