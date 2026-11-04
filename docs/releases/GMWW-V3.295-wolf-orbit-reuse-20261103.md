# GMWW V3.295 — Hiệu ứng 🫧 và 🐦‍🔥
Ngày: 03/11/2026

- Nhân vật tới lượt: 6 biểu tượng 🫧 bay quanh người.
- Nhân vật được chọn: 6 biểu tượng 🐦‍🔥 bay quanh người.
- Tái sử dụng đúng animation `gmwwSvVerticalOrbit` của 🐺: quỹ đạo elip ngang/dọc 30px/9px, 6 giây/vòng, lệch pha 1 giây.
- Đồng bộ GM Server và Player Web; không thay đổi hiệu ứng 🐺, luật chơi, dữ liệu, DNS hoặc IPA.
- Kiểm thử: keyframe nguyên gốc, biểu tượng chính xác, đồng bộ Player Web, version guard và required CI.

## Xác minh
Chỉ công bố sau khi GitHub Actions phát hành thành công .gmwwupdate, .sha256, đối chiếu commit và Cloudflare Worker Production Health.

## Rollback
- Giữ nguyên bản GMWW V3.294 trên GitHub Releases; không ghi đè bản cũ.
- Nếu V3.295 lỗi: tắt phát hành V3.295, rollback Worker bằng deployment Production trước đó trong Cloudflare với xác minh Health và backup, không thay DNS/IPA/Durable Object.
- Runtime trên iPhone: dùng lại gói V3.294 có SHA-256 xác minh, theo quy trình khôi phục an toàn. Không tự động hạ version trên dữ liệu đang hoạt động.
