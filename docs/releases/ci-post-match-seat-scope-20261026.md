# GMWW — sửa phân loại CI theo phạm vi kết thúc ván / Seat
Ngày: 26/10/2026.

- Chỉ áp dụng khi PR tính năng sửa đúng ba vùng chức năng: `gmReset` ở Worker, chọn phòng/chuyển chế độ ở GM UI, và nút sau khi kết thúc ván; bản đóng gói app phải nhất quán.
- Chạy test Seat/dữ liệu sau kết thúc, Demo/Online/Offline, replay, forced end, cùng xác minh bản đóng gói. Không chạy Chrome Card, 30 Seat, build IPA hoặc test đồ họa chỉ vì file app.js lớn.
- Mọi file hoặc chức năng ngoài danh sách phải chuyển về CI toàn diện (fail closed).
- PR phân loại CI này **không sửa logic game, không deploy**. Khi CI bắt buộc của PR tính năng PASS, mới chuẩn bị bản Runtime/Server có ghi chú tiếng Việt và rollback.
