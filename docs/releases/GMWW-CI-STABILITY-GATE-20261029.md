# GMWW — CI Stability Gate (29/10/2026)

## Thay đổi
- Tạo workflow **CI Stability Gate**, chạy cho mọi PR vào main và mọi push main (không dùng paths filter) để cung cấp tên check ổn định, không biến mất khi thay đổi thuộc phạm vi khác.
- Kiểm tra bộ phân loại phạm vi CI với unit test hiện hữu. Giữ nguyên nguyên tắc: thay đổi không biết trước => full, không tự bỏ kiểm thử.
- Xác minh đồng bộ bundle Player Web và GM, cú pháp selector và ứng dụng.
- Cố định Node 22, cache npm, cài theo lockfile, timeout 12 phút; hủy lượt PR cũ cùng nhánh khi có commit mới.
- Chỉ quyền contents:read, không quyền deploy, không Cloudflare secret, không sửa Worker/IPA/Runtime OTA/dữ liệu.

## Sửa lỗi CI lặp lại qua chạy thực tế
- Lượt CI đầu của PR #606 phát hiện 2/34 unit test selector lỗi: V3.222 AUTO VÁN và V3.234 dock. Hai fixture lịch sử dùng mã nguồn phiên bản hiện tại hoặc dấu mốc đã lỗi thời, dẫn đến kỳ vọng phạm vi hẹp sai thực tế.
- Đã sửa kỳ vọng để `full` (fail-closed), không nới selector, không bỏ test. Có commit `edf08ba`; cần chạy lại toàn bộ check trên commit mới.

## Điều kiện nghiệm thu
- CI Stability Contract SUCCESS trên chính PR và main sau khi merge.
- Các check chức năng theo phạm vi vẫn phải SUCCESS; **gate này không thay thế** kiểm thử luật/Server/Player hoặc kiểm thử E2E.
- Thiết lập branch protection hoặc ruleset required check `CI Stability Contract` qua Settings GitHub (cần xác nhận bằng giao diện/API; file workflow không tự thiết lập branch protection).
- Không merge PR khi một required check fail hoặc pending.

## Báo cáo nguyên nhân/rủi ro
- Nhiều workflow có `pull_request.paths`: khi file không khớp, workflow không chạy; nếu check đó cấu hình required, PR có thể kẹt Pending.
- Selector lịch sử có nhiều whitelist từng PR: dễ phát sinh maintenance cost và fallback full cho thay đổi không nằm whitelist; không được nới wildcard để tạo SUCCESS giả.
- Cloudflare Workers Builds cạn quota là một nhóm lỗi Preview độc lập; xử lý riêng ở PR #605 và không nới gate CI để né thất bại.

## Rollback
Revert commit thêm workflow này, sau khi gỡ required check tương ứng khỏi ruleset; không chạm dữ liệu hoặc phiên bản ứng dụng.

## Kiểm tra CI thực tế tiếp theo (PR #606)
- CI Stability Contract SUCCESS; 30-Player Realtime Room SUCCESS.
- Player Web Worker FAILURE: log có assertion lịch sử `tests/player-web-template-assets-v365.test.mjs:45`; runner sau đó bị shutdown/cancel trong quá trình quét rộng. Chưa được kết luận tất cả lỗi Worker chỉ do runner.
- Player Card Browsers FAILURE: assertion `🏴‍☠️ displayed to eligible Player` khi kiểm tra hiển thị đề cử/Lên Giàn; phải kiểm chứng UI hành vi theo luật đang áp dụng, không xóa assertion để ép PASS.
- P0 Chrome/Edge FAILURE: `TimeoutError` trong E2E realtime; log có 404 ảnh từ role ID giả `role-p0-*`, cần phân biệt dữ liệu fixture với lỗi ảnh Production.
- **Chặn merge** cho đến khi các kiểm tra lỗi được sửa hoặc chứng minh không liên quan và cấu hình required checks hợp lệ. Không bypass, không deploy.

## Đồng bộ main và sửa kiểm thử ngày 29/10
- Tích hợp `main` mới nhất vào PR #606 theo merge có hai parent; không mang mã Worker/Player cũ đè lên main.
- Giữ hai fixture V3.222/V3.234 theo hướng fail-closed, bảo đảm dữ liệu lịch sử không tự lọt vào scope cũ.
- Sửa bộ phân loại `auto-van-ci`: bộ bốn tệp CI không được chứa marker PR550; các thay đổi RULE PR550 không còn bị nhận sai là CI-only. Bộ test PR550 trong `tests/ci-browser-scope.test.mjs` phải PASS.
- Chỉ merge khi `CI Policy Gate` và `CI Stability Contract` SUCCESS trên đúng HEAD sau cùng; mọi lỗi kiểm thử chức năng liên quan phải được sửa. Không deploy Production/IPA/OTA.
