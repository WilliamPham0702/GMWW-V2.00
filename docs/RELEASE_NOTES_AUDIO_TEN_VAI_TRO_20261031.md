# GMWW — RELEASE NOTES V3.281 (DỰ KIẾN) — AUDIO TÊN VAI TRÒ

Ngày: 31/10/2026 · Phạm vi: Thư Viện → Âm Thanh → Vai Trò và kết quả soi Tiên Tri Hào Quang.

## Thay đổi
- Bỏ công cụ **cắt đoạn Tên** từ file gọi vai (các mốc cắt cũ không còn được dùng).
- Mỗi vai trò được gắn **hai nguồn âm thanh độc lập**: `Tên` và `Full`.
- Giao diện: **▶ Tên**, **▶ Full**, **Thay thế** (chọn tải file hoặc liên kết HTTPS riêng cho từng nguồn).
- **Tiên Tri Hào Quang**: phát lời dẫn “Người bạn soi là”, tiếp theo là toàn bộ file **Tên** của vai trò được soi. Không phát nhầm file gọi vai “ơi dậy đi”.
- Nếu chưa có audio Tên, thử đọc đúng tên bằng giọng tiếng Việt của thiết bị (không cắt hoặc phát audio Full).
- File Full và audio vai trò đã có không bị ghi đè cho tới khi GM chủ động chọn thay thế. Tên cũ đang lưu theo mốc cắt bị bỏ qua, dữ liệu không bị xoá tự động.
- Giữ nguyên IPA, luật Game, Oracle và dữ liệu Production.

## Kiểm thử / nghiệm thu
- Kiểm thử đúng phạm vi: hiển thị nút và gắn nguồn độc lập; không phát nhầm file Full; trình tự Tiên Tri Hào Quang; hồi quy âm thanh gọi vai.
- Cần xác minh nghe thật trên iPhone đối với file Tên do GM tải lên hoặc liên kết. URL ngoài cần thử phát trực tiếp.
- Chưa phát hành Production; mã phiên bản ứng viên V3.281, bản hiện hành trong main là V3.280. Chỉ merge và OTA sau khi CI SUCCESS, nghiệm thu an toàn và chủ dự án phê duyệt.

## Rollback
- Revert commit thay đổi trên PR này trước khi phát hành, hoặc quay về Runtime OTA production đã xác minh gần nhất.
- Audio Full cũ lưu nguyên vẹn trừ khi GM tự chọn “Thay thế Full”.

## An toàn xóa Audio (31/10/2026)
- Dòng Audio chỉ hiển thị tên và các nút Play Tên / Play Full / Thay thế / Xóa, bỏ ghi chú file bên dưới.
- Trước khi xóa hỏi xác nhận rõ tên mục, có thể chọn HỦY.
- Xóa nay chỉ chuyển mục vào **Thùng rác Audio**; **không xóa file âm thanh** trong IndexedDB, giữ nguyên file Tên và Full.
- Cho phép khôi phục từng mục bị xóa; tránh ghi đè file đã gắn lại sau đó.
- Bảng đối chiếu có nút sao chép danh sách nguồn thiếu, phân biệt thiếu nguồn với đã xóa; chỉ xác minh file trên thiết bị mới biết file nào thực sự còn.
- File bị xóa bằng các phiên bản cũ không thể cam kết phục hồi nếu binary đã bị xóa khỏi IndexedDB và không có bản sao lưu.

## Đối chiếu liên kết Audio theo Vai Trò
- Thay bảng **File thực còn thiếu** bằng **Vai Trò chưa liên kết Audio Full** và **Vai Trò chưa liên kết Audio Tên**; hai nguồn được đếm độc lập.
- Một vai trò có liên kết file tải lên, URL hoặc nguồn tích hợp vẫn được xem là **đã liên kết**, ngay cả khi tệp cục bộ sau đó bị mất; báo cáo không khẳng định khả năng phát.
- Danh sách chi tiết hiển thị **tên Vai Trò** và nút **Gắn Audio** mở đúng phần Thay thế để chọn file hoặc URL.
- Có thể sao chép danh sách Vai Trò chưa liên kết (kèm ID) để bổ sung audio. Không tự gán audio sai vai, không xoá file.
- Trạng thái 33 Audio thiếu nguồn trong bản trước không được suy ra là 33 Vai Trò chưa liên kết; số mới phải kiểm tra từ dữ liệu thực trên iPhone.

## V3.283 — Bản sửa không nhấn được nút Audio trên iPhone
- Sửa dùng nhầm bộ chọn 1 phần tử `$()` thay vì danh sách `$$()` trong bước gắn sự kiện của Audio Vai Trò.
- Không còn ngắt gắn handler Play Tên, Play Full, Thay thế, Xoá khi xuất hiện danh sách Vai Trò chưa liên kết Audio.
- Thêm regression test mô phỏng render danh sách thiếu liên kết và thao tác 5 nút Play Tên/Full, Thay thế, Xoá, Gắn Audio.
- Chỉ đóng gói bản QA; chưa phát hành Production khi CI / iPhone nghiệm thu chưa đạt. Bảo toàn IPA, Oracle, dữ liệu. Rollback về bản Runtime đã nghiệm thu.
