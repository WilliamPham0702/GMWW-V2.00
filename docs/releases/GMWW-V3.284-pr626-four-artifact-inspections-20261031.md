# GMWW Runtime V3.284 — 4 Artifact soi (#09, #24, #29, #39)

Ngày chuẩn bị: 31/10/2026. Phạm vi PR #626 tách từ PR #584; mã nguồn giữ theo `main` hiện hành, không thay đổi IPA, Oracle hoặc dữ liệu.

- **#09 Vạc Ma Thuật:** xác minh mục tiêu chính xác là Dân Làng thông thường.
- **#24 Sương Hào Quang:** kiểm tra mục tiêu có thuộc Phe Ba.
- **#29 Nhẫn Sự Thật:** kiểm tra mục tiêu có thuộc Phe Sói.
- **#39 Trượng Tiên Tri:** chỉ trả vai thật cho chủ lá và GM.
- **GM:** kết quả soi qua popup, audio đúng dạng ĐÚNG/KHÔNG ĐÚNG hoặc tên vai thực.
- **Player Web:** kết quả gửi riêng trong phiên `/me`, tái đồng bộ khi reconnect; không công khai trên phòng/chat/WS.
- **DEMO:** gọi executor Server, tránh dùng lại Artifact đã hết lượt.
- **Undo:** GM hoàn tác kết quả soi cuối trong cùng ngày nếu dữ liệu chưa bị thay đổi; khôi phục quota, receipt và kết quả riêng tư.

## Điều kiện phát hành
1. GitHub required CI SUCCESS ở HEAD cuối cùng; Preview đạt, chỉ merge an toàn.
2. GitHub Actions trên `main` xây gói `.gmwwupdate` V3.284, kiểm tra chính xác SHA-256 toàn file và manifest, xác minh upload GitHub Releases. Không ghi đè phiên bản cũ.
3. Nếu Production cần cập nhật, chỉ deploy theo workflow có rollback, không đổi IPA và dữ liệu.

**Trạng thái tài liệu:** kế hoạch phát hành, KHÔNG được tự nhận đã xuất bản trước khi GitHub Release và checksum thực tế được xác minh.

**Rollback:** giữ tag Runtime và release checksum trước đó; nếu lỗi, hoàn tác commit trên `main` qua PR/CI an toàn, quay Worker về bản đã xác nhận; không xóa dữ liệu/cấu hình.
