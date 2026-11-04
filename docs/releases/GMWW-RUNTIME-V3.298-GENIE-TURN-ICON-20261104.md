# GMWW Runtime V3.298 – Đổi icon đến lượt thành 🧞‍♂️

Ngày: 04/11/2026

## Nội dung
- **🧞‍♂️** thay **☄️** cho nhân vật đến lượt hoạt động trên GM Server và Player Web.
- Giữ **🐦‍🔥** cho nhân vật bị chọn và giữ nguyên đầu sói **🐺** khi bị Sói cắn.
- Tất cả dùng đúng `gmwwSvVerticalOrbit`, sáu biểu tượng lệch pha, quỹ đạo elip 6 giây, bám nhân vật; không tạo animation mới.
- Không sửa quy tắc vai trò, hành động, audio Auto GM V3.297, chat/Online, dữ liệu và 3D.

## Kiểm tra, phát hành
- Chỉ merge sau required CI SUCCESS trên HEAD cuối cùng: Worker CI, cú pháp, bộ dựng GM/Player Web, bản Runtime đồng nhất và regression quỹ đạo, privacy, OTA.
- Phát hành GitHub-first Runtime **V3.298** (.gmwwupdate) cùng tệp **SHA-256** tính từ gói thực tế, giữ nguyên IPA đã cài.
- Giữ URL Production, Cloudflare A/B, Durable Objects, phòng và lịch sử. Chỉ xác nhận hiệu ứng thực tế sau nghiệm thu iPhone.

## Rollback
- Khi hiệu ứng/sync lỗi: quay lại bản phát hành **Runtime V3.297** và Worker tương ứng, xác minh trạng thái phòng/chat và dữ liệu không đổi.
- Không đè hoặc xóa Releases V3.297, không thay IPA, DNS, dữ liệu thật; khôi phục Worker theo bản triển khai gần nhất nếu cần.
