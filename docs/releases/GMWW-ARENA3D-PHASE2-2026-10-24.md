# GMWW Arena 3D — Giai đoạn 2: Core V2.00 STAGING độc lập (24/10/2026)

## Mục đích
Tiếp tục GMWW Dual Renderer PR #452 bằng cách kết nối Arena 3D với **API phòng và WebSocket của chính Core V2.00** nhưng chỉ trên một Cloudflare Worker riêng `gmww-arena3d-core-staging`, namespace Durable Objects riêng. Không ghép vào main hoặc Production.

## Nội dung cập nhật
- Thêm `src/arena3d-stage-worker.mjs`: wrapper mỏng quanh `src/index.js`, giữ nguyên nghiệp vụ Worker và phân quyền của game; trả health STAGING, chặn API cập nhật Runtime/IPA.
- Thêm `wrangler.arena3d-core-stage.jsonc`: Worker và Durable Object độc lập; không có service binding tới Production, không sử dụng namespace `gmww-v2-00`.
- Thêm `assets/village/arena-3d/live.html` & `live.mjs`: sân 3D, tạo/phục hồi phòng thử, 6/12/20/30 người, Camera orbit, xoay Character, FPS/draw calls, hiển thị status hợp lệ; GM controls dùng API V2 thật (Seat, Phát Vai, Vào Trận, Ngày/Đêm, Lên Giàn).
- Thêm `room-realtime.mjs`: bộ nhận trạng thái V2 thật, WebSocket là tín hiệu tức thời, HTTP snapshot khi refresh/reconnect, chống nhận revision cũ, lọc roster và phiếu công khai.
- `/join/:roomCode` trên STAGING mở Player Web 2D dùng chính Core STAGING; 2D và 3D cùng nhận cùng Room DTO và cùng Match ID của môi trường thử nghiệm.
- Không chèn vai trò/phe/Artifact bí mật vào scene public; vai/Artifact chỉ xem qua Client Player Web đã xác thực sẵn của V2, không thêm client-side GM quyền.
- Bổ sung test hợp đồng Core 2D/3D & privacy, HTTP E2E phòng thật 6 thành viên/phát vai/Ngày Đêm/đề cử, UI Chromium 390px và ghép screenshot; không tính Chromium SwiftShader là iPhone vật lý.

## Điều cần nghiệm thu sau CI
1. Link staging live mở được trên iPhone Safari và Chrome/Edge; có thể tạo phòng thử mà không đụng dữ liệu Production.
2. Mở link Player Web STAGING và link Arena 3D cùng mã phòng; nhận roster, Seat, Phát Vai, Ngày/Đêm, đề cử/bỏ phiếu trên cùng Core.
3. Mất mạng/refresh xác nhận lấy lại snapshot đúng, không làm mất người chơi, không làm lộ Role/Artifact.
4. Đo FPS thực tế và nhiệt độ trên iPhone cho 6/12/20/30 trong từng trạng thái.
5. Kiểm tra các hiệu ứng public và private theo role/voter policy (đêm bí mật **không phát ra scene public**).
6. Phải phân biệt thử nghiệm 3D hình học với Character 3D mỹ thuật hoàn chỉnh.

## Trạng thái bảo vệ
- **Production Worker `gmww-v2-00`, IPA, OTA, dữ liệu/phòng thật, game 2D Production:** KHÔNG thay đổi.
- Không phát hành Runtime/IPA, không merge PR #452; nhánh feature nhận main mới theo quy trình kiểm tra xung đột.
- Không thêm tài khoản đăng nhập/người chơi vào Production; các tài khoản mô phỏng chỉ tạo trên namespace STAGING.
- Không ghi GM token vào URL hay trình lưu trữ; UI chỉ giữ GM token trong bộ nhớ tab.
- Không mở API lấy private card cho người xem vô danh; chỉ sử dụng endpoint `/api/rooms/:code` và `/ws/:code` công khai của Core.
- **Rollback:** hủy bản Worker STAGING hoặc triển khai lại phiên bản staging trước đó; vì không có binding Production nên dữ liệu thật không phải rollback.

## Release notes
- ADD: môi trường riêng chạy Core V2 game thật phục vụ 3D, cùng một nguồn luật.
- ADD: WebSocket + HTTP snapshot/reconnect cho Arena 3D.
- ADD: quản lý phòng, Seat 6–30 và luồng GM thử nghiệm Phát Vai/Ngày Đêm/Lên Giàn.
- ADD: lọc sự kiện phiếu công khai và giới hạn thông tin vai trò.
- ADD: CI đúng phạm vi và minh chứng staging qua HTTP/Chromium.
- UNCHANGED: Core Production, Worker Production, dữ liệu, GM iOS IPA, Runtime OTA và Player Web đang sử dụng.
