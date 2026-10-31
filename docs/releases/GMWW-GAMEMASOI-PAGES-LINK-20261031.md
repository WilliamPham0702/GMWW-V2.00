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
