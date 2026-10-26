# GMWW Runtime V3.236 — Menu GM và luật Lên Giàn (26/10/2026)

## Thay đổi
- Tại Setup và Vào trận, nhấn **đống lửa** mở/tắt Menu GM; xóa liên kết đống lửa → Tạo phòng, vẫn giữ bước Tạo phòng ở luồng Setup.
- Trong Menu GM, nút **ẨN MENU / HIỆN MENU** thay đổi đồng thời thanh trên, thanh dưới, có lưu tùy chọn local và không tự mở trở lại khi chạm màn hình. Đống lửa vẫn hoạt động khi ẩn. Menu GM hỗ trợ cuộn ngang các nút thay vì nhiều hàng lớn.
- Thanh dưới cao 62px (cùng mẫu Tập Hợp), giữ box HÀNH ĐỘNG và đồng hồ; các chức năng Báo, Lên Giàn, Khôi phục dùng SVG thống nhất một kích thước, không chèn chữ làm phình ô.
- Đề cử có hai người đồng hạng cao nhất hoặc chưa có phiếu: Server kết thúc việc lên giàn của ngày đó với trạng thái **no_lynch**, không treo ai và không mở vote. Số phiếu CỨU và GIẾT bằng nhau: kết luận **SỐNG** (giữ nguyên luật Server hiện có). Đồng bộ GM và Player Web, nhận kết quả qua snapshot thời gian thực.
- Số đề cử trên đầu Character chỉ hiển thị chữ số sáng và bóng chữ; bỏ icon, khung và nền.

## Phạm vi, kiểm thử và phát hành
- GM Runtime + Player Web hiển thị + luật Lên Giàn trong Worker/DO. Không sửa seat, card, Arena 3D, audio khác, tài nguyên IPA hoặc xóa dữ liệu.
- Kiểm thử tập trung menu, điều khiển giao diện, kết quả hòa phiếu, luật hồi sinh/giết khi vote và đồng bộ bundles; CI bắt buộc phải thành công trước deploy.
- OTA manifest SHA-256, release notes tiếng Việt, server health; không cần IPA mới.

## Rollback
- Rollback Worker và OTA về bản V3.235 đang được nghiệm thu. Không đụng Durable Objects, phòng và lịch sử.
