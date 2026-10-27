# GMWW — Kiểm toán và sửa luồng âm thanh (27/10/2026)
## Thay đổi
- Thư viện Âm Thanh kiểm tra thiếu file theo cả **Vai Trò, Hành Động, Hệ Thống** trên chính thiết bị GM; không coi tên file là bằng chứng âm thanh phát được. URL ngoài chưa kiểm tra.
- Tránh audio cũ đã decode muộn phát chồng lượt mới; giải phóng lượt cũ và duy trì chuỗi âm thanh.
- Đêm → Ngày: phát “Làng ơi dậy đi” và thông báo số người chết; chỉ phát “Ngày dài rồi” lúc GM mở chế độ đề cử/chọn.
- Kết quả Sát Thủ từ Player Web được đưa vào hàng chờ, phát một lần, không cắt ngang thông báo sáng.
- Đồng hồ 30 giây cuối và Hết giờ hoạt động khi đồng hồ thực sự chạy, kể cả GM thủ công; không phát khi tạm dừng.
- Khi chốt bỏ phiếu, đọc công bố phiếu, tổng Cứu/Giết (giọng Việt có sẵn trên thiết bị) rồi đọc Chốt Sống/Chết.
## Giới hạn xác minh
- File Audio người dùng tải vào IndexedDB nằm trên iPhone GM: cần xem mục Thư viện → Âm Thanh trên máy thật để xác nhận file nào còn thiếu hoặc URL nào không tải được.
- Không thay đổi game Core, IPA, Worker Player Web, tài khoản, phòng, lịch sử hoặc bản Production.
## Kiểm thử
- Chỉ kiểm thử các luồng phát audio, chuyển pha, kết quả Player Web và tính toàn vẹn bundle; không chạy E2E không liên quan.
## Phát hành/rollback
- PR Draft, **chưa merge và chưa deploy Production**. Khi đủ CI và được duyệt phát hành, tạo Runtime OTA, SHA-256 và kiểm chứng rollback về Production liền trước.

## Kiểm toán liên kết bổ sung (27/10)
- Rà soát toàn bộ cây source GitHub, không có file MP3/M4A riêng; có một bản âm Phù Thuỷ Già nhúng từ V1.08. Metadata chứa tên file **không chứng minh có file**.
- Chọn Audio theo `kind + targetId` chính xác, chỉ riêng alias `source-18` → `role_old_witch`. Không dùng nhãn giống nhau để gán nhầm cue.
- Khi nâng OTA, lưu mọi ID audio cũ khác nhau (blob nằm trên iPhone theo ID); duyệt các ID cùng target đến khi tìm được nguồn phát thật, bỏ qua placeholder không có media.
- Thư viện hiển thị tách bạch `CÓ FILE THỰC`, `URL CHƯA KIỂM TRA`, `THIẾU FILE` và danh sách từng mục trên thiết bị; phần xem trước giữ đúng tab và ID khi load chậm.
- Khi Tiên Tri Hào Quang cần đọc **tên Vai Trò** nhưng chưa đánh dấu đoạn tên, chỉ đọc tên Vai Trò chính xác thay vì phát 5 giây ngẫu nhiên.
- File thiếu chưa thể tạo thành clip thu âm gốc nếu chúng không được tải lên hoặc nằm trong dữ liệu iPhone; không được báo toàn bộ đủ khi chưa xác minh trên iPhone.

- Bao phủ thêm toàn bộ Audio của **Artifact**, hành động Artifact và các trạng thái ban sáng (bảo vệ/cứu/hồi phục/hồi sinh/chúc phúc/khiên/đầu độc/vết cắn/nguyền rủa), có ID chuẩn và câu đọc dự phòng tương ứng.
