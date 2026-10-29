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

## Xác minh thực tế 29/10/2026

- Đã merge `main` 157b499d vào nhánh bằng commit d8f97e8, giữ cả Strongman executor và privateRoleGroupRecognition. Không force push. Tiếp tục đồng bộ main 8c88afba (PR #612) trong checkpoint kế tiếp.
- CI tại d8f97e8: `Check RULE Executors 107 (focused)` SUCCESS, run 40845716172; `CI Policy Gate` SUCCESS, run 40845716303. Đây là kết quả bộ test, **không phải chứng nhận 107 lá**.
- Sửa literal `\n` làm test catalog không parse được; giữ nguyên assertion và chạy lại: 65/65 PASS. Hunter: 2/2 PASS. GM assembly 7 module, syntax và Worker dry-run PASS.
- Chạy Worker thật với SQLite cục bộ, HTTP thật, không dùng Production: soi, miễn chết đêm, Phù Thủy giết và Sói/bình minh PASS. Assertion Tiên Tri cũ `CÓ SÓI` đã được đối chiếu với luật/voice hiện tại `Người bạn soi là Sói`, đồng thời xác minh boolean wolf.
- HTTP thật cho Vạc Ma Thuật, Sương Hào Quang, Nhẫn Sự Thật, Trượng Tiên Tri: kết quả riêng, kiểm quyền GM/sở hữu, retry cùng request, xung đột request, single-use quota, reconnect và không lộ Artifact qua public API PASS.
- 84 bài liên quan scheduler, Dân Làng, Say Rượu, Nhà Tinh Thần Học, GM vote bundle PASS sau khi bổ sung dependency thật vào VM fixture. Không thêm mock executor. Bầy chỉ còn Sói chết phải bỏ lượt cắn; assertion cũ đòi lượt cắn đã được sửa theo hành vi này.
- Ma trận riêng đủ 107 ID: `docs/audits/pr584-acceptance-107.json`. Chưa lá nào được chứng nhận toàn bộ tiêu chí; mỗi ô chưa kiểm giữ NOT_VERIFIED. Không đổi kết quả test thành PASS dựa trên inventory/nút/icon.

### Chặn phát hành còn tồn tại

Nhiều Artifact vẫn rơi vào `DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED`; các luồng sao chép/hoán đổi/cấp Artifact, giao tiếp riêng, DEMO/audio/UI, undo và tương tác chéo chưa đủ bằng chứng. Đây là phần triển khai/kiểm thử còn phải làm, không phải yêu cầu chủ dự án chọn kỹ thuật.

**Không merge PR vào main, không phát hành Production/OTA.** Chưa tạo Runtime Update thủ công cho PR này. Không đổi IPA, không ghi/xóa dữ liệu Production. Rollback Production không cần kích hoạt vì chưa có triển khai; checkpoint nhánh có thể revert sau khi đối chiếu head mới nhất, không force push.

### Sửa kết quả riêng trên Player Web

Phát hiện và sửa Online/DEMO bỏ sót `result.message` của Artifact ban ngày, đồng thời thay JSON soi đêm bằng `revelation.message` dễ đọc. Hai bài test chạy trực tiếp hàm UI thật đã FAIL trước sửa và PASS sau sửa. Chưa chứng nhận UI 107 lá; chưa phát hành.
