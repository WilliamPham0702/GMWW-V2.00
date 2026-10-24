# GMWW — Sửa kết quả ván cũ xuất hiện khi Phát Vai (24/10/2026)

## Triệu chứng
- Ván trước đã kết thúc, GM nhấn Thoát hoàn toàn/Tạo phòng mới hoặc chọn lại phòng.
- Khi thiết lập ván mới và đến bước Phát Vai, bảng "PHE DÂN THẮNG" của ván trước tự xuất hiện.

## Nguyên nhân
- Kết quả ván trước lưu trong metadata phòng (`endedAt`, `winnerFaction`, `lastEndedMatchId`).
- Luồng cấu hình ván mới (`/config`) cập nhật `matchId` nhưng chưa làm mới các trường kết quả đó.
- Client tự hiện bảng thắng cuộc khi thấy `endedAt` và `winnerFaction`, bất kể phòng đã chuyển sang ván mới.

## Thay đổi
1. Worker: khi phòng hoàn thành được cấu hình mã ván mới, làm mới **chỉ** các trường kết quả đang hoạt động; giữ nguyên tài khoản, người chơi, phòng và bản ghi `matchCompletion:<old-id>`.
2. Room DTO: trả `lastEndedMatchId` để so khớp mã ván đã kết thúc với mã ván hiện tại.
3. GM iPhone/runtime: chỉ tự mở bảng thắng khi server đề xuất thắng trong ván đang chạy hoặc kết quả đã xác nhận thuộc **đúng mã ván hiện tại**, không ở bước chuẩn bị/phát vai.
4. Ẩn bảng thắng cũ nếu phòng đã chuyển sang setup ván mới; thao tác kết thúc thủ công trong setup mở bảng xác nhận kết thúc thay vì bảng thắng.
5. Không tự mở lại kết quả đã kết thúc khi GM chọn lại phòng; GM vẫn có thể xem kết quả hợp lệ bằng thao tác chủ động.
6. Bổ sung kiểm thử hồi quy cho phòng tái sử dụng, Phát Vai, thắng cuộc hợp lệ, ván tiếp theo và việc giữ lịch sử.

## Kiểm thử nghiệm thu
- Kết thúc ván A, chọn **Thoát hoàn toàn** rồi vào lại phòng A, chọn Ván Mẫu và **Phát Vai**: không xuất hiện kết quả cũ.
- Kết thúc ván A, chọn **Tạo ván mới**, **Chơi lại** và **Tạo phòng mới**: không xuất hiện kết quả cũ ở Phát Vai.
- Ván B đang chơi đến điều kiện chiến thắng: bảng kết quả của B hiển thị đúng.
- Đổi phòng, offline/online/demo, tải lại runtime: không trộn dữ liệu kết quả giữa các mã ván.

## An toàn / rollback
- Không thay đổi schema, không xóa room/roster/history, không xóa `matchCompletion:* `.
- Rollback bằng revert commit/PR; không yêu cầu rollback dữ liệu.
- Chưa tự merge main, chưa tự triển khai Production hay phát hành IPA.
