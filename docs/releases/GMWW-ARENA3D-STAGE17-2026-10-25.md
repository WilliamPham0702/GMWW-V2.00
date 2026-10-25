# GMWW Arena 3D — Giai đoạn 17: Hợp nhất hành động, hoàn tác, an toàn cue (25/10/2026)

## Phạm vi
- Tiếp nối PR Draft #487 (GĐ14–16), sử dụng Worker STAGING/DO độc lập; không tạo thêm nhánh nghiên cứu trùng hoặc merge vào `main`.
- Bổ sung nhóm hiệu ứng VFX cho các chức năng Core: soi xét nhiều mục tiêu, nhận diện phe, đòn kết liễu, dấu Sát Thủ, sao chép, thăm nhà, truyền cắn.
- Ưu tiên action ID gốc do Core xác nhận, không cho metadata Role/Artifact tùy chỉnh giả mạo animation action chuẩn.
- Bổ sung cơ chế **hoàn tác**: chỉ khi Core V2 đã chấp nhận `gmBattleUndo` mới xóa animation bí mật; phải khớp **đúng matchId + cycleKey + undoToken**. Hoàn tác sai ván/lượt/token không xóa cue khác.
- Khi Core kết thúc ván, lấy `matchId` trước khi Core đặt lại trạng thái, dọn metadata Artifact/VFX và cue riêng của ván đó trong DO STAGING; không tác động dữ liệu phòng Production.

## Kiểm thử đúng phạm vi
- `tests/arena3d-stage17-undo.test.mjs`: hoàn tác đúng/sai token/ván/lượt; đầy đủ ánh xạ nhóm VFX mới; hành động chuẩn không bị ghi đè; dấu hiệu Core xác thực và broadcast riêng tư.
- CI độc lập `.github/workflows/arena3d-stage14-16-research.yml` chạy Stage17 cùng unit test thiết yếu của GĐ14–16; không tự mở kiểm thử Chrome Player Card 2D, Seat, OTA, IPA hay Production.
- Bằng chứng CI của commit GĐ17 phải được kiểm tra sau khi GitHub chạy; chưa mặc định coi là PASS và chưa triển khai lại STAGING khi CI chưa xác nhận.

## An toàn, phạm vi chưa hoàn tất
- Thay đổi chỉ trên nhánh nghiên cứu PR #487, không thay Worker/DO Production, Core gameplay, 2D, Runtime, IPA hay dữ liệu.
- Không thay thế hoặc gán giả file audio/giọng nói của người dùng. Kho audio GĐ15 vẫn chỉ lưu blob trong tab, quyền GM và hành động Core đã xác thực.
- PR #490 độc lập còn là Draft: các điểm tương đồng được đối chiếu, không được báo rằng hai PR đã merge.
- Chưa đo pin/nhiệt/FPS trên **iPhone vật lý**. Chrome/WebKit mô phỏng không thay thế nghiệm thu máy thật.
- Khi cần trả lại bản Preview GĐ17, thực hiện deploy **duy nhất STAGING nghiên cứu** sau khi các kiểm thử bắt buộc đạt; không tự merge/deploy Production.
- Rollback: hoàn nguyên các commit Stage17 trên PR #487; STAGING hiện hữu giữ nguyên cho tới lần phát hành nghiên cứu được xác nhận.
