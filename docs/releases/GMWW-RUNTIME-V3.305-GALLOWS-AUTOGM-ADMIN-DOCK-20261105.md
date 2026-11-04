# GMWW Runtime V3.305 — Lên Giàn tự động · Auto GM mặc định · menu GM góc phải

Ngày: 05/11/2026 · Phạm vi: Worker (Server + Player Web + khung Làng) và Runtime GM (OTA). Không đổi IPA, URL, schema DO (chỉ thêm khóa `annCountdown`), không xóa dữ liệu.

## Yêu cầu
1. Server: người được chọn (MỤC TIÊU) chạy tại chỗ, Player Web thì không.
2. Icon hành động nằm sát menu dưới, che khung chat → đưa lên cao hơn.
3. Vào ván mặc định bật Auto GM.
4. Menu GM icon ở góc phải trên: Cứu · Giết · Cấm Chat · Auto GM, dùng lại icon hành động của game.
5. Thông cáo Làng (đang chạy trong khung chat) chạy thêm trên menu trên, sau ô "Làng ơi dậy đi".
6. Player Web không phát đếm ngược 30 giây cuối.
7. Hết giờ thảo luận game sang Đêm luôn, bỏ qua Lên Giàn.

## Nguyên nhân gốc
1. Khung Làng của Player Web khóa hoạt ảnh (`paused`) khi đang trận; không có cờ "mục tiêu chạy" như `battleTargetRunning` của GM.
4. Bộ icon GM đã có nhưng được gắn vào `<body>`, trong khi CSS chỉ áp cho `#start` → không hiện đúng chỗ; đường dẫn icon `/assets/...` khác icon trận.
6. Đếm ngược do app GM tự đẩy khi đồng hồ GM chạy tới 30s → app GM chạy nền/khóa màn hình thì Player không nhận.
7. `runAutoAdvanceIfDue` (Durable Object) khi hết giờ ban ngày gọi thẳng `applyCycle(night)` nếu phiếu Lên Giàn còn `ready`.

## Thay đổi
- Server: hết giờ thảo luận → Auto GM tự **Mở đề cử** → hết giờ đề cử **Chốt đề cử** (hòa phiếu = không ai lên giàn) → sau 5s **Mở bỏ phiếu Sống/Chết** → hết giờ công bố kết quả → 30s (hoặc GM xác nhận) mới sang Đêm. Chế độ Lên Giàn thủ công (GM) thì Auto GM chờ GM chốt.
- Server: bắt đầu ván thật luôn đặt `autoGM=true` (DEMO giữ tắt); GM cũng bật tại chỗ.
- Server: tự phát cue "Đếm ngược 30 giây cuối" tới mọi Player đúng lúc hạn ngày −30s (một lần mỗi ngày, bỏ qua khi Auto GM tạm dừng/DEMO). GM tải sẵn clip lúc sang ngày và không đẩy trùng.
- GM: menu góc phải trên 4 icon game (07 Cứu, 15 Giết, 39 Cấm nói, 31 Rung chuông = Auto GM có nhãn AUTO xanh/đỏ); gắn trong `#start`, CSS chèn từ bundle GM (không sửa style.css). Bảng Lên Giàn tự mở mỗi khi Server chuyển giai đoạn.
- GM + Player: icon hành động cách menu dưới 48px (trước 10px); Player bám theo khi mở/đóng chat.
- Player: dải 📢 Thông cáo Làng chạy trên menu trên, sau "Làng ơi dậy đi" (chỉ ban ngày).
- Khung Làng Player: mục tiêu (không phải người đến lượt, không chết/đóng băng/trục xuất) chạy tại chỗ như GM.

## Kiểm thử
- Mới: `tests/gmww-v3305-gallows-autogm-admin-dock-20261105.test.mjs` (11 bài: luồng Lên Giàn trước Đêm, hòa phiếu, chế độ GM, Auto GM khi vào ván, đếm ngược do Server, menu GM, dải thông cáo, mục tiêu chạy, vị trí icon).
- Cập nhật theo yêu cầu mới: vị trí icon (V3.228, V3.302, V3.304, 20261030, 20261031), số broadcast `gallows_updated` (P0 vote regression).
- Toàn bộ `tests/*.test.mjs` theo file: không có lỗi mới so với main (2 file lỗi sẵn: pr630-release-ci, v3186-local-village-cache).

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.304 từ GitHub Releases; không xóa dữ liệu.
