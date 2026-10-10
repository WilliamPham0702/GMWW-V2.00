# GMWW Character Master-01 V5.10 — 3D skinned review

## Phạm vi đã được chấp thuận
10/10/2026: chủ dự án xem Master-01 2.5D V5.00 trên Player Web và phản hồi “Tôi thấy okey”. Phản hồi này **duyệt hướng chuyển động**, không tự động phê duyệt artwork hoàn chỉnh, nhân vật Player Web chính hay IPA.

## Điểm nâng cấp V5.10
- Bỏ nhân vật 3D làm từ nhiều mesh di chuyển riêng biệt: thay bằng **một Three.js `SkinnedMesh`** có **16 `Bone`** theo thứ bậc: gốc → hông → ngực → đầu/vai/khuỷu/bàn tay; hông → đùi/gối/bàn chân.
- Dữ liệu `skinIndex` + `skinWeight` là thuộc tính vertex thật, bind `THREE.Skeleton` vào mesh. Bộ nghệ thuật hiện là hình học procedural với rig-weight cứng cho từng bộ phận và chồng lấn đường nối, **chưa phải mesh skin smooth/blendweight hoặc GLB cuối cùng**.
- Ngoại hình Chàng Biển: tóc navy 3D, biểu cảm mắt 3D, áo xanh hoa biển, vòng cổ, quần short be, sandal xanh. Độ chi tiết cao ở nhân vật chính, giảm đỉnh/hoa văn ở nhân vật phụ.
- Toàn bộ nhân vật chia sẻ **2 Geometry** theo cấp LOD, **1 Material**, mesh Skinning riêng cho từng người; mô phỏng 30 người bằng `requestAnimationFrame`; xem FPS, drawcalls, số tam giác tại `/characters/v5/`.
- Animation kế thừa `character-motion-v500.mjs`: 9 Action, 8 hướng, chạm để đi/chạy, ngồi/đứng có chuyển tiếp, tay/chân bước đối xứng. Đầu giữ thẳng, hông có thể nhún. Skeleton chuyển động bởi góc các Bone thật trong WebGL.

## Kiểm thử bắt buộc
- `tests/character-v510-skinned-master.test.mjs` kiểm tra Bone, SkinnedMesh, dữ liệu weight, độ chia sẻ vật liệu, 30 rigs, 9 Action, không có NaN.
- Kiểm tra Chromium headless WebGL đầy đủ trên trang V5.10, CI Worker và Character.
- Cloudflare chỉ PASS khi tệp model, thư viện local và tài nguyên giao diện thực trên Production khớp SHA.

## Chưa được coi là hoàn thành
- Chưa có model GLB nghệ thuật riêng hoàn chỉnh, ảnh chất lượng cao, blendshape, foot planting IK hoặc xuất animation MP4.
- Không có số liệu FPS trên **iPhone thật**. Bài test 30 rigs trong Node không thay thế việc đo nhiệt máy, FPS GPU, input lag và footprint trên iOS.
- V5.10 chỉ ở Studio; **không import vào `assets/village/village.mjs`, Player Web phòng chơi, GM Runtime hoặc IPA**. Không đóng task Character #106 trước nghiệm thu người dùng.

## Điều kiện tích hợp về sau
1. Chủ dự án duyệt **ngoại hình** Master-01 và tất cả 9 Action trên iPhone.
2. Cải thiện xương mềm/blended skin, bước chân bám nền và màu sắc. Đạt FPS ổn định 30+ với 30 người; ưu tiên 50–60 khi thiết bị đáp ứng.
3. WebGL overlay render đồng bộ vị trí trong Làng 2D, fallback WebP cho thiết bị không hỗ trợ GPU, không đổi dữ liệu game.
4. Kế hoạch chuyển 19 Character còn lại riêng sau khi Master-01 nghiệm thu.
