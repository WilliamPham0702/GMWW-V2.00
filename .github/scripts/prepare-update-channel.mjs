#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {buildReleaseCatalog,selectBuildVerifiedManifest} from '../../src/gmww-release-catalog-policy.js';

const classifiedReleaseType=(process.argv[2]||process.env.GMWW_RELEASE_TYPE||'server_only').trim();
const typeRank={server_only:0,runtime:1,native:2};
let previousManifest=null;
try{previousManifest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'))}catch{}
let releaseType=classifiedReleaseType;
const worker='https://gmww-v2-00.williampham0702.workers.dev';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const version=(app.match(/const VERSION='([^']+)'/)?.[1]||'').replace(/^V/i,'');
if(!version) throw new Error('Cannot resolve GMWW runtime version');

const outRoot=path.join('assets','updates','runtime','V'+version);
fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const copied=[];
function copy(src,dst){
  if(!fs.existsSync(src))return;
  const target=path.join(outRoot,dst);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(src,target);
  copied.push(dst.replaceAll('\\','/'));
}
function copyDir(src,dst){
  if(!fs.existsSync(src))return;
  for(const name of fs.readdirSync(src)){
    const a=path.join(src,name),b=path.join(dst,name);
    const st=fs.statSync(a);
    if(st.isDirectory())copyDir(a,b); else copy(a,b);
  }
}

const leanRuntimePatch=version==='3.16';

copy('server-game/current/GMWW.html','GMWW.html');
copy('server-game/current/app.js','app.js');
copy('server-game/current/runtime-recovery.js','runtime-recovery.js');
copy('server-game/current/gmww-local-export.js','gmww-local-export.js');
copy('server-game/current/artifact-sea-import.js','artifact-sea-import.js');
copy('server-game/current/battle-controls.js','battle-controls.js');
copy('server-game/current/style.css','style.css');
copy('server-game/current/status-visuals.js','status-visuals.js');
copy('server-game/current/status-visuals.css','status-visuals.css');
copy('server-game/current/character-renderer.js','character-renderer.js');
copy('server-game/current/gmww-shared-motion.js','gmww-shared-motion.js');
copy('server-game/current/character-renderer.css','character-renderer.css');
copy('server-game/current/gmww-village-coast.svg','gmww-village-coast.svg');
copy('assets/village/village-layout.js','village-layout.js');
copy('assets/village/seat-leaf.webp','seat-leaf.webp');
copy('assets/village/seat-leaf.webp','village/seat-leaf.webp');
copy('assets/backgrounds/gmww-village-day-v260.webp','gmww-village-day-v260.webp');
copy('assets/backgrounds/gmww-village-night-v260.webp','gmww-village-night-v260.webp');
if(!leanRuntimePatch)copyDir('assets/characters/v253','game-characters');
copyDir('assets/characters/gmww40','characters/gmww40');
copyDir('assets/gm','gm');
copyDir('server-game/current/home-art','home-art');

// Canonical clean role artwork (63 originals, no old delivery/thumb variants).
// deploy-production.yml restores this source from the pinned V2.52 release archive
// before this script runs.
if(!leanRuntimePatch){
  const sourceRoot=path.join('server-game','legacy-assets','v252');
  const sourceManifest=path.join(sourceRoot,'role-artwork-v251.js');
  const originalRoot=path.join(sourceRoot,'assets','role-artwork-v251','original');
  if(!fs.existsSync(sourceManifest)||!fs.existsSync(originalRoot)){
    throw new Error('Canonical clean role artwork source is missing');
  }
  const ctx={window:{}};vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(sourceManifest,'utf8'),ctx,{filename:'role-artwork-v251.js'});
  const source=ctx.window.GMWW_BUILTIN_ROLE_ARTWORK||{},out={};
  const entries=Object.entries(source);
  if(entries.length!==63)throw new Error('Expected 63 canonical role mappings, found '+entries.length);
  for(const [id,row] of entries){
    const sourceFile=path.join(originalRoot,id+'.webp');
    if(!fs.existsSync(sourceFile))throw new Error('Missing clean role artwork '+id);
    const rel='assets/role-artwork-v251/original/'+id+'.webp';
    copy(sourceFile,rel);
    out[id]={...row,display:rel,delivery:rel,thumb:rel,width:3072,height:2560,deliveryWidth:3072,deliveryHeight:2560};
  }
  const manifestRel='role-artwork-v251.js';
  fs.writeFileSync(path.join(outRoot,manifestRel),'window.GMWW_BUILTIN_ROLE_ARTWORK='+JSON.stringify(out)+';\n');
  copied.push(manifestRel);

  const htmlFile=path.join(outRoot,'GMWW.html');
  let html=fs.readFileSync(htmlFile,'utf8');
  if(!html.includes('role-artwork-v251.js')){
    const appScript=html.match(new RegExp('<script src="app\\.js(?:\\?v=[^"]+)?"><\\/script>'))?.[0]||'';
    if(appScript)html=html.replace(appScript,'<script src="role-artwork-v251.js"></script>\n'+appScript);
    fs.writeFileSync(htmlFile,html);
  }
  if(!html.includes('role-artwork-v251.js'))throw new Error('Runtime HTML did not load canonical role artwork manifest');
}

if(!leanRuntimePatch){
  const artwork=fs.readFileSync('server-game/shared/artwork.js','utf8');
  const m=artwork.match(/data:image\/webp;base64,([^']+)/);
  if(m){
    fs.writeFileSync(path.join(outRoot,'default-artwork.webp'),Buffer.from(m[1],'base64'));
    copied.push('default-artwork.webp');
  }
}

// Every local startup dependency referenced by the entry page must be shipped.
// A valid checksum inventory cannot rescue an HTML file pointing at absent JS.
const entryHtml=fs.readFileSync(path.join(outRoot,'GMWW.html'),'utf8');
for(const match of entryHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){
  const source=match[1];
  if(/^(?:https?:)?\/\//i.test(source))continue;
  const local=source.split(/[?#]/)[0];
  if(local.startsWith('/')||local.split('/').some(p=>!p||p==='.'||p==='..')||!copied.includes(local))
    throw new Error('Runtime startup dependency missing or unsafe: '+local);
}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
const files=[...new Set(copied)].sort().map(rel=>({
  path:rel,
  url:`${worker}/updates/runtime/V${version}/${rel.split('/').map(encodeURIComponent).join('/')}`,
  sha256:sha(path.join(outRoot,rel))
}));

if(previousManifest?.releaseVersion===version){
  const previousType=String(previousManifest.releaseType||'server_only');
  if((typeRank[previousType]??0)>(typeRank[releaseType]??0)) releaseType=previousType;
}
const projectShell=(fs.readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8').match(/MARKETING_VERSION = ([^;]+);/)?.[1]||'').trim();
const workerSource=fs.readFileSync('src/index.js','utf8');
const workerShell=(workerSource.match(/NATIVE_SHELL_VERSION="([^"]+)"/)?.[1]||'').trim();
if(!workerShell)throw new Error('Cannot resolve native shell version from Worker');
if(projectShell&&projectShell!==workerShell)throw new Error('Native shell version mismatch: Worker '+workerShell+' vs Xcode '+projectShell);
const shell=workerShell;
// Build-trigger/follow-up commits can be server-only even though a new native shell
// was just released. When the advertised version changed and the shell matches it,
// keep the channel native so older installs are told to download the new IPA.
const versionChanged=String(previousManifest?.releaseVersion||'')!==version;
if(releaseType==='server_only'&&versionChanged&&shell===version) releaseType='native';
// A newer runtime running on an older native shell must stay a runtime update even
// when the latest commit only touches tests/server files. Otherwise an incidental
// follow-up commit would hide the downloadable runtime package from installed apps.
if(releaseType==='server_only'&&version!==shell) releaseType='runtime';
const isNative=releaseType==='native';
const manifest={
  schema:1,
  releaseVersion:version,
  releaseType,
  shellVersion:shell,
  minimumShellVersion:isNative?version:shell,
  runtimeVersion:version,
  webVersion:version,
  serverVersion:version,
  required:false,
  restartRequired:releaseType==='runtime',
  releaseNotes:["V3.155: 5 điều chỉnh GMWW — Hủy/Xác nhận/Chọn tất cả cùng hàng, Artifact hiển thị hai từ và vuốt, điều hướng từng hành động, người bị đuổi vẫn được chọn nhưng tác động đêm vô hiệu, Artifact đầu game 30 giây.", "V3.154: Thay 40 Character mới, gồm Character 15; chỉ Idle, Walk, Run, Turn trên GM Server và Player Web; bỏ động tác ngồi, bảo toàn dữ liệu và IPA.","V3.153: Khắc phục Chọn tất cả chỉ cần một lần bấm; danh sách Sói chỉ hiện tên; Artifact hiển thị 2 ký tự có thể trượt, chức năng đúng tên; Box hành động một hàng có mũi tên và giữ kéo-thả; bảo toàn IPA V3.110 và dữ liệu.", "V3.152: Hiển thị tên Artifact dưới chân Character GM; mỗi Artifact tối đa một hành động, giữ đủ hành động Vai trò; cải thiện kéo-thả thao tác cảm ứng; duy trì dữ liệu, luật chơi, iPhone IPA V3.110 và OTA an toàn.", "V3.151: Lưu Phân Vai chuyển ngay sang Phát Vai; lá Artifact xuất hiện dưới Character GM; nhãn Đến lượt/Mục tiêu nổi bật; tên chức năng Artifact chính xác; đọc xong Xác nhận mới đổi lượt; giải thích Artifact không có hành động đêm, không thay đổi luật và IPA.", "V3.150: Ván Mẫu cấu hình riêng thời gian chọn người lên giàn và thời gian bỏ phiếu (mặc định 10 giây mỗi lượt); GM mở đề cử rồi mới bắt đầu đếm giờ, Player Web và GM cùng theo đồng hồ Server; giữ nguyên dữ liệu và IPA.", "V3.149: Kích hoạt chức năng Vai Trò và Artifact ban ngày với xác nhận Server, bảo toàn hạn mức và hậu tử; hiển thị công khai 👍/👎 trên đầu Character GM và Player Web; bổ sung chuỗi Audio/Thông Báo Làng. Giữ iOS IPA, dữ liệu và OTA an toàn.", "V3.148: Sửa tên Hành động Artifact; Thông Báo Làng và audio; hành động ban ngày theo lượt; Lên Giàn bỏ phiếu 10 giây; Sát Thủ chọn dấu bí mật và người chơi phản hồi sáng hôm sau. Giữ nguyên dữ liệu, IPA.", "V3.147: Menu đống lửa bỏ tiêu đề, vuốt tới chức năng cuối; nhãn Đến lượt/Mục tiêu luôn nằm trên trạng thái, tên và vai trò; giữ nguyên dữ liệu, luật chơi và IPA.", "V3.146: Các tab sau tác động bỏ dấu X, chạm ra ngoài để đóng, kéo thả được và dùng độ mờ kính như Timeline; giữ nguyên chức năng OK, luật chơi, dữ liệu và IPA.", "V3.145: Tích hợp bảng Cloudflare vào Cài đặt GMWW Server, xem số liệu quét trực tiếp và mở quét/dọn xác thực GitHub; giữ nguyên quyền Production, dữ liệu, OTA và IPA.", "V3.144: Sửa nút Quản lý Cloudflare mở được trên iPhone, bỏ hai đoạn chữ thừa và gỡ Công việc & Tiến độ không chính xác; bảo toàn phòng, dữ liệu và IPA.", "V3.143: Xóa Sói GM trên GM và Player Web, giữ menu đống lửa và GM online/offline; giảm polling và vòng lặp hiển thị khi nghỉ; không cần cài lại IPA, giữ dữ liệu và rollback.", "V3.140: Khắc phục OTA: bản vá SHA-256 từ inventory V3.137/V3.138, cảnh báo tải chậm, bảo toàn IPA V3.110, dữ liệu và rollback.", "V3.133: Đêm/Ngày có số thứ tự, gọi đủ Bầy Sói; sửa liên kết Audio lượt/OK/Sói Cắn/Phù Thuỷ/Sói Tuyết; hộp Yêu Tinh dịch trái-không dịch-phải và xem kết quả thật; Phù Thủy thấy vết cắn kể cả đã bảo vệ; kết quả soi nổi có thể kéo, đóng; thu gọn ONLINE/OFFLINE và ON/OFF.", "V3.132: Ghi nhận hành động ngay sau khi Server xác nhận, đồng bộ phòng ở nền; giảm xác thực lặp, ghi đo thời gian và thu hộp xác nhận chỉ còn nút OK; giữ nguyên dữ liệu, luật và Khôi phục.", "V3.131: Thu nhỏ icon Trạng Thái, xếp trạng thái - tên - vai trò trên đầu nhân vật, phục hồi màu Sói Cắn và bỏ Nhật ký dư.", "V3.130: Sửa CSS Trạng Thái ghi đè định vị Seat làm nhân vật dồn sang phải; giữ tọa độ tuyệt đối của GM và Player Web, bổ sung kiểm thử WebKit.","V3.129: Sửa triệt để Seat Mẫu không làm mới UI, ngăn chuyển động cũ đè vị trí đã gán trong các bước thiết lập; đồng bộ GM và Player Web, giữ nguyên dữ liệu và IPA.","V3.128: Viết lại vùng đi bộ trong làng và sơ đồ Seat 8–30 người lấy lửa làm tâm; chặn mái nhà, biển và sân cấm; loại bỏ vị trí ngẫu nhiên/di chuyển bù sai; giữ dữ liệu, Rule Engine và IPA.","V3.127: Khắc phục gốc lỗi Seat dồn cụm trong Vào Trận: tự hoàn tất seat chưa hợp lệ, hủy chuyển động cũ, đồng bộ vị trí GM/Player Web; bảo toàn seat, Rule Engine và dữ liệu.","V3.126: Sửa seat 12 vị trí hiển thị sai theo 24 mẫu, cho phép tick trạng thái Offline đồng bộ Online, Bảo Vệ + Săn cùng lúc, giảm tải render và lưu đầy đủ nhật ký tác động phân trang; bảo toàn dữ liệu, IPA và Rule Engine.","V3.125: Khắc phục 7 lỗi: box Tạo Phòng, Seat và căn chỉnh 4 hướng, vùng cấm, 🐺 Sói Cắn, hiệu ứng Đóng Băng trùng, giảm lag; đồng bộ GM Server/Player Web và giữ nguyên dữ liệu.","V3.124: Sửa hiển thị Bảo Vệ và Sói Cắn từ hành động xác nhận, đồng bộ hiệu ứng GM/Player Web đúng mẫu, giảm lag trên iPhone; giữ nguyên Rule, dữ liệu và IPA.","V3.123: Tích hợp 15 hiệu ứng Trạng Thái được duyệt lên nhân vật GM, Player Web và box Hành Động; bảo toàn dữ liệu và hỗ trợ Runtime OTA.","V3.122: Bổ sung phục hồi khi Runtime OTA không khởi động trên shell hiện có; giữ dữ liệu và không cần cài lại IPA. Chưa nghiệm thu trên iPhone.","V3.121: Thu gọn màn hình Tạo Phòng; bỏ lá dưới nhân vật đã vào Seat; đưa tên gần đầu; Công cụ GM một hàng vuốt ngang, giữ dữ liệu và IPA. Điều chỉnh giao diện và kiểm thử.", "V3.120: Phát hành giao diện Tạo Phòng thu gọn từ PR #264 và phục hồi luồng OTA trên iPhone bằng phiên bản Runtime mới; giữ nguyên dữ liệu và IPA đang cài.", "V3.119: Yêu Tinh: GM chọn Dịch chuyển vết cắn, chọn Trái hoặc Phải rồi OK; không chọn thì Yêu Tinh không thực hiện. Giữ nguyên dữ liệu, không cần cài lại IPA.","V3.118: Trạng thái người chơi hiện đúng trên nút hành động bị khóa (Đóng băng, Đuổi, Đã chết, Trạng thái); Tiên Tri nhận kết quả Sói / Không phải Sói riêng; giữ nguyên dữ liệu, không cần cài lại IPA.","V3.117: Xuất dữ liệu chưa đồng bộ hiển thị ngay trong app với nút Chia sẻ và Sao chép, không tải file (tránh màn hình đen trên iPhone); giữ nguyên dữ liệu, không cần cài lại IPA.","V3.116: Sửa phát hành OTA: bản Runtime 3.116 vượt phiên bản 3.115 đã quảng bá nhưng chưa tải được, để máy GM tải lại đầy đủ; giữ nguyên dữ liệu, không cần cài lại IPA.","V3.113: Thanh Đồng hồ và Hành động: người đến lượt có sao vàng lơ lửng; mục tiêu có vòng ngắm mint quay chậm và nhãn MỤC TIÊU; dấu hiệu được giữ khi realtime cập nhật; giữ nguyên dữ liệu.","V3.107: Khắc phục phát hành OTA: đồng bộ phiên bản Runtime và manifest, kiểm tra SHA-256 trước khi quảng bá bản cập nhật; bảo toàn dữ liệu và không cần cài lại IPA.","V3.106: Thêm trang Trạng Thái riêng và hiệu ứng Đóng Băng phủ nhân vật trên GM Server/Player Web; trạng thái lấy từ máy chủ, tự hết hạn, không lộ hiệu ứng riêng tư; giữ nguyên dữ liệu, không cần cài lại IPA.","V3.105: Box Hành Động bỏ tiêu đề trùng, căn giữa các nút và giữ cuộn ngang; khóa trạng thái đóng băng/đuổi hiển thị tức thời; Bầy Sói chỉ mở ở đêm đầu; sửa điều kiện đêm dùng giá trị đã chuẩn hóa; giữ dữ liệu và OTA không xóa.","V3.104: Nâng độ nhạy vuốt lượt; kéo thả mục tiêu có kiểm tra va chạm và xác nhận tên; bố cục trận giãn đều 8–30 người; thanh dưới Đồng hồ - Hành động - Khôi phục, các box Tập Hợp tự co theo chữ và Công cụ GM sắp hàng đẹp; không xóa dữ liệu.", "V3.103: Phát Audio Vai Trò/Hành Động đã nạp khi vào lượt hoặc GM chọn chức năng, có nút nghe lại cho iPhone; áp dụng giới hạn một chức năng mỗi đêm và số lượt dùng từng chức năng, cập nhật mờ nút ngay, server chặn dùng sai và khôi phục được bằng Undo; bảo toàn dữ liệu.", "V3.102: Box Hành Động dưới màn hình thu gọn theo nội dung, bỏ hướng dẫn, cuộn ngang khi nhiều chức năng; vuốt màn hình sang trái hoặc phải để chuyển lượt vai trò; giữ nguyên dữ liệu và Seat Mẫu 8–30.", "V3.101: Seat Mẫu một vòng duy nhất quanh đống lửa, tự chọn tròn / elip / chữ nhật theo số lượng 8–30; không xếp vòng trong/vòng ngoài, giữ dữ liệu GM/Player.", "V3.100: Seat Mẫu tự chọn hình 8–30 người, đống lửa làm tâm cố định, đồng bộ GM IPA và Player Web, giữ nguyên dữ liệu.", "V3.99: Vai cùng thứ tự sẽ thức dậy một lần, gom hành động trùng; box hành động cuộn ngang dưới màn hình, kéo thả hoặc nhấn đúp chọn mục tiêu, khôi phục thao tác vừa xác nhận; bảo toàn dữ liệu.", "V3.98: Đồng hồ đếm ngược dạng box nổi có thể kéo thả, bỏ thanh menu trận đấu dưới; Chọn Ván thiết lập Sói nhận diện 30 giây và Artifact đầu game 60 giây; Audio và Auto GM trong Sói GM; giữ nguyên dữ liệu.", "V3.97: Seat Mẫu 8–24 người với hình tròn, thoi, chữ nhật; vuốt ngang menu Gọi Người và chọn sơ đồ dấu chấm, đồng bộ GM và Player Web, giữ nguyên dữ liệu.", "V3.96: Khắc phục 42 chibi bị thay bằng chữ cái khi tài khoản GM offline hoặc ngồi; giữ nguyên nhân vật, phiên chơi và dữ liệu.", "V3.95: Thư Viện có Box Lab đầu tiên, mô phỏng chuỗi hiệu ứng nhiều đêm trong môi trường cách ly; không thay đổi dữ liệu trận thật.", "V3.94: Đồng hồ đếm ngược nhỏ gọn, chạy giảm thời gian ổn định; mũi tên trên chuyển về lượt trước, không thoát game; giữ nguyên dữ liệu.", "V3.93: Nhấn nhân vật sói GM đang đi trong làng để mở Hồi Sinh, Giết người, Thoát game và Kết thúc Ván. Thanh dưới là đồng hồ số, Thông Tin, icon Auto GM xoay khi bật; dữ liệu không đổi.", "V3.92: Thanh dưới chỉ icon Đồng hồ và Auto GM, chó sói GM mở Thông Tin / Thoát / Kết thúc Ván / Audio / Hồi Sinh / Giết người; bảo toàn dữ liệu.", "V3.91: Xây dựng lại menu Trận Đấu gọn trên/dưới, bỏ box che làng, thêm Hồi Sinh / Giết người thủ công; dữ liệu được giữ nguyên.", "V3.90: Cập nhật Timeline Bầy Sói / Artifact đầu ván / Vai Trò / Làng ơi dậy đi, sửa đồng bộ hành động và Auto GM, gom quản lý Artwork, giữ nguyên dữ liệu.", "V3.89: Xóa khung Khám Phá Trang Chủ, giữ ba ô hình và toàn bộ dữ liệu.", "V3.88: Một ô soạn thảo ChatGPT có prompt chuẩn, nút chẩn đoán điền báo cáo và nút Gửi riêng; không mất dữ liệu.", "V3.87: Bỏ nền hai box cuối Trang Chủ, giữ dữ liệu và thiết kế thẻ.", "V3.86: Thêm ô nhập yêu cầu bổ sung khi Báo lỗi tự động qua ChatGPT; giữ nguyên dữ liệu, Vai Trò, Artifact và cập nhật giao diện an toàn.", "V3.85: Bỏ chat AI nổi, bổ sung báo lỗi tự động ở Cài Đặt mở ChatGPT với nội dung chẩn đoán đã điền sẵn; không cần OpenAI API key.", "V3.84: Nạp 44 artwork Artifact Biển từ ZIP trong đúng phiên GM, không mất dữ liệu và đồng bộ kho server.","V3.82: Biểu tượng AI Support nổi, kéo thả; Chat hỏi đáp và Báo lỗi tự động, AI chỉ hoạt động sau khi kết nối OpenAI API.", "V3.81: Đồng bộ đèn Online/Offline trên Server cạnh tên nhân vật và GM, bỏ box trạng thái phụ.", "V3.80: Vuốt dài màn hình/chọn Timeline để điều hướng lượt, đồng hồ đếm ngược từ Ván Mẫu, Artifact theo thứ tự cấu hình và khoá Artifact đã dùng.","V3.79: Đổi chỗ menu trận: hành động ở trên, Timeline ở dưới, nút Quay về chỉ còn icon và rút gọn Bầy sói.","V3.78: Bỏ box OFFLINE · READY dưới nhân vật ở GM/Player; giữ trạng thái kết nối và game, giảm rối màn hình.","V3.77: Trang Chủ Top 3 người chơi có tỷ lệ thắng cao nhất, bục vàng bạc đồng và Nhật ký Hoạt Động Gần Đây thiết kế mới.","V3.76: Player Web tự khôi phục nhận vai sau khi GM Phát Vai, hiển thị trạng thái đang đồng bộ thay vì báo đã nhận khi chưa có dữ liệu.","V3.75: Thông báo Phát Vai và số đã xem ở box điều khiển dưới; bỏ thông báo nổi, giữ giao diện Vào Trận của V3.74.","V3.74: Giao diện Vào Trận riêng, timeline theo server, thao tác kéo thả hoặc chọn thủ công, xác nhận mục tiêu và hiệu ứng thị giác.","V3.73: Phát Vai hiển thị xác nhận Server và số Người Chơi đã xem Vai Trò; ẩn Artifact khi không sử dụng, bảo toàn dữ liệu.","V3.72: Sửa lỗi role_guard Load failed khi LƯU Ván Mẫu; đóng gói ảnh Vai Trò trên Server và giới hạn đồng bộ Artifact nền để tránh lag.","V3.71: Chọn Ván Mẫu liên kết artwork đã lưu trên Server, không truyền lại từng ảnh; Player nhận ảnh khi Phát Vai, Artifact dùng kho chung.","V3.70: Ván Mẫu chỉ đóng gói Vai Trò; Server lưu bộ Artifact dùng chung để tái sử dụng, không đóng gói lại theo từng ván.","V3.69: Khắc phục Load failed trên iPhone khi lưu Ván Mẫu; đọc Artwork chuẩn qua Server có CORS và cho phép LƯU lại không mất dữ liệu.","V3.68: Khắc phục triệt để lưu và chọn Ván Mẫu, Artwork tải theo từng lá có retry, tôn trọng Artifact đã lưu và bảo toàn dữ liệu.","V3.67: Sửa nút Chọn Ván Mẫu, Artifact không ★ vẫn được lấy theo ván, thông báo rõ lỗi và tiến độ nạp trên iPhone.","V3.65: Lá Vai Trò/Artifact Player hiển thị artwork chuẩn GM, chạm đóng và tự đóng sau 30 giây; Ván Mẫu đóng gói ảnh và nạp trước Phát Vai; đồng bộ đơn vị giây.","V3.64: Trang Phân Vai hoàn chỉnh, chia ngẫu nhiên/theo thứ tự, hoán đổi Vai Trò, điều chỉnh Artifact, chốt trước Phát Vai.","V3.63: Bổ sung lọc Tất cả / Online / Offline khi chọn Thành Viên, giữ lựa chọn khi chuyển bộ lọc và đồng bộ trạng thái","V3.62: Cho phép giữ và kéo thanh Tập hợp dân làng tới vị trí mong muốn, nhớ vị trí và tránh che timeline hoặc thanh điều khiển","V3.61: Khôi phục chỉnh thời gian sử dụng riêng từng lá Vai Trò; thời gian chung (giây) áp dụng mặc định","Chọn Ván Mẫu: hiện 3 cài đặt thời gian chung – thảo luận 300 giây, Vai Trò 30 giây, Artifact 30 giây; bỏ thời gian riêng từng lá","Chọn Ván: mặc định thảo luận 300 giây; cấu hình hạn mức Artifact theo Ngày/Đêm","Artifact ★ được chọn mặc định và vuốt ngang trên một hàng; làm gọn nhãn nhân vật trong Làng","Hiển thị đầy đủ 14 công cụ tối ưu dưới dạng lưới 3 cột và cuộn dọc; bỏ mũi tên, bộ đếm và thanh cuộn ngang","Bổ sung nút mũi tên trái/phải và thanh tiến độ để xem 14 công cụ tối ưu hệ thống theo chiều ngang; giữ nguyên chức năng và dữ liệu","Công cụ Chủ Đề: chỉ hiển thị các vị trí ảnh được kết nối với giao diện thực tế","Thay đổi hình Banner Làng Biển, Vào Làng, ba ô Khám Phá và thanh điều hướng ngay từ mục Chủ Đề","Ảnh mặc định được hiển thị trong preview; khôi phục về mặc định không làm mất dữ liệu đã lưu","Cập nhật Runtime V3.56: Player Web tự theo dõi bước chơi GM thời gian thực"],
  message:isNative?`GMWW V${version} yêu cầu cài IPA mới.`:releaseType==='runtime'?`Có GMWW V${version}. Có thể cập nhật trực tiếp.`:'Server/Player Web đã cập nhật.',
  runtime:{files:releaseType==='runtime'?files:[]},
  delete:[],
  ipa:{
    version:isNative?version:shell,
    fileName:`GMWW-V${isNative?version:shell}.ipa`,
    url:`https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v${isNative?version:shell}/GMWW-V${isNative?version:shell}.ipa`
  }
};
fs.mkdirSync(path.join('assets','updates'),{recursive:true});
fs.writeFileSync(path.join('assets','updates','latest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(outRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const updateChannelRev=workerSource.match(/UPDATE_CHANNEL_REV="([^"]+)"/)?.[1]||'runtime';
const revisionedManifest=path.join(outRoot,'manifest-'+updateChannelRev+'.json');
fs.writeFileSync(revisionedManifest,JSON.stringify(manifest,null,2)+'\n');
if(version!==shell){
  if(releaseType!=='runtime')throw new Error('Runtime '+version+' on shell '+shell+' must publish as runtime');
  const required=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css','gm/gm-white-wolf.webp','home-art/home-fantasy-hero-v337.webp','home-art/home-v1-book.webp','home-art/home-v1-members.webp','home-art/home-v1-action.webp'];
  for(const p of required)if(!files.some(f=>f.path===p))throw new Error('Runtime package missing '+p);
  if(!fs.existsSync(revisionedManifest))throw new Error('Revisioned runtime manifest was not generated');
}
const catalog=releaseType==='runtime'
  ? await buildReleaseCatalog(manifest,rel=>fs.readFileSync(path.join(outRoot,rel)))
  : null;
fs.writeFileSync('src/gmww-release-catalog.js','// Generated from SHA-256 verified package bytes. Do not edit.\nexport const releaseCatalog='+JSON.stringify(catalog)+';\n');
const releaseBases=[];
// CI-audited previous inventories for V3.140. Fail closed on any missing
// evidence: all file hashes were verified by their original SUCCESS Production
// build-catalog pipeline and are pinned in version control. The IPA's native
// updater independently SHA-256 checks every downloaded changed file.
if(version==='3.140'){
  const proofFile='update-system/verified-ota-baselines-v3140.json';
  if(fs.existsSync(proofFile)){
    const pinned=JSON.parse(fs.readFileSync(proofFile,'utf8'));
    const proofs=[
      ['3.139',39109032855,'4eff650a4dc55b3b222b0ab4f661cb05707d09ff'],
      ['3.138',39104239730,'212bb552ef577cba424e8177f916ec9a38c967a0'],
      ['3.137',39096250345,'38eb1446082f105c71e84fa7dc76b286da34f6c5']
    ];
    if(pinned?.schema!==1||!Array.isArray(pinned.baselines)||pinned.baselines.length!==3)
      throw Error('Pinned OTA baseline inventory missing');
    for(const [baseVersion,workflowRun,sourceCommit] of proofs){
      const rows=pinned.baselines.filter(r=>r?.version===baseVersion);
      if(rows.length!==1)throw Error('Unverified OTA baseline '+baseVersion);
      const row=rows[0],snapshot=row.manifest;
      if(row.workflowRun!==workflowRun||row.sourceCommit!==sourceCommit||
          snapshot?.releaseVersion!==baseVersion||snapshot?.runtimeVersion!==baseVersion||
          snapshot?.shellVersion!==shell||snapshot?.releaseType!=='runtime'||
          !Array.isArray(snapshot?.runtime?.files)||snapshot.runtime.files.length!==138)
        throw Error('Pinned OTA baseline provenance mismatch '+baseVersion);
      const manifest=JSON.parse(JSON.stringify(snapshot));
      const base={schema:1,manifest,
        sha256:crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex')};
      if(!await selectBuildVerifiedManifest(base,baseVersion,shell))
        throw Error('Pinned OTA baseline SHA-256 metadata invalid '+baseVersion);
      releaseBases.push(base);
    }
  }
}
// Only complete historical packages whose bytes are still available locally can
// become delta bases. Missing or damaged packages simply cannot enable a delta.
const packageRoot=path.dirname(outRoot);
const historical=fs.readdirSync(packageRoot).filter(name=>/^V\d+(?:\.\d+)+$/.test(name)&&name!=='V'+version)
  .sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
for(const name of historical){
  if(releaseBases.length===3)break;
  const root=path.join(packageRoot,name);
  try{
    const base=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
    if(base.shellVersion!==shell)continue;
    releaseBases.push(await buildReleaseCatalog(base,rel=>fs.readFileSync(path.join(root,rel))));
  }catch{/* Full package remains available for an unverified historical base. */}
}
fs.writeFileSync('src/gmww-release-bases.js','// Generated from verified historical package bytes. Do not edit.\nexport const releaseBases='+JSON.stringify(releaseBases)+';\n');
console.log(JSON.stringify({version,classifiedReleaseType,releaseType,files:files.length,manifest},null,2));
