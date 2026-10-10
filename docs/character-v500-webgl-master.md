# GMWW Character V5.00 — Master-01 2.5D WebGL (isolated review)

## Quyết định ngày 10/10/2026
Owner chọn **phương án A**: giữ Làng Biển 2D và toàn bộ hệ thống phòng, vai, artifact, IPA và Player Web; thiết kế **nhân vật 3D có khớp chuyển động** riêng. Cảm hứng đến từ game mẫu có runtime Unity, nhưng không sao chép model, hoạt ảnh hay asset của game mẫu.

## Có thể thử ngay sau khi Production SUCCESS
- Trang duy nhất: `/characters/v5/` (Cloudflare Worker Static Assets).
- `index.html`: Character Studio V5 dành cho iPhone/desktop.
- `character-motion-v500.mjs`: state machine thuần JS, có chuyển Idle/Walk/Run/Sit/Sit-down/Stand-up/Wave/Vote/Result; hướng quay 8 góc, vận tốc theo thời gian, chuyển tư thế và pose smoothed.
- `character-master-v500.mjs`: Three.js/WebGL chibi "Chàng Biển" bằng hình học thật; hông, thân, đầu, hai tay, hai đùi và hai gối chuyển động theo rig nhóm khớp. Bản này là **master kỹ thuật**, không phải mô hình nghệ thuật/texture HD cuối cùng.
- Chạm mặt sân để chạy/đi theo mục tiêu (rAF tính delta), phím WASD, biểu đồ FPS và 1–30 nhân vật kiểm thử.
- Các module V5 **không được import** bởi `src/gmww-members-live.js`, `assets/village/village.mjs`, game/server engine hoặc IPA.

## Giới hạn / nghiệm thu
1. V5.00 đã vendor Three.js r180 dạng minified trong `assets/characters/v5/vendor/` kèm giấy phép MIT. Trang lab không cần CDN ngoài để chạy. Tuy nhiên, nghiệm thu trên iPhone offline thật và tích hợp IPA vẫn chưa thực hiện.
2. Đây là articulated **group-transform rig** (các pivot 3D), chưa phải skinned GLTF/GLB, chưa có model/chất liệu chuyên nghiệp và chưa có animation retarget từ game mẫu.
3. FPS thực tế chưa được xác minh trên iPhone thật. Giới hạn 30 nhân vật chỉ là mục **stress thử nghiệm**, không phải tuyên bố đã chạy ổn 60 FPS.
4. Code kiểm thử và cloud verification chỉ kiểm tra tính toàn vẹn tệp, hợp đồng hoạt ảnh và byte trên Production; **không thay** nghiệm thu hình ảnh/thao tác trực tiếp trên thiết bị.
5. Master-01 cần owner nghiệm thu trước khi thay 42 Character, đồng bộ game chính, hay đổi dữ liệu. Task #106 còn mở cho đến khi nghiệm thu rõ ràng.

## Lộ trình sau khi duyệt mẫu kỹ thuật
- Tạo model GLB Chàng Biển có bone rig chuẩn và texture cao cấp; lưu binary trong repository/assets, nén mesh và texture.
- Hoàn thiện animation blending, chuyển hướng 8 hướng, bước chân bám mặt đất và chuyển trạng thái tự nhiên.
- Thêm instancing/LOD, đo CPU/GPU/FPS trên iPhone (1, 10, 20, 30 nhân vật).
- Chuyển riêng scene Character sang WebGL overlay trong Làng 2D sau khi rõ ràng tiêu chí nghiệm thu và fallback WebP.
