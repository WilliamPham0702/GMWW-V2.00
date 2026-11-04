# GMWW PR #778 — Phục hồi phát hành thông cáo công khai, Worker/Player Web

## Phạm vi
- Phát hành lại mã PR #778 đã merge (`ca76a9ae351b0567fed07f95d44f8a6b1f74f2e2`) cùng bản vá nhỏ cho phép lưu **nguyên văn thông cáo đầu tiên** khi đồng bộ lại.
- Dòng 🎬 dưới Chat Làng chạy chậm, tuần tự các sự kiện công khai của lượt đang chơi; thông cáo đã phát không biến mất khi cập nhật trạng thái hoặc tải lại Player Web.
- Hiển thị hai thông cáo độc lập: người bị Sát Thủ chọn → kết quả lựa chọn/sống/chết.
- Thông cáo không tiết lộ tên người đóng vai Sát Thủ; dữ liệu API/WebSocket của người chơi không nhận `actorId`/`gmChoice`.
- Tin nhắn văn bản và thoại trong Chat dùng trình bày không viền, giữ màu tên người gửi.
- **Worker/Player Web-only. Không phát hành IPA, .gmwwupdate, Runtime OTA, đổi URL hoặc dữ liệu phòng.**

## Điều kiện an toàn trước phát hành
1. Đúng HEAD cuối cùng và không có thay đổi Runtime, IPA, DNS, Durable Object migrations hoặc nội dung bí mật.
2. `Check Player Web Worker` kiểm thử đúng 6 bài liên quan Chat, thông cáo, riêng tư, CI + kiểm tra gói Player Web `--verify` + `npm run check` — **SUCCESS**.
3. `CI Policy Gate` và `GMWW AUTO-DELIVERY V3.0` đúng SHA — **SUCCESS**, không được bỏ required checks.
4. Chỉ triển khai qua luồng Worker-only; ghi lại Deployment ID/Version ID mới và Version ID trước đó.

## Kiểm tra sau phát hành
- API health của Worker, JavaScript Player Web tải được, có marker `gmwwVillageTickerUpdate`, `🎬:`.
- Dữ liệu thử: chọn mục tiêu → trả lời sai/đúng → **hai thông cáo** tồn tại theo thứ tự; không lộ người Sát Thủ; refresh/reconnect không mất thông cáo. Dữ liệu Production thật không dùng làm fixture.
- Kiểm tra quyền Chat ban ngày/ban đêm, không tạo room Production nếu chưa được phép.
- Ghi nhận riêng cảnh báo `/api/update/manifest` nếu vẫn 503; **không sửa Runtime/manifest trong PR này**.

## Rollback
Nếu smoke kiểm tra thất bại, khôi phục chính xác Cloudflare Workers deployment/version **đã ghi trước khi deploy** bằng API deploy phiên bản cũ; giữ nguyên DO storage, Player Web URL, IPA, Runtime và dữ liệu lịch sử. Không xóa dữ liệu phòng.
