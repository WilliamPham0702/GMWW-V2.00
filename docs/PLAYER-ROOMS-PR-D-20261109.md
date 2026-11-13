# Phòng online người chơi — PR-D: AutoGM tự kết thúc ván (09/11/2026)

- Phòng người chơi (`playerRoom`) tự kết thúc khi `computeWinProposal` ra phe thắng: gọi `gmEnd` nội bộ (idempotent), phòng về sảnh, lịch sử ván được ghi như bình thường.
- Kiểm tra ở mỗi lần AutoGM tới hạn (`runAutoAdvanceIfDue`), chỉ với phòng người chơi đang `running`. Phòng GM không đổi.
- Chủ phòng có thêm `POST /api/player-rooms/:code/owner/end` để kết thúc sớm (không ghi phe thắng). Chỉ khi ván đang chạy.
- AutoGM đã bật mặc định từ PR-A; ván đêm 1 khởi động ở PR-C.
- Chưa làm: Quả Cầu/vật phẩm (v1 không chia artifact).
- Test: `tests/player-room-autoend-20261109.test.mjs` (6).
