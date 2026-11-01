# GMWW Player Web — Phân cách khung Chat (PR #710 → main-first)

Ngày: 01/11/2026. Chưa merge/phát hành.

## Thay đổi
- Đặt đường kẻ ngang 1px trắng mờ (48%) giữa nội dung Chat và ô nhập khi Chat Làng đang mở.
- Giữ nguyên quyền Chat, nội dung, bố cục, ô Gửi, và tất cả code Runtime hiện hành.
- Bảo toàn phần sửa được kiểm toán từ PR #710 (source + generated JS + test). Loại bỏ metadata V3.286 cũ vốn đã phát hành, để tránh đè phiên bản.

## Chốt an toàn
- Required CI phải SUCCESS tại HEAD cuối; kiểm tra `node --test tests/player-chat-composer-divider.test.mjs`, `node .github/scripts/assemble-player-web.mjs --verify` và browser tests.
- Sau khi hoàn tất cả nhóm #700 và #656, tăng phiên bản thành V3.287+ trong PR phát hành riêng, chỉ phát hành GitHub-first khi xác minh đủ Worker/Runtime, manifest, SHA-256 và rollback.
- Nghiệm thu trực tiếp Chat + bàn phím iPhone; không tự tuyên bố ĐẠT trước khi thử.

## Rollback
- Revert PR sửa giao diện, không làm thay đổi IPA, 3D, dữ liệu Durable Objects hoặc thiết lập Cloudflare dự phòng.
