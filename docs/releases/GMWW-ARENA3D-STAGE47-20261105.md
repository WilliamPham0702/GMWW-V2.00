# GMWW Arena 3D — GĐ47: GM chạm nhân vật 3D để chọn mục tiêu lượt đêm (05/11/2026)

PR #581 (Draft). Phạm vi: chỉ STAGING. Production, IPA, Player Web gốc không đổi.

## Thay đổi
- `gm-dashboard.mjs`: thêm `tapTarget(id)` và `toggleTargetSelection`. Khi GM đang ở tab "Lượt Đêm", Core đã cấp hành động, chạm nhân vật 3D sẽ bật/tắt mục tiêu (tối đa 5). Ở các tab khác hoặc khi Core chưa cấp hành động, chạm vẫn chọn/xoay Seat như cũ.
- `live.mjs`: chạm 3D gọi `tapTarget` trước, nếu không xử lý thì giữ hành vi cũ.
- Không đổi đường gửi hành động: vẫn `coreAction` → `validateGmActionTargets` → `battle-action`; Core xác thực số mục tiêu, noSelf, lượt và thẻ đã phát.

## Kiểm thử
- `tests/arena3d-stage47-gm-tap-targets.test.mjs`: 5/5 PASS (bật/tắt, giới hạn 5, không hoạt động ngoài tab/khi thiếu quyền, reset khi đổi lượt, Core vẫn là nơi kiểm luật).

## CHƯA kiểm chứng
Chưa chạy trên trình duyệt thật/STAGING; chưa kiểm trên iPhone.

## Ảnh hưởng Production
Không. **Rollback:** revert commit GĐ47 trên nhánh `feature/arena3d-g39-main-first-candidate`.
