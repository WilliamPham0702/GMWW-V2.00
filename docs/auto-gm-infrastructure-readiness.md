# GMWW V2 — Chuẩn bị hạ tầng độc lập (02/10/2026)

## Phạm vi và an toàn
- Nhánh: `prep/auto-gm-infrastructure-20261002`, khởi tạo từ main V2.35 (commit `a1bd82ebd665b618850866820ec6359efbb64f61`).
- KHÔNG sửa `server-game/current`, `src`, artwork, Lá Bài, Artifact, dữ liệu người chơi, Worker production hoặc phiên bản IPA.
- KHÔNG hợp nhất vào main khi phiên thiết kế Lá Bài/Artifact đang làm việc. Đọc lại main mới nhất và đối chiếu diff trước khi tích hợp.
- Đây là bộ công cụ chuẩn bị, không phải Auto GM hay gameplay hoàn chỉnh.

## Đã chuẩn bị
1. `tools/readiness/local-room-30-smoke.mjs`: kiểm tra riêng trên localhost: tạo phòng thử, 30 khách vào phòng, xác minh ID duy nhất, bật Sẵn sàng, kiểm tra state/heartbeat, rồi dọn người chơi thử. Có chặn chạy với domain production.
2. `.github/workflows/readiness-local-30.yml`: quy trình thủ công, khởi chạy Wrangler local, dry-run và chạy bài thử. Không tự chạy khi push và không deploy.
3. CI hiện hữu: `check-player-web.yml` kiểm tra Worker/Player Web; `build-server-game-ipa.yml` build IPA thủ công. Không thay đổi các quy trình hiện hữu.

## Những thứ đã xác nhận từ source
- Worker entry: `src/index.js`; Durable Object `ROOMS` với SQLite; WebSocket endpoint `/ws/:code`.
- API hiện có: `/api/health`, `/api/avatars`, `/api/rooms`, `/api/rooms/:code/join`, `ready`, `heartbeat`, `leave`.
- iOS: SwiftUI + WKWebView và web bundle đóng gói trong IPA.
- Lưu ý: bài kiểm thử 30 người này xác minh API phòng chờ, **chưa** chứng minh 30 thiết bị WebSocket đồng thời, độ trễ thực tế, 30 luồng thoại hoặc tính đúng của Auto GM.

## Nghiên cứu / chuẩn bị tiếp khi có dữ liệu Lá Bài và Artifact
- Bản đồ schema action/effect/condition/limit thực tế từ phiên thiết kế.
- Hợp đồng sự kiện thống nhất GM ↔ Worker ↔ Player Web, bảo đảm idempotency, chống gửi trùng và quy tắc xử lý khi mất kết nối.
- Thiết kế bộ điều phối Auto GM có trạng thái/timer lưu server, GM ON/OFF không làm mất lượt hoặc reset thời gian; timeout tự bỏ qua, không tự chọn mục tiêu.
- Toàn bộ thời gian cấu hình tập trung tại Ván Mẫu; mọi Artifact tương tác trên điện thoại ở cả hai chế độ.
- Kịch bản 30 WebSocket đồng thời và kiểm thử chịu tải trong môi trường thử nghiệm, **không chạy trực tiếp production**.
- Voice cho Online 100%: đánh giá WebRTC SFU (managed hoặc self-hosted), quyền microphone, token phòng, chi phí và đo tải trước khi chọn.
- Xác thực Cloudflare trực tiếp chỉ cần cho xem metrics, quota và cấu hình ngoài GitHub; deploy hiện có đi qua GitHub Actions.

## Kiểm tra trước khi bàn giao / hợp nhất
- Chạy workflow `GMWW Local 30-Player Readiness` thủ công trên nhánh này.
- Đối chiếu commit main mới nhất và thay đổi từ phiên thiết kế; nếu trùng file phải hợp nhất cẩn thận.
- Không phát hành IPA hay deploy Worker chỉ để thêm công cụ chuẩn bị.
