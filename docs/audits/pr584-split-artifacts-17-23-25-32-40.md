# Trích chuyển PR #584 — 5 Artifact (bước 1: pure planners và unit tests)

Nguồn bất biến: [snapshot #584](https://github.com/WilliamPham0702/GMWW-V2.00/tree/backup/pr584-preserved-20261029-51c407c7) tại `51c407c7ec2891ffb636a2dcf3c9be9f3f6b4ed5`. Tracker: #623.

## Nằm trong PR con này
Artifact **#17 Ngọc Ghen Tuông**, **#23 Tráng Gương**, **#25 Hắc Ngọc Hủy Diệt**, **#32 Lam Ngọc Định Mệnh**, **#40 Đá Hoán Đổi**. Đã chuyển nguyên blob của 5 pure planners và 5 unit-test trực tiếp từ snapshot (không tái viết, không mất logic của các file này).

## CHƯA HOÀN THÀNH — KHÔNG ĐƯỢC MERGE HOẶC DEPLOY
- `src/index.js` và `src/gmww-demo-runner.js` của #584 có thay đổi liên quan đến nhiều lá khác nhau; chưa tách các hunk Server/DEMO nên **chưa có executor end-to-end trên nhánh này**.
- Chưa chuyển Worker E2E, GM UI, Player Web UI, audio, undo, reconnect/interaction cases riêng cho 5 lá.
- Sau khi tích hợp phải chạy unit + HTTP/SQLite Worker E2E + đúng phạm vi CI, đính bằng chứng từng tiêu chí trước khi chuyển Ready for review.
- Nguồn #584 tiếp tục Draft, backup giữ nguyên; không được chuyển toàn bộ `src/index.js` của #584 đè lên main.

**Bản này chỉ lưu chuyển code tách được an toàn. Không có đổi runtime.**
