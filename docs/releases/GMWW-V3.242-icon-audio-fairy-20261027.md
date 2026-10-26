# GMWW Runtime V3.242 — Audio icon và Dịch vết cắn Yêu Tinh

## Đã sửa
- Nhấn trực tiếp icon hành động trong trận: phát audio **Hành động** đã cấu hình trước khi mở chọn mục tiêu hoặc bảng hướng (tôn trọng công tắc tắt âm).
- Yêu Tinh: sửa điều kiện xác nhận nhầm với hành động chọn người, gây từ chối các hướng dù đã bấm. Ba nút **Dịch trái / Không dịch / Dịch phải** bằng ảnh cùng phong cách bộ icon minh họa đã duyệt (11, 50, 12), nhấn một lần gửi Server.
- Server xác thực hướng chỉ thuộc `left/none/right`, đúng actor, đúng loại thông báo, không chấp nhận mục tiêu giả. Không dịch là hành động hợp lệ không di chuyển vết cắn. Core tính toán vết cắn dựa trên seat thực tế, không thay luật.
- Luồng OK audio xác nhận sau Server ACK và Undo giữ nguyên.

## Phạm vi
GM Runtime battle icon, audio và Yêu Tinh; điểm kiểm tra Server nhỏ liên quan đúng hành động. Không sửa Player Web, luật soi/sói, dữ liệu Durable Objects, IPA.

## Kiểm thử và phát hành
Kiểm tra: bấm icon audio; ba hướng + không chọn; payload và giới hạn Server; ghép 6 source GM; Worker CI same-SHA; đóng gói OTA SHA-256, Production health. Không mở Chrome Card, Seat/DEMO, Native IPA hay 3D không liên quan.

**Phát hành chỉ khi CI bắt buộc SUCCESS.** Rollback V3.241 bằng Worker deployment trước; không xóa dữ liệu người chơi, phòng, lịch sử, localStorage hoặc IndexedDB.
