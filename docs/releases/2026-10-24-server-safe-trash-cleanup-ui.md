# GMWW — Công cụ DỌN RÁC SERVER trong Cài đặt (24/10/2026)

## Thực hiện
- Trong **Cài đặt → Kiểm tra & bảo trì** bổ sung nút **♻ DỌN RÁC SERVER** ngay cạnh **QUẢN LÝ CLOUDFLARE**.
- Nút mở bảng Cloudflare có sẵn trong app (không có quyền xóa), tự đọc kiểm toán GitHub Issue #320. Bổ sung các số liệu: Ứng viên cần xác minh rỗng, Preview được bảo vệ, Chưa đối chiếu và Đã dọn lượt gần nhất.
- Trình bày rõ hướng dẫn **QUÉT PREVIEW → DỌN THỦ CÔNG** qua GitHub Actions của chủ dự án; xác nhận trước khi rời ứng dụng; hiển thị **BÁO CÁO CŨ** nếu kết quả >24 giờ.
- Ghi rõ giữ lại Preview còn nhánh/PR chưa kiểm toán, namespace có dữ liệu, Production, phòng/lịch sử, backup và hệ thống khác.
- Giữ lịch bảo trì 09:00 sáng (VN) và giới hạn 10 Preview/lượt, không thêm quyền xóa vào iPhone/Player Web.
- Trong bước đóng gói IPA, tự chuyển đường dẫn báo cáo Cloudflare của Server (`/admin/cloudflare/index.html`) thành HTTPS đầy đủ; tránh WebView iPhone hiểu nhầm đường dẫn gốc local. Không thay đổi đường dẫn trên Production Web.

## Bảo toàn
- Không đổi Worker, Durable Object binding/schema, dữ liệu, room, game rules, IPA hay OTA.
- Không thay đổi logic cleanup hậu trường; vẫn fail-closed với Preview chưa xác minh.
- Trong lần audit thực tế ngày 24/10/2026, workflow 40048577342 chạy SUCCESS: **38 namespace / 37 Preview / 26 chưa đối chiếu (đều còn branch GitHub, xác nhận storage rỗng) / 0 đủ điều kiện dọn tự động / 0 đã xóa**.
- Không được diễn giải tên branch cũ hoặc storage rỗng là chắc chắn có thể xóa.

## Kiểm thử và phát hành
- Chạy `node --test tests/settings-server-trash-cleanup.test.mjs` và CI liên quan.
- Chưa merge hoặc deploy Production cho đến khi CI SUCCESS và chủ dự án phê duyệt/kiểm thử trên iPhone.
- Rollback: revert PR thay đổi `server-game/current/GMWW.html` và file tài liệu/kiểm thử; không có thao tác rollback dữ liệu.
