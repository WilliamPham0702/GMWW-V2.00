# GMWW Arena 3D — Giai đoạn 10 (nghiên cứu)

## Đã triển khai
- Nhánh nghiên cứu kế thừa GĐ9; không thay đổi Production, 2D, IPA hoặc dữ liệu.
- Thư viện hoạt ảnh 9 nhóm: đũa phép, tiên tri soi xét, đầu sói linh hồn, khiên, hồi phục, tấn công, bỏ phiếu, trinh sát và nguyền rủa; ánh xạ hơn 30 tên/biến thể vai trò để dùng chung motion.
- Character 3D có đũa phép vẫy, đầu sói 3D bay từ người thi triển tới mục tiêu, mái vòm khiên ở mục tiêu, biểu cảm tay theo nhóm và giới hạn tối đa 5 mục tiêu.
- ID âm thanh theo từng nhóm để gắn với Thư viện Âm thanh khi có file được tải lên; **không tạo hoặc giả lập file audio không tồn tại**.
- Chỉ lấy thông tin role/action từ cue riêng do Core trả cho GM hợp lệ; viewer công khai không nhận metadata vai trò bí mật. Nếu Core chưa cung cấp roleId/actionId thì chỉ phát animation mặc định theo loại tác động, không đoán vai trò.
- Giảm chuyển động và tối ưu low-power; mesh 3D dùng hình học nhỏ, giải phóng GPU resource khi đóng cảnh.

## Chưa được coi là hoàn tất
- Cần kiểm toán toàn bộ catalog vai trò/artifact thực tế của GMWW và ghép chính xác từng hành động, không coi nhóm alias là danh sách đầy đủ.
- Cần tích hợp file audio thật vào thư viện và xác minh đồng bộ cue theo quyền.
- Cần kiểm thử tương tác nhiều client / Core thật và đánh giá pin/nhiệt trên iPhone thật. Chỉ yêu cầu nghiệm thu toàn bộ GĐ10 sau khi đạt các bước này.
- CI chỉ kiểm thử mã Stage10 và các phụ thuộc Stage8/9 cần thiết, không chạy kiểm thử 2D/OTA/IPA ngoài phạm vi.

## Kết quả CI và STAGING — 25/10/2026
- PR Draft #482: https://github.com/WilliamPham0702/GMWW-V2.00/pull/482
- Unit tests + kiểm tra cú pháp + Wrangler dry-run: SUCCESS.
- STAGING Worker độc lập: `gmww-arena3d-stage10-staging` — version `1f75a0bf-883b-43ab-b13b-d78650bac9ed`.
- CI triển khai và browser smoke: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40152406578 — SUCCESS.
- Chrome/WebKit 6, 12, 20, 30 Character: PASS; FPS Chrome headless ~16, WebKit headless ~2, không dùng làm chứng nhận hiệu năng iPhone vật lý.
- Preview: https://gmww-arena3d-stage10-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Smoke hiện xác minh render/animation tổng quát, **chưa** kiểm thử trực quan riêng đầu sói/đũa/khiên trong trận Core thực tế. Giữ PR Draft, chưa nghiệm thu.

## Bổ sung lô animation tiếp theo
- VFX mới: vòng tác động theo màu từng nhóm vai trò, hỗ trợ tối đa 5 mục tiêu, tự giải phóng geometry/material khi thoát.
- Mã hóa castKey bao gồm actor, action, role và mục tiêu để cập nhật hiệu ứng khi Core đổi mục tiêu trong cùng lượt.
- Giữ nguyên hợp đồng ngân sách draw-call cũ cho các Character dạng instancing; báo cáo thêm peakVfxDrawBudget riêng để không làm hỏng kiểm thử hiệu năng của GĐ8.
- CI GĐ10 đúng phạm vi SUCCESS: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40153769263.
- Chưa kết luận nghiệm thu toàn bộ vai trò/Artifact hoặc audio khi chưa có đối chiếu Core thực tế.
