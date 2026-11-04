# GMWW Runtime V3.286 — phát hành 3 PR đã merge

Ngày 01/11/2026. Ứng viên: chưa phát hành Production khi CI required và checksum chưa được xác minh.

## Phạm vi từ main
- PR #698: Chat riêng GM cho mọi trạng thái thành viên phòng; chặn Chat Làng khi chết/đuổi; mở lại Chat Làng sáng hôm sau khi đóng băng hết hiệu lực.
- PR #699: icon hành động Player Online trên đống lửa trong lượt, kéo vào mục tiêu; hiệu ứng lượt và thông báo quyền Chat.
- PR #702: thông báo Player Web nằm dưới menu trên, không bị Chat che; nghiệm thu iPhone ghi nhận trong PR #711.

Không bao gồm các PR chưa merge #700, #701, #697, #710, #713. Không cherry-pick hoặc đóng nhánh Draft.

## Điều kiện phát hành
1. Đồng bộ V3.286 trong source Worker, Runtime, HTML, source part và package + lock.
2. Chạy required CI SUCCESS trên đúng commit cuối rồi merge vào main.
3. GitHub Actions chỉ đóng gói .gmwwupdate sau khi main same-SHA CI SUCCESS, xác minh SHA-256 và publish GitHub Releases; Production Worker dùng cùng SHA.
4. Xác minh kho tải, metadata, Runtime/Server Production và nghiệm thu trên iPhone.

## Rollback
Giữ IPA, Oracle, phòng, Durable Objects và dữ liệu. Có thể dùng gói Runtime V3.285 đã phát hành để khôi phục trên thiết bị tương thích, đồng thời rollback Cloudflare Worker về phiên bản tương thích đã được kiểm tra. Không ghi đè Release V3.285, không tái sử dụng tên phiên bản và checksum cũ.
