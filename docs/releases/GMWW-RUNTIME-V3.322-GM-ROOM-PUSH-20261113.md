# GMWW Runtime V3.322 – Thông báo iPhone khi có phòng mới

- Server → Cài đặt: mục mới "Thông báo iPhone khi có phòng mới". Dán mã/link của app Bark, bấm LƯU, bấm GỬI THỬ để kiểm tra, TẮT để ngừng.
- Worker: khi người chơi tạo phòng trên Player Web, gửi thông báo đẩy tới iPhone của GM qua Bark (tên người tạo + mã phòng), kể cả khi game đã tắt. Lỗi gửi thông báo không ảnh hưởng việc tạo phòng (giới hạn 4 giây).
- Mã Bark lưu ở cài đặt chung của Worker, chỉ GM đọc/ghi được; giao diện chỉ hiện 4 ký tự cuối.
- Thông báo mang link `gmww://rooms`; Runtime đã có sẵn `window.GMWWDeepLink('rooms')` để mở Quản lý phòng. Việc chạm thông báo mở thẳng app cần IPA mới có URL scheme `gmww` (PR native riêng, cần duyệt riêng).
- Không đổi luật chơi, không đổi dữ liệu phòng/ván, không migration DO.
- Rollback: cài lại Runtime V3.321 và redeploy Worker bản trước; mã Bark đã lưu không ảnh hưởng bản cũ.
