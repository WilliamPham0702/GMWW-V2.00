# GMWW — DEMO lai người chơi thật + tự động (28/10/2026)

## Nội dung cập nhật
- Phòng DEMO hiển thị trong Sảnh Chờ Player Web, có nhãn DEMO thay vì bị ẩn.
- Thành viên đăng nhập có thể vào phòng DEMO trước khi khóa/bắt đầu ván, chọn nhân vật, vị trí và nhận lá Vai Trò/Artifact như luồng thật. Khách chưa đăng nhập không được nhận quyền tác động DEMO.
- Player Web hiển thị bảng hành động đêm/ngày **chỉ dành cho Vai Trò đang đến lượt của chính tài khoản**; chọn mục tiêu/hướng Yêu Tinh/dấu Sát Thủ và xác nhận. Server xác minh session, ownership, match/cycle, lượt, số mục tiêu, hạn mức và tác động qua cùng engine GMWW.
- DEMO tự động vẫn chạy trên Durable Object. NPC được xử lý trước; hành động của người thật được ưu tiên, engine chỉ làm dự phòng gần hết lượt nếu người thật chưa xác nhận. Hành động đã ghi nhận không bị chạy đè; kết quả bỏ phiếu/lên giàn của người thật được lưu đúng như người chơi Online.
- Sự kiện socket DEMO được che tên vai, người thực hiện và mục tiêu đêm. GM vẫn xem nhật ký đầy đủ từ đường API xác thực.
- DEMO vẫn **không ghi kết quả, thống kê hay lịch sử vào tài khoản thật**. Không chuyển đổi ván chạy dở sang mode khác.

## Phạm vi kiểm thử
- Quyền tham gia DEMO: thành viên đã đăng nhập, người ngoài, reconnect, phòng khóa và ván đã bắt đầu.
- Hiển thị action offer của người được giao Vai Trò; không lộ Vai Trò khác; xử lý action idempotency, race với auto, nhận kết quả riêng.
- Bỏ phiếu thật và AI fallback; kiểm tra các vai khó (Sát Thủ, Yêu Tinh, Tiên Tri), quyền bí mật, DEMO server-only cũ và không ghi lịch sử.
- Kiểm tra cú pháp Worker, đúng bản ghép Player Web, dry-run Cloudflare. Không cần build IPA, thử 3D, kiểm Seat 30 hay artwork không liên quan.

## Giới hạn và cách nghiệm thu
- Người chơi thật muốn trực tiếp thực hiện chức năng Vai Trò cần tham gia **trước khi GM phát vai và bắt đầu ván**; đang diễn ra chỉ người đã tham dự được reconnect.
- GM chuẩn bị phòng DEMO ở Tập Hợp rồi gọi người thật vào; bổ sung NPC nếu cần. Chạy ở 1x khi thử thao tác thực để có thời gian chọn mục tiêu.
- Để kiểm tra: mở Player Web bằng tài khoản thành viên, vào phòng có nhãn DEMO, nhận Vai Trò, tới lượt chạm hành động. Kiểm tra AI không ghi đè hành động đã thực hiện, ngày được đề cử/vote.

## Phát hành và quay lui
- Thay đổi Worker + Player Web trên cùng phiên bản Server, không đổi IPA/Native shell, không đổi schema DO, không xóa dữ liệu.
- Chỉ merge/deploy sau khi CI bắt buộc SUCCESS và chủ dự án duyệt phát hành.
- Rollback: deploy lại commit Production trước PR; các trường `humanControlled` là bổ sung tương thích, các ván lịch sử vẫn giữ nguyên.

## Phiên bản phát hành
- Runtime/Server/Player Web: **V3.269**; phiên bản Production trước PR #587 là **V3.268** (commit `58a627ab41b3864393edbf800cdb2adb898dc0ef`).
- IPA Shell: **V3.264**, không build/cập nhật IPA, không thay đổi Native.
- Tối ưu tương thích: cập nhật cơ chế vá lá bài riêng tư để Player Web không trả lỗi HTTP 500 với bảng thao tác DEMO mới.
- Sau CI SUCCESS: phát hành gói Runtime OTA **V3.269** và manifest SHA-256; đối chiếu checksum gói với manifest và xác minh endpoint Production trước khi nghiệm thu.
- Rollback an toàn: đưa Worker + Player Web + Runtime OTA về bản Production **V3.268** (`58a627ab41b3864393edbf800cdb2adb898dc0ef`) qua quy trình phát hành hiện có; không xóa Durable Objects, lịch sử, hay tài khoản. Nếu `main` tiếp tục đổi trước merge, lưu lại commit Production thực tế ngay trước khi phát hành.
- Tích hợp giữ nguyên Chat Online và thông báo audio của V3.266–V3.267; kiểm thử DEMO lai và xác thực /me riêng tư. Các kiểm thử ngoài phạm vi không dùng làm chốt phát hành PR.

- V3.269 tích hợp lên V3.268 hiện hành: giữ nguyên thanh hít Menu dưới của Ván Mẫu, giao diện và CSS mới nhất; chỉ bổ sung DEMO lai, không làm mất thay đổi vừa phát hành.
