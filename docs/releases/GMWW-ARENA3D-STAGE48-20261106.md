# GMWW Arena 3D — GĐ48: GM chọn 2D hoặc 3D cho từng phòng (06/11/2026)

Phạm vi: chỉ STAGING `gmww-arena3d-stage14-staging`. Production, IPA, Player Web gốc, dữ liệu và Core V2.00 không đổi.

## Thay đổi
- `src/arena3d-view-mode.mjs` (mới): chế độ phòng `2d` (mặc định) hoặc `3d`.
- Worker STAGING: `GET /api/arena-staging/rooms/<MÃ>/view-mode` (công khai, chỉ trả chế độ) và `POST` (bắt buộc quyền GM do Core `gmAuthorized` xác thực). Lưu trong Durable Object STAGING.
- Player Web (STAGING): chỉ tự vào làng 3D khi GM chọn 3D. Mặc định/2D thì ở lại Player Web như hiện nay.
- Player 3D: khi GM chuyển về 2D hiện nút "Về Player Web (2D)".
- GM `live.html`: ô "Chế độ chơi" 2D/3D, chỉ bật khi có quyền GM STAGING.

## Kiểm thử (PASS)
- `tests/arena3d-stage48-view-mode.test.mjs` 7/7. Cập nhật test cũ `arena3d-gm-staging-bridge` cho đúng yêu cầu mới (vào 3D theo lựa chọn GM).
- Toàn bộ `arena3d-*.test.mjs`: 200 PASS, 0 FAIL.

## CHƯA kiểm chứng
- Chưa chạy trên STAGING bằng trình duyệt thật sau deploy.
- Chưa nối nút set-up của app GM (Runtime) để chọn 2D/3D ngay lúc set-up; hiện chọn ở trang GM Arena 3D. Mục này cần bản Runtime mới.

## Rollback
Quay Worker STAGING về version trước hoặc revert commit GĐ48. Production không tham gia.
