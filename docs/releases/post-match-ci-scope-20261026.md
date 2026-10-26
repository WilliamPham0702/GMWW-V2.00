# GMWW — CI đúng phạm vi PR #532 (26/10/2026)

PR CI riêng chỉ điều chỉnh phân loại thay đổi, không sửa gameplay, IPA, Player Web, dữ liệu hoặc Runtime.

- Phạm vi được xác minh bằng diff cho sáu tệp PR #532; chỉ chấp nhận sửa các hàm Kết thúc ván, RESET Server, chọn phòng và đổi chế độ. Thay đổi ngoài danh sách quay về `full`.
- Workflow Worker bắt buộc: cú pháp, `wrangler deploy --dry-run`, đồng bộ mã GM, test kết thúc ván/Seat/DEMO và bảo toàn lịch sử.
- Check Player Card chỉ chạy hồi quy vòng đời ván; không mở thử nghiệm Card Chrome/Edge.
- Kiểm tra icon và Lên Giàn vẫn xác minh tính toàn vẹn mã nhưng không chạy bộ E2E không liên quan.
- Chặn xây dựng Native IPA trong scope `post-match-room-532` và `ci-policy`.
- `ci-policy` chỉ cho phép đúng tập tệp workflow/script/test (bao gồm bỏ qua phép thử Arena 3D không liên quan) và ghi chú này, không bao gồm mã game.

Rollback: hoàn nguyên PR sửa CI nếu phân loại sai; không chạm dữ liệu DO hay IPA. Production vẫn cần được phê duyệt phát hành sau khi kiểm tra chốt Runtime/OTA và SHA-256.

Chốt độc lập `postmatch-ci-532` chỉ chạy bài test chính sách PR532, không hạ tiêu chuẩn bài `ci-policy` hiện hữu của các PR khác.
