# GMWW Player Web — Sửa điều hướng sau kết thúc ván (PR #656)

## Release notes tiếng Việt
- Loại bỏ trang “Chọn Phòng” V1 khỏi Player Web. Nút cũ, lửa trại và lịch sử trình duyệt không mở lại trang này.
- Sau kết quả ván, Player Web hiển thị Làng hiện tại. Người còn giữ trong phòng theo GM được chuyển tới trạng thái Tập hợp/Setup ghế hoặc Chuẩn bị ván mới; người bị giải phóng khỏi phòng trở về Sảnh chờ.
- Bảo toàn cơ chế nhận vai, chat, đồng bộ WebSocket, refresh, reconnect và không tự tham gia lại phòng đã bị GM reset.
- Không chỉnh sửa IPA, Oracle, cấu hình Production, Durable Object, lịch sử hoặc dữ liệu ván.

## Kiểm chứng và phát hành
- Bài test: `tests/player-postgame-v1-room-retirement-20261031.test.mjs`; `tests/player-web-first-paint-cleanup.test.mjs`; `tests/player-web-receipt-patch-hotfix.test.mjs`.
- Chỉ phát hành sau required CI SUCCESS và nghiệm thu Safari/Chrome/Edge iPhone. Đây là ghi chú cho PR; chưa xác nhận Production.
- Rollback: revert riêng commit của PR #656, rebuild Player Web và triển khai lại từ bản release Production gần nhất đã xác minh; không rollback dữ liệu.
