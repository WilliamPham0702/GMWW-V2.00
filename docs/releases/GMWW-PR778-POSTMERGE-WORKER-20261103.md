# GMWW PR #778 — Phát hành Worker/Player Web sau merge (CI-LITE)

**Nguồn:** PR #778 đã merge; PR #781 đã SUCCESS và merge (`98c700d5833bc69f4ffe35b8ddbe53b3630f178c`). Bản phục hồi này chỉ bổ sung kiểm thử main-push chính xác và không cắt bớt lịch sử thông cáo.

## Thay đổi
- Lưu toàn bộ thông cáo đã công khai trong ngày/đêm của ván hiện tại, không xóa sự kiện cũ khi có kết quả mới hoặc tải lại.
- Dòng 🎬 trong Chat Làng chạy chậm, lặp các thông cáo; tin nhắn văn bản/thoại không dùng box riêng.
- Không làm lộ danh tính Sát Thủ, lựa chọn bí mật hoặc hành động chưa công bố của đêm.
- CI Scope dành cho PR và main-push kiểm toán chính xác 8 file; các thay đổi khác phải chạy full CI. Luôn giữ các required checks và Worker dry-run.

## Chốt trước khi phát hành
- Ghi HEAD commit SHA, ghi Cloudflare deployment ID và version ID trước phát hành.
- Check Player Web Worker, CI Policy Gate, V3 Focused CI, V3 Release Gate phải SUCCESS trên HEAD cuối cùng của PR; main-push phải xác nhận đúng SHA trước khi Worker-only publish.
- Chỉ dùng luồng Worker/Player Web; **không đổi IPA, Runtime OTA, URL, DNS hay dữ liệu thật**.

## Nghiệm thu an toàn
- API health, Player Web bundle và marker `gmwwVillageTickerUpdate` trên Production.
- Test synthetic: trước và sau khi trả lời Sát Thủ phải có hai thông cáo theo thứ tự; load/reconnect không mất; không lộ ai là Sát Thủ.
- Kiểm tra Chết/Bị đuổi/Đánh dấu và quyền chat bằng dữ liệu thử ở CI; không tự tạo phòng/dữ liệu thử trên Production.

## Rollback
Nếu smoke fails, dùng Cloudflare Worker deployment/version được ghi nhận ngay trước phát hành; không xóa Durable Object storage, lịch sử, URL, IPA hay Runtime. Vấn đề `/api/update/manifest` (nếu còn HTTP 503) xử lý ở task Runtime riêng, không nằm trong bản này.
