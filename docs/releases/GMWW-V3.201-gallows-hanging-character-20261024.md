# GMWW Runtime V3.201 — Character bị treo Lên Giàn

**Ngày:** 24/10/2026
**Trạng thái:** Ứng viên Runtime OTA. Chỉ merge/deploy khi CI liên quan + SHA-256 PASS; chủ dự án đã yêu cầu cập nhật server sau hoàn thành.

## Thay đổi

- **Khi nào xuất hiện:** sau khi chọn một người lên giàn từ kết quả đề cử và bắt đầu bỏ phiếu trong chế độ **Tự động**, hoặc ngay khi GM lựa chọn người lên giàn trong chế độ **Thủ công**.
- **Hiển thị:** Character hiện có bay lên phía trên **đống lửa của giao diện đang dùng**, treo lơ lửng với dây treo và chuyển động vùng vẫy nhẹ. Không thay avatar, không di chuyển tất cả ghế và không thay tọa độ Seat.
- **Đồng bộ:** Durable Object phát `gallows_updated` chứa `hanging:{active,candidateId,stage,startedAt}` có phân quyền GM; Player Web nhận trực tiếp và truyền trạng thái xuống iframe Làng. Khi refresh/reconnect, snapshot cũng phục hồi trạng thái đang treo.
- **Tự động:** giữ người treo trong giai đoạn `voting` và `closed` của phiếu; `resolved` sẽ gỡ treo.
- **GM Thủ công:** GM thay đổi lựa chọn thì nhân vật cũ trở lại vị trí và nhân vật mới treo lên; chọn Cứu/Giết chốt kết luận thì gỡ treo.
- **Hủy/khôi phục:** đổi chế độ, Khôi phục Lên Giàn, rời phase Ngày/đổi ván tự bỏ hiệu ứng; trạng thái chỉ được suy ra từ ballot hiện hành chứ không tồn tại riêng ngoài dữ liệu game.
- **Hiệu năng:** CSS transform và transition, không thêm Sprite, Canvas vòng lặp hay Poll; tôn trọng `prefers-reduced-motion`. Giữ quy tắc 6–30 Seat.
- **Không thay đổi:** luật biểu quyết, dữ liệu người chơi, vai trò/Artifact, âm thanh, phòng, Durable Objects, tính năng Arena 3D đang nghiên cứu.

## Kiểm thử liên quan

- `tests/gallows-hanging-character.test.mjs`: GM manual selection/auto vote, candidate, kết luận, mode switch, bảo vệ Seat, bridge Player Web và CSS.
- `.github/workflows/check-gallows-redesign.yml`: kiểm thử Lên Giàn và xác thực ghép nguồn GM/Player Web.
- `.github/workflows/prepare-runtime-v3201-candidate.yml`: hash manifest V3.201 lớn hơn Production V3.200; chặn phát hành byte mới cùng phiên bản.

## Phát hành và rollback

- Worker, GM và Player Web chạy Runtime **V3.201** qua OTA; IPA chính thức giữ **V3.200** và shell nền **V3.110**, không cần tạo IPA mới.
- Chạy CI, manifest SHA-256, rồi deploy Production sau khi merge. Xác minh `/api/health` và `/api/update/manifest` đều V3.201, xem Character từ GM + Web trên cùng phòng.
- Rollback Cloudflare Worker về bản trước nếu gặp lỗi, bảo toàn toàn bộ Durable Objects/phòng/lịch sử. Không ghi đè file V3.201 cùng version bằng byte khác.
