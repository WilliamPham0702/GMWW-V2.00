# GMWW — link miễn phí gamemasoi.pages.dev (giai đoạn 1)

Ngày: 31/10/2026. Chỉ triển khai trên dự án Cloudflare Pages riêng `gamemasoi`.

## Cấu hình
- Static Pages: `sites/gamemasoi-pages/index.html`, `_redirects`.
- Redirect HTTP **302**, tất cả path sang `https://gmww-v2-00.williampham0702.workers.dev/:splat`.
- Không proxy HTML, WebSocket/WSS, login, session hoặc Durable Objects; không tạo bản sao dữ liệu.
- Dự án Pages độc lập, KHÔNG sửa Worker Production, IPA, Oracle, Runtime OTA, version hoặc dữ liệu.
- URL mới là **lối vào**; sau redirect, thanh địa chỉ sẽ hiện URL Worker cũ. Không tuyên bố đây là custom domain reverse proxy.

## Đường phát hành
1. Merge guard CI-only #663 khi chính xác commit cuối có required checks SUCCESS.
2. PR này phải qua `Validate ONLY static Pages alias` và toàn bộ required checks trên đúng HEAD.
3. Sau merge PR này, workflow mới chỉ chạy lệnh `wrangler pages deploy` cho dự án `gamemasoi` đã tồn tại, dùng GitHub secrets đang được cấu hình; không gọi `wrangler deploy` Worker.
4. Kiểm tra HTTPS / status 302 / Location sang hostname Worker cũ. Thử trên Safari/Chrome/Edge iPhone.
5. GM UI hiện có **tiếp tục khóa lựa chọn Link mới** cho tới PR bật riêng sau nghiệm thu đường link. Không sửa UI trong PR này.

## Rollback
- Nếu chưa merge: đóng PR, không thay đổi gì tới người dùng.
- Nếu Pages không đạt: tắt sử dụng link mới, giữ link Worker hiện tại; rollback deployment Pages riêng bằng CF Pages deployment rollback; không xóa dữ liệu và không rollback Runtime/IPA.
- Nếu workflow điều phối có lỗi: tắt deploy Pages, không được lấy lý do đó để tự deploy Worker hoặc Runtime.

## Giai đoạn tiếp theo
Oracle STAGING độc lập: tách stateful DO adapter, kiểm chứng schema/rule/version/data checkpoint; không bật chuyển backend cho GM trước khi đạt toàn bộ gate.
