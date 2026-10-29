# GMWW — Chốt bằng chứng CI và phát hành Runtime OTA V3.274 (29/10/2026)

## Nguyên nhân
PR #613 đã merge Runtime V3.274 lên `main`. Sau PR #614, Worker và 8/8 kiểm thử Artifact đạt SUCCESS nhưng Production bị chặn vì đòi một lần chạy kiểm tra Vai Trò trên `main`, trong khi workflow này chỉ có bằng chứng SUCCESS trên commit PR #613.

## Khắc phục
- Đối chiếu đúng commit PR #613 `28f62f91`: **Check Approved Role Card Settings** và **Check GM card artwork centering** đã SUCCESS.
- Vẫn bắt buộc trên đúng commit `main` phát hành: **Check Player Web Worker**, **Check GM card artwork centering** và **CI Stability Gate** đều SUCCESS.
- Kiểm thử lại trực tiếp 8 ca Artifact, bộ chọn phạm vi CI, kiểm tra 7 module GM và đồng bộ phiên bản.
- Chỉ chấp nhận thay đổi 4 file CI/release của PR sửa chốt; mã nguồn game, hình ảnh, IPA V3.264 và dữ liệu không thay đổi.
- Phát hành đúng Runtime OTA V3.274 đã merge, tạo manifest SHA-256, gói update thủ công và xác minh Production.

## Rollback
Dừng nếu CI/SHA/Production không đạt. Nếu đã phát hành lỗi, rollback Runtime theo gói V3.273 đã xác minh, không thay IPA hay dữ liệu Room/DO/lịch sử.

## Khắc phục phát hành Git ancestry (PR #598/Runtime V3.274)
- Checkout tại `deploy-scope` chuyển sang `fetch-depth: 0` để `git merge-base --is-ancestor` xác minh được commit gốc PR #613 thay vì lỗi `Not a valid commit name`.
- Bảo toàn các chốt kiểm thử gốc từ PR #613, Worker/Artifact/CI Stability cùng SHA và phạm vi chính xác bốn file CI/release.
- Runtime V3.274 bao gồm GM/Chat đã merge từ PR #598; không thay đổi gameplay, Worker source, IPA V3.264, Durable Objects hay lịch sử. Chỉ hoàn thành sau khi SHA-256 OTA, file Runtime thủ công và Production health được xác nhận.

## Sửa sai lệch bộ kiểm chứng Character40, không đổi ảnh (29/10/2026)
- Endpoint `/api/game-characters/{id}/image` từ trước đến nay đọc `/characters/gmww40/originals/{id}.webp`, nhưng workflow Production và script nghiệm thu lại so sánh với `portraits/{id}.webp` được tạo nhỏ hơn. Đây là **hai tệp khác nhau**, không phải lỗi đồng bộ Cloudflare.
- Ở Character-01, SHA của tệp gốc trong catalog là `e02be1adc8cb5eb074e79b10c6523aeaab59ffcb0d4171bb26da357f2402a2d9`, **khớp SHA mà Production trả về**; SHA của ảnh thu nhỏ `1cce1a1067567b4dfce326797a88338fe8275dfd9735c37f2a6aebbb3c6a5f34` không được dùng để đối chiếu API ảnh gốc.
- Sửa cả hai bài kiểm tra Production để đối chiếu **ảnh gốc với ảnh gốc**; vẫn giữ SHA của 40 ảnh, atlas và file Runtime, không tắt cơ chế kiểm thử.
- Thay đổi chỉ đúng 5 file CI/test/release notes, giữ nguyên source của game, 40 ảnh Character, IPA V3.264, Durable Objects, dữ liệu người chơi và rollback.
- Chỉ phát hành GitHub Release thủ công khi workflow Production SUCCESS sau xác minh manifest và SHA-256.
