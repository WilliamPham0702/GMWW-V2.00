# GMWW V3.264 — Tối ưu IPA và Runtime OTA

## Cập nhật nội dung gì?
- IPA mới và gói Runtime OTA thủ công chỉ đóng gói **51 icon hành động WebP V3**. Không đóng gói 98 icon PNG sea-v1/v2 cũ, tương ứng **16.130.922 byte** tài nguyên nguồn trước nén.
- **Không xóa** thư viện icon nguồn V1/V2 trong GitHub hoặc các phiên bản Runtime cũ trên iPhone. Bảo toàn rollback.
- Giữ toàn bộ 40 Character atlas và gốc, animation dự phòng, các artwork Vai Trò/Artifact, nhạc/audio, dữ liệu, phòng, lịch sử, Durable Objects.
- Sửa hai bộ chọn danh sách Audio trong GM thành bộ chọn nhiều phần tử `$$` để tránh lỗi lúc kiểm tra IPA và đảm bảo mọi dòng nhận sự kiện.
- Kế thừa đầy đủ Runtime V3.263 và ba luật Artifact đã phát hành. Không thay Core/Player Web/gameplay.
- Đồng bộ IPA Native, GM và Worker V3.264; xác minh SHA-256 và ghi chú tiếng Việt.

## Chốt phát hành
- Kiểm thử CI đúng phạm vi: 51 icon, âm thanh danh sách, trình cập nhật Runtime, IPA startup, delta, SHA-256.
- Chỉ merge khi CI bắt buộc SUCCESS, IPA test build có đủ nguồn và checksum, dung lượng IPA giảm so với V3.257.
- Sau Production kiểm chứng URL tải IPA, OTA, SHA-256; rollback về IPA V3.257/Runtime V3.263 nếu lỗi.
- Không loại 13,53 MB ảnh Character gốc hoặc 10,02 MB frame đi bộ dự phòng vì còn phụ thuộc Native.
