export const page = String.raw`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GMWW • Quản lý Cloudflare</title>
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#071927;color:#e9f7fb}*{box-sizing:border-box}body{margin:0}main{max-width:1050px;margin:auto;padding:24px 18px 70px}header{display:flex;align-items:center;gap:12px;padding:10px 0 28px}header b{font-size:22px}header small{display:block;color:#9ac1d0}h2{font-size:17px;margin:0 0 15px}.panel{background:#0c2b3e;border:1px solid #285368;border-radius:18px;padding:20px;margin-bottom:17px;box-shadow:0 6px 18px #00172333}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.number{font-size:30px;font-weight:750;letter-spacing:-1px}.muted{color:#9ac1d0}.green{color:#7cebc3}.amber{color:#ffd38b}button,input{font:inherit;border-radius:10px;padding:11px 14px}input{background:#061923;border:1px solid #527184;color:white;min-width:0;width:100%}button{background:#0cbbad;color:#062126;font-weight:700;border:0;cursor:pointer}button:disabled{opacity:.5;cursor:default}.secondary{background:#234b60;color:#e9f7fb}.danger{background:#9f343f;color:white}.flex{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.flex>*{flex:0 0 auto}.flex input{flex:1 1 240px}.row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-top:1px solid #2c5261;padding:13px 0}.row:first-child{border:0}code{color:#b2e3ff;font-size:12px;overflow-wrap:anywhere}.desc{font-size:13px;line-height:1.5;color:#aac8d4}.pill{border-radius:30px;background:#174d53;color:#abf5db;padding:5px 10px;font-size:12px}.hidden{display:none!important}#error{color:#ffadad;white-space:pre-wrap}progress{width:100%;accent-color:#35c3b4}a{color:#9bdffa}footer{font-size:12px;color:#84a5b5;margin-top:20px}
</style></head><body><main>
<header><div style="font-size:28px">☁️</div><div><b>GMWW Cloudflare</b><small>Quản trị tài nguyên • Tách biệt Server Game</small></div></header>
<section id="login" class="panel"><h2>Xác thực quản trị viên</h2><p class="desc">Nhập khóa quản trị được cấp riêng. Khóa chỉ giữ trong bộ nhớ trang; không lưu vào trình duyệt.</p><div class="flex"><input id="key" type="password" autocomplete="off" placeholder="Khóa quản trị"><button id="signin">Đăng nhập</button></div><p id="loginError" class="desc"></p></section>
<div id="app" class="hidden">
<div class="panel"><div class="flex" style="justify-content:space-between"><h2>Tổng quan tài nguyên</h2><button class="secondary" id="logout">Đăng xuất</button></div><div class="grid">
<div><div class="muted">Namespaces</div><div class="number" id="namespaces">—</div></div><div><div class="muted">Previews</div><div class="number" id="previews">—</div></div><div><div class="muted">Ứng viên theo PR</div><div class="number green" id="candidates">—</div></div><div><div class="muted">Dọn tự động</div><div class="number" style="font-size:19px">Hằng ngày</div><small class="muted">Giới hạn 5 Preview/lần</small></div></div>
<progress max="100" value="0" id="capacity"></progress><p class="desc">Chỉ xem/xóa Preview đã đóng PR, qua 24 giờ, không được cập nhật sau khi PR đóng, namespace không có dữ liệu. Production luôn được bảo vệ.</p></div>
<section class="panel"><h2>Kiểm tra và dọn an toàn</h2><div class="flex"><button id="scan">Quét Preview dư thừa</button><button class="secondary" id="refresh">Làm mới tổng quan</button></div><p class="desc" id="scanstatus">Chưa quét.</p><div id="candidatelist"></div></section>
<section class="panel"><h2>Nhật ký dọn dẹp</h2><div id="logs" class="desc">Đang tải…</div></section>
<p id="error"></p><footer>Quản trị riêng • Không can thiệp Runtime OTA, IPA hoặc trạng thái phòng chơi. <a href="https://github.com/WilliamPham0702/GMWW-V2.00" target="_blank" rel="noopener">GitHub GMWW</a></footer></div>
</main><script>
let token="";
const $=id=>document.getElementById(id);
async function api(path,opts={}){
 const r=await fetch(path,{...opts,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json",...opts.headers},cache:"no-store"});
 let data;try{data=await r.json()}catch{throw Error("Máy chủ trả dữ liệu không hợp lệ")}
 if(!r.ok)throw Error(data.error||"Lỗi "+r.status);return data;
}
const error=e=>{$("error").textContent=e.message||String(e)};
async function refresh(){
 const d=await api("/api/overview");$("namespaces").textContent=d.namespaces+"/100";
 $("previews").textContent=d.previews;$("candidates").textContent=d.candidateCount;
 $("capacity").value=Math.min(100,d.namespaces);
 const items=await api("/api/logs");$("logs").replaceChildren();
 for(const x of items.items){const line=document.createElement("div");line.className="row";line.textContent=new Date(x.at).toLocaleString("vi-VN")+" · "+x.action+" · "+x.status+" · "+(x.preview||"—");$("logs").appendChild(line)}
 if(!items.items.length)$("logs").textContent="Chưa có sự kiện dọn dẹp.";
}
async function scan(){
 $("scan").disabled=true;$("scanstatus").textContent="Đang xác minh các ứng viên…";$("candidatelist").replaceChildren();
 try{const d=await api("/api/scan",{method:"POST",body:"{}"});$("scanstatus").textContent=d.eligible.length+" Preview đủ điều kiện xoá, "+d.protectedCount+" Preview được giữ.";
 for(const x of d.eligible){const row=document.createElement("div");row.className="row";const name=document.createElement("div");const title=document.createElement("strong");title.textContent=x.preview;const desc=document.createElement("div");desc.className="desc";desc.textContent="PR #"+x.pr+" · Namespace rỗng · Đã xác minh";name.append(title,desc);const btn=document.createElement("button");btn.className="danger";btn.textContent="Xoá Preview";btn.onclick=async()=>{if(!confirm("Xóa Preview thử nghiệm "+x.preview+"? Không ảnh hưởng Production."))return;btn.disabled=true;try{const res=await api("/api/cleanup",{method:"POST",body:JSON.stringify({previewId:x.previewId,confirm:"DELETE_VERIFIED_PREVIEW"})});alert(res.message);await Promise.all([refresh(),scan()])}catch(e){error(e);btn.disabled=false}};row.append(name,btn);$("candidatelist").appendChild(row)}
 await refresh();}catch(e){error(e);$("scanstatus").textContent="Không thể xác minh dữ liệu."}finally{$("scan").disabled=false}
}
$("signin").onclick=async()=>{token=$("key").value.trim();$("loginError").textContent="";try{await refresh();$("key").value="";$("login").classList.add("hidden");$("app").classList.remove("hidden")}catch(e){token="";$("loginError").textContent=e.message}};
$("scan").onclick=scan;$("refresh").onclick=()=>refresh().catch(error);
$("logout").onclick=()=>{token="";$("app").classList.add("hidden");$("login").classList.remove("hidden");$("candidatelist").replaceChildren()};
</script></body></html>`;