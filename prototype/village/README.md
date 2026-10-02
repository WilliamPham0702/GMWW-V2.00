# GMWW V2 — Ngôi làng: nguyên mẫu đồ họa độc lập
Trạng thái: PROTOTYPE, chưa phải tính năng production, chưa kết nối dữ liệu người chơi.

## Chạy thử
Trong thư mục repo: `python3 -m http.server 8080`, mở `http://localhost:8080/prototype/village/`.
Kiểm thử hình học: `node prototype/village/village.test.mjs` (Node 22).
Không triển khai lên Cloudflare hoặc IPA. Không gọi API, không gửi chat thật, không bật micro thật.

## Đã dựng
- Bố cục làng CSS nhiều lớp: nền trời, nhà, quảng trường, lửa trại, lớp sáng ngày/đêm.
- 1–30 avatar vòng tròn (trên 12 người: hai vòng), chọn avatar, zoom, responsive mobile/desktop.
- HUD thời gian/giai đoạn, tab chat/người chơi/vai trò, mô phỏng gửi chat, nút mic/loa chỉ đổi trạng thái minh họa.
- Không dùng ảnh đại diện thật trong prototype; emoji chỉ là placeholder.

## Chưa hoàn thành trước khi tích hợp
1. Asset production theo concept được duyệt: xuất nền/nhà/lửa/hiệu ứng nhiều lớp ở độ phân giải chuẩn; bản CSS hiện tại KHÔNG đạt mức giống ảnh concept.
2. Mapping ảnh avatar tài khoản từ nguồn xác thực; fallback chân dung và quy trình tạo chibi (chỉ khi có quyền asset).
3. PixiJS hoặc renderer được benchmark trên iPhone thực; prototype dùng CSS/DOM nhằm chốt bố cục trước, không tự coi PixiJS đã triển khai.
4. Xác minh hit targets khi đủ 30 người trên màn hình nhỏ; cân nhắc zoom/điểm tập trung và danh sách phụ.
5. Kiểm thử thực tế FPS, RAM, texture, WebP và visual regression với ảnh concept.
6. Tích hợp voice/chat, quyền đêm và gameplay chỉ sau khi luật Lá Chức Năng/Artifact được chốt.

## Quy tắc an toàn
Đây là nguyên mẫu ở nhánh riêng; không sửa src/, server-game/, assets production hoặc workflow deploy. Mọi nhánh đang làm song song phải đọc main mới nhất trước khi tích hợp.
