# GMWW Runtime V3.216 — Sửa Audio Phù Thuỷ Già / thức dậy Ban Ngày / Chốt Lên Giàn
Ngày 25/10/2026 · Phạm vi GM Runtime/OTA, giữ IPA shell V3.110.

## Lỗi và khắc phục
1. **Phù Thuỷ Già không phát khi qua lượt hoặc đầu Đêm 2.** Các ván cũ có thể gửi mã role `source-18`, còn Audio đã được di chuyển tới `role_old_witch`. Bộ đọc Audio chuẩn hóa riêng mã cũ sang mã mới, giữ nguyên gameplay/role IDs và ưu tiên voice ROLE:source-18 đóng gói từ V1.11 khi máy chưa có file. Bỏ đánh dấu lượt phát thành công quá sớm; có hai lần thử lại hữu hạn khi phát lỗi, với WebAudio đang mở khóa và tiếng đọc dự phòng nếu phát file trên iPhone không khởi động.
2. **Đêm → Ngày thiếu “Làng ơi dậy đi”.** Chuyển cue `audio_system_day_wakeup` lên đầu chuỗi đọc thông cáo mỗi khi Server đã xác nhận bước Ngày. Không gắn lời đọc vào bước `village-wakeup` Ban Đêm có thể bị Server/Auto GM chuyển qua trước khi khách nhận. Thứ tự: “Làng ơi dậy đi” → “Ngày dài rồi” (nếu có file) → thông báo ngày.
3. **Chốt Sống/Chết gán sai vị trí âm thanh.** Hai nút gán file chỉ ở **Thư Viện → Âm Thanh → Hệ Thống**, không đặt trong bảng Lên Giàn; hệ thống dùng `audio_system_gallows_result_saved` cho SỐNG, `audio_system_gallows_result_dead` cho CHẾT. Trong Thư Viện Hệ Thống có 5 ô chuyên biệt: Làng ơi dậy đi, Ngày dài, Công bố phiếu, Chốt Sống, Chốt Chết; chạm là chọn file trực tiếp vào đúng ô hệ thống, không phụ thuộc tab Audio khi iOS Files đang mở.

## Hành vi/giới hạn
- Các file audio / URL / đoạn Tên đã gán được giữ nguyên trong thư viện; không thay thế hoặc xóa.
- Không đụng Core luật, trò 3D, Player Web gameplay, Seat, dữ liệu Durable Object.
- Không có tệp âm thanh nhị phân người dùng đính kèm nên không thể xác thực giọng của file hiện có trên iPhone. Fallback dùng tiếng đọc hệ thống nếu không thể phát file.
- Chỉ xác nhận tính nhất quán mã nguồn/GM assembled bundle, cú pháp và phiên bản phát hành/manifest SHA-256. Không mở các kiểm thử gameplay không liên quan.
- Rollback: quay lại Cloudflare Worker bản V3.215 bằng lịch sử deployment; giữ DO và dữ liệu.

## Nghiệm thu gợi ý
A. Đêm 1: sau “Bầy Sói”, Phù Thuỷ Già phát audio đúng một lần khi đến lượt; Đêm 2 là vai trò đầu vẫn phát.
B. Kết thúc Đêm và chuyển Ngày: lần đầu nghe “Làng ơi dậy đi”; “Ngày dài rồi” tiếp theo nếu được nạp, không phát hai lần.
C. Tại Thư Viện → Âm Thanh → Hệ Thống, tải hai file Sống và Chết khác nhau; khi chốt Lên Giàn, hệ thống phát đúng file ứng với kết luận.
