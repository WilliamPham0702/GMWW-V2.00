# Player Web — sửa lệch chỗ ngồi lần mở đầu tiên trên Safari (07/11/2026)

## Triệu chứng
Trên iPhone, mở Player Web bằng Safari lần đầu thì tên người chơi và vị trí nhân vật không khớp với ghế. Tải lại hoặc xoay màn hình thì đúng lại.

## Nguyên nhân
`screenPoint` trong `assets/village/village.mjs` dùng kích thước sân `clientWidth/clientHeight`, nếu bằng 0 thì dùng số cố định 864×1536. Safari ổn định chiều cao viewport sau khi thanh địa chỉ co lại mà thường không phát `resize`, nên bố cục không được tính lại.

## Thay đổi
- `assets/village/village.mjs`: thêm `ResizeObserver` trên `.stage`, mỗi khi sân được đo lại thì chạy `render`, `placeFire`, `renderPortal`. Giữ nguyên xử lý `resize`.
- `tests/player-web-first-open-stage-measure.test.mjs`: test tái hiện lỗi. Trên `main` test thất bại, sau sửa test đạt.

## Không thay đổi
Seat ID, Character, dữ liệu phòng, Durable Object, IPA, URL gamemasoi.pages.dev.

## Kiểm chứng
- `node --test tests/player-web-first-open-stage-measure.test.mjs`: 2/2 PASS (trên nhánh sửa); trên `main`: 1 FAIL (đúng như mong đợi).
- CHƯA CHẠY: bộ test đầy đủ và kiểm tra thật trên Safari iPhone. Cần bạn mở gamemasoi.pages.dev bằng Safari lần đầu để xác nhận.

## Rollback
Revert commit `village.mjs` và xóa file test; không có thay đổi dữ liệu.
