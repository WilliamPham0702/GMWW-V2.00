# GMWW Arena 3D — Giai đoạn 11–13: bản nghiên cứu hoàn thiện chức năng (25/10/2026)

## Phạm vi, an toàn và trạng thái
- Pull request **Draft #485**, nhánh `feature/arena3d-stage11-core-role-catalog`, kế thừa PR #482 (GĐ10), #481 (GĐ9). Không tự merge và **không deploy Production**.
- Chỉ sử dụng Worker Cloudflare **`gmww-arena3d-stage11-staging`**, DO/room STAGING độc lập. Không thay đổi game 2D, IPA, dữ liệu, tài nguyên/DO Production.
- Preview: https://gmww-arena3d-stage11-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Rollback: khôi phục nhánh nghiên cứu về commit STAGING đã chạy ổn định trước thay đổi hoặc deploy lại phiên bản Worker STAGING trước đó; không tác động Worker Production.
- Chỉ kiểm thử Stage11–13 và các phụ thuộc trực tiếp (Stage5 optimization, Stage8 casting, Stage10 role VFX); không test Chrome Player Card/OTA/IPA/Seat không liên quan.

## GĐ11 — Thư viện vai trò tích hợp Core
- **28 Vai Trò mặc định, 26 mã Hành Động mặc định** đối chiếu trực tiếp với `server-game/src/00-core-and-library.part`. Có 3 vai trò không có action chủ động mặc định; không dựng phép giả cho vai trò thụ động.
- Bao phủ 26/26 hành động mặc định theo 9 nhóm animation dùng chung nguyên tố hình ảnh (đũa phép, tiên tri soi, đầu sói linh hồn, khiên, hồi phục, nguyền rủa, trinh sát, tấn công, vote). Phù Thủy cứu/giết; Sói Tuyết đóng băng/cắn; Tiên Tri Hào Quang đọc vai trò được phân biệt theo **mã hành động Core**.
- Hỗ trợ 5 mục tiêu 3D, VFX trúng mục tiêu, chỉ nhận `roleId` từ lượt Core đã xác minh, thông tin mục tiêu/vai trò bí mật chỉ trong GM-only cue; viewer vô quyền bị chặn 401/403.
- Sửa lỗi đồng bộ **Phát Vai**: bước `role_delivery` và phiên bản `deliveryVersion`/giai đoạn GM được xác định rõ, không còn bị xem là lobby lặp.
- Chu kỳ đêm: lưu cue action đã được Core xác nhận với TTL ngắn để hiệu ứng hiển thị sau khi GM sang lượt.
- **Giới hạn:** thư viện Artifact tùy chỉnh và các vai trò do GM tự tạo không có danh mục mặc định cố định. Trường hợp không có `actionId` chuẩn sẽ dùng kiểu VFX chung và không suy đoán phe, vai trò hay nội dung lá.

## GĐ12 — Âm thanh phép 3D
- 9 nhóm âm thanh phép **WebAudio procedural** độ nhỏ, **tắt mặc định**; người dùng phải chủ động bật nút âm thanh; tránh phát lặp khi cùng cue nhận qua polling/reconnect; giải phóng AudioContext khi tắt/đóng trang.
- Không tải ngầm audio và không phát âm thanh trên web người xem chỉ vì người GM đang thi triển bí mật.
- **Đây không phải file ghi âm đọc tên Vai Trò hoặc kết quả soi.** Hệ thống không tạo link hoặc tuyên bố có file ghi âm chưa được cung cấp; việc ghép thư viện âm thanh giọng nói đòi hỏi file gốc thực tế.

## GĐ13 — Full Core E2E & điện thoại
- Test **một ván thực trên STAGING** với 2 browser (GM được xác thực và viewer vô quyền), 6 tài khoản kiểm thử: tạo phòng → lấp Seat → khóa Seat → Phát Vai → Vào Trận → Đêm → Core xác nhận Bảo Vệ → refresh viewer → Ngày → đề cử/vote → kết thúc ván → về lobby. Kết quả **PASS** tại https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40156574798
- Test Chrome/WebKit giả lập iPhone với **6/12/20/30 Character** và các mẫu hiệu ứng sói/phù thủy/tiên tri/bảo vệ PASS trong cùng run. Quan sát headless: Chrome ~11 FPS, WebKit ~2 FPS; đây không phải số đo máy thật.
- Bổ sung fallback tiết kiệm tài nguyên khi frame trên thiết bị hiển thị vượt 250 ms liên tục nhiều lần, không nhầm với việc đưa tab xuống nền; giảm độ phân giải, animation Hz và chi tiết theo chất lượng; bảo vệ tính năng khôi phục chất lượng Stage5.
- Đánh giá FPS, pin, nhiệt độ, bộ nhớ trên **iPhone vật lý: CHƯA THỰC HIỆN**. Không khẳng định 30 Character mượt trên iPhone chỉ dựa vào Playwright headless.
- Trận E2E xác thực Bảo Vệ, còn các vai trò mặc định được kiểm bằng catalog/action mapping + VFX synthetic; **chưa kiểm chứng end-to-end tất cả 26 action trên 26 lượt Core thật**.

## Tiêu chí chốt trước khi Production (không được tự thực hiện)
1. CI unit/phân quyền/rollback + Chrome/WebKit STAGING PASS sau commit cuối cùng và link log có bằng chứng.
2. Một ván Core thực chạy từ Phát Vai đến kết thúc, quyền GM/Player không lộ, refresh/reconnect không mất game state.
3. Chủ dự án nghiệm thu hiệu năng iPhone vật lý và âm thanh giọng nói nhập từ thư viện nếu có nhu cầu; gói 3D vẫn là **nghiên cứu** cho tới khi có chấp thuận Production riêng.
4. Khi phát hành thực, tạo release notes Runtime/IPA/Player Web riêng, SHA-256, rollback và CI theo phạm vi thực tế.

**Lưu ý:** Chủ dự án đã bỏ yêu cầu nghiệm thu cho từng giai đoạn nghiên cứu, nhưng điều này **không phải phê duyệt merge hoặc deploy Production**.
