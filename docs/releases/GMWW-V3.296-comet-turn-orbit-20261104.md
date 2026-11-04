# GMWW Runtime V3.296 — ☄️ / 🐦‍🔥 cùng quỹ đạo 🐺

Ngày: 04/11/2026. Phạm vi: thay biểu tượng người **đến lượt** từ 🫧 thành ☄️ trên GM Server và Player Web.

- **☄️**: đang đến lượt hoạt động; sáu biểu tượng bay quanh nhân vật theo đúng `gmwwSvVerticalOrbit` (6 giây/vòng).
- **🐦‍🔥**: người được chọn/mục tiêu; giữ nguyên biểu tượng và quỹ đạo từ V3.295.
- **🐺**: giữ nguyên hiệu ứng Sói cắn, CSS gốc, phạm vi hiển thị trạng thái và luật chơi.
- Không thay đổi cấu trúc IPA, Cloudflare B, DNS, nội dung phòng hoặc dữ liệu thật.
- Bản dựng: Runtime OTA `GMWW-Runtime-V3.296.gmwwupdate`, SHA-256 bắt buộc và kiểm thử CI trên HEAD cuối.

## Nghiệm thu
Trên GM Server và Player Web: (1) tới lượt có 6 ☄️ chạy 6s; (2) chọn mục tiêu xuất hiện 6 🐦‍🔥; (3) bị Sói cắn vẫn có 🐺 như trước; (4) khi nhân vật di chuyển, vòng orbit bám theo; (5) không tiết lộ lựa chọn bí mật sang client khác.

## Rollback
Nếu nghiệm thu lỗi, khôi phục **Runtime V3.295** từ GitHub Releases (gói .gmwwupdate + .sha256), đồng thời rollback Worker bằng phiên bản Cloudflare đã kiểm tra trước khi triển khai. Không dùng lại tag V3.295 cho byte mới, không xóa lịch sử/dữ liệu.
