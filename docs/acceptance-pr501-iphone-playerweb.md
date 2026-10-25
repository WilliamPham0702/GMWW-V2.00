# Nghiệm thu iPhone / Player Web — GMWW PR #501
Ngày chuẩn bị: 25/10/2026 · Phạm vi: 5 icon; không kiểm thử mở rộng game.

**Trạng thái:** Ứng viên PR Draft, **không phải Runtime OTA đã phát hành**. Không kiểm thử trên Production bằng cách thay đổi dữ liệu/phòng chơi thật. Dùng bản test/Preview tách biệt khi có thể.

## Checklist iPhone GM
- [ ] **🐦‍🔥 DEMO:** vào phòng DEMO ở màn Trận, biểu tượng không khung, không dính menu dưới; chạm mở/thu gọn lịch sử; kéo đến vị trí mới, không mở bảng khi đang kéo; đóng/mở màn hoặc tải lại vẫn giữ vị trí.
- [ ] **🌈 Thống kê phe:** biểu tượng nổi không khung, chạm mở ra bảng có quân số sống/tổng theo từng phe lấy từ ván Server; chạm lần nữa để đóng; kiểm tra số liệu sau khi chuyển pha/người chết (không giả định dự báo là luật xử thắng); kéo và chạm không lẫn nhau.
- [ ] **🏖️ Thông cáo Làng:** xuất hiện ở ngày, không chiếm thanh dưới, kéo được; chạm mở nội dung của đêm trước, chạm ngoài đóng; tiếp tục lượt không bị chặn.
- [ ] **⛱️ Lên Giàn:** xuất hiện ở ngày, kéo được; chạm mở đúng bảng Lên Giàn; bố cục, đề cử và vote/OK/Khôi phục không thay đổi; chạm ngoài đóng.
- [ ] **An toàn giao diện GM:** các icon độc lập, còn trong giới hạn màn hình khi xoay/resize; rời trận trở về phòng/lobby thì ẩn; trạng thái icon thu gọn không che đồng hồ, 🔥 hay Character.

## Checklist Player Web
- [ ] **🚩 Cờ đề cử:** chỉ hiện khi người chơi được quyền đề cử; emoji đỏ kích thước chuẩn 48×48px, không box.
- [ ] **Kéo cờ:** thấy hút Character hợp lệ gần nhất; thả mới chọn tạm, chưa gửi đề cử; OK mới gửi Server; Khôi phục đưa cờ về 🔥 và không tự vote; không chọn người chết/người không đủ quyền.
- [ ] **Không ảnh hưởng game:** thao tác trên Player Web/GM không tạo hành động mới ngoài tương tác mong đợi, không đổi rules, room/DO và dữ liệu.

## Chốt phát hành (chưa được đánh dấu chỉ vì viết checklist)
- [ ] Bộ kiểm thử chuyên biệt 5 icon + WebKit iPhone **SUCCESS** trên commit cuối.
- [ ] Bundle GM 6 module trùng byte, cú pháp GM/Player Web đạt; đối chiếu SHA-256 các file ứng viên và lưu artifact QA.
- [ ] Release notes tiếng Việt, số phiên bản Runtime tăng đúng và manifest OTA/hash cập nhật khi **bắt đầu một quy trình phát hành được duyệt**, không dùng lại V3.218.
- [ ] Xác nhận an toàn rollback về mã và Runtime Production trước khi phát hành.
- [ ] **Chủ dự án duyệt merge / deploy** sau nghiệm thu, không tự triển khai.

**Bằng chứng CI:** workflow `Kiểm tra 5 icon GM và Player Web #501`; artifact `GMWW-PR501-UI-SHA256-NO-DEPLOY` và `GMWW-PR501-IPHONE-WEBKIT-PREVIEW-NO-DEPLOY` nếu chạy thành công.

**Rollback:** revert PR #501 (nếu đã merge trong tương lai), phục hồi phiên bản Runtime ổn định liền trước; khóa localStorage `gmww_battle_free_icons_v1` chỉ lưu tọa độ UI nên giữ/xóa không đổi trạng thái ván.
