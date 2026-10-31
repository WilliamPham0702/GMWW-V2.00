# GMWW Runtime V3.285 — DEMO dùng vận chuyển Online (31/10/2026)

## Phạm vi
- Đóng gói cơ chế DEMO Online từ PR #677, được kiểm chứng triển khai Worker bằng PR #694.
- Nâng phiên bản đồng nhất từ V3.280 lên V3.285 tại Worker, GM Runtime, HTML, npm và bản phát hành OTA; không đổi cơ chế gameplay.
- DEMO vẫn dùng cờ demo và bảo vệ vai trò bot, người chơi thật, phân quyền, dữ liệu phòng. Bản phát hành này không sửa IPA Native V3.264, Oracle hoặc lược đồ Durable Objects.
- GitHub Releases cung cấp gói .gmwwupdate cùng .sha256 và manual-manifest.json; tự động tải trên kênh Worker khi Production an toàn.

## Release gate
- CI required tại SHA hợp nhất phải SUCCESS; nguồn GM phải khớp bundle, test DEMO/Online và version guard; Wrangler dry-run.
- Chỉ phát hành Production khi các kiểm tra kết nối, trình duyệt, OTA, manifest và checksum hoàn tất.
- Kiểm thử iPhone thật là bước nghiệm thu riêng: cập nhật thủ công, xác nhận Runtime V3.285, tạo DEMO, mở 2 Player Web, Chat/reconnect, kiểm tra role riêng tư và Undo. Không tuyên bố ĐẠT nếu chưa có bằng chứng thiết bị.

## Rollback
- Giữ gói Runtime V3.280 và các phiên bản đang lưu trên iPhone để khôi phục thủ công khi cần; bản V3.285 không ghi đè dữ liệu hoặc IPA.
- Worker: chuyển traffic 100% về Cloudflare Worker trước cập nhật (ghi nhận bằng Deployments API), nếu Production có lỗi. Không thay đổi dữ liệu Durable Objects.
- Không xóa Github Release trước đó hoặc các file trong vòng backup.
