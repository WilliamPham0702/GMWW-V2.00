# GMWW Arena 3D — Cloudflare Preview độc lập (24/10/2026)

## Phạm vi
- Nhánh nghiên cứu `feature/arena-3d-dual-renderer` và Draft PR #452.
- Cloudflare Worker `gmww-arena3d-preview` hoàn toàn riêng biệt với `gmww-v2-00`.
- Tài nguyên thử nghiệm chỉ có HTML, module Dual Renderer, Three.js đã vendor. Không có binding Durable Objects/KV/R2/Production, không gọi API phòng game.
- Bản mẫu dùng các đối tượng nhân vật hình học mô phỏng, **không** là Character chibi artwork cuối cùng.
- Test 6/12/20/30, camera orbit/zoom và chạm người để xoay theo góc 90° mỗi chạm (4 lần = 360°), ngày/đêm, hiệu ứng bảo vệ/vote công khai, FPS/drawcalls.
- Các sự kiện hành động đêm chưa công bố không được truyền ra preview. Bộ lọc phân quyền ngoài game thật chưa tạo quyền riêng tư mới.
- Kết nối Player Web hiện hành, online/offline/demo thật, Safari iPhone thực địa và thẩm định pin/nhiệt: **chưa nghiệm thu**, cần kiểm thử sau khi có link Preview.

## Chính sách phát hành
- Chỉ workflow `Deploy Arena 3D Preview (isolated)` được phép triển khai Worker `gmww-arena3d-preview`.
- Trigger tự động chỉ khi thay đổi nhánh feature đã duyệt; không deploy main/Production.
- Test và dry-run trước upload; sau upload HTTP kiểm tra /api/health, 5 assets và 404 cho /api/rooms.
- Không tạo IPA, không tăng runtime V2.00, không merge PR #452.
- Rollback: deploy lại build Preview trước hoặc xóa Worker Preview; Production không liên quan.

## Changelog
- ADD: Cloudflare Worker Preview không truy cập Core/DO thật.
- ADD: pipeline build whitelist chỉ tài nguyên Arena 3D.
- ADD: hợp đồng smoke kiểm tra dữ liệu mô phỏng 6–30 người, phân quyền hiển thị, 404 API game.
- ADD: công khai số FPS trên máy đang xem; số FPS từ Chromium CI chỉ là đo trên môi trường mô phỏng, không thay iPhone thật.
- UNCHANGED: GM Server IPA, runtime/OTA, Production Worker, phòng, dữ liệu, Player Web.
