# GMWW — GitHub Actions PR Preview khi Cloudflare Workers Builds hết hạn mức

Ngày: 29/10/2026

## Thay đổi
- Tạo GitHub Actions `Check GMWW PR Preview (GitHub Actions)` chạy trên pull request vào `main`.
- Job `validate-preview` kiểm tra guard về quyền truy cập dữ liệu và chạy `npm run check` (Wrangler dry-run) trên GitHub runner; không dùng phút Cloudflare Workers Builds.
- Sau khi validate thành công, chỉ PR do chủ repo tạo trong chính repo mới có thể chạy `wrangler preview --worker-name gmww-v2-00 --name pr-<số PR>`.
- Chỉ dùng `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` trong bước tạo Preview, không đưa credentials vào các bước chạy test.
- Giữ `previews.durable_objects.bindings.ROOMS` trong `wrangler.jsonc`; Cloudflare cấp namespace/state riêng cho mỗi Preview. Guard từ chối binding KV, D1, R2, Queue, service, Workflow hoặc routes không được kiểm toán.
- Không tạo workflow push hay workflow_run; không kích hoạt deploy Production, build IPA, Runtime OTA hoặc viết dữ liệu Production.

## Giới hạn và kiểm soát
- Workflow mới cần 2 GitHub Actions secrets đã được các workflow phát hành hiện hữu tham chiếu. Nếu chưa được thiết lập, Preview job thất bại công khai, không được tự nhận PASS.
- Không thay thế/loại bỏ các required checks khác hoặc tự merge khi chưa đạt.
- Cloudflare Workers Builds có thể vẫn tự khởi chạy theo kết nối Git cũ; để tiết kiệm phút dài hạn cần tắt auto-build Cloudflare cho Preview sau khi kiểm thử GitHub Actions đã vận hành ổn định.
- Phân quyền token Cloudflare theo nguyên tắc tối thiểu là cải tiến bảo mật được khuyến nghị; workflow chỉ thao tác qua lệnh `wrangler preview`.

## Rollback
Revert PR cấu hình CI này để hủy workflow GitHub Actions Preview. Việc revert không làm thay đổi Worker Production, IPA, OTA hoặc dữ liệu. GitHub Preview được dọn theo quy trình đóng PR hiện hữu.
