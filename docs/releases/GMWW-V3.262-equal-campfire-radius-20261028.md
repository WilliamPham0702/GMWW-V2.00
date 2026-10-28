# GMWW Runtime V3.262 — tất cả nhân vật đứng cách tâm đống lửa bằng nhau

## Hiện tượng iPhone
- Nhân vật phía dưới đi đến gần lửa nhưng ở phía trên chỉ di chuyển một đoạn nhỏ, vị trí dừng không đồng đều.
- Luồng V3.261 dùng bán kính ngang `rx` và dọc `ry` khác nhau và chặn riêng tọa độ từng vị trí.

## Sửa hiển thị GM
- Thay quỹ đạo hình elip bằng **một đường tròn duy nhất quanh đúng tâm nút đống lửa trên màn GM**.
- Giảm bán kính hiển thị và tính chung từ kích thước vùng chơi, tự thu trong biên an toàn; không cho vị trí dừng nằm trong lõi lửa.
- Chia 24 điểm ứng viên trên cùng vòng; chọn điểm gần hướng ghế, ưu tiên không trùng người đang đứng quanh lửa.
- Nhân vật từ trên/dưới/trái/phải đều dừng tại cùng khoảng cách tính từ tâm lửa, giữ mặt hướng lửa khi nghỉ, hết lượt chạy về Seat. Không sửa ghế hay vị trí người chơi trên server.

## An toàn và hiệu năng
- Chỉ thay thuật toán đích đi bộ GM. Không thêm timer, vòng lặp vẽ, mạng hoặc ghi Durable Objects; giữ 15 FPS low-power và Reduce Motion.
- Giữ nguyên V3.261, V3.260 Say Rượu, Audio, RULE Core, Player Web, IPA native V3.257, phòng và lịch sử.

## Chốt trước phát hành
- Unit: 4 hướng, 4 góc, khoảng cách bằng nhau, nhiều nhân vật, không chồng chỗ, đi/về và chống nóng.
- Xác minh sáu module ghép đúng app.js, Worker, version, STAGING riêng, CI bắt buộc cùng SHA.
- Runtime OTA và gói cập nhật thủ công phải có SHA-256 và ghi chú tiếng Việt.

## Rollback
- Chưa áp dụng OTA: có thể duy trì Runtime V3.261.
- Đã cài V3.262: dùng Runtime khôi phục version cao hơn, không hạ version bằng cập nhật OTA; không đụng phòng, tài khoản, dữ liệu, lịch sử.
