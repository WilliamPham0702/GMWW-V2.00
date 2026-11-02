# GMWW — Đồng bộ trạng thái Player Web và tối ưu Chat (02/11/2026)

## Phạm vi
- Giữ nguyên bộ icon hành động đã được nghiệm thu, không đổi IPA/URL/DO.
- Player Web lấy lại bản chiếu trạng thái công khai từ REST sau cập nhật WebSocket, bao gồm Chết, Bị đuổi, Đánh dấu, hồi sinh/khôi phục; bảo vệ theo match và debounce để tránh truy vấn lặp.
- Khi ván đang chạy, nhân vật Player Web dừng di chuyển và không chạy vòng chuyển động tự phát. Chế độ sảnh chờ giữ nguyên.
- Trạng thái BỊ ĐÁNH DẤU có nhãn rõ ràng trên nhân vật.
- Chat ngày cao tối đa 3 lần khung đêm, nhưng bị giới hạn bởi viewport. Ban đêm giữ 90px. Nhấn ra ngoài vẫn đóng.
- Chat tiếp tục dùng chức năng công bố trạng thái tiêu cực/kết quả Sát Thủ từ backend; thông cáo và GM màu đỏ, người chơi có màu chữ riêng. Không phát tán thông tin bí mật ban đêm.
- Giữ nguyên tính năng chat thoại đang phát triển trong PR #749.

## Kiểm thử và an toàn
- Chạy test `tests/player-public-status-chat-lowheat-20261102.test.mjs` và test hồi quy `tests/player-v3-village-status-daychat-20261102.test.mjs`.
- Chạy kiểm tra ghép nguồn `tests/gmww-player-web-source-modules.test.mjs` (source parts phải khớp chính xác bản đóng gói).
- Nghiệm thu trực tiếp iPhone Safari/Chrome/Edge: chết, đuổi, đánh dấu, hồi sinh, thông cáo sáng, phân màu chat, kích thước ban ngày/ban đêm, đóng khi chạm ngoài.
- **Không merge hoặc phát hành nếu required CI chưa SUCCESS tại HEAD cuối cùng.**
- Phát hành Worker/Player Web qua AUTO-DELIVERY sau kiểm thử, giữ nguyên Production A, DNS, IPA, Runtime OTA và dữ liệu đang sử dụng.

## Rollback
- Đảo commit PR này về commit main trước merge (không đụng dữ liệu/DO).
- Xác minh lại `/api/rooms/:code`, chat, trạng thái công khai và đồng bộ WebSocket sau khi rollback.
