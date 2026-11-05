# GMWW – Già Làng, Trưởng Phái, Tà Đạo (2026-11-05)

## Thay đổi (chỉ Worker)
- Già Làng (action "18" Rung Chuông): 4 đêm đầu, mỗi lần vô hiệu mọi tác động chết của đêm (Sói Cắn, Thiếu Nữ, Ti Hí, Tà Đạo Giết, chết hẹn giờ) và mất 1 mạng; hết 2 mạng thì chết.
- Trưởng Phái (action "25"): kết nạp Giáo Dân mỗi đêm; Trưởng Phái chết thì Giáo Dân chết theo (không ngược lại).
- Tà Đạo: Đêm 1–5 mỗi đêm Thêm hoặc Giết (hành động đầu tiên của đêm); thành viên sang Phe Ba từ đêm sau và mất chức năng; Tà Đạo chết thì thành viên chết theo; sau Đêm 5 vẫn Giết. Giết bị Bảo Vệ/Bất Tử chặn.

## Quy tắc tự quyết (cần chủ dự án xác nhận)
- Tà Đạo Giết có bị Bảo Vệ/Bất Tử chặn hay không (đang: có chặn).
- Rung Chuông không chặn Tuổi Thọ của Ông Già.

## Kiểm thử
- tests/night-cult-elder-20261105.test.mjs: 3 PASS. Hồi quy liên quan: 131 PASS / 0 FAIL.

## Triển khai & rollback
- Worker-only deploy + smoke test. Rollback: deploy lại Worker phiên bản trước.
