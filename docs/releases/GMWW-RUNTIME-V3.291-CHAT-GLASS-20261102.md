# GMWW Runtime V3.291 — Chat giao diện kính mờ, đồng bộ GM / Player Web

Ngày: 02/11/2026. PR: #749.

## Thay đổi
- Micro SVG tối giản và nút gửi tròn mũi tên lên, giống nhau trên Player Web và GM Server.
- Hộp Chat mờ trong suốt, bo góc; lịch sử tin trên, ô nhập và nút thao tác dưới, thống nhất hai phía.
- Khi ghi thoại: chấm đỏ nhấp nháy, họa tiết sóng, thời gian đếm đến tối đa 30 giây; bấm dừng để gửi.
- Tin thoại hiển thị thẻ bo tròn có nút phát, sóng biểu thị và thời lượng; hiệu ứng nhẹ khi đang phát.
- Giữ nguyên lịch sử, Chat GM, Chat Làng, thông cáo, quyền chat theo trạng thái, dữ liệu thoại, xử lý tối đa 30 giây và quyền microphone. Hiệu ứng giảm khi thiết bị bật Reduce Motion.
- Chỉnh thứ tự lớp để biểu quyết Lên Giàn không bị Chat đè lên.
- Không thay đổi IPA, tên miền, tài khoản Cloudflare, DO migration hay dữ liệu phòng.

## Kiểm tra trước khi phát hành
- Bắt buộc required GitHub CI Policy Gate và các bài Browser/Worker relevant SUCCESS trên HEAD cuối cùng.
- So sánh nguồn/bundle byte-exact GM & Player Web, syntax, version đồng bộ: Worker, app.js, GMWW.html, package/lock.
- Worker/Player Web smoke Production: health V3.291, bundle giao diện mới, URL giữ nguyên.
- Runtime OTA: chỉ công bố GitHub Releases khi .gmwwupdate + SHA-256 + manifest phù hợp và gói chạy kiểm định; không ghi đè V3.290.

## Rollback
- Worker: Cloudflare A triển khai lại phiên bản Worker 100% trước thay đổi bằng deploy version; không xóa Durable Objects/data.
- Runtime: dùng gói Runtime V3.289 trong GitHub Releases để phục hồi nếu engine hỗ trợ chọn phiên bản. Không xóa IPA, cache tài khoản hoặc dữ liệu thật để rollback.
- Trước khi hoàn thành, kiểm chứng nút gửi văn bản, ghi và nghe lại thoại GM–Player Web, đóng/mở Chat và Lên Giàn trên iPhone thực tế.
