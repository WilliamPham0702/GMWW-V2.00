# GMWW Runtime V3.263 — 3 luật Artifact (28/10/2026)

## Cập nhật nội dung gì?
- **Bình Giấc Mơ:** Khóa chức năng của người được chọn trong hai chu kỳ ngày/đêm, áp dụng ban ngày và ban đêm, tự kết thúc đúng hạn. Mục tiêu đang khóa từ chối trước khi tiêu hao lượt; GM có thể hoàn tác lượt đêm.
- **Hơi Thở Lão Già:** Ghi nhận đánh dấu ở ngày hoặc đêm N, xét chết vào bình minh sau đêm kế tiếp; không làm chết ngay khi đánh dấu. Kiểm tra miễn nhiễm, người đã chết/đuổi, chống lặp và hỗ trợ hoàn tác.
- **Kim Cương Phủ Nhận:** Chỉ loại Artifact dùng mãi mãi đã thực sự dùng; xóa khỏi ván, giữ lịch sử và Vai Trò, khóa kích hoạt lại từ Server, GM, Player Web và bản lưu khi reconnect.
- Tiếp tục bảo toàn hoạt ảnh đi bộ tới **cùng bán kính quanh đống lửa V3.262**, không sửa IPA Native **V3.257**, thư viện ảnh/audio/icon, phòng, Durable Objects, lịch sử hoặc các luật chưa triển khai.

## Phát hành và rollback
- Chỉ công bố khi **Check Player Web Worker SUCCESS đúng SHA**, bộ test RULE/GM và Worker dry-run đạt, manifest Runtime OTA V3.263 được tạo với **SHA-256 từng file** và xác minh thực tế từ Production.
- OTA thủ công được tạo từ cùng bản manifest, đi kèm bản tự động; không xóa tài nguyên/ dữ liệu lưu và không chuyển cấp IPA.
- **Rollback:** dùng lại Worker và Runtime OTA V3.262 trước phát hành nếu cần. Không rollback/xóa phòng hoặc lịch sử DO. Các dấu tích/hiệu ứng đã phát sinh trong ván có thể cần GM xử lý theo luật hiện hành khi rollback.
