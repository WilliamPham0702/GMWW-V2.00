# GMWW Runtime V3.204 — Hoàn thiện trang Lên Giàn (24/10/2026)

## Thay đổi
1. Trang Lên Giàn có thứ tự: (1) Tự động/Thủ công — số giây chung — đồng hồ đếm ngược — Khôi Phục; (2) danh sách thành viên; (3) Mở Đề Cử — Chốt — Mở Vote cùng hàng ở chế độ Tự động; (4) Thống kê / Chi tiết / Kết luận.
2. GM nhập một số giây áp dụng **cả đề cử và vote**. Server xác nhận một lần với `kind=both`; chỉ thay đổi trước khi giai đoạn bắt đầu, không làm mất phiếu đang chạy. Đồng hồ dùng thời hạn từ Server.
3. Danh sách còn sống xếp theo số đề cử, vẫn cuộn tối đa 10 người. Đề cử được lấy từ snapshot Server ngay khi Player Web gửi phiếu, qua WebSocket `gallows_updated` (không chờ nút Chốt). Không hiện cột 👍/👎 trong danh sách.
4. Khôi phục nút **Cấm Chọn** / **Cấm Vote** cho từng thành viên, GM chạm để bật/tắt với phản hồi Server. Tác động Artifact Cấm Vote vẫn được ưu tiên, GM không thể vô hiệu hóa.
5. Nút Chốt điều khiển chốt đề cử khi đề cử đang mở hoặc chốt vote khi bỏ phiếu đang mở; không tự mở vote khi chốt đề cử. Mở Vote chỉ khi Server đã chuyển giai đoạn; khi hòa, GM chọn người trong nhóm dẫn đầu.
6. Thống kê số người đã đề cử, số người đã vote, chi tiết từng người và kết luận 👍 Sống / 👎 Chết. Audio Ngày dài phát khi mở trang Lên Giàn; audio kết luận lấy từ Thư viện Âm thanh → Hệ thống (không ghi đè tệp của chủ phòng).

## Phạm vi kiểm thử
- CI **Check Lên Giàn theo đúng phạm vi**: đồng hồ chung, bản ghi phiếu realtime, cấm chọn/vote, Chốt đúng giai đoạn, đồng bộ GM compiled app với 6 source, Player Web nguồn/compiled và quyền Server.
- CI Worker thiết yếu bảo đảm API / WebSocket. Không yêu cầu bài kiểm thử Card Chrome, Seat, OTA/IPA hành vi khác.
- Guard phát hành Runtime đúng phiên bản V3.204, SHA-256 từng asset, manifest OTA, health Production. Không thay đổi Native Shell V3.110 hoặc đăng IPA mới.

## An toàn / rollback
- Không thay đổi schema hoặc xóa phòng, người chơi, luật vai trò, Seat, Character 2D/3D.
- Chỉ phát hành khi hai CI thiết yếu SUCCESS cùng commit `main`; bất kỳ lỗi nào dừng deploy.
- Rollback bằng bản Runtime / phiên bản Worker trước phát hành theo quy trình đã có; không đảo ngược dữ liệu trận.
