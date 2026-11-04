# GMWW FAST-TRACK V1.0 — Chính sách thực thi (31/10/2026)

Áp dụng cho mọi task/PR mới; không thay đổi phạm vi hoặc lịch sử PR đang chạy.

## Phân luồng
- P0: lỗi Production, dữ liệu, bảo mật, login/kết nối bị chặn. Ưu tiên xử lý và phát hành khi an toàn.
- P1: lỗi Online/Player Web/GM UI. PR nhỏ độc lập.
- P2: thay đổi RULE. Chốt yêu cầu cho mỗi PR; yêu cầu mới vào backlog/PR khác, không mở rộng PR đang test.
- P3: tính năng mới. Phát triển riêng.

## Quy trình bắt buộc
1. Ghi nhận HEAD/main SHA, triệu chứng, test tái hiện, phạm vi tác động và rủi ro hồi quy.
2. Một PR chỉ một lỗi hoặc một nhóm thay đổi liên quan. Không sửa ngoài phạm vi.
3. Sau 5 phút bế tắc: ghi root cause, đổi phương án hoặc tách PR; không xóa thành quả, lịch sử hay bỏ qua CI.
4. Chạy test tái hiện, test hồi quy liên quan và các kiểm tra an toàn bắt buộc theo AGENTS.md. Required checks phải SUCCESS trên HEAD cuối trước merge.
5. Chỉ merge khi không xung đột và có đủ điều kiện an toàn. Phê duyệt FAST-TRACK không phải phê duyệt vô điều kiện cho mọi thay đổi Production.
6. Phát hành GitHub-first: từ main đã xác minh, build một lần, SHA-256, release notes tiếng Việt, rollback; cập nhật kho Releases dùng chung bằng asset gốc, không tạo bản sao thừa. Cung cấp file .gmwwupdate tải thủ công khi có Runtime.
7. Bảo toàn IPA, Cloudflare Production, Oracle, Durable Objects, dữ liệu, lịch sử, các bản rollback và PR đang chạy. Không chuyển server khi đang chơi ván.
8. Báo trạng thái thực: CHƯA CHẠY / PASS / FAIL / BLOCKED; không tuyên bố đã phát hành nếu chưa xác minh artifact và Production.

## Triển khai automation
Các workflow CI/release hiện có phải được kiểm toán trước khi sửa. Thay đổi automation bằng PR riêng, không tự ý thêm deploy trigger hoặc xóa artifact. Không tắt required checks hay branch protection.
