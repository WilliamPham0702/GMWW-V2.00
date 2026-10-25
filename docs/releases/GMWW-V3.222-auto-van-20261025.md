# GMWW Runtime V3.222 — AUTO VÁN

Ngày phát hành dự kiến: 25/10/2026. Nguồn: **PR #504**, merge `0b398ee33b3fa9000cce6421783364c112696530`.

## Nội dung cập nhật

1. **Gợi ý Ván Mẫu theo số người:** hiển thị ván đúng số lượng trước, các ván chênh ít người xếp tiếp theo; nhãn **✓ PHÙ HỢP**.
2. **✨ AUTO VÁN:** tạo bộ vai mới mỗi lần nhấn, chỉ dùng vai đúng GMWW Core; 3–9 người có Phe Dân và Sói, từ 10 người bổ sung một vai Phe Ba; đếm tổng vai khớp 3–30 thành viên.
3. **Xem trước rồi CHỌN VÁN:** hiển thị thống kê Dân/Sói/Ba và danh sách vai. Không ghi Server khi nhấn Auto; khi Chọn Ván mới lưu Ván Mẫu có tên AUTO, kiểm tra artwork và chuyển Phân Vai.
4. **Bảo toàn:** không đổi gameplay Core, Artifact, luật Vai Trò, UI Player Web, Swift IPA hiện có, phòng/dữ liệu/lịch sử.

## Kiểm thử đúng phạm vi và chốt phát hành

- `node --test tests/auto-game-template.test.mjs` và `node --test tests/ci-browser-scope.test.mjs` (phân luồng CI); `node .github/scripts/assemble-gm-app.mjs --verify`, `node .github/scripts/verify-gmww-versions.mjs`.
- Verify `npm run check`, gói OTA Runtime, manifest `releaseType=runtime`, `releaseVersion=3.222`, SHA-256 từng file so với nội dung Production.
- Chỉ phát hành sau CI cùng commit SHA SUCCESS và preflight xác nhận V3.222 mới hơn Production; nếu không, không triển khai.
- Dòng `releaseNotes` Runtime có V3.222 rõ ràng trong biểu mẫu cập nhật.

## Rollback

- Giữ lại Cloudflare Worker deployment Production ngay trước V3.222 và gói Runtime tương ứng; nếu nghiệm thu sau phát hành không đạt, khôi phục deployment trước, đối chiếu manifest OTA/Hash và kiểm tra kết nối.
- Không xóa KV, D1, Durable Objects, phòng, vai đã phát, lịch sử, hồ sơ thành viên hoặc IPA.
- Không ép cài IPA mới; ứng viên V3.222 chỉ Runtime OTA trên shell đang dùng.
