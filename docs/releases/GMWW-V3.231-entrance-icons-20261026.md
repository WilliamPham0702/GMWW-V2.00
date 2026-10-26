# GMWW Runtime V3.231 — Icon hành động lớn gấp đôi tại lối cầu thang

26/10/2026 · Kế thừa V3.230.

## Cập nhật
- Hình icon hành động Vai Trò/Artifact từ **40px → 80px**, vùng kéo **92px**, không nền/khung.
- Mặc định xuất hiện **ở lối cầu thang vào làng phía trên menu dưới cùng**, không còn ở đống lửa. Tọa độ neo theo mép trên của thanh điều khiển thực tế trên iPhone, có phương án dự phòng khi layout chưa sẵn sàng.
- Nhiều icon cùng lượt tự xếp thành hàng theo chiều ngang/chiều dọc, các tâm cách nhau tối thiểu 100px; không đè lên nhau.
- Giữ kéo/thả, hút người chơi, chọn nhiều mục tiêu, quay về vị trí khởi tạo, nút Khôi phục, Core và menu dưới cố định.

## Phạm vi và kiểm thử
- Chỉ UI icon GM; không đổi luật Core, Player Web, Durable Objects, dữ liệu, IPA.
- Kiểm thử phần icon và các điều kiện phát hành Worker/OTA/SHA-256 liên quan. Không chạy Chrome Card, Seat, DEMO hay build IPA không liên quan.
- Chỉ phát hành Production khi CI bắt buộc thành công.

## Rollback
Quay lại Worker/Runtime V3.230 cùng manifest SHA-256 trước đó, không thay đổi dữ liệu người chơi hay phòng.
