# GMWW Player Web — Audio lượt vai trò lúc phát lúc không (06/11/2026)

Phạm vi: Player Web (Worker). Không đổi IPA, Runtime GM, DO schema, URL, dữ liệu.

## Triệu chứng
Server vẫn phát audio đúng lượt nhưng Player Web khi có khi không phát, lặp lại nhiều lần.

## Nguyên nhân gốc (35-online-chat.part)
1. Cue cũ từ poll `/me` (5 giây/lần) đến sau cue lượt mới do WebSocket đẩy → `gmwwChatAnnounce` ghi đè cue mới, cắt audio lượt mới và mất clip đang chờ.
2. Cue đến muộn sau khi clip đã hết trên Server (poll chậm, socket ngủ) → Player tính vị trí vào clip vượt độ dài rồi bỏ qua im lặng và đánh dấu đã phát, dù lượt vẫn đang chạy.

## Thay đổi
- Bỏ qua cue có `startedAt` cũ hơn cue đang chờ của cùng phòng.
- Cue đến muộn nhưng trong 8 giây sau khi clip hết: phát từ đầu; muộn hơn (người vào lại giữa chừng): không phát lại. Vào giữa clip vẫn vào đúng vị trí của Server (như cũ). Áp dụng cho cả WebAudio và HTMLAudio dự phòng.

## Kiểm thử (đúng phạm vi)
`tests/gmww-announcement-late-cue-sync-20261106.test.mjs` (tái hiện trước sửa: 2 FAIL; sau sửa: PASS) + `gmww-v3302-player-sync-five-fixes` + `gmww-v3305-gallows-autogm-admin-dock` (kiểm tra audio liên quan). `assemble-player-web.mjs --verify` PASS.

## Rollback
Rollback phiên bản Worker trước trên Cloudflare (gmww-v2-00). Không cần đổi dữ liệu.
