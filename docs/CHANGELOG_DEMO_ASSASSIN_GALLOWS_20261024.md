# GMWW — Bản sửa DEMO Sát Thủ, soi xét, audio và quyền bỏ phiếu
Ngày chuẩn bị: 24/10/2026. Trạng thái: PR nháp, **chưa phát hành**.

## Nội dung sửa
- **Sát Thủ:** giữ bí mật dấu GM chọn ban đêm. Buổi sáng, DEMO tự mô phỏng phản hồi 👍/👎 theo cùng API xử lý Player Web; lưu dấu người chơi đã chọn và kết luận sống/chết vào lịch sử. Online/Offline tiếp tục nhận câu trả lời thật từ Player Web.
- **Soi xét nhiều người:** Nhà Tinh Thần Học chọn 2 mục tiêu khác nhau; Kẻ Thổi Sáo/Cáo Soi cần 3; các hành động khác tôn trọng cấu hình. Server từ chối kết quả soi xét thiếu mục tiêu trước khi thay đổi dữ liệu. Kết quả soi xét chỉ trả cho GM.
- **Audio Nhà Tinh Thần Học:** âm thanh CÙNG PHE/KHÁC PHE đã liên kết phát trước, sau đó lần lượt phát đoạn mở đầu 3–5 giây của file gọi thức từng vai trò được soi. Ưu tiên điểm cắt đã lưu; mặc định 4 giây. Tham khảo cơ chế `playRoleName`/ `playSegment` trong IPA V1.11 người dùng cung cấp. Không sao chép nội dung IPA cũ vào repo.
- **Lên Giàn:** người đang treo không được tự chọn Cứu/Giết, kể cả GM manual proxy; người chết/bị đuổi vẫn bị Server loại khỏi danh sách hợp lệ. Không tính phiếu tự bỏ của bản cũ vào kết quả. Player Web ẩn/vô hiệu hóa lựa chọn không hợp lệ.
- Áp dụng cho logic chung Online/Offline/DEMO ở những chức năng được chia sẻ.

## Kiểm thử giới hạn phạm vi
`node --test tests/demo-assassin-gallows-divination.test.mjs` và kiểm tra syntax các module có sửa. Không chạy Seat, Chrome Card, OTA, IPA hoặc Arena 3D.

## An toàn & rollback
Không thay đổi schema Durable Object, tài nguyên đã triển khai, dữ liệu cũ, IPA hay Production. Nếu có vấn đề sau khi merge/phát hành, quay về commit trước PR; không xóa lịch sử phòng/ván.

**Chưa thực hiện:** nghiệm thu iPhone/Player Web và phát hành Runtime. Cần có CI liên quan SUCCESS trước khi đề xuất merge.
