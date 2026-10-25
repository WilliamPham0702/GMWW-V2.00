# GMWW Arena 3D — Giai đoạn 8 (25/10/2026)

## Phạm vi triển khai nghiên cứu
- Xây dựng Stage8 Ritual Director: chuẩn hóa dữ liệu lượt và phép do GM/Core xác thực, từ chối actor ngoài danh sách Character hiện hữu, không suy diễn quyền hay vai bí mật từ client.
- Hỗ trợ 1–5 mục tiêu hợp lệ cho một phép, loại mục tiêu trùng, giới hạn thời hạn phép và giữ danh sách người có quyền hành động.
- Chuỗi diễn hoạt xác định: đứng dậy → tiến đến vùng phép → thi triển → quay lại ghế → ngồi; có trạng thái chờ Core khi chưa có lệnh phép.
- Ngân sách hiệu ứng 6–30 Character, giảm hạt trang trí khi FPS thấp/chế độ tiết kiệm pin hoặc giảm chuyển động.
- Kết nối Ritual Director vào luồng GM visual của STAGING; tuyệt đối không cấp dữ liệu bí mật cho Player Web công khai.
- Giữ nguyên nghệ thuật và chuyển động GĐ5–7, game 2D, dữ liệu phòng Production và IPA.

## Kiểm thử và nghiệm thu
- Unit test: quyền Core, mục tiêu đa đối tượng, timeout, chuyển động xác định, ngân sách 6/12/20/30.
- Browser smoke: Chrome và WebKit giả lập iPhone trên Worker STAGING GĐ8 riêng, 6–30 Character và chuỗi phép.
- Kiểm thử đúng phạm vi; không chạy các bài test Chrome lá bài 2D, Seat/OTA/IPA không liên quan.
- Worker nghiên cứu dự kiến: `gmww-arena3d-stage8-staging`, không ghi đè STAGING GĐ6 hoặc GĐ7.
- Preview dự kiến: https://gmww-arena3d-stage8-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Chỉ bàn giao nghiệm thu iPhone khi CI, deploy và browser smoke đều SUCCESS; FPS giả lập không thay thế pin/nhiệt iPhone thật.
- PR Draft xếp chồng GĐ7, không merge hoặc deploy Production.

## Kết quả CI và STAGING (25/10/2026)
- PR #476: https://github.com/WilliamPham0702/GMWW-V2.00/pull/476 (Draft, chưa merge).
- CI unit/casting/ritual/dry-run: SUCCESS. Job triển khai và smoke: SUCCESS.
- Workflow: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40147026998
- Cloudflare Worker GĐ8 đã phát hành: `a312eda0-ccaa-409b-8e7e-bd6bd48497ab`.
- Chrome/WebKit đều PASS 6, 12, 20, 30 Character và chuỗi animation nghi lễ trên Worker GĐ8 độc lập.
- Chỉ số CI giả lập: 46 draw calls; Chrome 10 FPS; WebKit 1 FPS. **WebKit 1 FPS trên CI là dấu hiệu phải đo trực tiếp iPhone; chưa thể xác nhận đạt mục tiêu hiệu năng iPhone thật**.
- Đã cập nhật bài kiểm thử trực tiếp liên quan đến Core cue: nhận cue chuẩn hóa GĐ8 thay cho chuyển thẳng cue chưa xác minh.
- Không thay đổi Worker GĐ6/GĐ7, Production, game 2D hay dữ liệu.
