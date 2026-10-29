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

## Cổng phát hành Worker-only PR #612
- PR bắt buộc có `CI Policy Gate`, `village-legacy-removal` và `mobile-webkit` thành công trước khi phát hành.
- CI WebKit mô phỏng Safari iPhone 13, chụp ảnh trang Làng sau khi tải, kiểm tra không còn bộ công cụ cũ; kiểm tra cả trang Player Web thực.
- Workflow `deploy-village-legacy-online-pr612.yml` chỉ chạy sau khi chính PR #612 đã merge và đối chiếu SHA main + trạng thái CI, danh sách file thay đổi chính xác.
- So sánh byte-to-byte `assets/updates/latest.json` với Production **trước** và **sau** cập nhật; khác nhau thì chặn phát hành/rollback Worker, không được ghi đè manifest OTA ngoài phạm vi.
- Pipeline Production mặc định bỏ qua đúng phạm vi PR #612; không đụng IPA, nguồn GM, runtime game, DO/dữ liệu.
- Xác nhận trực tiếp trên Production: giao diện Làng không còn nội dung mẫu, Player Web và health trả HTTP 200, Worker version mới 100%, WebKit iPhone chạy thành công và lưu ảnh kiểm thử.
- Nếu kiểm tra Production không đạt, tự chuyển lại Worker version trước đó; trường hợp static asset cần phục hồi ngoài Worker version phải triển khai lại asset từ commit trước.
- Không coi kiểm thử WebKit giả lập là đã thao tác trực tiếp trên iPhone thật của người dùng.
