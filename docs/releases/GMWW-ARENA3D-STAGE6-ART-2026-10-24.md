# GMWW Arena 3D — Giai đoạn 6: mỹ thuật Character, animation và phép theo vai (24/10/2026)

## Phạm vi
Nhánh `feature/arena3d-stage6-art-motion-vfx` tách từ commit đã nghiệm thu Giai đoạn 5 `e06aba58f8ac82a6f344060f924d6bf3f38a634f`; PR tầng trên nhắm vào nhánh GĐ5 (PR #464), **không merge vào main**.

## Thay đổi
1. Nâng cấp chi tiết Character chibi biển: mắt có mống, lông mày, nơ biển, vương miện ngọc trai, áo choàng, khuy vỏ sò; vẫn dùng InstancedMesh và reuse geometry để kiểm soát số draw calls cho 6–30 nhân vật.
2. Bộ 40 biến thể mỹ thuật `character-01`–`character-40`, phối tóc/trang phục/phụ kiện theo mã Character công khai, **không liên quan vai trò/phái bí mật**. Thêm nút thử `🎨 Xem Character 01–30 / 11–40` chỉ ở màn hình synthetic; phòng thật không được đổi mỹ thuật để suy vai.
3. 5 chuyển động thi triển khác nhau: **Bảo Vệ** giơ hai tay tạo khiên, **Tiên Tri** nâng tay soi, **Phù Thủy cứu** dang hai tay, **Tấn công** vươn tay tung phép, **Bỏ phiếu** giơ tay. Chỉ xuất hiện theo event `kind` mà GM Core V2 đã xác thực hoặc lúc thử mẫu không kết nối phòng.
4. VFX sử dụng lại 4 batch hiện hữu với hình vòng, độ nghiêng, chuyển động hạt, điểm phát sáng khác nhau cho 5 nhóm phép; không thêm hàng loạt hạt tải nặng. Bật chế độ tiết kiệm pin/giảm motion vẫn hoạt động.
5. Giữ animation đứng → bước ra nơi nghi lễ → làm phép → bước về chính ghế → ngồi xuống, camera theo lượt và vị trí Seat bất biến. Không tạo quyền tiết lộ vai cho Player Web.

## CI/UAT đúng phạm vi
- Test thuần Stage6: 40 look, năm pose và motif khác nhau, invalid kind fail closed, batch GPU không tỷ lệ số Character; kiểm tra không biến dữ liệu game.
- Test 6/12/20/30: WebGL Chromium (iPhone 390px), scene FPS/drawcalls, 40 lookbook, sample stand/cast/sit, Core V2 thật, WebSocket và Player Web staging.
- WebKit iPhone-size mô phỏng; FPS chỉ là tham khảo GPU phần mềm, **không thay thế đo iPhone vật lý**.
- Kiểm thử quyền GM token và các Cue bí mật đã được kiểm tra trong pipeline STAGING; không mở thêm test game 2D Production.

## Giới hạn
- 40 Character hiện là **40 biến thể procedural trên mô hình chia sẻ**, KHÔNG phải 40 model sculpt độc lập hoặc chất lượng nhân vật hoàn thiện như ảnh concept.
- Hành động 3D chỉ biểu diễn 5 nhóm phép đã có hợp đồng server. Chưa phải bộ hiệu ứng độc lập cho từng vai/Artifact.
- Không thể khẳng định pin/nhiệt hay đạt 30 FPS trên Safari iPhone thật trước khi nghiệm thu.

## Bảo vệ và rollback
Không sửa `src/index.js`, luật game, DO Production, Worker Production, IPA/Runtime/OTA, room data hoặc Player Web 2D hiện hành. Chỉ Worker `gmww-arena3d-core-staging` với namespace riêng có thể triển khai. PR Giai đoạn 6 ở Draft; không merge. Rollback STAGING bằng redeploy Cloudflare version Stage5 `b2ff28c5-ebe6-48f9-a69f-0d581bd261d3` (hoặc commit CI Stage5 `e06aba58f8ac82a6f344060f924d6bf3f38a634f`).
