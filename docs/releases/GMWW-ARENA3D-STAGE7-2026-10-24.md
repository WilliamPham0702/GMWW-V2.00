# GMWW Arena 3D — Giai đoạn 7 (24/10/2026)

## Nội dung thay đổi trên nhánh nghiên cứu
- Character chibi biển có chớp mắt, ánh nhìn khi làm phép, gật đầu, tóc, tay áo, bàn chân và nét mặt chuyển động theo thời gian; không thay đổi luật chơi, vai trò hoặc dữ liệu bí mật.
- Tích hợp ngân sách hiệu năng quality/balanced/eco cho 6–30 Character với giới hạn pixel ratio, tần suất cập nhật animation và hiệu ứng, tiếp nhận FPS đo thực tế từ vòng render.
- Sửa lỗi thiếu import `renderQualityBudget` ở Character Atelier; bổ sung kiểm thử phát hiện lỗi tái diễn.
- Giữ nguyên nghi lễ Giai đoạn 6: tới lượt, Character đứng lên, tiến tới vùng phép, thực hiện phép và trở về ghế.
- Kiểm thử Giai đoạn 7 và phần phụ thuộc trực tiếp: chuyển động, giảm chuyển động, phân quyền/không rò rỉ dữ liệu vai, FPS và 6–30 Character.

## Xác minh và phát hành thử
- GitHub Actions kiểm thử PR #469 đã SUCCESS với cấu hình STAGING riêng; mỗi lần có sửa đổi mới phải kiểm tra lại kết quả CI.
- Tạo cấu hình `wrangler.arena3d-stage7-staging.jsonc` với Worker `gmww-arena3d-stage7-staging` và Durable Object namespace độc lập; không ghi đè Worker Giai đoạn 6 đã nghiệm thu.
- Job deploy Giai đoạn 7 chỉ chạy khi kích hoạt `workflow_dispatch` với `deploy_stage7=true`, sau job kiểm thử mã nguồn thành công.
- Kiểm thử smoke sau deploy chỉ nhắm URL STAGING Giai đoạn 7: Chrome và WebKit giả lập iPhone, 6/12/20/30 Character, animation làm phép, lỗi JavaScript, ngân sách GPU và quyền hiển thị.
- URL dự kiến: https://gmww-arena3d-stage7-staging.williampham0702.workers.dev/village/arena-3d/live.html
- **Chưa kết luận STAGING Giai đoạn 7 đã triển khai hay qua smoke test nếu chưa có log hoàn tất.** WebKit giả lập không thay thế nghiệm thu FPS, pin và nhiệt trên iPhone vật lý.

## Bảo toàn
PR #469 Draft dựa trên PR #467; không tự merge, không deploy Production và không cập nhật game 2D, phòng chơi, dữ liệu, Runtime, OTA hay IPA. STAGING Giai đoạn 6 giữ nguyên.
