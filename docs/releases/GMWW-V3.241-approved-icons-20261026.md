# GMWW Runtime V3.241 — Bộ icon minh họa đã duyệt

Thay bộ hình đơn giản bằng 49 ảnh hành động riêng và 1 ảnh xoay Yêu Tinh, phong cách biển xanh–vàng kim. Dùng đúng 19 ảnh đã được duyệt; hoàn thiện các ảnh còn lại theo cùng phong cách. Mỗi ảnh WebP 512×512, nền ngoài trong suốt; lưu SHA-256 ảnh gốc và ảnh đóng gói trong manifest.

Giữ kích thước hiển thị 80px, vùng chạm 92px, vị trí lối vào làng, kéo thả và nhiều mục tiêu. Yêu Tinh vẫn một nút, mở lựa chọn hướng theo Core. Giữ toàn bộ cập nhật menu V3.240, ảnh tải lên và ánh xạ tùy chỉnh V5. Không thay luật chơi, Player Web, DO, dữ liệu phòng/lịch sử hoặc IPA.

## Kiểm chứng

- Tái hiện đường dẫn cũ bằng test trước sửa; kiểm tra resolver V3, bảo toàn ảnh/ánh xạ tùy chỉnh, 50 ảnh riêng và SHA-256 hai bản sao Worker/OTA.
- Kiểm tra icon trong trận: kéo thả, hủy kéo, không mục tiêu, nhiều mục tiêu, bật/tắt và xoay Yêu Tinh.
- Kiểm tra alpha, kích thước và khoảng an toàn từng ảnh; xem hình ở kích thước 80px trên nền tối.
- Kiểm tra ghép app, đồng bộ phiên bản và Worker dry-run. CI chọn phạm vi icon-artwork; không chạy Card/Seat/IPA ngoài phạm vi.
- Trước merge yêu cầu CI thành công; sau deploy đối chiếu ảnh trực tiếp và ảnh OTA bằng SHA-256, phiên bản, release notes tiếng Việt và IPA giữ nguyên.

## Hoàn tác

Khôi phục deployment Production V3.240 trước phát hành hoặc revert commit phát hành rồi chạy pipeline Production. Không xóa localStorage/IndexedDB, phòng hoặc lịch sử. Giữ IPA V3.200 (shell V3.110), SHA-256 `974cefca2dbff129d0f6c4bf50505f883814a9b9813b08199238f8bb4a2f4aa6`.

## Quyết định tích hợp

Bản gốc dự kiến V3.234, nhưng main và Production đã lên V3.240 từ task menu. Bộ icon dùng V3.241 và rollback V3.240 để bảo toàn cập nhật mới. Ảnh nguồn được khôi phục từ các file đã tạo trước đó; 7 ảnh cuối được tạo riêng để hoàn tất danh mục.
