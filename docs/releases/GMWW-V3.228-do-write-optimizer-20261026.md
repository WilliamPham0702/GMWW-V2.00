# GMWW Runtime V3.228 — Tối ưu ghi Durable Objects (26/10/2026)

## Nguồn gốc
Cloudflare thông báo vượt hạn mức miễn phí 100.000 `rows_written` trong ngày 25/10/2026. Hạn mức reset 07:00 giờ Việt Nam ngày 26/10; người dùng đã xác nhận lưu phòng iPhone thành công.

## Thay đổi
- **Cài đặt → Kiểm tra & bảo trì**: nút **🛡️ TỐI ƯU DO** ngay cạnh **HEALTHY CHECK**. Hiển thị trạng thái chính sách tự động và số lần ghi trùng tránh được từ lúc Durable Object quản lý thành viên hiện tại khởi động.
- **Tự động, không cần nhấn nút:** giảm ghi `member/session`, `member/presence` nếu không có đổi phòng/ready/lệnh GM và thời gian ghi gần nhất vẫn còn trong cửa sổ 45 giây (TTL online 90 giây).
- Heartbeat GM không đổi phòng: tối đa một lượt ghi mỗi 35 giây (TTL 75 giây); chuyển phòng hoặc offline vẫn ghi ngay.
- Danh bạ phòng: lượt upsert không đổi trạng thái có thể bỏ qua khi thời hạn lease còn trên 100 giây; vòng đời, số người, version reset và mode đổi vẫn cập nhật ngay.
- **Không thay đổi** cơ chế ghi gameplay, phân vai, điều khiển Đêm/Ngày, vote, role/action, lịch sử; không xóa hoặc reset phòng.
- API kiểm tra quyền GM `GET /api/gm/storage-optimizer` chỉ đọc, không ghi thống kê vào DO.

## Giới hạn / ngăn tái diễn
- Tối ưu các nguồn ghi lặp đã xác định; không thể bảo đảm tuyệt đối không vượt hạn mức khi số phòng/người dùng hoặc tần suất hành động tăng.
- Bộ đếm hiển thị mang tính **tạm thời theo phiên DO**, không phải tổng ghi của tài khoản Cloudflare hay số dòng bị tính phí. Muốn cảnh báo chính xác mức 70%/90% cần tích hợp Analytics/Billing API có quyền truy cập phù hợp.
- Hạn mức miễn phí đặt lại mỗi ngày 00:00 UTC; nếu vẫn vượt cần điều tra query SQL/index và cân nhắc Workers Paid.

## Test đúng phạm vi
- Test chính sách lọc ghi trùng, TTL, đổi phòng/online/ready/GM, cập nhật lease.
- Test liên kết nút Cài đặt → GM API có Bearer → DO stats.
- Check cú pháp Worker/GM, phiên bản, assemble GM và chốt phát hành Runtime/SHA-256 trên workflow hiện hữu.
- Không chạy kiểm thử Chrome Card, Seat 30, Arena3D, IPA, audio hoặc luật vai ngoài phạm vi.

## Rollback
- Giữ nguyên DO namespace và mọi key lưu trữ. Nếu gặp hồi quy, deploy lại Worker commit V3.227, khôi phục OTA V3.227 theo manifest đã xác minh; không rollback/xóa dữ liệu.
