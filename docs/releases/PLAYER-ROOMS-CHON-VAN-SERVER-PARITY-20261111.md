# Player Web: đưa hai màn Ván Mẫu của Server sang bước Chọn Ván

## Thay đổi

- Màn Chọn Ván có Ván Gợi Ý, AUTO VÁN, Thêm Mới, tóm tắt số lá, bật/tắt Artifact riêng cho trận và hai nhóm thời gian có thể tùy chỉnh.
- Màn Thiết kế Ván Mẫu có thư viện 28 Vai Trò lõi lấy từ cấu hình Server, ảnh vai, tìm kiếm, lọc phe, lọc Thường dùng, chỉnh số lượng/thứ tự/thời gian riêng, thống kê phe, cấu hình Artifact và thời gian, lưu/sửa/xóa mẫu.
- Chỉnh Artifact và thời gian tại Chọn Ván chỉ áp dụng cho trận hiện tại; không ghi đè Ván Mẫu đã lưu.
- Không đổi IPA, Runtime, URL, cấu trúc Durable Object hoặc dữ liệu Production.

## Xác minh

- Kiểm thử phạm vi Player Room/Ván Mẫu: kiểm soát giao diện Chọn Ván, catalog vai, AUTO VÁN 14 người, cấu hình riêng cho trận, lưu và nạp Ván Mẫu.
- Kiểm tra cú pháp JavaScript và xác nhận bundle Player Web khớp các source part.
- Chờ required CI, CI Policy Gate và Worker dry-run SUCCESS trên HEAD PR cuối cùng trước khi xin phát hành Worker-only.
- Rollback bằng phiên bản Worker Production ngay trước khi phát hành; không thay đổi IPA hoặc Runtime.
