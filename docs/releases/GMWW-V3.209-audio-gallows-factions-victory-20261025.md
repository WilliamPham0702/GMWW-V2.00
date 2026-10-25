# GMWW Runtime V3.209 — Audio lượt / Lên Giàn / Thống kê phe / Phe thắng
Ngày 25/10/2026. Chỉ Runtime và Player Web, Native IPA shell V3.110 không đổi.

## Nội dung triển khai
- Phát gọi Vai Trò theo lượt sau khi đồng bộ Server ổn định; không đánh dấu đã phát quá sớm trong lúc chuyển lượt. Thêm cơ chế thời điểm bản phát theo lượt, tránh trường hợp Phù Thuỷ Già không phát khi từ Sói hoặc đầu Đêm 2.
- Tiên Tri Hào Quang đọc 'Người bạn soi là' + đoạn Tên vai trò, mặc định lấy từ giây 0 đến giây 5. Nếu đã lưu đoạn Tên thì dùng đúng start/end, ưu tiên WebAudio và timer cắt không phụ thuộc `timeupdate` trên iPhone. Đoạn Tên có thể tinh chỉnh trong Thư viện.
- Ngày dài phát đầu buổi Ngày, chuỗi công bố phiếu/giết/cứu phát theo kết quả được Server chốt; tránh tiếng Xác nhận lặp khi đang đề cử và vote. Trang Lên Giàn có 4 đường dẫn upload từng audio cho người có file trên máy: Ngày dài, Kết quả phiếu, Sống, Chết.
- Số đề cử công khai lấy từ `gallowsSnapshot.nominationTotals` Server, hiển thị bằng ngọc trai nổi trên Character của GM và Player Web. Không gửi thông tin phe, vai trò qua Player Web.
- Kết luận Lên Giàn là bảng Sống/Chết, hẹn tự đóng 30 giây tính từ `resolvedAt` do Server xác nhận, hoặc GM chạm xác nhận để chuyển sang Đêm tiếp. Core giữ cổng Ngày→Đêm và ngày/đêm tự động theo timestamp, DEMO dùng cơ chế thời gian riêng.
- Thống kê ⚖️ là màn hình chỉ GM xem, hiển thị quân số còn/tổng của từng phe từ assignments riêng GM và hiệu ứng Server; dự báo ngày thắng chỉ là phép ước tính quân số có nêu giả định, không coi là kết quả đã xác định.
- Giao diện phán quyết và màn hình thắng phong cách biển, giữ lại Server-authoritative `winnerFaction` và đồng bộ Player Web; chuyển động nhẹ và hỗ trợ Reduce Motion.

## An toàn và giới hạn
- Không đổi schema Durable Objects, không xóa lịch sử/phòng/role/artifact, không thay gameplay khác, Seat, Core 3D hoặc IPA.
- Không có audio nhị phân mới được tạo/upload thay cho file người dùng: các slot liên kết có thể còn trống nếu thiết bị chưa nạp.
- Không thể tự nhận diện chính xác tên được đọc ở giây nào nếu audio không có transcript; mặc định 5 giây, GM tinh chỉnh bằng công cụ Tên.
- Theo yêu cầu chủ dự án: không chạy bộ kiểm thử gameplay mở rộng; chỉ giữ cú pháp/assemble, phiên bản/OTA và SHA-256 cũng như chốt phát hành Production. Nếu phát hiện chốt bắt buộc không đạt, không deploy và báo lỗi.
- Rollback: chọn bản Cloudflare Worker Production trước đó; dữ liệu Durable Object giữ nguyên.
