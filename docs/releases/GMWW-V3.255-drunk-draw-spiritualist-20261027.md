# GMWW Runtime V3.255 — Say Rượu và Nhà Tinh Thần Học

## Nội dung cập nhật (tiếng Việt)
- Say Rượu đến lượt ở Đêm 3 sẽ thấy bộ lá Vai Trò úp của những người đã chết trước đó. Player Web hiển thị đúng mặt lưng lá Vai Trò hiện có; nhấn một lá để mở và nhận Vai Trò/Phe/năng lực. Chỉ chọn một lần duy nhất, các lá khác lập tức vô hiệu.
- GM Server cũng hiển thị các lá úp, trạng thái đang chờ và kết quả đã được Say Rượu mở; Character của Say Rượu nhận Vai Trò mới. Hệ thống sử dụng private delivery snapshot, không tiết lộ nội dung lá chưa chọn cho Player Web, chống giả mạo/replay và đảm bảo reconnect.
- Nếu Say Rượu bốc trúng Sói sẽ tham gia lượt Bầy Sói chung và nhận chức năng riêng theo timeline; nếu chưa có người chết thì trở thành Dân thường như luật đã chốt.
- Nhà Tinh Thần Học chọn hai người vẫn được thông báo CÙNG PHE / KHÁC PHE khi một hoặc cả hai đã bị Đuổi. Đây chỉ là soi thông tin, không phải tác động gây hại. Đuổi vẫn miễn nhiễm Cắn Sói, Giết và các tác động xấu khác.
- Đồng bộ mô tả/Điều kiện/Chức năng của hai lá Vai Trò trong thư viện Cài đặt đã lưu.

## Kiểm thử và phát hành
- Kiểm thử thực tế qua Durable Objects: bốc lá, không tự bốc, chỉ chọn một lần, role/faction chuyển chính xác, privacy, reconnect và mục tiêu bị Đuổi trả kết quả soi.
- Player Web assembled module và GM app phải khớp các nguồn; Worker CI và manifest Runtime/OTA với SHA-256 phải PASS trước khi công bố.
- Bảo toàn tài khoản, phòng, lịch sử, artwork, audio và các lá khác. Không đổi IPA shell V3.110.
- Rollback: V3.254 (Worker/Runtime đã triển khai trước đó); không xóa hoặc hạ cấp dữ liệu Durable Objects.

## Trạng thái
Ứng viên; chỉ được công bố đã phát hành sau khi triển khai và xác minh Production thực tế.
