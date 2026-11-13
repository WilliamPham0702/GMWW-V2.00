# server-game/src — mã nguồn GM Server

`server-game/current/app.js` = nối tất cả file `.part` dưới đây theo thứ tự (nhóm theo số đầu tên thư mục,
trong nhóm theo số đầu tên file). Danh sách nhóm nằm ở `.github/scripts/source-groups.mjs`.

| Nhóm | Việc |
| --- | --- |
| `00-core-and-library/` | Cảnh làng, khoá lưu trữ + dữ liệu mặc định, chuẩn hoá và nâng cấp dữ liệu, state, kho ảnh, theme |
| `10-library-and-settings/` | Thư viện vai/bảo vật, hành động + hiệu ứng, âm thanh, khởi động, cập nhật, chẩn đoán |
| `20-members-and-roster/` | Thông báo cài đặt, quản trị thành viên, trang chủ, trạng thái màn Chơi |
| `30-village-and-setup/` | Trạng thái người chơi, âm thanh trận, kết nối phòng, phòng người chơi tạo, DEMO, di chuyển, tập hợp |
| `40-battle-and-timeline/` | Luồng dựng ván, DEMO runner, luật + hành động trong trận, điều hướng lượt, treo cổ, menu GM, ván mẫu |
| `45-online-chat/` | Thông báo âm thanh, box chat và tin thoại của GM |
| `50-roles-and-artifacts/` | Phân vai, gói lá bài + ảnh, phát vai + chỗ ngồi, kết thúc ván, danh sách tham gia |

Quy tắc:

- Sửa mã trong file `.part`, rồi chạy `node .github/scripts/assemble-gm-app.mjs --write` để dựng lại `app.js`
  (`--verify` để kiểm tra nguồn và bản đóng gói khớp nhau từng byte).
- Tất cả file dùng chung một phạm vi (một IIFE), nên thứ tự file là thứ tự chạy. Thêm file mới: đặt số đầu tên
  để nó nằm đúng chỗ; thêm nhóm mới: khai báo trong `source-groups.mjs`.
- Test đọc mã một nhóm bằng `gmSource('40-battle-and-timeline')` từ `.github/scripts/source-groups.mjs`.
