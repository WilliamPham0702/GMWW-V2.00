# GMWW Runtime V3.307 — lá bài mini · lỗi hành động tiếng Việt · căn giữa MỞ ĐỀ CỬ

Ngày: 05/11/2026 · Phạm vi: Worker (Player Web) và Runtime GM (OTA). Không đổi IPA, URL, schema DO, không xóa dữ liệu. Mã nguồn đã merge ở PR #808; bản này tăng phiên bản Runtime vì V3.306 đã phát hành với nội dung khác.

## Thay đổi
1. Player Web: lá Vai Trò/Artifact thu nhỏ luôn có mặt lưng đã duyệt; ảnh lá lỗi tự quay về mặt lưng, hết ô "?".
2. Player Web: lỗi hành động hiển thị tiếng Việt, không lộ mã `DEMO_ACTION_ALREADY_USED_OR_NOT_YOUR_TURN`.
3. GM Lên Giàn: chữ **MỞ ĐỀ CỬ** căn giữa nút, icon đặt cố định bên trái.

## Kiểm thử
- PR #808: CI SUCCESS trên HEAD e71cfb7; 19/19 test đúng phạm vi đạt.

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.306 từ GitHub Releases; không xóa dữ liệu.
