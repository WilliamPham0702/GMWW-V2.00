# GMWW Runtime V3.304 — Icon ở lối cầu thang · menu ngày Player gọn · audio ngày đồng bộ

Ngày: 04/11/2026 · Phạm vi: Worker (Server + Player Web) và Runtime GM (OTA). Không đổi IPA, URL, schema DO (chỉ thêm khóa `annDay`), không xóa dữ liệu.

## Yêu cầu
1. Icon hành động chuyển từ đống lửa xuống lối cầu thang vào làng, ngay trên menu dưới — cả GM và Player Web.
2. Player Web ban ngày: bỏ ô "Thông cáo Làng" và "Lên Giàn" trên menu trên.
3. Audio vai trò đã đồng bộ, nhưng audio ban ngày không phát/không thông báo trên Player Web.

## Nguyên nhân gốc (3)
Hàng đợi audio ban ngày của GM (`battleQueueDayAudio`: Làng ơi dậy đi, số người chết, Lên Giàn, đếm ngược/hết giờ…) chỉ phát trên máy GM. Server chỉ biết một clip "Làng ơi dậy đi" lúc sang ngày nên Player Web không nghe các thông báo ngày.

## Thay đổi
- GM + Player: điểm neo icon = giữa màn hình, mép dưới cách menu dưới 10px; nhiều icon xếp lên trên, không che menu; ẩn/hiện menu không làm icon nhảy.
- Server: `publicTimeline` ban ngày của Player chỉ còn bước "Làng ơi dậy đi".
- GM: mỗi lần xếp hàng audio ngày → tải clip (chỉ clip mới) → gửi một cue ngày (tối đa 12 clip hệ thống, không nhận clip vai/artifact) kèm độ trễ so với lúc GM bắt đầu phát. Server lưu `annDay` theo ván + chu kỳ và tự đẩy `announcement_ready` tới mọi Player; Player phát nối tiếp theo giờ Server.

## Kiểm thử
- Mới: `tests/gmww-v3304-entrance-icons-day-audio-20261104.test.mjs` (vị trí icon GM/Player, menu ngày, cue ngày: lọc clip, đẩy tới Player, giờ bắt đầu, đổi chu kỳ không phát lại, ban đêm từ chối).
- Cập nhật theo yêu cầu mới: test vị trí icon V3.228 / V3.302.

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.303 từ GitHub Releases; không xóa dữ liệu.
