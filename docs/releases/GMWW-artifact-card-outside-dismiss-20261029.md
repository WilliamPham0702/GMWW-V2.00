# GMWW Runtime OTA V3.275 — Artifact preview & đóng cửa sổ khi chạm ngoài (29/10/2026)

- Căn lại vùng tiêu đề Mặt Player Web của mọi lá Artifact/Vai Trò: cho phép xuống dòng, tự co chữ theo chiều rộng **và chiều cao**; không bị cắt tên ở mép iPhone.
- Tăng khả năng nhận biết dải đen bất cân xứng khi artwork có đốm sáng trang trí; giữ trần bảo vệ không cắt ảnh gốc, không thay tỷ lệ và không ghi đè ảnh đã lưu.
- Đồng bộ chính sách chạm ngoài cho 10 sheet GM Server (Chọn Ván, Tạo Phòng, GM, Thành Viên, Seat, Roster, Kết thúc, v.v.), Chat 🦩, panel Cloudflare, Phân Vai, menu chọn Seat và trình xem mặt trước lá; nhấn trong khung giữ nguyên.
- Không tự xác nhận hành động, lưu/xóa dữ liệu hoặc đóng mặt sau khi đang biên tập. Các popup chiến đấu vẫn áp dụng logic chạm ngoài hiện hữu.
- Không đổi luật, dữ liệu Production, Player Web hay IPA. Phát hành V3.275 chỉ sau CI đúng phạm vi SUCCESS trên PR và cùng SHA main, xác minh manifest SHA-256 và rollback V3.274.

## Kiểm thử phạm vi
- `node --test tests/artifact-preview-horizontal-centering-20261029.test.mjs tests/gm-card-fit-outside-dismiss-20261029.test.mjs`
- `node .github/scripts/assemble-gm-app.mjs --verify`; `node --check server-game/current/app.js`
- Kiểm tra iPhone Safari: ba lá trong ảnh, tên dài, đốm sáng ở dải tối, chạm trong/ngoài sheet, thoát khi đang nhập.
- Rollback: revert PR trước phát hành hoặc trở về Runtime OTA Production đã xác minh gần nhất sau khi có bản phát hành; không thay đổi kho dữ liệu.
