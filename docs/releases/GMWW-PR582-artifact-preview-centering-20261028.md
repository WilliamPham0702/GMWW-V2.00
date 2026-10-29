# GMWW — Căn giữa artwork Artifact (PR #582)

Ngày: 29/10/2026 — đồng bộ nhánh với main V3.273.

## Thay đổi
- Căn giữa phần artwork của Artifact có lề tối không cân xứng trong Thư viện → Mặt Player Web (màn hình GM); chỉ biến đổi hiển thị, không chỉnh sửa file ảnh gốc.
- Phát hiện lề trống bằng canvas nhỏ và áp dụng giới hạn an toàn; khi mở lá khác, chuyển sang Vai Trò hoặc gặp ảnh không đọc được, khôi phục vị trí mặc định.
- Ngăn kết quả tải ảnh bất đồng bộ của lá trước ghi đè lá đang mở.
- Giữ nguyên toàn bộ phiên bản V3.273 và thay đổi mới trên main, bao gồm Player Web của PR #597, các quy tắc, âm thanh, DO, lịch sử và IPA.

## Kiểm thử bắt buộc đúng phạm vi
- `node --test tests/artifact-preview-horizontal-centering-20261028.test.mjs` (5 ca).
- `node --check server-game/current/app.js`.
- `node .github/scripts/assemble-gm-app.mjs --verify`.
- `node .github/scripts/verify-gmww-versions.mjs`.
- Workflow: **Check Artifact artwork preview centering (PR582)** trên commit đồng bộ mới.

## Phát hành / khôi phục
- Đây là bước **đồng bộ mã và tái kiểm thử**; không tự động phát hành Production hoặc Runtime OTA trong task này.
- Không quay phiên bản về V3.263 của nhánh cũ. Khi phát hành Runtime tiếp theo, cần tăng phiên bản hợp lệ so với Production, kiểm tra SHA-256 và release gating theo quy trình hiện tại.
- Nếu hồi quy hiển thị, hoàn tác riêng helper/handler Artifact; không rollback dữ liệu hoặc nguồn artwork.
