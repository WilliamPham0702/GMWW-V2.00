# Player Web — Chat phòng chờ, menu và tương tác (chưa phát hành)

- Cho phép thành viên đã được gọi vào phòng chat trước khi xếp Seat và trong lúc Phát Vai. Người ngoài phòng không có quyền; các nhóm chat ban đêm vẫn tách riêng.
- Sửa xung đột CSS viewport PR631: khung Chat gắn đúng menu dưới khi Chrome/Edge/Safari iPhone mở bàn phím, không bị kéo lệch bởi kiểu hộp thoại cũ.
- Menu dưới gồm đồng hồ, chat mờ và khôi phục thao tác chưa gửi. Nhấn để mở chat, tự ẩn sau 30 giây không thao tác; dữ liệu đồng bộ nền không kéo dài thời gian này.
- Tin nhắn dạng Tên: nội dung, mỗi người một màu; GM đỏ đậm. Thông cáo chỉ lấy trạng thái tiêu cực đang có hiệu lực và được GM cho công khai.
- Menu trên dùng HTML/CSS gốc của Server, cạnh avatar; lượt công khai được đồng bộ, không trao quyền điều khiển GM cho Player.
- Hiện lá ngay khi Phát Vai, kích thước thu nhỏ thêm 50%, ban đầu dưới lối vào làng. Kéo để đổi vị trí; khi mở chat, lá chuyển dưới avatar; đóng chat trả về vị trí đã lưu.
- Đặt icon hành động tại đống lửa, sửa tọa độ kéo/thả khi iframe co giãn. Thả đúng người gửi hành động qua API có kiểm tra quyền/lượt; hủy kéo không gửi.

## Kiểm chứng

Test tái hiện chat trước trận và thả icon đã thất bại trên bản cũ, qua sau sửa. Kiểm tra thêm timer 30 giây, tọa độ lá, thông cáo riêng tư, chat ngày/đêm, API hành động, bản Player đóng gói và cú pháp. Không coi đây là nghiệm thu Safari/audio; chưa kiểm tra hình ảnh trực tiếp vì tải trình duyệt trong môi trường kiểm thử thất bại.

## An toàn và rollback

Không thay đổi IPA, schema phòng, dữ liệu lịch sử hoặc phát hành Production. Không xóa các hội thoại cũ. Hội thoại trước trận tách theo resetVersion; trong trận giữ khóa matchId. Khi cần rollback, revert PR và triển khai lại bản Worker trước đó; Runtime đang phát hành vẫn V3.276.
