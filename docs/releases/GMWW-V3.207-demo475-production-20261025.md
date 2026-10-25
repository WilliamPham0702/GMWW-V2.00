# GMWW Runtime V3.207 — DEMO Sát Thủ / Soi xét / Audio / Lên Giàn

Ngày chuẩn bị phát hành: **25/10/2026**. Nguồn thay đổi gameplay: PR #475, commit merge `8772337ab95e7561aeba6d63b2ec2337d7bbee94`.

## Thay đổi cho người dùng
1. **Sát Thủ**: trong DEMO, mô phỏng câu trả lời 👍/👎 của người bị chọn và giải quyết kết quả sống/chết qua logic Server chung; Online/Offline dùng phản hồi Player Web thực.
2. **Soi xét**: Nhà Tinh Thần Học phải chọn đúng 2 mục tiêu; hành động soi 3 người yêu cầu đủ 3; kết quả vai chỉ gửi GM.
3. **Audio Nhà Tinh Thần Học**: phát tín hiệu cùng/khác phe trước, tiếp nối 3–5 giây mở đầu của âm thanh tên vai từng người được soi; không phát trùng cùng lúc.
4. **Lên Giàn**: người đang bị treo không được tự bỏ phiếu cứu/giết; người chết/đã bị đuổi cũng không được bỏ phiếu. Phiếu không hợp lệ không được tính; Player Web ẩn quyền bỏ phiếu.
5. **Phát hành**: sửa phân loại phạm vi CI sau khi PR #475 merge, chọn đúng test gameplay/Worker/Lên Giàn; không chạy bộ Card/Seat/IPA không liên quan để chặn Runtime.

## Kiểm soát phát hành
- Áp dụng **chỉ V3.207 và mã merge PR #475**. Yêu cầu **2 CI SUCCESS cùng commit `main`**: `Check Player Web Worker` và `Check Lên Giàn theo đúng phạm vi`.
- Vẫn phải vượt `npm run check`, version guard OTA, SHA-256 Runtime và kiểm tra Production sau deploy. Không chạm Native IPA.
- Giữ nguyên schema Durable Object, danh sách thành viên, phòng, lịch sử và dữ liệu đang lưu.
- Không dùng STAGING của PR #475 để đại diện dữ liệu thành viên Production.

## Khôi phục nếu lỗi
- Worker Production trước phát hành: Cloudflare deployment `ac1d0f38-94f1-4746-97bf-87e60bf941b3`, version `ff69ea4b-606e-49c3-a29e-6dee4a83b5db` (đã đối chiếu trước phát hành).
- Khi xảy ra lỗi, quay lại bản Worker trước bằng **deployment rollback**; không xóa DO, phòng, thành viên hoặc lịch sử. Xác minh lại health, Player Web và manifest OTA sau rollback.
- Trạng thái deploy và SHA-256 phải căn cứ vào job triển khai thực tế; văn bản này **không tự chứng minh đã deploy**.
