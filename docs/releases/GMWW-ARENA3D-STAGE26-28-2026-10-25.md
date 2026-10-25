# GMWW Arena 3D — Giai đoạn 26–28 (25/10/2026)

## Phạm vi phát hành
- **Chỉ nghiên cứu STAGING**, trên PR #487 dạng Draft, nhánh `feature/arena3d-stage14-16-dynamic-artifacts-audio`.
- Giữ GMWW 2D/Player Web/IPA/Runtime OTA hiện hành, mọi phòng thật và dữ liệu Production nguyên vẹn.
- Không merge, không deploy Production và không chuyển người chơi 2D sang 3D.

## GĐ26 — Thư viện diễn hoạt bao phủ Core
- Đối chiếu tự động **28 vai trò dựng sẵn, 26 hành động** với `server-game/src/00-core-and-library.part` của phiên bản Core trên nhánh. Vai thụ động không có lượt hành động riêng thì không tạo hành động giả.
- 26 mã hành động dựng sẵn có **chữ ký hình ảnh ổn định, riêng biệt**, gồm nhịp tay, pha xoay hào quang, kích thước trúng đích và nhận diện VFX. Giữ đặc trưng theo họ: Sói bay đầu sói tấn công, Tiên Tri/hào quang đũa phép, Bảo Vệ khiên, Phù Thủy hoa chữa trị hay đòn tấn công; bổ sung biến thể từng mã Core.
- Vai trò và Artifact **tùy chỉnh** được tạo chữ ký riêng theo `actionId` chỉ khi hành động đã được Core xác nhận và thẻ riêng của thành viên hiện tại xác thực, không suy diễn từ nhãn, tên người chơi hay dữ liệu công khai.
- Sử dụng sound ID theo hồ sơ hành động, không tự tạo file âm thanh chưa có link. Thư viện bao gồm metadata/họ, không khẳng định đã có audio ghi sẵn cho từng vai.
- Lưu ý phạm vi catalog: Core nguồn hiện tại có 28 vai và 26 hành động gốc; nếu thư viện game ở phiên bản khác có thêm vai/Artifact thì việc hiện hình đúng sẽ phụ thuộc hành động đã được cấu hình và Core chấp nhận. Không tự tuyên bố 63 vai/44 Artifact tất cả đã được chạy thực tế riêng lẻ.

## GĐ27 — Kiểm thử ván 3D trọn luồng GM/Player
- Giữ nguyên Core V2 thật trong Worker+Durable Objects riêng; các bước end-to-end: tạo phòng, gắn người, khóa ghế, phát vai, vào trận, bắt đầu Đêm, xác nhận hành động Bảo Vệ thật, chuyển Ngày, đề cử, bỏ phiếu, kết thúc ván.
- Bổ sung **reconnect Player giữa Phát Vai**, trong đêm và sau khi kết thúc. Player không có quyền đọc cue GM; kiểm tra HTTP 401/403 kể cả khi refresh.
- E2E phụ cho Vai Trò và Artifact tùy chỉnh: hành động Shield 2 mục tiêu, Artifact Heal 1 mục tiêu được Core xác nhận, viewer vẫn không lộ dữ liệu GM.
- Bảo toàn cảnh 6–30 Character / render ngân sách GĐ23–25. Không tạo phòng Production, không dùng số người thật.

## GĐ28 — Ứng viên kiểm thử iPhone/STAGING
- Chỉ xuất ứng viên khi CI đúng phạm vi, triển khai Cloudflare STAGING độc lập, Chrome/WebKit 6–30, tất cả diễn hoạt preview và E2E Core 2 client đều PASS.
- Trả link Worker STAGING, GitHub Actions và version ID Cloudflare có kiểm chứng; không dùng số bản 3D để đánh lừa Runtime Production.
- Nghiệm thu iPhone vật lý là **bước riêng**; Chrome/WebKit giả lập iPhone không thể chứng minh nhiệt/pin, độ mượt với GPU thật hoặc âm thanh từng thẻ chưa upload.
- Không tự merge ngay cả khi CI SUCCESS, giữ Draft cho đến khi chủ dự án phê duyệt thao tác cụ thể.

## Rollback và bảo mật
- Nếu ứng viên gặp sự cố, dùng Cloudflare Worker version STAGING đã nghiệm thu GĐ23–25 `755963dd-47f3-4c0a-bce7-65c0a21a2122` hoặc revert các commit chỉ trên nhánh nghiên cứu.
- Giữ mọi yêu cầu Core kiểm duyệt GM JWT/bearer, room/match/cycle/turn và artifact ownership; không phát cue bí mật trong WS/dataset Player.
- Không thay đổi Durable Objects Production, main, Worker Prod hoặc cấu hình IPA.

## Trạng thái phát hành ứng viên
**Đang hoàn thiện kiểm thử thực tế.** Điền CI/Worker version và kết luận sau khi GitHub Actions hoàn thành; không tự đánh dấu PASS trước.
