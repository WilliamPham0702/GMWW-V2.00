# GMWW · Thư viện Icon hành động (bản đề xuất 25/10/2026)

## Phạm vi đã đối chiếu
Nguồn kiểm tra: \`server-game/src/00-core-and-library.part\` (DEFAULT_STATE), \`server-game/src/40-battle-and-timeline.part\`, \`server-game/src/50-roles-and-artifacts.part\`, \`src/index.js\`, \`server-game/current/GMWW.html\`.

- 22 Vai Trò mặc định; 26 actionId mặc định. Dân Làng không có hành động chủ động.
- 44 artwork Artifact chủ đề Biển chỉ là tài nguyên hình ảnh. \`DEFAULT_STATE.artifacts=[]\`, \`DEFAULT_STATE.actions.artifacts=[]\`: thông tin Artifact thực tế phụ thuộc danh mục nhập động/được lưu tại thiết bị và các gói người dùng. **Chưa xác nhận số lượng hành động Artifact; không tự gán nhầm từ artwork.**
- Các Vai Trò khác có artwork ngoài danh mục mặc định không mặc nhiên có lượt hành động; phải đọc functions của card nếu được thêm.
- Trong bản PR này không thay đổi cơ chế luật, đồng bộ phòng, GM/Player Web hay lượt hành động.

## Phân nhóm icon dùng chung (19 icon mặc định)

| Icon | Hành động mặc định tương ứng | Quy tắc điều khiển |
|---|---|---|
| soi-xet | action_seer, action_aura_read, action_destroyer_scry, action_find_seer | Chọn một Character; hiệu ứng/ẩn thông tin theo rule riêng |
| soi-nhom | action_scan_three, action_fox_scan, action_bear_scan | Chọn đủ số mục tiêu trước chốt |
| so-sanh-phe | action_compare_faction | Chọn đủ 2 mục tiêu |
| soi-can | action_wolf_bite | Chọn Character để cắn, kiểm tra sói tuyết cô độc |
| bao-ve | action_protect | Chọn Character cần bảo vệ |
| cuu | action_witch_save | Cứu theo lượt và số lần còn lại |
| giet | action_witch_kill, action_destroyer_kill, action_stab | Tác động chết theo cơ chế cuối đêm |
| dong-bang | action_snow_wolf_freeze | Đóng băng theo luật |
| danh-dau | action_assassin_mark, action_hunter_mark | Sát thủ chọn dấu trước khi gán |
| duoi | action_exile | Đuổi theo luật |
| hoi-sinh | action_revive | Cho phép mục tiêu đã chết theo rule |
| dich-vet-can | action_transfer_bite | Chọn hướng trái/phải; không coi như chọn người tuỳ ý |
| tham-nha | action_visit_house | Chọn nhà/người theo rule |
| san | action_hunt | Chọn mục tiêu săn |
| nhan-ban | action_clone_target | Chọn người để nhân bản |
| doi-vai | action_thief_change_role | Mục tiêu là lá Vai Trò, không phải Character |
| hiep-si | action_knight_last_strike | Chọn Character |
| say-ruou | action_drunk_draw | Chọn lá/rút theo rule, không kéo vào Character |
| tac-dong | Chưa gán | Chỉ dùng khi Artifact/hành động mới chưa có nhóm phù hợp |

Các actionId bổ sung hỗ trợ dùng chung kiểu soi xét: \`action_wolf_seer\`, \`action_rotten_seer\` nếu được đưa vào catalog về sau. Trạng thái action chính xác và chủ sở hữu luôn do Core xác nhận, không do icon quyết định.

## Vai Trò mặc định được đọc
1. Phù Thuỷ Già: Đuổi, Hồi Sinh
2. Yêu Tinh: Dịch vết cắn
3. Sát Thủ: Đánh dấu
4. Thiếu Nữ: Thăm nhà
5. Sói Tuyết: Đóng băng, Sói cắn (điều kiện)
6. Bảo Vệ: Bảo vệ
7. Sói Trùm: Sói cắn
8. Sói Thường: Sói cắn
9. Phù Thuỷ: Cứu, Giết
10. Thợ Săn: Săn
11. Nhà Tinh Thần Học: So sánh phe
12. Say Rượu: Rút lá
13. Kẻ Bị Nguyền: các chức năng cấu hình tuỳ trạng thái
14. Tiên Tri: Soi xét
15. Dân Làng: không có chức năng chủ động
16. Kẻ Huỷ Diệt: Soi Vai Trò, Giết
17. Nhân Bản: Chọn người
18. Tiên Tri Hào Quang: Đọc chức năng
19. Hiệp Sĩ: Chọn người chết
20. Hồ Ly: Soi nhóm
21. Thần Gấu: Soi nhóm
22. Kẻ Trộm: Chọn lá đổi Vai Trò

## Giao diện quản lý (đã phát triển trên nhánh)
- Thư viện → ICON; danh sách 19 biểu tượng vector gốc phối xanh biển/vàng ngọc, không lấy emoji iPhone.
- Tìm kiếm, tạo, sửa tên, tải ảnh PNG/WEBP/JPEG, xoá, khôi phục mặc định.
- Mỗi Icon gán nhiều \`actionId\` và một loại đích: một Character, nhiều mục tiêu, hướng, lá bài.
- Bản này lưu vào bộ nhớ cục bộ của GM để thử nghiệm; chưa công bố là dữ liệu server dùng chung. Core chưa sử dụng icon mới để chốt hành động.

## Quy tắc giai đoạn tích hợp kéo thả
1. Icon chỉ xuất hiện khi đúng lượt, đúng quyền, còn lượt sử dụng, đúng actionId.
2. Neo xuất phát bám toạ độ 🔥 tương ứng bối cảnh.
3. Một mục tiêu: snap rõ ràng, thả = gửi lệnh xác nhận hợp lệ lên server; chống gửi trùng.
4. Nhiều mục tiêu: tích luỹ tới \`targetCount\` mới xác nhận, không chốt sớm.
5. Chọn hướng/lá bài: dùng đích thao tác đúng ngữ nghĩa.
6. Dùng cơ chế Khôi phục đã có, không tạo ledger hoặc nút undo thứ hai.
7. Bật/Tắt trong menu GM chỉ thay đổi giao diện, không đổi trạng thái Server hay quyền hành động.
8. Chỉ sau nghiệm thu và phân loại đầy đủ các action Artifact đã nhập mới triển khai bộ icon cho toàn trận Online/Offline/DEMO.

## Kiểm thử liên quan
- \`node --test tests/action-icon-library.test.mjs\` : ánh xạ đủ 26 hành động mặc định, kiểu mục tiêu đặc biệt, liên kết HTML, SVG gốc.
- Không mở các bài test Chrome Card / Seat / OTA / IPA không liên quan.
- PR ở trạng thái Draft, chưa merge, chưa deploy Production; không thay đổi dữ liệu.
