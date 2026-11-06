# GMWW Arena 3D — GĐ49: làng 3D theo phong cách làng tranh (06/11/2026)

Phạm vi: chỉ STAGING. Production, Core, dữ liệu không đổi.

## Thay đổi
- `coastal-village.mjs` (v2-painted): quảng trường lát đá có hai vòng xanh viền vàng và 4 hình thoi (vẽ canvas, không tải ảnh), tường đá thấp, nhà khung gỗ mái xanh, sạp vải sọc, giỏ hoa, cột đèn lồng, cờ la bàn, cọ, đồi và phố xa, hải đăng, bầu trời chuyển sắc ngày/đêm. Toàn bộ dùng instancing (khoảng 32 draw call tĩnh).
- Ghế người chơi, Core, ánh sáng ngày/đêm giữ nguyên API.
- Ảnh chụp: `docs/audits/arena3d-village-gd49-day.png` (Chromium giả lập, không phải iPhone).

## Kiểm thử
- `arena3d-*.test.mjs`: 200 PASS, 0 FAIL. Cập nhật version và ngân sách draw call trong test làng.

## CHƯA có
- Nhân vật vẫn dựng bằng code; model 3D cho 40 nhân vật chưa có (chờ GLB).
- Chưa đo FPS/pin trên iPhone thật. Chưa xem cảnh Đêm trên trình duyệt thật.

## Rollback
Revert commit GĐ49 hoặc quay Worker STAGING về version trước.
