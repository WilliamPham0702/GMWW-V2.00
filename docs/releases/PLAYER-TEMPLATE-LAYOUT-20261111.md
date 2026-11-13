# Player Web — sửa bố cục Chọn Ván và Thiết kế Ván Mẫu

- Sửa màn thiết kế chỉ hiện tiêu đề: thay hàm tải ảnh chỉ có trên Server bằng endpoint ảnh vai chuẩn có sẵn trên Player Web.
- Kiểm thử không giả lập hàm tải ảnh; dùng ảnh WebP thật trong gói tài nguyên, tái hiện designer trống trên bản cũ.
- Bỏ chiều cao 100% của nút và ô chọn trong hàng grid tự giãn; đặt ô chọn cao 44px, nút theo nội dung.
- Khung nội dung cuộn riêng, giữ chiều cao tiêu đề và các mục để không chồng nút Hủy/Chọn Ván.
- Sửa tham số nhập thời gian riêng từng vai để giá trị được gửi đúng khi chọn ván.
- Kiểm tra trình duyệt Chromium/WebKit với dữ liệu giả ở 390×844, 768×1024, 1024×768: mở thiết kế, chọn vai, lưu mẫu, chỉnh thời gian và áp dụng.
- Chỉ Worker/Player Web; giữ IPA, Runtime, URL, DO và dữ liệu. Phát hành qua V3 với snapshot phiên bản cũ và rollback nếu smoke thất bại.
