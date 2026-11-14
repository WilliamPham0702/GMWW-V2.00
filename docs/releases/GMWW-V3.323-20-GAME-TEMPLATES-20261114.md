# GMWW Runtime V3.323 — Thư Viện tối đa 20 Ván Mẫu

Ngày: 14/11/2026. Thay đổi chức năng: PR #917; PR phát hành: tiếp nối #917.

## Có gì mới
- Thư Viện Ván Mẫu hỗ trợ tối đa **20 ván** trong kho dùng chung (GM / người tạo phòng).
- Hiển thị **Đã lưu X/20 Ván Mẫu**.
- Khi đã đủ 20, hệ thống chặn tạo ván mới; vẫn cho sửa ván hiện có.
- Bỏ việc tự động xóa ván mẫu cũ: chỉ xóa thủ công mới mở chỗ trống.
- Kiểm thử giới hạn ván thứ 20/21, quyền sửa ván và bảo toàn artwork.

## Giới hạn tác động
- Chỉ cập nhật Worker backend và GM Runtime. Không đổi iOS IPA shell, DNS/URL, Durable Objects schema hoặc dữ liệu hiện có.
- Dữ liệu Ván Mẫu đã lưu được giữ nguyên.

## Phát hành và xác minh
- Chỉ merge khi **CI Policy Gate + V3 Release Gate** cùng SHA đạt SUCCESS.
- Worker: xác minh Cloudflare Production deployment và health sau phát hành.
- Runtime: xác minh gói mới **GMWW-Runtime-V3.323.gmwwupdate**, SHA-256 đi kèm, ghi chú tiếng Việt trên kho GitHub Releases, không dùng lại nhị phân V3.322.
- Nghiệm thu trên iPhone: Thư Viện hiển thị X/20; lưu ván thứ 20; thử tạo ván thứ 21 phải nhận thông báo chứ không bị xóa ván; sửa ván cũ vẫn được.

## Rollback
- Nếu lỗi Worker, chuyển về phiên bản Worker Production trước khi phát hành mà **không xóa Durable Objects**.
- Nếu lỗi Runtime, quay lại phiên bản Runtime V3.322 đã xác minh qua kho Releases. Không hạ cấp iOS IPA và không thay dữ liệu thật.
- Khi rollback, không xóa hoặc ghi đè các Ván Mẫu đã lưu.
