# GMWW Arena 3D — GĐ50: model GLB cho làng (06/11/2026)

Phạm vi: chỉ STAGING. Production, Core, dữ liệu không đổi.

## Thay đổi
- 14 model GLB (ChatGPT dựng) trong `assets/village/arena-3d/models/village/`: nhà, cổng vòm, bậc thang, mái vòm, sạp, ô dù, cột đèn, cờ, chậu hoa, thùng hoa, lửa trại, thuyền, cây bách, cây cọ.
- `glb-lite.mjs`: bộ đọc GLB tối thiểu, từ chối animation/skin/camera/URI ngoài/texture.
- `village-props.mjs`: bố cục cố định không đè nhau, nướng màu vật liệu vào vertex color, vẽ bằng InstancedMesh (≤30 draw call cho toàn bộ model), phần `glow` sáng ban đêm. Tải lỗi thì giữ làng dựng bằng code.
- `coastal-village.mjs`: nhóm khối dựng bằng code có thể ẩn khi model đã nạp.

## Kiểm thử
- `arena3d-*.test.mjs`: 221 PASS, 0 FAIL (gồm test quy cách GLB và bố cục).

## CHƯA có
- Cổng vòm vẫn gỗ nâu, lá cọ còn nhọn (chờ ChatGPT làm lại).
- Nhân vật vẫn dựng bằng code. Chưa đo FPS/pin iPhone thật.

## Rollback
Revert commit GĐ50 hoặc quay Worker STAGING về version trước.
