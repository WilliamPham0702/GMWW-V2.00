# GMWW — XÓA BỘ SET-UP ONLINE CŨ TRONG LÀNG (29/10/2026)

## Thay đổi
- Xóa toàn bộ thanh HUD giả, chọn số người, Thu phóng, nút tự đổi Ngày/Đêm, 3 tab Thảo luận/Người chơi/Vai trò và các khối Chat/Voice mô phỏng ở `/village/`.
- Xóa thông điệp Minh/Lan và dữ liệu người chơi mẫu tự tạo; chỉ hiển thị nhân vật từ trạng thái phòng thật.
- Chỉ giữ cảnh Làng 2D, lửa trại, nhân vật/ghế và trình hiển thị nền; giao diện Online mới do Player Web và GM quản lý.
- Dọn xử lý DOM của các nút đã xóa; tiếp tục nhận `gmww:village-state`, phản hồi `gmww:village-ready`, `gmww:fire-click`, `gmww:move-arrived` và giữ cơ chế đề cử Lên Giàn/di chuyển/hiệu ứng nhân vật.
- Điều chỉnh cảnh Làng toàn màn hình và đổi cache-key CSS/JavaScript để không sử dụng lại file cũ trên iPhone.

## Kiểm thử đúng phạm vi
- `node --test tests/village-remove-old-online-setup.test.mjs tests/player-web-online-village-20261028.test.mjs`
- `node --check assets/village/village.mjs`
- `node --check assets/village/scene-manager.mjs`
- `npm run check` (Worker dry-run, không deploy)

## Giới hạn và an toàn
- Không thay đổi IPA, Runtime OTA, server rules, Durable Objects, Room, lịch sử hoặc dữ liệu.
- Chỉ được merge/phát hành Production sau khi kiểm tra CI bắt buộc SUCCESS và phê duyệt phát hành.
- Rollback: revert PR, phát hành lại Worker/static assets theo commit đã được xác minh. Không cần migration.
