# Phòng online người chơi — PR-E: giao diện Player Web (09/11/2026)

- Nút tròn tím "＋" (chỉ khi đã đăng nhập) mở bảng **Phòng của tôi**.
  - Chưa có phòng: nhập tên (tuỳ chọn) → TẠO PHÒNG → tự vào phòng làm người chơi.
  - Là chủ phòng (sảnh): chọn Ván Mẫu, Khoá/Mở ghế, Chia ghế ngẫu nhiên, Kick, BẮT ĐẦU VÁN.
  - Đang chơi: KẾT THÚC SỚM. Ván tự kết thúc khi có phe thắng (PR-D).
- Chủ phòng không thấy vai của ai; bảng chỉ gọi `/api/player-rooms/*`.
- `ownerToken` lưu ở trình duyệt (khoá `gmwwOwnedRoom`), xoá khi phòng đóng.
- Người khác vào phòng bằng danh sách phòng/mã phòng sẵn có.
- GM (gm0702) đã có bảng quan sát sẵn (Cứu/Giết/Câm/Auto) vào được mọi phòng, gồm phòng người chơi.
- Nguồn: `src/player-web-src/37-player-rooms.part`; đã build lại `src/gmww-members-live.js`.
- Test: `tests/player-room-ui-20261109.test.mjs` (5).
- Chưa test trên thiết bị thật.
