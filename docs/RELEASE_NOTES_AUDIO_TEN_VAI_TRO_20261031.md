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
