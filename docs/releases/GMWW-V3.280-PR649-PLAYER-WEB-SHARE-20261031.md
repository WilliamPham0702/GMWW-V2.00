# GMWW RUNTIME OTA V3.280 — PR #649

## Thay đổi
- Thu gọn box Chia sẻ Player Web trên GM iPhone; chỉ một URL, tiêu đề và trạng thái ngắn gọn.
- Nút Sao chép/Gửi link cùng một hàng. Link Cloudflare tiếp tục hoạt động; link mới chỉ bật sau khi DNS/HTTPS được xác thực.
- Giữ các ID, Clipboard/Web Share, logic trò chơi, Oracle, Durable Objects, dữ liệu, phòng và lịch sử.
- Đồng bộ Runtime V3.280 trong Worker, app GM, HTML và package; sinh lại manifest SHA-256 khi phát hành.
- Không thay IPA; Native shell vẫn V3.264.

## Kiểm thử và phát hành
- Phải đạt CI Policy Gate, GM link-sharing UI iPhone WebKit, Chrome viewport, Player Web Worker và Runtime integrity trước khi merge/phát hành.
- Xuất GitHub Runtime OTA `.gmwwupdate` và `.sha256`. Không ghi đè tag phiên bản với bytes khác.
- Nghiệm thu Safari, Chrome và Edge trên iPhone trước khi kết luận phát hành đạt.

## Rollback
- Bản dự phòng V3.279. Không hạ cấp hoặc sửa dữ liệu/IPA; khôi phục Runtime qua cơ chế có xác minh gói.
