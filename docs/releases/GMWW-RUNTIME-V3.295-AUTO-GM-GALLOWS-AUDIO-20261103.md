# GMWW Runtime V3.295 – Sửa Auto GM Ban Ngày + Audio (03/11/2026)

## Lỗi được báo
- Auto GM hết giờ thảo luận bỏ qua Mở đề cử → Chốt đề cử → Mở bỏ phiếu → Chốt bỏ phiếu → Công bố kết quả; đi thẳng sang đêm.
- GM không nghe audio sau khi một vai hoặc giai đoạn tự chuyển.

## Thay đổi
- Server Durable Object điều khiển lần lượt: thảo luận hết giờ → Mở đề cử → Chốt đề cử → Hiển thị ứng viên → Mở bỏ phiếu → Chốt bỏ phiếu → Công bố kết quả (giữ kết quả tối đa 30 giây) → Đêm mới.
- Đề cử hòa hoặc không có đề cử hợp lệ: không treo ai; công bố kết quả rồi mới sang đêm. Phiếu cứu/giết hòa: người chơi sống.
- Chế độ GM chọn thủ công không tự tạo đề cử/vote; không nhảy đêm nếu Auto GM chưa hoàn tất Lên Giàn.
- Thời gian thảo luận ban ngày 0 giây sẽ mở đề cử, không bỏ qua quy trình.
- Giữ hàng đợi audio trong cả một Ngày; không làm rơi audio khi đổi giai đoạn. Đọc cue đóng đề cử; retry theo đúng sự kiện chuyển lượt ban đêm Server. iOS cần âm thanh bật và phiên có tương tác để trình phát tự khởi động đúng chính sách hệ điều hành.

## Nghiệm thu bắt buộc
- Worker E2E trên workerd cục bộ với dữ liệu giả và WebSocket: kiểm tra thứ tự các giai đoạn, người chơi đề cử/bỏ phiếu, kết quả, 30 giây công bố và chuyển đêm.
- Test audio queue không bị xoá khi chuyển giai đoạn, test đóng góp cùng một lần/không trùng; kiểm tra nguồn đã đóng gói.
- Required CI SUCCESS trên HEAD cuối; Production deploy, xác minh health và version; runtime OTA file kèm SHA-256.
- Nghiệm thu nghe audio thực tế trên iPhone vẫn phải xác nhận; CI không thể bảo đảm iOS cho phép autoplay trong mọi chế độ.

## An toàn và rollback
- Giữ nguyên ba tính năng V3.293 đã ĐẠT: Sát Thủ 👍👎, tác động realtime GM, vòng ⭐🔥.
- Không đổi IPA, DNS, Cloudflare B, quyền riêng tư, vai trò hoặc dữ liệu thật.
- Snapshot Worker Production trước triển khai; có thể rollback Worker và Runtime từ GitHub Release liền trước, bảo toàn ván và lịch sử.
