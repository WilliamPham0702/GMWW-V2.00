# GMWW — Sửa thông báo Hiệu Ứng trên Player Web (28/10/2026)

## Phạm vi
- Server: `effect_notice` chỉ ghi nhận kết quả/hành động, không yêu cầu phản hồi thì ghi nhận hoàn tất ngay. Không gửi thông báo WS cho người chơi và không đưa vào danh sách tương tác chờ của `/me`. Hành động, lượt, trạng thái, nhật ký và dữ liệu cũ vẫn giữ.
- Player Web: các `effect_notice` kiểu cũ còn `pending` nhưng không có yêu cầu `requireAck`/`requireResponse` sẽ xác nhận âm thầm; không hiện hộp `HIỆU ỨNG / ĐÃ HIỂU`. Vẫn hiển thị các hộp lựa chọn bắt buộc, xác nhận thật, Đánh Dấu/👍👎 và trạng thái theo quyền.
- GM: số thẻ Trạng Thái được tính theo catalog thực tế (16, thay vì cố định `/15`). Các công tắc `Hiển thị Player Web` vẫn được lưu trong Server bằng `status_display` và `status_display_batch`.

## Kiểm thử liên quan
- `node --test tests/player-visual-notice-status-sync-20261028.test.mjs tests/status-visuals-v1.test.mjs`
- `node .github/scripts/assemble-player-web.mjs --verify`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node --check src/index.js`
- `node --check server-game/current/app.js`

## Phát hành / Rollback
Chưa phát hành Production, Runtime OTA hay IPA trong PR này. Khi CI liên quan đạt SUCCESS và được phê duyệt phát hành: merge nhánh mới nhất, phát hành Server + Player Web + Runtime OTA, bump version đúng chuẩn, xuất SHA-256 và xác minh Production; giữ nguyên IPA/phòng/Durable Objects/lịch sử. Rollback về bản Production ngay trước đợt phát hành, không reset dữ liệu.
