# GMWW Runtime V3.253 — Hiệu năng & Chống nóng (27/10/2026)

## Nội dung
- Cài đặt GM → Hiệu năng & Chống nóng, mặc định **Tự động**, bật chống lịch render trùng, giảm hiệu ứng khi khung hình chậm, tạm nghỉ render khi rời sân chơi hoặc nhân vật đứng yên.
- Nhân vật nhận hành động mới sẽ đánh thức render ngay lập tức.
- Giữ nguyên 16 ô Cài đặt V3.252, game Core, đồng hồ, audio, Player Web, phòng và lịch sử. Không cần cập nhật IPA.

## Kiểm thử, phát hành & rollback
- 5 bài kiểm thử hiệu năng, cú pháp, GM source assembler, Worker CI cùng SHA.
- Runtime OTA V3.253 có manifest và SHA-256; rollback về V3.252 không làm mất dữ liệu.
- Không tuyên bố đo nhiệt iOS; theo dõi độ trễ khung hình để điều tiết đồ họa.
