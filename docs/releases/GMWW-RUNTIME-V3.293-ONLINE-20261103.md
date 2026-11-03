# GMWW Runtime V3.293 — Online tự chuyển lượt, Sát Thủ và đồng bộ realtime (03/11/2026)

- Auto GM Online: chuyển lượt theo deadline DO; nếu deadline thiếu thì tính theo thời điểm bắt đầu và thời lượng lượt đã cấu hình. Lượt 0 giây tự chuyển khi Auto GM bật. Audio GM hoạt động độc lập với Auto GM.
- Sát Thủ Player Web: chọn mục tiêu rồi nhấn trực tiếp 👍 hoặc 👎, không nhập bằng prompt.
- GM Server: khi Player Web xác nhận hành động, nhận tick WebSocket và lấy trạng thái riêng có xác thực để cập nhật tác động cùng hiệu ứng 🔥 mục tiêu hiện tại.
- Player Web: hiệu ứng ⭐ quanh vai đang hoạt động và 🔥 quanh mục tiêu riêng, dừng theo lượt và hỗ trợ giảm chuyển động.
- An toàn: WS chung chỉ có tick, không lộ người thực hiện, mục tiêu, lá bài bí mật hay ledger khôi phục. Không đổi DO schema, IPA, URL https://gamemasoi.pages.dev/, dữ liệu hay Cloudflare A/B.
- Nghiệm thu: kiểm thử hồi quy đúng 4 lỗi và các required CI trên HEAD cuối; chỉ phát hành khi CI SUCCESS, smoke Worker/Player Web và checksum OTA đã xác minh.
- Rollback: Worker + Player Web và Runtime OTA về V3.292, giữ nguyên dữ liệu và lịch sử phòng.

### Khôi phục phát hành sau merge (#762)
- Commit khôi phục chỉ thêm marker không thực thi vào Worker/Runtime để pipeline Delivery V3 có thể kiểm tra và phát hành lại đúng V3.293.
- CI-LITE sau merge dùng phạm vi chính xác, nhưng vẫn chạy kiểm tra Worker, Player, GM, bảo mật WebSocket, gói Runtime, SHA-256. Không sửa gameplay, IPA, dữ liệu hoặc Cloudflare B.
