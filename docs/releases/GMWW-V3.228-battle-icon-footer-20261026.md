# GMWW Runtime V3.228 — Icon và menu điều khiển dưới

Ngày 26/10/2026 · Phát hành Runtime OTA, giữ IPA và gameplay Core.

## Thay đổi
- Hình Icon hành động trở lại **40 px** (vùng kéo chạm 50 px), không viền và không nền, cùng cỡ trực quan với các biểu tượng GM.
- Nếu Vai Trò/Artifact có nhiều hành động trong một lượt, icon xuất hiện **tách rời thành vòng quanh đúng đống lửa của GM** (2–6 icon); khi di chuyển đống lửa, icon chưa kéo tự bám vị trí mới.
- Đối với hành động chọn từ 2 mục tiêu trở lên, sau khi thả vào mục tiêu hợp lệ, icon quay về vị trí ban đầu để tiếp tục chọn người tiếp theo. Không tự chốt khi chưa đủ mục tiêu; giữ lựa chọn đã được Core chấp nhận và không hút lại người đã chọn.
- Di chuyển **🏖️ Thông cáo**, **🌈 Thống kê**, **⛱️ Lên Giàn** về thanh cố định bên dưới; bỏ chế độ kéo thả tự do của ba nút này. Thanh cố định từ trái sang phải: **Đồng hồ – nhóm 🏖️/🌈 – Hành động – ⛱️ – Khôi phục**. DEMO 🐦‍🔥 giữ nguyên chế độ riêng.
- Đồng hồ ban ngày vẫn cho vuốt trái/phải để cộng/trừ 1 phút qua API Server, không làm giả thời gian. Không thay đổi thời lượng lượt đêm hoặc quyền Core.

## Giữ nguyên
- Không thay đổi luật Vai Trò/Artifact, quyền bí mật, Server/Player Web, phòng, lịch sử, dữ liệu Durable Objects hay native IPA.
- Giữ toàn bộ thư viện PNG/SVG đã nghiệm thu; chỉ điều chỉnh kích thước hiển thị và tương tác GM.

## Kiểm thử đúng phạm vi
`node --test tests/gmww-v3228-battle-icons-footer.test.mjs tests/gmww-action-icon-stacking.test.mjs tests/gmww-action-icons-in-battle.test.mjs tests/gm-free-floating-shortcuts-20261025.test.mjs`
và kiểm tra đồng bộ module GM, cú pháp, phiên bản, manifest OTA/SHA-256. Không chạy Seat, Chrome Card, DEMO, Arena 3D hoặc IPA không liên quan.

## Rollback
Nếu Runtime V3.228 gặp sự cố, hoàn nguyên Worker/OTA V3.227 theo manifest SHA-256 bản đã phát hành. Không xoá dữ liệu phòng, người chơi hay ván.
