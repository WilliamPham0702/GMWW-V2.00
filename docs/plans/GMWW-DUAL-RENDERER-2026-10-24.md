# GMWW Dual Renderer — bản kiến trúc nghiên cứu (24/10/2026)

## Trạng thái và giới hạn phê duyệt
- Nguồn gốc: duy nhất repository WilliamPham0702/GMWW-V2.00, nhánh main là chuẩn.
- Nhánh: feature/arena-3d-dual-renderer, mở Draft PR, không merge main và không deploy Production.
- Không sửa src/index.js, DO, dữ liệu phòng, migrations, IPA, Player Web, giao diện 2D đang vận hành hoặc release version.
- Bản Arena 3D là demo WebGL độc lập bằng dữ liệu mô phỏng, **chưa đăng nhập**, không truy cập API/DO thực, không đạt điều kiện nghiệm thu iPhone thật.
- Đã tận dụng Three.js r180 nội bộ có sẵn trong assets/characters/v5/vendor (không thêm CDN).

## Kiến trúc mục tiêu (KHÔNG tách thành game mới)
1. GMWW Core V2: RoomDurableObject, luật vai trò và Artifact, dữ liệu, các phiên bản/phát hành.
2. Hợp đồng DTO công khai (nguồn hiện hữu): src/gmww-public-room-contract.js -> publicRoom(meta); player DTO là publicPlayer đã khử dữ liệu riêng ở Worker.
3. Adapter server read-only: src/gmww-dual-renderer-projection.js chuẩn hóa DTO và không tạo bất kỳ trạng thái lưu trữ mới nào.
4. Hợp đồng trình bày thuần JS: assets/village/dual-renderer-core.mjs. Cùng một frame duy nhất cho rendererCommands(frame,'2d') và rendererCommands(frame,'3d').
5. Renderer hiện tại 2D được giữ nguyên. Arena preview: assets/village/arena-3d/ chỉ là thử nghiệm, **chưa đấu dây vào luồng game**.
6. Tích hợp Player Web/GM IPA thật và giao diện lựa chọn 2D/3D là bước riêng sau nghiệm thu và kiểm chứng phân quyền tại server.

## Đồng bộ thay đổi từ main
- Feature branch đã được tạo **trực tiếp từ main** ở thời điểm khởi tạo; luôn giữ main làm nguồn chuẩn.
- Khi main nhận PR mới: đưa thay đổi bằng merge/rebase **main -> feature branch**, kiểm tra xung đột contract và chỉ chạy test liên quan. Không bao giờ merge ngược feature -> main tự động.
- Không lấy ảnh/logic 2D làm dữ liệu độc lập để sinh ra “game V3”. Khả năng chạy đồng thời cùng phòng phải dùng cùng Core contract, room ID, match revision, delivery version.
- Ban đầu, chưa cấu hình tự merge main vào branch trong GitHub Actions vì cần bảo vệ các nhánh đang làm dở và không được bỏ qua conflict. CI báo khi nhánh nghiên cứu tụt sau main. Đồng bộ nhánh chỉ khi xác nhận không xung đột.
- Khi Core nâng DTO, cập nhật module chung và test hợp đồng hai renderer **trong cùng thay đổi**.
- Những thay đổi UI thuần 2D không tự sinh ra asset/hình thức 3D; phải có mapping tương ứng và nghiệm thu 3D.

## Phân quyền / đồng bộ
- Frame công khai có allowlist: mã phòng, match/stage/delivery/reset revisions, giai đoạn, trạng thái người chơi, seat, character và statusTags **đã lọc từ Core**.
- Không đưa token, mật khẩu, Role/Artifact private card, phe, hành động kín/target kín qua frame công khai.
- projectAuthorizedVisualEvents chỉ xuất public event nếu released=true; sự kiện GM/chủ thẻ phải được **Server xác thực** rồi mới cung cấp authorizePrivate. Không tin toggle UI, query parameter hay isGM trên client.
- Bản preview chỉ tạo dữ liệu tổng hợp trong trình duyệt, không dùng cơ chế cho phép bí mật qua client.
- Bỏ các frame matchRevision/stageRevision/deliveryVersion cũ để tránh hồi quy Phát Vai/đổi ván. Vì source V2 chưa có revision thống nhất cho mọi chuyển động, bước tích hợp WebSocket bắt buộc bổ sung thứ tự sự kiện có chứng cứ và snapshot recovery.
- Tuyệt đối không thêm một polling/WS độc lập cho giao diện 3D khi kết nối game thật: dùng cùng adapter nguồn state của Player Web.

## Test đúng phạm vi
- tests/dual-renderer-contract.test.mjs: hai renderer dùng cùng DTO, leak bí mật, dedupe/giới hạn 30 người, stale revision, phân quyền sự kiện, cô lập Production và kiểm tra định tuyến CI.
- Workflow check-dual-renderer.yml: Node 22, npm ci, node --test tests/dual-renderer-contract.test.mjs (và test phạm vi CI nếu ảnh hưởng).
- Check Player Web Worker được routing chế độ dual-renderer để tránh chạy 30 ghế, Role/Artifact browser, DEMO hoặc full suite không liên quan. Bước kiểm tra cú pháp/dry-run Worker vẫn giữ nguyên.
- **CHƯA CHẠY** QA iPhone thật / Safari / Chrome / Edge / sức nóng / FPS thực địa. Chỉ báo FPS ngay trong preview khi mở bằng trình duyệt, chưa có số liệu sản phẩm.
- Không thay đổi logic game, dữ liệu hay server runtime; không bump version/release IPA.

## Release notes (research only)
- ADD: hợp đồng Dual Renderer v1 đọc DTO phòng và nhân vật công khai.
- ADD: projector 2D/3D từ cùng một frame, không lưu state lần hai.
- ADD: lọc event hiển thị theo quyền đã được Server phê duyệt; bỏ trường riêng.
- ADD: bản xem Arena 3D giả lập (6/12/20/30 nhân vật; camera xoay/zoom; ngày/đêm; hiệu ứng công khai).
- ADD: CI dành riêng cho Dual Renderer và kiểm thử tương thích dữ liệu.
- UNCHANGED: Worker Production, Durable Objects, room/history, dữ liệu, Player Web thực, GM IPA, runtime/OTA.
- ROLLBACK: đóng Draft PR/xóa branch nghiên cứu; không có hành động Production cần khôi phục.

## Cửa nghiệm thu tiếp theo (riêng, không tính PASS tại PR này)
1. Kiểm thử trình duyệt thật và iPhone vật lý, đo FPS/độ nóng/bộ nhớ 6/12/20/30.
2. Bản đồ thật với 30 Character không chồng, camera phù hợp iPhone, xoay người 360°, target/effect/sound đúng.
3. Server-side viewer-specific WS projection có auth thật, xử lý reconnect/replay, thứ tự sự kiện.
4. Bản 2D và 3D cùng xem một phòng, cùng matchId, đồng bộ kết quả GM/Player, test bảo mật.
5. CI liên quan SUCCESS, người dùng nghiệm thu, có rollback và release notes trước khi xét hợp nhất/Production.
