# GMWW — Chỉnh phạm vi CI cho Treo Giàn (24/10/2026)

## Vấn đề
Task Treo Giàn PR #463 kích hoạt `Check Player Card Browsers` chạy toàn bộ Chrome/Edge Card, đống lửa, Khám Phá, Seat, các lớp Character và OTA ngay cả khi PR đã có CI `Check Lên Giàn theo đúng phạm vi`. Việc này làm chậm tác vụ mà không kiểm chứng thêm chức năng đang sửa.

## Sửa
- Phân loại PR #463 thành `gallows` nếu tập tin thay đổi thuộc danh sách đã xác minh và có đầy đủ tệp đặc trưng Gallows.
- Khi `gallows`, chỉ giữ job phân phạm vi của workflow trình duyệt; kiểm thử Gallows do workflow `Check Lên Giàn theo đúng phạm vi` phụ trách.
- Các workflow Worker, Player Web, OTA SHA-256, IPA release gate độc lập tiếp tục kiểm tra theo điều kiện của chúng. Không được bỏ qua các chốt bảo đảm tính toàn vẹn/phiên bản.
- Với thay đổi thuần selector/workflow/test CI, chạy bài kiểm thử phân phạm vi; không chạy toàn bộ trình duyệt.
- Nếu đổi file Card, Seat, Player Web không nằm trong danh sách, xóa file, hoặc diff chưa chứng minh phạm vi, tự động quay về kiểm thử toàn phần (fail-safe).
- Main, manual release vẫn giữ chính sách kiểm tra toàn phần trước phát hành.

## Kiểm thử đúng phạm vi
`node --test tests/ci-browser-scope.test.mjs` kiểm tra cả lựa chọn đúng `gallows`/`ci-policy` và phản ví dụ chạm tới Card, Seat, Worker khác.

## An toàn
Chỉ thay CI, không đổi gameplay GMWW, không merge Production, không deploy IPA/OTA, không thay phòng, dữ liệu hay Durable Objects.
Rollback: revert PR CI này nếu lựa chọn phạm vi sai.

## Bảo vệ Production khi merge CI-only
- Main hiện tự chạy `Deploy Production` sau khi `Check Player Web Worker` SUCCESS. Thêm job `deploy-scope` so commit main với cha thứ nhất; nếu chỉ thay chính sách/kiểm thử/tài liệu CI PR #466 thì job `deploy` bị SKIPPED, không chạy `wrangler deploy`.
- Nếu có file mã gameplay/Worker hoặc bất kỳ file lạ thì giữ các kiểm soát deploy bình thường. Kích hoạt `workflow_dispatch` thủ công không thay đổi.
