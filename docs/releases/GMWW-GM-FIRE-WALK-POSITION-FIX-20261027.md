# GMWW GM — Sửa nhân vật chỉ quay mặt, không đi ra đống lửa
- Tái hiện phản hồi iPhone: lượt Yêu Tinh hiển thị **ĐẾN LƯỢT** nhưng nhân vật đứng tại Seat.
- Nguyên nhân kỹ thuật: hoạt ảnh cũ ghi đè `transform` căn ghế của CSS immersive. Thay sang thuộc tính CSS `translate` độc lập, không thay `transform`/tọa độ seat, trả lại `translate` về 0 khi chạy về.
- Khi tới đống lửa, người hoạt động quay mặt về phía lửa và đứng yên; hết thời gian hoặc hết lượt dùng atlas Run quay lại chỗ cũ.
- Điều khiển Đi bộ dùng key cài đặt riêng, mặc định bật, không bị trạng thái tắt từ tính năng Bay/Chạy trước đây.
- Vẫn tối ưu 15 FPS khi chuyển động, dừng Canvas khi idle; không đổi Player Web, Core, Durable Objects hoặc IPA.
- Test thêm thay đổi thực tế trên tọa độ DOM (không chỉ đổi mặt), góc bản đồ, chuyển lượt và về đúng tọa độ ban đầu.
- Rollback: quay lại commit Production trước PR hotfix, không di chuyển dữ liệu; nếu đã OTA phải tăng version khôi phục.
