# GMWW — Bật Link mới trên Server (31/10/2026)

## Phạm vi thay đổi
- Mục **Cài đặt → Chia sẻ Player Web → Link mới** nhận URL HTTPS cố định `https://gamemasoi.pages.dev/` đã kiểm tra trên Cloudflare Pages Production và iPhone qua PR #676.
- `Link hiện tại`: `https://gmww-v2-00.williampham0702.workers.dev/` giữ nguyên và vẫn chọn mặc định nếu GM chưa lưu lựa chọn khác. Chỉ lưu lựa chọn vào localStorage, không đổi server backend.
- Sao chép và Gửi link lấy chính xác URL được chọn, có kiểm tra WebKit ở 375/390/430px, iPhone clipboard fallback và không cho alias không xác minh ghi đè.
- Không sửa gameplay, API/WebSocket, IPA, Oracle, Durable Objects hoặc lịch sử dữ liệu.

## Kiểm tra và phát hành
- CI: `node --test tests/gm-player-web-share-link.test.mjs` và WebKit iPhone-size cùng `node .github/scripts/assemble-gm-app.mjs --verify`.
- Nghiệm thu trên GM iPhone: mở Cài đặt → Chia sẻ Player Web, chọn Link mới, Sao chép/Gửi link phải là `https://gamemasoi.pages.dev/`. Chọn Link hiện tại phải trả URL Worker cũ.
- Chỉ merge khi required CI SUCCESS. GM native Runtime/OTA chỉ cập nhật theo quy trình phát hành an toàn riêng, không thay IPA.
- Rollback: quay lại GMWW.html/Runtime trước bản vá; Cloudflare Pages link mới và link cũ đều độc lập với thay đổi này.
