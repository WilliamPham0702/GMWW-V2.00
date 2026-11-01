# GMWW Runtime V3.287 — Chat UI (01/11/2026)

## Phạm vi xác thực
- PR #720 (đã merge, thay thế #710 đóng không merge): đường phân cách trắng mờ giữa nội dung Chat và ô nhập Player Web.
- PR #721 (đã merge, thay thế #700 đóng không merge): GM Server chỉ icon 💬 ngay sau Khôi phục, giữ nhãn aria-label và quyền Chat.
- Merge commit: #720 3cd4c1998a80f1c71ecca5006fd04e2f52e9d26a; #721 cad8eb7ad3260fd1d50484560b8de17ac54d52e5.

## Không bao gồm
- PR #656 chưa merge; PR #581 Arena 3D đóng băng; tin nhắn thoại và Audio/đồng bộ đang mở.
- Không nâng IPA Native V3.264, không tác động dữ liệu Durable Objects/Oracle hoặc thay luật chơi.

## Điều kiện phát hành GitHub-first
1. Main mới nhất, required CI cùng SHA SUCCESS; Worker/Player Web/GM bundle và version guard SUCCESS.
2. Gói .gmwwupdate V3.287 từ GitHub Actions, SHA-256 file và manifest verified. Không ghi đè release.
3. Xác minh Worker Production/OTA tương thích Runtime V3.287, nghiệm thu iPhone trước khi tuyên bố đạt trên thiết bị.
4. Không xóa nhánh/PR cũ/Release cũ hoặc dữ liệu.

## Rollback
- Giữ Runtime V3.286 và SHA-256 trong GitHub Releases, lưu version Worker Production trước deploy.
- Có lỗi: rollback Worker về version trước; với thiết bị đã nâng Runtime, chỉ dùng gói khôi phục tương thích có version tăng, không cưỡng ép hạ cấp.
