# GMWW Arena 3D — Giai đoạn 18: tối ưu hiệu năng 3D trên thiết bị di động (25/10/2026)

## Thực hiện trên PR Draft #487 (nghiên cứu độc lập)
- **Nhịp vẽ theo hoạt động** (GPU only): khi Character nghỉ, nhịp vẽ tối đa 12 FPS thay vì luôn yêu cầu 30; khi có phép, Character di chuyển hoặc kéo camera tự nâng lên tối đa 30 FPS. Chế độ tiết kiệm: 8 FPS khi nghỉ, 20 FPS khi có chuyển động; Reduce Motion: 10/20 FPS. Tab ẩn: 0 FPS. Đây là ngưỡng yêu cầu vẽ, **không phải FPS đo thực tế hay cam kết tốc độ thiết bị**.
- **Giảm draw call:** Khi bật Tiết kiệm pin, tạm ẩn 13 chi tiết phụ như má hồng, ngọc trai, phụ kiện tóc/áo. Giữ nguyên đầu/mắt/thân/tay/chân, nhân vật có thể chọn, di chuyển và thi triển phép. Phục hồi mesh khi chuyển về Mượt, không xóa hoặc thay đổi ID/Seat/ván.
- **Giảm tải GPU:** không cập nhật lại toàn bộ màu/chất liệu cảnh Ngày/Đêm khi trạng thái chưa thay đổi; điều chỉnh pixel ratio dựa vào ngân sách 6–30 Character, không tự nâng phân giải khi nhận snapshot người chơi.
- **Tách biệt dữ liệu:** không giảm tần suất WebSocket, Core, xác thực GM, lịch sử, kết quả bỏ phiếu; không để phép hay nhạc từ phòng đã rời bật lại.
- Tại tab Hiệu năng, lựa chọn Mượt/Tiết kiệm pin đã có sẵn. Không bổ sung thao tác bắt buộc cho người dùng.

## Kiểm thử liên quan
- `tests/arena3d-stage18-performance.test.mjs`: nhịp vẽ ngơi/làm phép/kéo camera/tiết kiệm, bảo toàn kết nối và quyền riêng tư, cấu trúc LOD.
- Chrome và WebKit trên STAGING: kiểm tra 6/12/20/30 Character, ẩn chi tiết làm **giảm draw calls thực** và nút Mượt khôi phục hiển thị.
- Trận Core thật GM/viewer, đa mục tiêu và Artifact từ suite GĐ16 để tránh ảnh hưởng tương tác có liên quan.
- Không mở suite game 2D/Seat/Player Card/OTA/IPA không liên quan.
- **CI GĐ18 SUCCESS**: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40163798470.
- **STAGING/GPU/browser/Core E2E SUCCESS**: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40163845910. Worker STAGING version `9dcd0697-06a1-4ebe-bf8e-73e82132ddab`.
- Chrome/WebKit 6–30 Character PASS, bao gồm kiểm tra draw calls giảm khi bật Tiết kiệm pin; Core thật có Bảo Vệ, refresh viewer, Lên Giàn PASS; Vai trò tùy chỉnh 2 mục tiêu và Artifact 1 mục tiêu PASS; người xem bị từ chối endpoint GM-only (HTTP 401).
- CI headless software GPU cho Chrome khoảng 9 FPS, WebKit khoảng 2 FPS; **không phản ánh FPS iPhone vật lý**, không công bố cải thiện FPS đo thực tế nếu chưa đo trên máy thật.

## Ranh giới
- Giữ PR #487 **Draft**; chỉ phát hành sang Worker `gmww-arena3d-stage14-staging` khi CI thành công; không merge/deploy Production, không thay gameplay game 2D, dữ liệu, DO Production hoặc IPA.
- **Chưa đo FPS/pin/nhiệt trên iPhone vật lý.** Headless WebKit/Chrome trên CI dùng GPU phần mềm, không đại diện thiết bị thật; tính năng tiết kiệm có thể giảm độ mượt hình ảnh khi nghỉ và đây là thiết kế có chủ đích.
- Rollback: revert commit GĐ18 trên nhánh nghiên cứu hoặc phát hành lại Worker STAGING phiên bản GĐ17 `73f43164-3310-4b24-af6b-8d7aa8e6b934`. Production giữ nguyên.
