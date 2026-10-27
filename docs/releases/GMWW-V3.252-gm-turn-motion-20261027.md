# GMWW Runtime V3.252 — GM Bay/Chạy và tiết kiệm năng lượng

**Phạm vi:** GM Runtime/DEMO trên iPhone. Giữ nguyên gameplay Core, Player Web, Durable Objects, phòng, lịch sử, native shell và IPA.

- Nhân vật đến lượt được nâng lên trên đầu vị trí đứng một chiều cao nhân vật, hạ đúng vị trí khi kết thúc lượt.
- Người được chọn làm mục tiêu chạy tại chỗ bằng animation đang có, trở về đứng yên khi bỏ chọn hoặc chuyển lượt. Không sửa tọa độ Seat.
- Menu GM có nút **Bay/Chạy**, lưu trên máy GM, không truyền tới Player Web.
- Chống nóng: Canvas của nhân vật đứng yên ngừng vẽ; khi không có chuyển động dừng toàn bộ requestAnimationFrame; đối tượng cần chạy giới hạn tối đa 15 FPS. Không thêm timer, không vẽ khi ẩn trang hoặc cài đặt giảm chuyển động.
- Chỉ chạy CI trực tiếp liên quan và kiểm tra cú pháp, đồng bộ 6 module, Worker cùng SHA, OTA SHA-256. Nhiệt độ máy thực tế chỉ nghiệm thu trên iPhone.

**Rollback:** phục hồi Worker/OTA từ commit Production V3.251 và manifest/catalog tương ứng, không thay đổi dữ liệu Durable Objects. Vì OTA không cho hạ phiên bản, nếu thiết bị đã cập nhật V3.252 thì phát hành gói khôi phục với phiên bản lớn hơn V3.252. Có thể tắt hiệu ứng tức thời bằng nút Bay/Chạy trên GM.

**Phát hành:** CI và HTTP/SHA-256 Production phải SUCCESS trước khi xác nhận hoàn tất.
