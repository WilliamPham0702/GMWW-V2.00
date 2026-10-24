# GMWW V3.197 — Công bố Production và IPA, bổ sung PR #439

- PR gốc: #439; merge SHA `911b776bac575d4c8a26b42cdf2ddae30203c96c`.
- Production: GitHub Actions `Deploy Production` run 40043191406 **SUCCESS**. Worker V3.197, commit main đã được kiểm tra.
- CI trên main: `Check Player Web Worker` và `Check Player Card Browsers` **SUCCESS**; trên head PR #439, P0 Chrome/Edge realtime, phòng 30 người và build native **SUCCESS**.
- GitHub Release: https://github.com/WilliamPham0702/GMWW-V2.00/releases/tag/gmww-v3.197
- IPA V3.197, 136084529 bytes, SHA-256 `74aa218c9081c92caf596a8adccb96d992aea3ff964598cc7add32569dc380a7`. Artifact do build run 40034743719 tạo từ SHA `6b887ce739380a1cdc06a11ac16b1f3fd6a8d5c7`.
- Điều chỉnh `update-system/published-ipa.json` để nút **TẢI IPA** chọn V3.197 thay vì V3.196; thay thế release note V3.197 mặc định bằng mô tả sửa đồng bộ Player Web PR #439.
- Tải IPA/OTA là hai kênh riêng biệt: giữ `NATIVE_SHELL_VERSION=3.110`, không nâng yêu cầu cài IPA khi chỉ cần OTA. Tệp IPA được build unsigned, cần ký hợp lệ mới cài trực tiếp trên iPhone.

## An toàn / Rollback
- Không đổi schema, Durable Object binding, phòng, lịch sử, dữ liệu hoặc tài nguyên Production.
- Worker Production trước PR #439: deployment `023a0d05-3f8a-4847-a258-e19a95859327`, version `cb74d22c-8828-4c2d-96db-0a9305066acd`.
- Worker PR #439: deployment `1b448d91-f72a-4f67-a8a3-81e9aaad222e`, version `eebfa2c3-9cf4-465e-8a53-e19e2444e49f`. Khi chỉ sửa catalog và ghi chú cùng Runtime V3.197, có thể rollback về Worker PR #439 mà không đảo migration.
- Trước merge follow-up phải chạy CI SUCCESS; sau triển khai xác minh `/api/health`, `/api/update/manifest` và `/updates/latest.json`: IPA V3.197 + checksum đúng + ghi chú PR #439.

## Nghiệm thu người dùng
- Trên Chrome và Edge: đội hình đầy đủ, Role và Artifact mở ngay khi nhận, đề cử và bỏ phiếu 👍/👎 theo thời gian thực; refresh/reconnect không mất người.
- Trên iPhone: kiểm tra kênh OTA V3.197 và nút TẢI FILE IPA hiển thị V3.197, thử tải và xác nhận checksum; cài đặt yêu cầu ký IPA phù hợp.
