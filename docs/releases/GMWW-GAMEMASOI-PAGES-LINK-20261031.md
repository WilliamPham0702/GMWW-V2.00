# Game Ma Sói — Pages URL ngắn, 31/10/2026

## Phạm vi
- Dùng dự án Cloudflare Pages 'gamemasoi' đang tồn tại và hostname gamemasoi.pages.dev.
- 302 HTTPS tới https://gmww-v2-00.williampham0702.workers.dev/. Không proxy, không đổi Worker, IPA, OTA, DO, Oracle hay dữ liệu.
- Cảnh báo: trình duyệt đổi thanh địa chỉ về workers.dev sau chuyển hướng; KHÔNG coi đây là alias giữ nguyên hostname và KHÔNG mở tùy chọn link mới trong GM trước nghiệm thu.
- Deploy chỉ khi main same-SHA Worker CI SUCCESS, diff thuộc riêng phạm vi Pages và test PASS. Link cũ độc lập với Pages.

## Nghiệm thu
- Kiểm thử chính xác 302, đường dẫn tuyệt đối HTTPS và không triển khai Worker/Runtime theo PR này.
- Sau triển khai: xác minh 302 và trình duyệt người chơi; login/chat/reconnect trên iPhone thật là gate riêng.

## Rollback
- Trên Pages 'gamemasoi', rollback deployment trước nếu có hoặc tạm tắt site; link Worker cũ không đổi. Không xóa hay di chuyển dữ liệu.

## Sửa cổng phát hành Pages 31/10/2026 (PR theo dõi)
- Lượt đầu sau PR #661: Worker main CI SUCCESS nhưng Pages deploy không chạy vì checkout bị shallow, lệnh HEAD^1 lỗi 128. Không có Pages production deployment từ lượt này.
- Sửa checkout đầy đủ lịch sử và fetch main không dùng --depth=1; tiếp tục xác thực cùng SHA CI SUCCESS.
- Whitelist chỉ nhận file Pages và hai script CI liên quan, chặn các file game/backend/IPA.
- Chặn GitHub Runtime OTA tự phát hành đối với chính xác đợt sửa Pages-only.
- URL đích và hành vi HTTPS 302 giữ nguyên; không động dữ liệu, Oracle, Worker hay IPA.
- Rollback: dừng/khôi phục bản Pages trước; Worker Production độc lập.

## Khắc phục nhiễu CI 31/10/2026
- Chỉ triển khai Pages khi commit sửa `infra/pages/gamemasoi/*` và toàn bộ file thay đổi thuộc whitelist an toàn.
- Commit Oracle, Worker, gameplay hoặc CI không liên quan: workflow Pages kết thúc thành công ở chế độ bỏ qua, không tạo deployment mới.
- Giữ nguyên đúng hai quy tắc HTTPS 302 tới Cloudflare Production cũ, không đổi IPA/Runtime/DO/data.
- Rollback: khôi phục workflow trước đó hoặc tắt project Pages; Worker cũ luôn độc lập.
