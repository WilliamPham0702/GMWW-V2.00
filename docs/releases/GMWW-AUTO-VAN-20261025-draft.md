# GMWW — AUTO VÁN thông minh (PR Draft, chưa phát hành)

Ngày: 25/10/2026. Phạm vi: màn hình **Chọn Ván Mẫu** của GM, không sửa luật Core/Player Web/IPA native, không cập nhật dữ liệu các phòng đang chơi.

## Thay đổi

- Ván Mẫu đã lưu được gợi ý theo khoảng cách giữa số lá và số thành viên hiện tại; ván khớp chính xác hiển thị nhãn **✓ PHÙ HỢP** và đứng đầu.
- Thêm nút **✨ AUTO VÁN · NHẤN ĐỂ ĐỔI** và thống kê Dân/Sói/Phe Ba cùng tên các vai đã tạo.
- Tạo số lá đúng bằng số người (3–30); luôn có vai Sói Thường và Dân Làng. Từ 10 người bắt buộc có một vai Phe Ba hiện hữu trong Core.
- Bộ phân phối chọn theo quy tắc số Sói, vai thông tin, bảo vệ, vai chuyên biệt; không chọn vai ngoài Thư Viện hoặc thay đổi hành động, điều kiện thắng. Không lặp lại ngay đội hình của lần nhấn trước.
- **Bấm AUTO VÁN chỉ xem trước trên GM, chưa ghi vào Server.** Khi GM bấm **CHỌN VÁN**, lưu cấu hình thành Ván Mẫu mới và tiếp tục đường xác minh Artwork → lưu room config → Phân Vai sẵn có.
- Trạng thái Artifact theo trận vẫn do GM bật/tắt, không bị thuật toán tự ý điều chỉnh.

## Giới hạn & lưu ý cân bằng

- Đây là quy tắc phân phối đội hình có kiểm tra, **không phải kết quả chứng minh cân bằng bằng mô phỏng thống kê**. Đội hình 3–5 người có hạn chế khách quan về cân bằng.
- Thiếu vai nền bắt buộc hoặc thiếu vai Phe Ba khi từ 10 người: hiện lỗi rõ ràng, không tạo đội hình sai luật.
- Nếu các khả năng khác nhau đã hết trong thư viện, hệ thống thông báo thay vì giả vờ tạo đội hình mới.

## Kiểm thử đúng phạm vi

- `node --test tests/auto-game-template.test.mjs`: số lá 3–30, cơ cấu phe, vai Core, lặp lần bấm, phân loại gợi ý, không ghi server ở chế độ xem trước, đường xác minh/Phân Vai.
- Chưa chạy kiểm thử Player Web Card, Seat, Audio, Arena 3D hoặc IPA vì không liên quan thay đổi.

## Chốt phát hành & rollback

- Giữ PR **Draft**; không merge và không deploy Production trước khi người dùng nghiệm thu/cho phép.
- Trước khi phát hành Runtime OTA: xác minh CI bắt buộc liên quan, integrity/SHA-256, manifest OTA và nghiệm thu iPhone.
- Rollback: revert commit/PR của Auto Ván và khôi phục runtime trước phát hành; không xóa hoặc thay đổi Ván Mẫu/room lịch sử đã tồn tại.
