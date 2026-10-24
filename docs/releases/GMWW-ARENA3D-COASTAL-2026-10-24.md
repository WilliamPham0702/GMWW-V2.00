# GMWW Arena 3D — Tiếp tục theo ảnh mẫu làng biển Ngày/Đêm và thi triển phép (24/10/2026)

## Phạm vi
- Nhánh **PR #452 Draft** `feature/arena-3d-dual-renderer`, Core V2.00 STAGING độc lập với Production.
- Yêu cầu từ ảnh tham chiếu: cả làng ngồi quây tròn xung quanh đống lửa, người có lượt đứng dậy và làm phép; cùng cảnh biển sáng ban ngày / đêm trăng và đèn sáng ban đêm.
- Không merge `main`, không deploy Production, không sửa Runtime OTA, IPA, dữ liệu/DO Production hoặc giao diện game 2D.

## Release notes
1. Thêm cảnh dựng 3D `coastal-village.mjs`: đảo cát giữa biển, vách đá, bến/cầu tàu, bốn căn nhà, cây dừa, lối đá quanh lửa, đèn, mặt trăng và sao. Sử dụng InstancedMesh cho đá/cây/dock/huts; giới hạn tổng nhóm hình học cảnh nền thay vì tạo một mesh riêng cho từng cây/đèn. Đây là low-poly kỹ thuật, không phải art chất lượng cao bằng ảnh tham chiếu.
2. **Ngày/Đêm trên đúng một cảnh 3D**: Core `cyclePhase=night` đổi bầu trời, màu biển/cát, ánh lửa, đèn nhà và trăng sao; khi `morning` trở về cảnh ban ngày. Không tải lại bộ ảnh nền khác hay đổi tọa độ Seat.
3. **Vòng tròn Seat linh hoạt 6–30**: số Seat/thứ tự lấy từ Core, bán kính mở rộng theo số người để 30 nhân vật không chồng lên nhau. Các kiểu không phải vòng tròn vẫn giữ tọa độ nguồn đã cấp; chỉ thay đổi phép chiếu hiển thị trong Arena 3D.
4. **Phép có hướng**: nhân vật được Server xác nhận mới đứng, hướng vào mục tiêu và phát một dải phép 3D tới đúng vị trí mục tiêu, sau đó thu hồi hiệu ứng/ngồi lại. Một dải phép tái sử dụng hình học để hạn chế số lần vẽ; không cho Viewer xem mục tiêu vai trò ban đêm.
5. **Quyền xem**: giữ nguyên `gmAuthorized`, trạng thái lượt/role kín không broadcast công khai tới Player Web. Màn hình demo chỉ chạy animation cục bộ trong phòng giả, không tạo dữ liệu Core.
6. **Hiệu suất iPhone**: duy trì FPS cap và DPR của các giai đoạn trước, hình học cảnh nền là instanced, tắt sao khi giảm hiệu ứng, không dùng asset mạng cho cảnh mới.
7. **Kiểm thử trực tiếp**: `arena3d-coastal-village.test.mjs` kiểm tra ngày đêm cùng scene và Seat 6/12/20/30; `arena3d-casting.test.mjs` kiểm tra spell beam chỉ xuất hiện khi có cue; Chromium và WebKit trên màn hình giả lập iPhone xác nhận cách hiển thị.
8. **Rollback**: tái triển khai commit STAGING trước thay đổi theo workflow `deploy-arena3d-core-stage.yml`; không động tới Production.

## Điều kiện nghiệm thu
- Trên Safari iPhone, mở `https://gmww-arena3d-core-staging.williampham0702.workers.dev/village/arena-3d/live.html`. Xem bãi biển và vòng ghế 6–30, thử nút `🪄 Mẫu lượt đứng dậy và làm phép`.
- Tạo phòng STAGING riêng, mở Player Web STAGING cùng mã phòng, điều khiển Đêm/Ngày trên GM; xác nhận nhân vật và cảnh không giật/không đổi ghế.
- Cần đánh giá thực tế FPS/nhiệt/pin iPhone; số liệu CI Chromium/WebKit GPU phần mềm **không phải kết quả iPhone vật lý**.

## Giới hạn đã công bố
- Cảnh nền mới và 40 Character vẫn là low-poly/procedural, khác độ chi tiết của concept art. Chưa có bộ model mỹ thuật 3D được dựng thủ công theo ảnh.
- Hành động ẩn chỉ diễn trên GM có quyền, không hiện trong Player Web trước khi luật Core cho phép. Lượt nào Core không cung cấp actor cụ thể thì không tự chọn nhân vật.
- Chỉ test chức năng tương ứng nhiệm vụ; không mở rộng sang CI IPA/Production nếu không liên quan.
