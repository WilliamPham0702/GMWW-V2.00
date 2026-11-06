# GMWW – Nhóm đổi vai/kế thừa và thông tin (2026-11-05)

## Thay đổi (chỉ Worker)
- Hầu Gái: sau khi có người bị Treo Cổ, nhận vai/phe của người đó từ đêm kế tiếp (một lần).
- Con Hoang: Hình Tượng chết → sang Phe Sói, giữ vai; Cắn từ đêm kế tiếp.
- Cupid: hai người được ghép thuộc Phe Ba.
- Ba Anh Em: Đêm 1 mỗi người nhận thông báo riêng về hai người còn lại.
- Hồn Ma: sau khi chết, mỗi ngày 1 từ, tự công bố; nhắc tên người chơi → mất quyền đến hết ván.
- Cô Bé Ti Hí: mặc định không bị phát hiện; Sói phát hiện (action-peek-detect) → chết, xuyên Bảo Vệ.

## Giới hạn đã biết
- Chưa có màn hình Player Web cho Sói chọn "phát hiện Ti Hí" và Hồn Ma nhập từ (server nhận `action-peek-detect` và `word`).
- Hầu Gái chưa chuyển trạng thái đã dùng chức năng của vai cũ; Con Hoang/Cupid chưa tính vào điều kiện thắng.

## Kiểm thử
- tests/swap-info-cards-20261105.test.mjs: 5 PASS. Hồi quy liên quan: 119 PASS / 0 FAIL.

## Triển khai & rollback
- Worker-only deploy + smoke test. Rollback: deploy lại Worker phiên bản trước.
