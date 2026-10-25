# GMWW Runtime V3.220 — Khắc phục icon hành động trong trận

Ngày: 25/10/2026. **Ứng viên OTA – chưa triển khai Production.**

## Thay đổi
- Khi GM vào lượt hợp lệ của Vai Trò/Artifact, hiển thị icon đang gán tại đống lửa 🔥. Không làm biến mất icon chỉ vì đồng bộ/reconnect; tạm vô hiệu nút khi đang gửi lệnh để tránh chốt trùng.
- Neo thanh icon vào tọa độ thực của đống lửa, luôn giới hạn trong vùng hiển thị iPhone; không thay đổi tọa độ của lửa, nhân vật hoặc seat; hiển thị lớp icon phía trên khung làng.
- Bổ sung thao tác **Touch** cho WKWebView/iPhone bên cạnh Pointer, bảo vệ một thao tác không gửi 2 lần. Kéo icon vào Character hợp lệ dùng đúng hàm chọn mục tiêu và chốt Core đang có. Hành động 2–3 mục tiêu đợi đủ người rồi mới chốt.
- Artifact không cần mục tiêu vẫn có thể nhấn icon và xác nhận; với Yêu Tinh, hai icon trái/phải tương ứng hai hướng xử lý thực tế.
- Giữ nút **ICON: BẬT/TẮT**, các icon cá nhân, danh mục 49 icon và gán actionId. Nếu người dùng xoá hình của một hành động Core đang hợp lệ, hiện hình trung lập báo chưa gán thay vì ẩn toàn bộ.
- Hỗ trợ thư viện OTA tải muộn: tự cập nhật màn hình lượt hiện hành khi thư viện icon sẵn sàng.
- Khôi phục qua `battle-undo` và token đã cấp từ Server; không tạo thao tác khôi phục cục bộ làm lệch dữ liệu.
- Không thay đổi luật, định danh hành động, quyền mục tiêu, gameplay Online/Offline/DEMO, Player Web hay IPA native.

## Kiểm thử đúng phạm vi
- `node --test tests/gmww-battle-action-icons-touch.test.mjs`: 11 tình huống về hiển thị, đồng bộ, kéo thả trên mô phỏng WKWebView, một/nhiều/không mục tiêu, chống chốt trùng, Yêu Tinh trái/phải, ON/OFF, hành động bị khóa và khôi phục Core.
- `node --test tests/action-icon-library.test.mjs tests/action-icon-card-clean.test.mjs` khi kiểm tra thư viện/mã gán.
- `node .github/scripts/assemble-gm-app.mjs --verify`, `node .github/scripts/verify-gmww-versions.mjs`; chốt đóng gói OTA và checksum SHA-256 toàn bộ file.
- **Chưa thực hiện thử trực tiếp trên iPhone vật lý**: cần nghiệm thu lượt Vai Trò/Artifact, nhận icon, kéo đến Character, hiệu ứng hít, khôi phục sau khi có bản STAGING/ứng viên.

## Phát hành và rollback
- Phiên bản đề xuất: Runtime **V3.220** trên V3.219, không xây IPA mới.
- Chỉ merge/deploy sau khi GitHub CI đúng phạm vi SUCCESS và hoàn thành nghiệm thu theo quy trình. Không thay đổi dữ liệu Durable Objects/phòng.
- Nếu không đạt: quay về Worker/OTA V3.219 với checksum tương ứng; không xóa dữ liệu phòng và mọi chỉnh sửa Icon đã lưu.
