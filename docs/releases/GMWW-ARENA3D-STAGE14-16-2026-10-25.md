# GMWW Arena 3D — Giai đoạn 14–16 (25/10/2026)

## Trạng thái phát triển và phạm vi an toàn
- **PR Draft #487** trên nhánh `feature/arena3d-stage14-16-dynamic-artifacts-audio`, xếp chồng PR Draft #485 và các giai đoạn trước.
- **Chỉ STAGING độc lập** `gmww-arena3d-stage14-staging`, dùng cùng logic Core V2 nhưng Worker/DO riêng; không merge/deploy Production, không thay game 2D, IPA, Runtime OTA hoặc dữ liệu/phòng chơi Production.
- Preview: https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Rollback: deploy lại Worker STAGING GĐ14 phiên bản trước trong Cloudflare hoặc hoàn nguyên nhánh nghiên cứu. Không rollback Production vì Production không bị thay đổi.
- Không tự mở kiểm thử Chrome Player Card, Seat 30 người của game 2D, OTA/IPA hoặc chức năng khác không liên quan.

## Giai đoạn 14 — Vai Trò/Artifact tùy chỉnh
- Sau khi Core V2 **thực sự xác nhận hành động và quyền sở hữu**, lớp nghiên cứu đọc thẻ Vai Trò/Artifact riêng của người thực hiện trên DO STAGING, kiểm tra đúng phiên bản ván và chọn nhóm diễn hoạt an toàn.
- Vẫn giữ 28 vai trò/26 hành động gốc đã đối chiếu GĐ11; hành động tự tạo có thể sử dụng hiệu ứng khiên, phép soi, hồi phục, đầu sói, lời nguyền, thám thính... theo `effectIds` hợp lệ hoặc metadata GM có danh sách cho phép.
- Chặn animation của action ID tự tạo không nằm trên lá bài đã được Core giao; không suy đoán vai trò, phe, mục tiêu qua ảnh công khai hoặc WebSocket.
- Core loại bỏ một số thuộc tính trình diễn khi lưu Artifact. Lớp DO STAGING chụp **chỉ ánh xạ mã hành động → nhóm VFX** từ bản phân công GM đã được Core chấp nhận, sau đó đối chiếu lại với artifactCard thật. Nhờ đó Artifact tự tạo không biến thành phép chung khi dữ liệu hiển thị được làm sạch.
- Có kiểm thử cả hai định dạng phân công Artifact: đối tượng `artifact` lồng và `artifactId/artifactCard` dạng phẳng.
- Xóa ánh xạ STAGING này khi Core kết thúc ván, bảo toàn mọi metadata gameplay chính thức.

## Giai đoạn 15 — Âm thanh thật trên thiết bị GM
- Nút chọn **file MP3/WAV/OGG/AAC** dung lượng tối đa 10MB cho từng hành động mặc định hoặc mã action tùy chỉnh; kiểm tra MIME, kích thước và giới hạn số file.
- File chỉ tạo URL `blob:` trong tab trình duyệt, **không upload**, không lưu localStorage/IndexedDB, không gửi Player Web, không giả định Server có file hay link âm thanh chưa xác nhận.
- Audio chỉ phát khi đã chủ động bật âm thanh và Core xác thực quyền GM; cùng một sự kiện chỉ phát một lần, ưu tiên file thật nếu đã gán, còn lại dùng tiếng phép WebAudio nhẹ từ GĐ12.
- Khi thoát/mất quyền GM, tự tắt tiếng, thu hồi object URL và giải phóng bộ nhớ.
- **Giới hạn:** đây là công cụ gán audio trực tiếp trong tab nghiên cứu; chưa đồng bộ thư viện âm thanh cá nhân giữa thiết bị, chưa kết nối kho file IPA/Server, và không thay thế audio đọc tên vai trò của game 2D.

## Giai đoạn 16 — CI và trận Core thật
- Đã kiểm tra **Chrome và WebKit giả lập iPhone** với 6, 12, 20, 30 nhân vật, các mẫu Sói/Phù Thủy/Tiên Tri/Bảo Vệ và thao tác nhập audio cục bộ.
- Kiểm thử 2 client Core: tạo phòng → phân vai → vào trận → Đêm/Bảo Vệ → refresh viewer → Ngày/Đề Cử/Bỏ Phiếu → kết thúc ván, viewer không đọc được dữ liệu GM (401): **PASS**.
- Kiểm thử mới **Vai Trò tự tạo** (2 mục tiêu, phép khiên) và **Artifact tự tạo** (1 mục tiêu, phép hồi phục) qua Core thực với cùng người sở hữu, xác nhận `visualFamily` và quyền riêng tư người xem: **PASS** trên Worker STAGING.
- **Bằng chứng STAGING và CI cuối cùng:** https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40158706271 — unit/đúng phạm vi, Chrome/WebKit và hai trận Core thật đều **SUCCESS**, bao gồm hỗ trợ Artifact dạng phẳng và dạng lồng.
- **Cloudflare Worker STAGING version:** `17983261-ad90-43ad-b0e2-2e9e8c3272fe` (STAGING riêng; không Production).
- WebKit/Chrome chạy trên môi trường headless, **không đại diện cho FPS/pin/nhiệt trên iPhone vật lý**. Không kết luận iPhone thật đã đạt.
- Các tác động bất thường và luật vai trò trong trận thực vẫn do Core V2 xử lý; animation không quyết định kết quả Sống/Chết và không cấp quyền mới.

## Cổng nghiệm thu phát hành thực (chỉ khi chủ dự án cho phép riêng)
1. CI đúng phạm vi, test quyền GM/private Card, E2E role + Artifact, hỗ trợ khôi phục STAGING và release notes tiếng Việt.
2. Kiểm tra trên iPhone vật lý: FPS, pin, nhiệt, nền trước/sau và thời lượng trận 30 người.
3. Xác nhận dữ liệu âm thanh thực và các đoạn đọc tên Vai Trò do người dùng cung cấp, không tự gán file chưa tồn tại.
4. Nếu sau này yêu cầu Production, cần phê duyệt **riêng** với SHA-256, rollback, toàn vẹn phòng/chơi và kế hoạch Runtime/IPA. Bản nghiên cứu hiện tại tuyệt đối không tự phát hành Production.
