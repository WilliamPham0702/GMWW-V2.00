# GMWW PR #778 — Worker CI-LITE hậu merge và khôi phục thông cáo khi kết nối muộn

Ngày 03/11/2026 — Worker/Player Web only, không tăng phiên bản Runtime hoặc IPA.

## Nguồn gốc
PR #778 đã được merge sau khi CI Policy Gate, V3 Focused CI và V3 Release Gate SUCCESS. Workflow Worker cũ tự động chạy cả các bài kiểm thử lịch sử ngoài phạm vi (bao gồm kiểm thử 3D đã đóng băng) khiến luồng phát hành Production bị chặn.

## Phạm vi sửa
- Thêm Worker-only khôi phục **lịch sử Thông cáo Làng của ngày trước** khi người chơi kết nối lại trong đêm, chỉ từ các sự kiện đã được công khai.
- Bổ sung test hồi quy cho đối tượng kết nối muộn, không cho phép lộ hành động của đêm hiện tại.
- Điều chỉnh đúng **Check Player Web Worker** theo CI-LITE cho thay đổi hậu merge được kiểm chứng bằng SHA nguồn cụ thể; chạy kiểm thử quyền, ticker, bí mật vai trò, gói Player Web và Worker dry-run; các thay đổi ngoài 4 file kiểm chứng sẽ rơi về bộ full CI.
- Không sửa các quy tắc Game, âm thanh, Cloudflare B, IPA, URL, Runtime hay dữ liệu lịch sử.

## Triển khai và rollback
Chỉ khi CI Policy Gate và toàn bộ kiểm thử Worker liên quan SUCCESS trên HEAD cuối cùng mới merge. GitHub AUTO-DELIVERY V3.0 phải kiểm tra same-SHA và smoke Worker/Player Web trước khi xác nhận Production. Rollback về Cloudflare Worker version trước đó nếu smoke thất bại; không xóa DO hoặc key `villagePublicBulletin`.
