# GMWW – Chơi nhanh: khôi phục điều khiển trận Player Web (14/11/2026)

- Chỉ sửa giao diện Player Web, không thay engine đêm/ngày/Lên Giàn, quyền API, luật thắng, IPA/Runtime, URL, dữ liệu thật.
- Thanh chuẩn bị được thay bằng menu trận: đồng hồ theo giờ server, hành động, Chat/Thông cáo, Lên Giàn/Khôi phục, Audio và Điều hành/Vai trò.
- Trên iPad/iPhone, timeline trận hiện liên tục khi Chơi nhanh đang RUNNING.
- Icon hành động của người bị đóng băng bị vô hiệu; server đã có kiểm tra chặn `ACTOR_CANNOT_ACT`, bổ sung test chủ động.
- Audio dùng đúng cơ chế phát clip của GMWW hiện có, **không tự tạo giọng/clip thay thế**. Nếu phòng không có clip do GM Server từng nạp, hiển thị chẩn đoán; cần khắc phục nguồn clip riêng trước khi xác nhận audio ĐẠT.
- Kết quả thắng vẫn được xử lý bởi `playerRoomAutoEnd` và `showResult`; cần nghiệm thu một ván thật.
- Rollback: phục hồi Worker version ngay trước thay đổi trên Cloudflare; giữ DO/dữ liệu thật và URL không đổi.
- Chỉ merge/deploy khi required CI SUCCESS cùng SHA và Production smoke/rollback an toàn.
