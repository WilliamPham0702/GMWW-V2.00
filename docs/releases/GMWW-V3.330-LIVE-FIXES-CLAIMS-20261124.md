# GMWW Runtime V3.330 — Sửa chế độ LIVE + bot nhận vai, phản biện, uy tín

Ngày: 24/11/2026.

1. Đồng hồ hành động luôn 00:00 (Demo/Live chạy trên server): server báo đồng hồ đang chạy là "tạm dừng 0 ms". Nay gửi `null` khi đang chạy; GM Server dùng hạn của đồng hồ Demo khi cần.
2. Nút LIVE riêng trong Menu GM: phòng Live hiện nút LIVE đỏ (● nhấp nháy khi chạy), không có ×1/×2/×5/×10; server khóa Live ở ×1.
3. Ban ngày bot nói chuyện ngay từ đầu giờ thảo luận (rải đều 4%→90%), mở màn bằng phản ứng đêm qua (có người chết / không ai chết), 5–12 câu thảo luận.
4. Bot nhận vai: Tiên Tri thật nói kết quả soi đêm qua ("Tôi là Tiên Tri, đêm qua soi số 12 ra Sói"); Phù Thuỷ thật kể nạn nhân bị cắn, có cứu hay không, "sao số 3 vẫn sống?" và người đó tự bào chữa; Sói diễn giỏi có thể nhận Tiên Tri giả/phản biện. Bot khác tin / không tin theo uy tín + tính cách. Uy tín tăng/giảm trong ván; điểm nghi ảnh hưởng đề cử và bỏ phiếu của bot.
5. Số ghế dưới chân nhân vật trong phòng Live để người xem bình luận theo số; lời thoại bot gọi "số N".

Không đổi luật chơi, dữ liệu, DO, URL, IPA. Rollback: cài lại Runtime V3.329.
