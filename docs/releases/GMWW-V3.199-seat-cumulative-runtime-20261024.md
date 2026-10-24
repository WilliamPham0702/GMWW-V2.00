# GMWW Runtime V3.199 — ứng viên OTA (24/10/2026)

**Trạng thái:** Đã chuẩn bị để kiểm tra trên PR; **chưa merge, chưa deploy Production, chưa thay manifest OTA đang chạy**.

## Phạm vi phiên bản
- Production đã quảng bá Runtime **V3.198** (được xác nhận bởi CI deploy của commit merge PR #453: bản ứng viên 3.198 bị chặn do không vượt Production 3.198).
- Đối chiếu lịch sử `main`: **PR #453** là PR duy nhất được merge sau mốc PR #451 phát hành V3.198; PR #443/#445/#447/#449 và các thay đổi CI trước đó đã thuộc V3.198, **không ghi đè nội dung đã phát hành**.
- **V3.199** chỉ thay đổi Runtime; native shell giữ **V3.110**. Không cần cài lại IPA.

## Changelog tiếng Việt
- **PR #453 — Tập hợp dân làng / Seat**: kéo thả cả đội hình (6–30 Seat) tới mọi mép vùng bản đồ 2–98%, không dừng ở rào cản quanh đống lửa như trước; tất cả Seat giữ nguyên tương quan.
- Giữ **Giãn cách 70–135%** và nút **🔄 Khôi phục** (về vị trí 0/0, 100%). Bỏ bốn mũi tên và dòng tọa độ. Không cho đổi Seat riêng lẻ khi kéo.
- Đồng bộ mã tọa độ cho GM iPhone, Worker và Player Web. Cache-busting để tải đúng phiên bản script.
- **OTA**: phát hành byte Runtime mới **bắt buộc tăng phiên bản**; không còn cho phép ghi đè cùng phiên bản chỉ nhờ Worker health fallback. Nếu package SHA-256 đã được xác minh và byte hoàn toàn đồng nhất, có thể xác nhận lại mà không phát hành bản mới. CI ứng viên đọc mốc live phiên bản trước khi cho PASS.

## Tạo gói và xác minh
1. CI tải bộ artwork nguồn chuẩn (đối chiếu SHA-256 trước khi đóng gói).
2. `node .github/scripts/prepare-update-channel.mjs runtime`: tạo manifest `assets/updates/latest.json` và đường dẫn `runtime/V3.199/` **trong runner**, không commit file giả hoặc hash giả.
3. `node .github/scripts/verify-prepared-runtime.mjs 3.199`: so SHA-256 **từng byte** và đối chiếu manifest, đảm bảo không có lệnh xóa.
4. CI xuất `GMWW-V3.199-OTA-CANDIDATE-SHA256-NO-DEPLOY` và `out/gmww-runtime-v3.199-sha256.json` để nghiệm thu.

## Test đúng phạm vi
- Đồng bộ version trong package-lock, Worker, GM app, GM HTML, cache, shell và release notes.
- Regression nhóm Seat 8 người / 135% / kéo qua Y -8.4, tính cứng 6–30 Seat, slider/reset; Worker/Player Web dùng chung layout.
- So bản kê SHA: cùng phiên bản nhưng khác byte ⇒ **FAIL** cả khi chỉ có Worker health; V3.199 > V3.198 ⇒ **PASS**; URL/đường dẫn thiếu hoặc SHA không hợp lệ ⇒ FAIL.
- Kiểm tra toàn vẹn build và bảo vệ dữ liệu. Không dùng check Role/Artifact, Hunter, DEMO để tuyên bố nghiệm thu riêng task Seat; cổng CI release an toàn hoạt động độc lập.

## Dữ liệu và rollback
- Không đổi schema DO, không xóa phòng, người chơi, lịch sử, hình nền, OTA đã phát hành hay IPA.
- **Chỉ merge / Production khi chủ dự án phê duyệt riêng.** Trước phát hành: rollback bằng cách đóng PR. Sau phát hành: khôi phục deployment Worker và **manifest + gói Runtime** V3.198 nhất quán, không xóa Durable Objects hoặc hạ phiên bản kiểu không tương thích.
- SHA-256 của ứng viên **phải lấy từ GitHub Actions thực tế**; không công bố giá trị tự suy đoán.
