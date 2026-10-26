# GMWW Runtime V3.240 — WITCH-01 · Phù Thuỷ Già

Ngày 26/10/2026. Rule đã được GM phê duyệt.

## Luồng Đêm
- Artifact đầu ván (ART-01, nếu có) → Bầy Sói nhận diện (WOLF-01, nếu cần) → **Phù Thuỷ Già** → Vai Trò còn lại theo số thứ tự.
- Phù Thuỷ Già luôn là một lượt độc lập trước toàn bộ Vai Trò khác dù order trong Ván Mẫu là 99 hay trùng với vai khác. Không thay đổi thứ tự đã lưu trên lá bài/Ván Mẫu.
- Gọi audio vai theo cơ chế hiện có khi lượt bắt đầu, không thay thế hay tạo file audio.

## Năng lực Phù Thuỷ Già
- Mỗi đêm chỉ **1 hành động**: hoặc Đuổi hoặc Hồi Sinh.
- Hồi Sinh chỉ **1 lần duy nhất mỗi ván**, không thể tự cứu; chỉ người có trạng thái Chết đang hiệu lực, phát sinh ở **ngày hoặc đêm liền trước** (night N-1 khi đang trong night N).
- Nếu không có người đủ điều kiện: nút Hồi Sinh khóa, mục tiêu không thể chọn, Server từ chối thao tác giả mạo.
- Không thể Đuổi chính mình, người đã chết, hoặc cùng một mục tiêu mà chính Phù Thuỷ Già vừa Đuổi ở đêm N-1; hành động còn hiệu lực từ đêm N-2 không khóa.
- Bảo lưu kiểm soát tại Server ngay cả khi giao diện cũ chưa nhận cập nhật, dữ liệu hiệu ứng đã hết hiệu lực hoặc người chơi cố gọi API tương tác cũ.
- Ghi nhận mục tiêu hành động vào sổ sử dụng có sẵn, không migration hoặc xóa bất kỳ dữ liệu phòng/lịch sử nào.

## Kiểm thử đúng phạm vi
- `node --test tests/witch01-old-witch-rules.test.mjs tests/v389-night-runtime-integration.test.mjs`
- Canonical GM bundle verify, Worker/GM syntax, version sync, Production deployment and OTA SHA-256 verification.
- Không kiểm thử Chrome Player Card, Seat, iOS native IPA, Arena3D, nội dung khác ngoài phạm vi.

## Production, dữ liệu và rollback
- V3.240 Runtime OTA + Server Worker; Player Web không đổi nghiệp vụ; IPA shell giữ V3.110.
- CI bắt buộc SUCCESS trước merge và Production. Verify manifest release V3.240, file OTA có sha256 và Worker version chính xác sau phát hành.
- Rollback sang Worker/Runtime V3.239 bằng release workflow an toàn nếu cần; không xóa Durable Objects, phòng, người chơi hoặc lịch sử.
