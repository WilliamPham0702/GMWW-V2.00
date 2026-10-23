# Ghi chú phát hành — Kiểm toán Cloudflare GMWW (23/10/2026)

## Phạm vi thay đổi
- PR #427: Bổ sung đối chiếu Preview chưa xác định PR với danh sách nhánh GitHub, PR ngoài quy tắc nhánh `main`, thông tin Preview và lịch sử triển khai Cloudflare.
- Kiểm tra trạng thái namespace và xác nhận tình trạng lưu trữ Durable Object (khi xác định được duy nhất namespace).
- Phân nhóm nguyên nhân chưa đối chiếu bằng mã lý do và hiển thị giải thích tiếng Việt từng Preview trong Issue #320; cập nhật tổng hợp vào GitHub Actions.
- Bổ sung kiểm thử cho Preview còn nhánh, bản sao lưu, PR khác `main`, tài nguyên không có PR và trường hợp thiếu dữ liệu đối chiếu.

## An toàn và giới hạn
- Chỉ kiểm toán; mọi Preview chưa đối chiếu tiếp tục được giữ lại để xác minh, không được đưa vào danh sách xóa tự động.
- Không sửa cơ chế kiểm tra Preview đủ điều kiện xóa hiện tại, giới hạn xóa một lượt hoặc các khóa bảo vệ Production.
- Không tác động Worker Production, phòng chơi, dữ liệu thành viên, hoặc tài nguyên có dữ liệu chưa xác minh.
- Chế độ `scan` hoàn toàn chỉ đọc đối với tài nguyên Cloudflare; lưu báo cáo lên GitHub Issue #320.

## Xác minh/ nghiệm thu
- CI của PR phải SUCCESS trước khi hợp nhất.
- Sau khi merge `main`, kích hoạt `cloudflare-maintenance.yml` ở chế độ `scan`.
- Kiểm tra báo cáo có danh sách, nguyên nhân và kết quả kiểm toán cho từng Preview chưa đối chiếu; so sánh Production binding trước/sau.
- Không thay đổi số phiên bản IPA/Player Web/runtime: thay đổi này là công cụ kiểm toán nội bộ.

## Rollback
- Revert commit merge PR #427 trên GitHub nếu chức năng kiểm toán/báo cáo bất thường; không có thay đổi dữ liệu Cloudflare cần phục hồi.
