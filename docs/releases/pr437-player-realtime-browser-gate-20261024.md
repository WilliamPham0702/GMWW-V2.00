# GMWW – PR #437 · Chặn phát hành lỗi Player Web và truy vết P0 (24/10/2026)

## Tình trạng
- PR #436 đã được merge ngày 24/10/2026 dù `Check Player Card Browsers` còn FAIL.
- Workflow `Deploy Production` chạy theo kết quả `Check Player Web Worker` riêng, không chờ bài Browser.
- Log E2E xác nhận Server trả về 2 thành viên Chrome/Edge, nhưng iframe Chrome hoặc Edge có thời điểm chỉ hiển thị bản thân.
- Các thử nghiệm cũ mở lá Role/Artifact trên Chrome, Edge, WebKit PASS. Luồng đa trình duyệt phát vai → đề cử → vote → reconnect chưa thể nghiệm thu vì vướng lỗi roster.

## Đã thay đổi trong PR #437
1. **Release gate fail-closed:** khi triển khai Worker, chờ workflow `Check Player Card Browsers` **cùng SHA và sự kiện push** kết thúc `success`. Mọi tình trạng `failure`, `cancelled`, `timed_out`, hoặc chưa kết thúc quá thời gian xác minh phải chặn deploy.
2. **Bằng chứng lỗi:** thu thập tên người chơi có trên Server, payload parent → iframe, danh sách Character đã render, bộ đếm render/movement và trạng thái màn hình trong kiểm thử Edge.
3. Chạy kiểm thử roster/phiếu đa trình duyệt trước các kiểm thử browser đã có nhằm phát hiện P0 nhanh hơn.

## Nghiệm thu còn mở
- Player Web phải duy trì danh sách 6–30 người khi Chrome/Edge truy cập, khi join/refresh/mất mạng và trong cả DEMO/Online/Offline.
- Lá Role và Artifact đã nhận mở được lần đầu, không yêu cầu reload.
- GM bật đề cử và vote tự động, Player Web hiện ngay, gửi được 👍/👎, số phiếu Server chính xác.
- Tất cả CI Worker, Realtime 30 người, Browser Chrome/Edge/WebKit, Backup/IPA build phải SUCCESS.
- Không merge PR #437 hoặc triển khai Production nếu chưa đạt toàn bộ.

## Dữ liệu và rollback
Không thay đổi cơ sở dữ liệu, phòng, thành viên, lịch sử, lá bài, bản IPA native hay luật game. Nếu bản phát hành chưa đạt, giữ Production/OTA như hiện trạng cho đến khi có phiên bản đã được nghiệm thu và phương án rollback từ deployment trước đó.
