# GMWW ART-01 — Chuẩn hóa lượt Artifact đầu ván (26/10/2026)

## Quy tắc đã chốt
1. Nếu cấu hình ván bật Artifact: **Đêm 1 bắt đầu bằng Artifact đầu ván**, tiếp theo **Bầy Sói nhận diện**, sau đó **Vai Trò theo thứ tự**.
2. Chỉ Artifact có cờ `priorityFirst` / “Ưu tiên sử dụng đầu tiên” được hành động ở lượt đầu này. Không tự tiêu hao vì chỉ xuất hiện trong Timeline.
3. Đã dùng trong lượt đầu thì không dùng lại ở lượt Vai Trò **trong cùng đêm**; chưa dùng vẫn có thể chọn khi đến lượt Vai Trò, theo quyền sở hữu/giới hạn thật.
4. Đêm 1 giữ audio hệ thống `audio_system_early_artifacts`, phát khi lượt Artifact mở đầu được kích hoạt. Giữ audio Bầy Sói và vai theo lượt mới.
5. Từ Đêm 2, chỉ tạo lượt Artifact đầu đêm nếu **còn Artifact ưu tiên đủ điều kiện dùng**, ví dụ Artifact dùng một lần chưa tiêu hao hoặc Artifact được dùng lại mỗi đêm. Không tạo lượt trống khi không còn.
6. Nếu ván tắt chế độ Artifact, bỏ qua lượt mở đầu và không ghép chức năng Artifact vào lượt Vai Trò.

## Phạm vi thay đổi
- Server Durable Object: thứ tự queue, điều kiện bật Artifact, lọc quyền sử dụng, kế thừa cấu hình ván cũ.
- Pure projection: thứ tự Timeline trên GM theo queue Server, giữ quyền Artifact và tránh dùng lại.
- Không thay đổi luật Sói Cắn, trận đang chạy, Player Web, IPA, version Runtime/OTA hoặc cấu trúc dữ liệu Durable Objects.
- Trận đang chạy đã có `nightRuntime` lưu riêng: giữ queue cũ, không thay đổi giữa trận. Queue mới chỉ sinh khi bắt đầu đêm chưa có runtime.

## Kiểm chứng phát hành
- Chỉ chạy `tests/artifact-priority-first.test.mjs`, `tests/v389-night-runtime-integration.test.mjs` và chốt Worker (build/syntax/CI).
- Không chạy Chrome Card, Seat, DEMO, 3D, iOS Native, OTA.
- Audio ID đã liên kết trong GM; file audio do người dùng tải lên vẫn cần nghiệm thu iPhone.
- Worker Production chỉ triển khai khi GitHub CI bắt buộc **SUCCESS**; kiểm tra sức khỏe Production sau phát hành.

## Rollback
- Revert commit ART-01 rồi chạy lại CI và deploy Worker cũ; **không xóa DO storage, phòng, lịch sử**, không thay IPA/Runtime.
