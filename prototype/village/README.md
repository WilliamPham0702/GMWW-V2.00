# GMWW V2 — Ngôi làng đồ họa (nhánh cách ly)

## Phạm vi thực tế
Đây là code đồ họa và adapter avatar để tích hợp sau; KHÔNG phải gameplay/voice/chat production. Không chỉnh src/, IPA hoặc dữ liệu iPhone.

### Đã triển khai bằng mã nguồn
- Bộ asset SVG gốc, tách độc lập: `assets/village-coast.svg` (làng ven biển/quảng trường), `assets/avatar-chibi.svg` (nhân vật chibi mặc định), `assets/campfire.svg` (lửa trại).
- Layer màu/ánh sáng ngày-đêm riêng `village-art.css`, hiệu ứng lửa, chế độ giảm chuyển động.
- Bố trí vòng tròn/đồng tâm cho 1–30 người, chạm chọn, zoom và kéo camera có giới hạn; bảng danh sách hỗ trợ.
- Adapter `mapPublicPlayers(roomState)` nhận danh sách công khai từ `/api/rooms/:code` hoặc room state hiện hành, lọc ID trùng và bỏ thông tin vai trò. Giao diện có thể nhận `window.GMWW_PUBLIC_ROOM_STATE` hoặc `window.GMWW_VILLAGE_PLAYERS` do tầng tích hợp đã xác thực cung cấp.
- Ánh xạ `avatarId` sang API hiện có `/api/avatars/{id}/image`, chấp nhận URL ảnh cùng origin; fallback SVG chibi nếu lỗi.
- Tệp kiểm thử hình học/adapter và kiểm thử browser trên màn hình iPhone mô phỏng. Workflow riêng chạy kiểm thử và xuất ảnh regression nội bộ.

### Còn lại trước khi coi nhiệm vụ 4 hoàn tất
- Art sản xuất đạt độ chi tiết *đúng hình concept đã duyệt*: SVG hiện tại chỉ là asset gốc dựng kỹ thuật, chưa thay thế được tranh fantasy/chibi nhiều lớp chất lượng cao.
- Asset painterly WebP nền ngày và đêm đồng nhất hình học, character sprites đa dạng, atlas UI, chuyển động thật.
- Tích hợp adapter vào Player Web thật qua room-state đã xác thực; kiểm tra avatar đăng ký và khách.
- Kiểm thử hiệu năng/FPS/RAM trên **iPhone thật** và Android thật; browser iPhone emulation không thay thế được.
- Kiểm thử trực quan so sánh concept và nghiệm thu người dùng.
- Không merge main/deploy cho đến khi có phê duyệt và kiểm thử.

## Chạy kiểm thử
`node prototype/village/village.test.mjs`
`python3 -m http.server 8080` (trong repo)
Browser smoke CI: `node prototype/village/village.browser.test.mjs` sau khi cài Playwright/Chromium.

## Chú ý bảo mật
Public room-state không được chứa vai trò bí mật; avatar ảnh chỉ nhận từ cùng origin. Không dùng mô phỏng chat/voice trong prototype làm bằng chứng tính năng thật.
