# GMWW Runtime V3.271 — Player Web tham gia DEMO đang chạy

V3.271: Khắc phục Player Web DEMO đứng ở Sảnh Chờ khi GM đang chạy ván: hiển thị phòng DEMO hoạt động ngay cả khi lease danh sách cũ; tài khoản đăng nhập có thể vào ván DEMO đang chạy mà không mở khóa phòng; Player Web tự theo vào DEMO duy nhất đang chạy hoặc phòng GM đã gọi; luôn đồng bộ cảnh chơi/vòng ngày đêm/nhân vật và quyền riêng tư. Người tham gia muộn không được phát trái phép lá Vai Trò đã chốt; chỉ người được GM gán Vai Trò mới được thao tác Vai Trò, AI vẫn dự phòng chống trùng. Giữ V3.270 Audio, V3.269 DEMO lai, V3.268 Ván Mẫu, IPA V3.264 và dữ liệu, rollback V3.270.

## Phạm vi
- Server và Player Web, không IPA; không thay đổi DO schema, vai trò được phát, lịch sử, audio.
- Người vào muộn có thể theo dõi ván, chat theo chính sách; hành động vai trò chỉ khi đã được GM gán Vai Trò và quyền chính xác. Không gán vai đang chạy trái luật.
- CI: kiểm cú pháp, game bundles, DEMO người thật/AI và Worker dry-run.
- Rollback: triển khai lại Runtime V3.270 trước phát hành; không xóa Durable Object.
