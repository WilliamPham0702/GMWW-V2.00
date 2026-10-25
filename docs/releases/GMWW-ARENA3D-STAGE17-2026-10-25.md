# GMWW Arena 3D — Giai đoạn 17: Hợp nhất hành động, hoàn tác, an toàn cue (25/10/2026)

## Phạm vi
- Tiếp nối PR Draft #487 (GĐ14–16), sử dụng Worker STAGING/DO độc lập; không tạo thêm nhánh nghiên cứu trùng hoặc merge vào `main`.
- Bổ sung nhóm hiệu ứng VFX cho các chức năng Core: soi xét nhiều mục tiêu, nhận diện phe, đòn kết liễu, dấu Sát Thủ, sao chép, thăm nhà, truyền cắn.
- Ưu tiên action ID gốc do Core xác nhận, không cho metadata Role/Artifact tùy chỉnh giả mạo animation action chuẩn.
- Bổ sung cơ chế **hoàn tác**: chỉ khi Core V2 đã chấp nhận `gmBattleUndo` mới xóa animation bí mật; phải khớp **đúng matchId + cycleKey + undoToken**. Hoàn tác sai ván/lượt/token không xóa cue khác.
- Chặn phản hồi GM-only đã cũ từ tab đổi phòng/đổi lượt/mất quyền trước khi kích hoạt VFX/âm thanh; dừng AudioContext và xóa file tạm khi mất quyền.
- Khi Core kết thúc ván, lấy `matchId` trước khi Core đặt lại trạng thái, dọn metadata Artifact/VFX và cue riêng của ván đó trong DO STAGING; không tác động dữ liệu phòng Production.

## Kiểm thử đúng phạm vi
- `tests/arena3d-stage17-undo.test.mjs`: hoàn tác đúng/sai token/ván/lượt; đầy đủ ánh xạ nhóm VFX mới; hành động chuẩn không bị ghi đè; dấu hiệu Core xác thực và broadcast riêng tư.
- CI độc lập `.github/workflows/arena3d-stage14-16-research.yml` chạy Stage17 cùng unit test thiết yếu của GĐ14–16; không tự mở kiểm thử Chrome Player Card 2D, Seat, OTA, IPA hay Production.
- **CI GĐ17 SUCCESS** tại https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40162557509.
- **Deploy STAGING + browser/E2E SUCCESS** tại https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40162616742; Worker riêng version `73f43164-3310-4b24-af6b-8d7aa8e6b934`.
- Chrome/WebKit headless 6/12/20/30 Character PASS; Core E2E GM/viewer PASS, viewer GM-only HTTP 401; hành động chuẩn `action_protect`, vai tự tạo 2 mục tiêu và Artifact 1 mục tiêu PASS.
- **Giới hạn hiệu năng:** browser CI software rendering ghi nhận Chrome khoảng 11 FPS, WebKit khoảng 1 FPS; không được xem PASS chức năng là đạt yêu cầu FPS, pin, nhiệt trên iPhone thật. Cần QA thiết bị vật lý trước khi nghiệm thu sản phẩm.

## An toàn, phạm vi chưa hoàn tất
- Thay đổi chỉ trên nhánh nghiên cứu PR #487, không thay Worker/DO Production, Core gameplay, 2D, Runtime, IPA hay dữ liệu.
- Không thay thế hoặc gán giả file audio/giọng nói của người dùng. Kho audio GĐ15 vẫn chỉ lưu blob trong tab, quyền GM và hành động Core đã xác thực.
- PR #490 độc lập còn là Draft: các điểm tương đồng được đối chiếu, không được báo rằng hai PR đã merge.
- Chưa đo pin/nhiệt/FPS trên **iPhone vật lý**. Chrome/WebKit mô phỏng không thay thế nghiệm thu máy thật.
- Khi cần trả lại bản Preview GĐ17, thực hiện deploy **duy nhất STAGING nghiên cứu** sau khi các kiểm thử bắt buộc đạt; không tự merge/deploy Production.
- Rollback: hoàn nguyên các commit Stage17 trên PR #487; STAGING hiện hữu giữ nguyên cho tới lần phát hành nghiên cứu được xác nhận.
