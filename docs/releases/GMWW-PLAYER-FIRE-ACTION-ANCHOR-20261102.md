# GMWW Player Web — Icon hành động luôn trở về đống lửa (02/11/2026)

## Lỗi tái hiện
- Ảnh nghiệm thu iPhone trên Runtime V3.289: icon Sói Cắn nằm sát góc trái dưới; đống lửa thực tế ở giữa sân.
- Nguyên nhân mã nguồn: khi kéo icon và thả ngoài mục tiêu, Player Web lưu `gmwwOnlineIconPositions` và dịch nút icon khỏi đống lửa; vùng hotspot `.fire` trong iframe nếu có tọa độ bất thường cũng bị ép ra rìa màn hình.

## Sửa
- Icon hành động luôn xuất hiện trên vùng đống lửa khi đến lượt; không lưu dịch chuyển ngẫu nhiên sau khi thả không trúng nhân vật.
- Hủy/không trúng mục tiêu: icon trở về đống lửa. Thả đúng người: tiếp tục gửi hành động tới Server như cũ.
- Ưu tiên tọa độ ngọn lửa thật trong iframe; nếu hotspot đã nằm ngoài vùng nhìn thấy thì dùng tâm sân làm dự phòng.
- Giữ lại tất cả hành động (kể cả 2 bình của Phù Thuỷ), nhãn, hiệu ứng, quyền hành động và nút Khôi phục.

## Phát hành
- Thay đổi chỉ ở Worker/Player Web, **không tăng Runtime OTA** nếu không đổi bytes Runtime GM; vẫn giữ gói V3.289 trong GitHub Releases.
- Merge và deploy Worker sau khi required CI trên HEAD cuối cùng SUCCESS; kiểm tra Production /api/health, /gmww-members-live.js và các tuyến Pages; rollback Worker trước PR nếu phát sinh lỗi.
- Bảo toàn IPA, tên miền, dữ liệu phòng và Durable Objects.
