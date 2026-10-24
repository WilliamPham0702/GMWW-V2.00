# GMWW Arena 3D — Đợt kiểm thử tổng hợp (24/10/2026)

## Mục tiêu
Không nghiệm thu lắt nhắt theo từng hiệu ứng. Tập trung một đợt trên Draft PR #452: phòng thật 6–30 người, Core V2.00 STAGING, quản trị lượt GM, bộ nhân vật có vai khác nhau, animation đi ra–thi triển–về ghế, bảo mật Player Web, hiệu năng và hồi phục kết nối.

## Release notes — thay đổi trong đợt
1. **Phòng thử có 4 vai thay vì toàn Dân Làng:** phân vai Bảo Vệ, Tiên Tri, Phù Thủy, Ma Sói và các Dân Làng còn lại bằng `arena-acceptance-scenario.mjs`. Tạo `gameConfig` và `assignments` qua API GM Core STAGING. Đây là **kịch bản kiểm thử vai và hình ảnh**; bảng action `effect_notice` không được coi là thực hiện đầy đủ nghiệp vụ sức mạnh riêng từng vai trò.
2. **Điều khiển lượt Đêm:** thêm tab GM `Lượt Đêm`, hiển thị nhãn lượt và người thực hiện theo dữ liệu riêng `nightControl` được Core cấp sau khi xác thực GM; nút sang lượt tiếp theo có kiểm `expectedTurnId`; GM chọn đúng Seat/mục tiêu trước khi gửi hành động thử tới Core, không tự nhận diện vai từ client.
3. **Hành động chỉ được vẽ sau khi Core xác nhận:** action gửi `/api/gm/rooms/:code/battle-action`, Core kiểm turnId, actorId, matchId/cycleKey và xác thực GM. Adapter Arena riêng dựng cue ngắn hạn cho animation đứng–đi–phép–về ghế khi action trả thành công.
4. **Quyền riêng tư:** Player Web không được xem `nightControl`, queue vai trò ban đêm, mục tiêu và kết quả riêng; chúng chỉ hiện qua `/api/arena-staging/rooms/:code/gm-visuals` với token GM hợp lệ. Không lưu GM token vào URL/localStorage.
5. **Kiểm thử Core thật:** test phòng thực từ 6 người: phát 4 vai khác nhau; lần lượt gửi 4 hành động tới đúng turn actor; thử gọi không có token phải bị 401, giả actor bị 403, xác nhận Cue phép đúng loại và mục tiêu chỉ được GM nhận. Sau đó chạy chuyển Ngày, đề cử, bỏ phiếu 👍/👎 và tạo phòng 30 người.
6. **CI tập trung:** workflow Arena Core STAGING chạy tests hợp đồng, privacy, 6/12/20/30 seats, Character/VFX, một luồng API Core thật, GM Browser Chromium, WebKit màn hình giả lập iPhone. Không chủ động chạy các bài kiểm tra IPA/Production không liên quan.

## Chỉ bàn giao khi đạt mốc lớn
- **Mốc kỹ thuật:** CI tất cả job cần thiết SUCCESS, phòng Core thật và Player Web cùng phòng, quyền GM đúng, 4 nhóm vai thử, Day/Night, Lên Giàn, refresh/reconnect, 30 người, không lộ vai.
- **Mốc mỹ thuật:** cảnh và 40 Character hiện vẫn low-poly/procedural. Chưa đạt 40 mẫu 3D sculpt như ảnh tham chiếu; không tuyên bố hoàn thành nghệ thuật cuối.
- **Mốc iPhone thật:** FPS, nhiệt/pin, độ mượt/đẹp chưa thể xác nhận từ Chromium hoặc WebKit CI; cần chạy trên Safari iPhone thật. Không tự gọi “xong toàn bộ sản phẩm” trước khi đạt.

## An toàn và rollback
- Chỉ triển khai Cloudflare Worker `gmww-arena3d-core-staging` có Durable Object namespace độc lập.
- PR #452 giữ Draft; không merge main, không deploy Production, không thay đổi IPA/Runtime/OTA, dữ liệu phòng và 2D.
- Rollback bằng redeploy commit thành công gần nhất của workflow `deploy-arena3d-core-stage.yml`.
