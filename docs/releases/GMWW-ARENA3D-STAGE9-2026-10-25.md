# GMWW Arena 3D — Giai đoạn 9 (25/10/2026)

## Phạm vi triển khai nghiên cứu
- Kế thừa Giai đoạn 8 đã được nghiệm thu: Character biển 3D, biểu cảm, nghi lễ phép nhiều mục tiêu, điều phối từ GM/Core.
- Xây dựng `stage9-gameplay-sync.mjs` làm lớp projection công khai từ Core, đồng bộ trạng thái phòng, trận, ngày/đêm, người chơi và diễn biến Lên Giàn.
- Bỏ qua bản tin phòng cũ quay về lobby trong cùng trận; bỏ qua chu kỳ đêm cũ để tránh nhảy lùi trạng thái khi WebSocket và polling cập nhật khác nhịp.
- Khi đổi phòng hoặc trận, xóa hiệu ứng và kết quả bỏ phiếu của trận trước, tránh rò rỉ trạng thái qua trận mới.
- Thống kê đề cử/bỏ phiếu trên Arena chỉ lấy dữ liệu công khai (ứng viên, cứu/giết, kết luận); không đọc lá vai trò, GM token hoặc dữ liệu bí mật từ Player Web.
- Giữ giao diện, Character 6–30, chuỗi làm phép và chất lượng adaptive của Giai đoạn 5–8.

## Kiểm thử đúng phạm vi
- Unit: chuyển phòng/trận, phòng chờ→vào trận, bỏ bản tin cũ, chuyển đêm/ngày, 6–30 người, bảo mật projection, Lên Giàn và hồi quy animation/ritual GĐ8.
- Chrome + WebKit giả lập iPhone: 6/12/20/30 Character, nghi lễ, nhãn đồng bộ gameplay công khai trên STAGING GĐ9.
- Worker nghiên cứu riêng: `gmww-arena3d-stage9-staging`; URL dự kiến: https://gmww-arena3d-stage9-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Chỉ kích hoạt deploy qua workflow_dispatch sau khi unit CI đạt; chỉ nghiệm thu sau khi STAGING và browser smoke đều SUCCESS.
- CI giả lập không đại diện hiệu năng pin/nhiệt/FPS trên iPhone vật lý.

## Bảo toàn
- PR Draft xếp chồng PR #476, không merge hoặc deploy Production.
- Không chỉnh sửa game 2D, IPA, OTA, Runtime Production, dữ liệu phòng thật hoặc STAGING GĐ6–8.

## Kết quả CI/STAGING (25/10/2026)
- PR #477: https://github.com/WilliamPham0702/GMWW-V2.00/pull/477 (Draft).
- Unit CI và dry-run: SUCCESS; triển khai STAGING riêng và browser smoke: SUCCESS.
- Workflow: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40148265498
- Cloudflare version: `ce634df3-1e31-4432-90a4-0ad15797c075`.
- Chrome/WebKit PASS các mốc 6, 12, 20, 30 Character, animation nghi lễ và dữ liệu trạng thái công khai GĐ9.
- FPS giả lập: Chrome 11, WebKit 2; không đại diện iPhone thật.
- **Chưa kiểm chứng đủ luồng nhiều người thật:** chuyển phòng/đêm/ngày và Lên Giàn qua Core có unit test projection, nhưng browser smoke hiện dùng cảnh SYNTH; cần bổ sung kiểm thử E2E phòng STAGING thực trước khi bàn giao nghiệm thu toàn bộ GĐ9.
