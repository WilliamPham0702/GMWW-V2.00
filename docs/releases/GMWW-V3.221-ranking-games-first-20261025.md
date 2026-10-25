# GMWW V3.221 — Xếp hạng ưu tiên số ván đã chơi

Ngày: 25/10/2026.

## Thay đổi
- Đồng bộ quy tắc xếp hạng **Top 3 trên Trang Chủ**, **bảng Xếp hạng Thành Viên**, cùng thông báo người dẫn đầu.
- Quy tắc: (1) **tổng ván đã chơi cao hơn đứng trước**; (2) nếu cùng số ván, **tỷ lệ thắng cao hơn đứng trước**; (3) nếu vẫn hòa, xếp theo tên tiếng Việt. Không dùng tổng trận thắng làm tiêu chí chính.
- Không có ván nào được tính thì vẫn có thể hiện ở bảng đầy đủ, nhưng không lọt vào Top 3.
- Tiêu đề Trang Chủ đổi thành **Top 3 Xếp Hạng**; giải thích quy tắc mới ngay bên dưới để tránh hiểu nhầm rằng bảng chỉ ưu tiên % thắng.
- Dữ liệu được lấy từ stats.wins/stats.losses hiện hữu, không thay đổi lưu trữ hay cộng thêm dữ liệu ván.
- Runtime V3.221; giữ nguyên giao diện Top 3 kính mờ trắng và Character thật (V3.219), toàn bộ Icon/Vai Trò/Artifact, gameplay, Player Web và IPA.

## Kiểm thử đúng phạm vi
- `node --test tests/member-ranking-games-first-v3221.test.mjs`
- `node .github/scripts/assemble-gm-app.mjs --verify`
- `node .github/scripts/verify-gmww-versions.mjs`
- `node --check server-game/current/app.js`
- CI Worker và chốt phát hành Runtime/OTA bắt buộc.

## Triển khai và rollback
- Chỉ merge và deploy Production khi các chốt bắt buộc thành công; xác minh manifest/SHA-256 và health V3.221 sau deploy.
- Rollback về runtime Production trước nếu cần; không thay đổi dữ liệu phòng, lịch sử, DO hay IPA.
