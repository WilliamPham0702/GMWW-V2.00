# Runtime V3.250 — Đồng bộ luật vào Cài đặt từng lá Vai Trò

**Nội dung cập nhật:** Cài đặt của các lá đã chốt phải phản ánh cùng một bộ luật đang được Core vận hành, không chỉ đúng lời thoại/hiệu ứng trong trận.

- Phù Thuỷ Già: sau Bầy Sói nhận diện; mỗi đêm chỉ Đuổi hoặc Hồi Sinh. Hồi Sinh 1 lần/ván, đúng người chết ngày/đêm trước, không tự cứu; Đuổi không tự chọn hoặc trùng người hai đêm liên tiếp.
- Sói Tuyết: ưu tiên Đóng Băng; cấm cùng người hai đêm liền, đêm thứ ba được chọn lại; chỉ Cắn khi là Sói cuối. Sói Trùm bị Đóng Băng thì vết Cắn chung vô hiệu.
- Bảo Vệ: chỉ bảo vệ khỏi Sói Cắn, kể cả vết cắn dịch chuyển; không bảo vệ một người hai đêm liên tiếp.
- Sói Trùm, Sói Thường, Sói Tiên Tri, Sói Con, Sói Thợ Săn: điều kiện tham gia Bầy Sói Cắn chung; chức năng riêng thức đúng thứ tự. Loại nội dung cũ sai của Sói Tiên Tri nói không được Cắn khi còn Sói khác.
- Yêu Tinh: sau mọi hành động của Sói; dịch Trái/Phải/Không Dịch, bỏ qua người chết trước đó.
- Phù Thuỷ: thức sau Yêu Tinh, thấy mục tiêu Sói Cắn cuối kể cả được Bảo Vệ hoặc Bất Tử Đêm; Sói Trùm bị Đóng Băng/Đuổi thì không thấy; bình Cứu và Giết độc lập, có thể dùng cùng đêm, mỗi bình một lần/ván.
- Say Rượu: một lần ở đêm 3, trước Phù Thuỷ Già; bốc vai người đã chết, không ai chết trở thành Dân, chuyển Phe và năng lực theo vai bốc.
- Nhân Bản: chỉ Đêm 1 chọn người sống khác mình; khi mục tiêu chết, từ đêm sau nhận vai/phe/năng lực; nếu chưa chết vẫn là Dân.

**Sửa đồng bộ:** Cơ chế nạp lá mặc định trước đây có thể ghi đè các mô tả/điều kiện vừa được cập nhật. V3.250 áp dụng hợp đồng luật đã chốt ở bước cuối cho cả thư viện mới và thư viện đã lưu; cập nhật đúng các trường Thông tin, Giới hạn, Điều kiện, và các thông số của từng Chức năng trên mặt Cài đặt lá bài. Thiếu chức năng chuẩn thì phục hồi đúng chức năng, không xóa các chức năng bổ sung ngoài phạm vi.

**Bảo toàn:** Không thay artwork, file audio, chủ đề, Artifact, dữ liệu người chơi, phòng, lịch sử và IPA V3.110. Hệ thống chỉ đồng bộ các lá Vai Trò đã chốt, không cập nhật Core gameplay.

**Kiểm thử:** kiểm tra từng lá trên Cài đặt, thư viện đã lưu/khởi tạo mới, idempotency, giữ audio và artwork, kiểm thử liên quan WITCH-01/NIGHT-02/Phù Thuỷ-Say Rượu-Nhân Bản. CI bắt buộc Worker và kiểm tra gói GM.

**Phát hành:** OTA SHA-256 theo manifest V3.250. Rollback Runtime/Worker V3.249 không xóa Durable Objects.
