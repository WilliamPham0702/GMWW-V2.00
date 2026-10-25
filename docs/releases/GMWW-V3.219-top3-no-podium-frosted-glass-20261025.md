# GMWW Runtime V3.219 — Top 3 không bục, kính biển mờ và Character thật
Ngày 25/10/2026 · Kế thừa main V3.218 (49 icon + 34 hành động) và các bản audio trước đó.

## Giao diện đã sửa
- **Bỏ hoàn toàn ba bục** vàng/bạc/đồng; không còn DOM platform/crown, không thêm bục ảo qua CSS.
- Character thật lấy từ `gameCharacterId` của thành viên, ảnh Idle C40 cùng endpoint hiện có. Không dùng avatar lịch sử, hình giả hoặc ảnh preview.
- Xếp hạng hiển thị thứ tự **02 – 01 – 03**, căn ảnh theo trục giữa 50%; Character đứng nổi tự do phía trên bảng, nhẹ nhàng đung đưa, ánh sao/ngọc trai trên biển. Tôn trọng `prefers-reduced-motion`, responsive iPhone.
- Bảng tên, hạng, tỷ lệ thắng, số ván được chuyển thành **kính mờ mạnh blur 21px, bán trong suốt**, bo tròn mềm, viền ngọc trai và tất cả chữ **trắng sáng** với bóng đổ đọc rõ trên nền biển.
- Không đổi API xếp hạng, công thức thắng, dữ liệu nhân vật và nút mở danh sách xếp hạng.

## Phạm vi / kiểm thử
- Chỉ GM Trang Chủ Top 3: `server-game/src/20-members-and-roster.part` và đóng gói `server-game/current/app.js`, CSS, cache-busting HTML.
- Tăng V3.218 → **V3.219** đồng bộ Worker/GM/package/OTA; cập nhật ghi chú OTA bằng tiếng Việt.
- Chỉ kiểm thử 3 bài Top 3 trực tiếp, đối chiếu 6 module GM = app.js, cú pháp và version/release guards; không mở Chrome Card/Seat/3D/gamelogic nếu không phải chốt Production.
- **Không đổi gameplay, Player Web, IPA, thông tin thành viên, phòng chơi, Durable Objects, lịch sử, Action Icon V3.218 hoặc âm thanh V3.217.**
- Chỉ phát hành Production khi CI bắt buộc SUCCESS, OTA manifest với SHA-256 khớp artifact, health Production đạt.
- **Rollback:** Cloudflare Worker deployment trước V3.219 (dự kiến V3.218 nếu đang ổn định). Không xóa/migrate DO hoặc dữ liệu, giữ nguyên IPA.
