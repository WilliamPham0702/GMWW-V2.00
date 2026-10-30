# GMWW GitHub-First + Dual Server — GĐ1–GĐ3

Ngày khởi tạo: 2026-10-30. Trạng thái: kiểm toán sơ bộ, chưa triển khai/chuyển Production.

## Mục tiêu và bất biến
- Giữ nguyên Production `https://gmww-v2-00.williampham0702.workers.dev/`, IPA, OTA, dữ liệu và lịch sử.
- GitHub ưu tiên cho source, CI, releases, runtime packages và các assets phù hợp; **không** dùng GitHub Pages/Actions làm máy chủ WebSocket liên tục.
- Cloudflare mặc định cho Online, Oracle chỉ là STAGING/dự phòng sau nghiệm thu, không chuyển giữa ván.
- Cùng commit, build manifest, rule/schema version trên Cloudflare và Oracle; chỉ cho phép chọn backend đã xác minh tương thích.
- Link web mới chỉ là alias truy cập; lựa chọn link chia sẻ không tự đổi backend.
- Không dùng tài nguyên trả phí; mọi thao tác phát hành phải có CI bắt buộc SUCCESS, release notes tiếng Việt và rollback.

## Bằng chứng từ main tại thời điểm kiểm tra
- `package.json`: version `3.276.0`, scripts `dev`, `deploy`, `check`, `test`; Wrangler `4.145.0`.
- `wrangler.jsonc`: Worker `gmww-v2-00`; Durable Object `ROOMS` class `RoomDurableObject` storage SQLite; static assets `./assets`; `/api/*`, `/village*`, `/updates/*` qua Worker.
- `src/index.js`: import `DurableObject` từ `cloudflare:workers`, class `RoomDurableObject`; có xử lý game, player, chat, GM, DEMO, runtime. Đây là ràng buộc cần tách trước Oracle.
- `README.md` còn ghi `V2.26`, khác version package; phải xác minh nguồn version chính thức, không dùng README làm release manifest.
- Chưa xác minh đầy đủ workflow, required checks, topology lưu trữ dữ liệu, DNS/domain và khả năng cấp Oracle Always Free.

## GĐ1 — Kiểm toán (PR này: tài liệu khởi động)
1. Lập inventory routes: web, login, chat, WebSocket, assets, update manifest, OTA, CORS/cookies/service workers.
2. Lập inventory storage: Durable Objects SQLite, account/member, room/history, browser local storage, backup/PITR; phân loại dữ liệu lâu dài so với trạng thái ván.
3. Kiểm kê GitHub Actions/required checks, deployment credentials, Cloudflare quotas, runtime SHA-256 và rollback.
4. Ghi lại baseline Production, không chạm dữ liệu/namespace/IPA.

## GĐ2 — GitHub-first (PR tiếp theo)
1. Tạo manifest release duy nhất: version + git SHA + assets digest + schema/rule version.
2. Kiểm tra workflow hiện có trước khi bổ sung để tránh trùng CI/OTA; phát hành artifact GitHub sau required checks SUCCESS.
3. Không chuyển route động hoặc WebSocket lên GitHub Pages; chỉ chuyển static assets nếu xác minh đường dẫn/caching/CORS và không làm thay đổi UX.
4. Tách deploy Cloudflare và Oracle thành hai target dùng chung source/manifest; Oracle chưa triển khai Production.

## GĐ3 — Link mới + chia sẻ link GM (PR tiếp theo)
1. Khảo sát tên miền phụ miễn phí (ví dụ `gamemasoi.duckdns.org`, **chưa đăng ký/chưa xác nhận**), kiểm tra khả năng gắn Cloudflare Workers, HTTPS và Oracle.
2. Giữ link cũ. Link mới chỉ được bật sau khi DNS/TLS/host routing hoạt động, không dùng redirect làm thay đổi URL nếu yêu cầu giữ URL mới.
3. Cài đặt GM: chọn **link chia sẻ cũ/mới**, sao chép và chia sẻ; lưu lựa chọn; disable link mới khi chưa xác minh; tuyệt đối tách khỏi chọn Cloudflare/Oracle.
4. Kiểm thử iPhone Safari, Chrome, Edge; login/session, chat/WebSocket, static assets, reconnect, không scroll/lag hồi quy.

## Điều kiện chuyển giai đoạn / không được merge deploy
- Mỗi PR chạy đúng test phạm vi, required checks SUCCESS; không merge khi chưa có bằng chứng.
- Oracle chỉ được chọn khi phiên bản, schema, lịch sử và dữ liệu lâu dài đối soát thành công; khi chưa có ván đang chạy.
- Cloudflare hết quota trước khi đồng bộ xong có thể gây thiếu dữ liệu; phải chặn chuyển nếu checkpoint chưa đạt.
- Tên miền miễn phí có thể không hỗ trợ trực tiếp Cloudflare Custom Domains; cần chứng minh bằng cấu hình thực tế trước khi công bố.
- PR tài liệu này không thay đổi runtime, không có deploy, không cấp tài nguyên.
