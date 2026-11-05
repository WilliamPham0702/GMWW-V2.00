# GMWW – Nhóm Treo Cổ (2026-11-05)

## Thay đổi (chỉ Worker)
- Kẻ Ngốc: Treo Cổ lần đầu không chết, mất quyền bỏ phiếu/đề cử đến hết ván; lần hai chết. GM "khôi phục giàn" hoàn tác cả lần thoát.
- Người Yêu Hòa Bình: phiếu Treo Cổ không được tính, chỉ phiếu CỨU tính.
- Thẩm Phán: kích hoạt Phán Quyết Kép (1 lần/ván, trước phiên đầu); sau khi phiên đầu có kết quả, GM dùng lệnh `judge_second` để mở thêm một phiên đầy đủ (tối đa 2 phiên/ngày).

## Giới hạn đã biết
- Chưa có nút GM "Phiên thứ hai" trên giao diện; server đã nhận lệnh `judge_second`.
- Phiếu Treo Cổ của Hòa Bình vẫn nhận được khi gửi nhưng không tính vào kết quả.

## Kiểm thử
- tests/gallows-cards-20261105.test.mjs: 3 PASS. Hồi quy liên quan: 121 PASS / 0 FAIL.

## Triển khai & rollback
- Worker-only deploy + smoke test. Rollback: deploy lại Worker phiên bản trước.
