# GMWW Runtime V3.229 — Icon trong trận và thanh điều khiển cố định

Ngày 26/10/2026. Kế thừa toàn bộ bản V3.228 (bao gồm công cụ tối ưu Durable Objects), chỉ thay đổi giao diện GM trong trận.

## Bốn chỉnh sửa
1. Trả hình hành động về 40px, hitbox kéo 50px, cùng kích thước trực quan nhóm 🏖️/🌈/⛱️. Hình không khung và nền.
2. Khi cùng lượt có 2–6 hành động của Vai Trò/Artifact, các icon được phân bố riêng quanh tọa độ 🔥 của GM, không chồng nhau và bám lửa khi vị trí lửa di chuyển.
3. Hành động chọn nhiều người: sau mỗi lần thả hợp lệ, icon quay lại vị trí xuất phát để chọn người tiếp theo; giữ danh sách các mục tiêu đã chọn, loại người vừa chọn khỏi danh sách hút, chỉ chốt khi đủ số lượng theo Core. Khôi phục không thay đổi.
4. Cố định các biểu tượng 🏖️, 🌈, ⛱️ trở lại thanh dưới, theo thứ tự **Đồng hồ – nhóm 🏖️/🌈 – Box Hành động – ⛱️ – Khôi phục**. 🐦‍🔥 DEMO vẫn dùng nút độc lập. Đồng hồ ban ngày vuốt trái/phải cộng/trừ 1 phút qua API hiện có.

## Giới hạn
- Không sửa luật Vai Trò/Artifact, quyền bí mật, Player Web, Core, dữ liệu người chơi/phòng, Durable Objects hay IPA native.
- Không thay đổi ảnh PNG/SVG đã duyệt; chỉ tăng kích thước hình hiển thị và khoảng cách.
- Không tạo API điều chỉnh đồng hồ ban đêm mới; quyền thời gian lượt đêm vẫn thuộc Core Server.

## Chốt phát hành
- Kiểm thử trực tiếp: `node --test tests/gmww-v3228-battle-icons-footer.test.mjs tests/gmww-action-icon-stacking.test.mjs tests/gmww-action-icons-in-battle.test.mjs tests/gm-free-floating-shortcuts-20261025.test.mjs`.
- Đối chiếu 6 module GM, version guard, cú pháp, candidate OTA, manifest SHA-256.
- Chỉ merge khi CI Worker đúng commit đạt SUCCESS; không kiểm thử Seat, Chrome Card, Demo hay IPA không liên quan.

## Rollback
Khôi phục Worker/Runtime V3.228 đã phát hành cùng manifest SHA-256 tương ứng, giữ nguyên dữ liệu và phiên bản IPA.
