# GMWW — Executor 107 lá: theo dõi triển khai PR #584

Ngày: 28/10/2026. Cơ sở đồng bộ: Native/Runtime V3.264.

## Phạm vi phê duyệt
63 Vai Trò, 44 Artifact. Không xem có Action ID/nút/icon là có executor hợp lệ. Mỗi lá phải có kết quả thực thi Server, quota/timing/interaction, GM/Player Web/private visibility, undo/reconnect/idempotency, demo và bài test tương tác phù hợp.

## Đã bổ sung xử lý trên nhánh (chưa nghiệm thu 107/107)
- Thợ Săn: chặn mục tiêu Phe Ba trước khi lưu hành động.
- Sói Thợ Săn: phân biệt đánh dấu với Sói Cắn; chết liên kết và giới hạn thay mục tiêu theo luật.
- Già Làng: chặn chết cùng đêm khi Rung Chuông, trừ một mạng, chết khi đã dùng hai mạng, có kiểm soát đêm.
- Lực Sỹ: hấp thụ một vết Cắn có hiệu lực, sự kiện công khai, chống trừ mạng lặp sau retry.
- Con Quạ: cộng hai phiếu bất lợi trong phiên Lên Giàn đúng mục tiêu.
- Người Yêu Hòa Bình: cấm phiếu GIẾT trong bỏ phiếu thường và do GM vận hành.
- Ấn Thị Trưởng: phiếu của chủ tính thành hai, không tạo người bỏ phiếu ảo.
- Vòng Hoa Hòa Bình: chủ chỉ được bỏ phiếu CỨU.
- Vạc Ma Thuật: Server xác thực Dân thường.
- Sương Hào Quang: Server xác thực Phe Ba.
- Nhẫn Sự Thật: Server xác thực Sói.
- Trượng Tiên Tri: Server đọc riêng Vai Trò.
- Khiên Bảo Hộ: lưu hiệu ứng bảo vệ vào đêm kế tiếp, giải quyết Cắn và hết hạn ở bình minh.

**Chưa nghiệm thu**: toàn bộ Player Web/GM UI, các tổ hợp liên kết, asset, audio, tính năng DEMO và tất cả lá còn lại. Bốn Artifact xem/kiểm tra hiện mới có kết quả Server, cần hoàn thiện xác nhận/hiển thị riêng theo Player Web. Không đánh dấu các lá này là đã hoàn tất 100%.

## Kiểm thử / chốt phát hành
- CI chuyên biệt: `Check RULE Executors 107 (focused)` với các test `tests/card-executors-*.test.mjs`.
- Các workflow không thuộc phạm vi cũ có thể lỗi do kiểm thử UI lỗi thời; không tự sửa/loại bỏ chúng để giả tạo SUCCESS.
- **Không merge, không phát hành OTA** đến khi ma trận 107 lá đạt đủ điều kiện CI bắt buộc, Native/IPA giữ nguyên trong các thay đổi của PR này.
- Khi đủ điều kiện: đồng bộ Runtime version, SHA-256, release notes tiếng Việt, rollback, xác minh Production.

Mốc hiện tại: triển khai **một phần**, PR giữ Draft. Không khẳng định 107 lá đã hoạt động.
