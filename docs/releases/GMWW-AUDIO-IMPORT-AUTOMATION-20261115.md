# GMWW Audio Releases — nhập ZIP/MP3 tự động (15/11/2026)

Phạm vi: hoàn thiện công cụ nhập cho PR #926; KHÔNG tự merge, deploy Worker, đổi IPA/Runtime/URL/DNS hoặc dữ liệu game.

## Cách dùng sau khi PR đủ điều kiện CI và được merge an toàn

1. Vào GitHub repository > Releases. Tạo hoặc sửa một **draft Release** với tag bắt đầu bằng gmww-audio-import-. Chọn Edit > Attach binaries; tải ZIP hoặc MP3, rồi Save draft. Nếu link draft trả 404, truy cập qua Releases trong repository khi đã đăng nhập.
2. Một ZIP có các MP3 và file audio-map.json (hoặc manifest.json) ở thư mục gốc. Nội dung mapping mẫu:

    {"clips":{"cards:role_snow_wolf":"wolf.mp3","system:audio_system_countdown":"countdown.mp3"}}

   Nếu tải MP3 riêng mà không có mapping, tên file phải dạng cards__role_snow_wolf.mp3 / system__audio_system_countdown.mp3 / actions__id.mp3 / artifacts__id.mp3. Nếu không xác định được cue, nhập sẽ FAIL (không đoán).
3. Mở Actions > GMWW Shared Audio Import > Run workflow trên nhánh main; nhập ID draft Release; chọn **validate** (mặc định). Xem báo cáo, candidate manifest và SHA-256 tại workflow artifact. Validate không xuất bản Audio.
4. Chỉ khi MP3, mapping, required CI và nghiệm thu được xác nhận: chạy lại với **publish** và nhập chính xác **PUBLISH GMWW AUDIO**. Công cụ upload các MP3 với tên SHA-256, xác minh bytes sau upload, tạo snapshot manifest-r0001.json và manifest.json; tạo/publish Release gmww-audio-v1 khi hợp lệ.
5. Lần sau thêm Audio mới: tạo draft nhập mới, bổ sung MP3/cue chưa tồn tại, validate và publish tương tự. Cue cũ KHÔNG được ghi đè trong cùng major version; đổi nội dung clip cũ phải qua phiên bản major mới và PR riêng.

## Phiên bản và rollback

- Chỉ dùng GitHub Releases (không đưa MP3 vào git tree). Mỗi đợt nhập tạo manifest-rNNNN.json bất biến, latest manifest.json mới được đổi sau khi upload + kiểm SHA-256 thành công.
- Worker của PR #926 chỉ được đọc catalog có tag gmww-audio-v1, xác minh SHA-256 và giới hạn clip đúng lượt người chơi; ưu tiên Audio trong phòng.
- Rollback catalog: Actions > GMWW Shared Audio Import > action **rollback**, chọn revision cũ và nhập câu xác nhận. Tạo revision mới phản ánh manifest cũ; không xóa MP3.
- Nếu lỗi khi thay manifest, importer thử phục hồi bản cũ; nếu phục hồi thất bại workflow trả FAIL, cần xử lý thủ công.
- Rollback Worker riêng: quay về phiên bản Worker Production trước thay đổi (nếu được phát hành trong tương lai). Không đổi dữ liệu Production.

## Điều kiện còn thiếu

GitHub draft Release ID 445512358 đang có 0 asset tại thời điểm kiểm tra. Không thể nghiệm thu 74 MP3 hay publish catalog khi thiếu file thực. Workflow mới chỉ có thể Run workflow trên main sau khi đã merge an toàn; riêng PR phải chạy unit tests và toàn bộ required checks trên HEAD cuối, không bỏ qua. Không merge/deploy Production chỉ dựa trên unit tests.

## Kiểm tra ZIP thật ngày 15/11/2026
Đã đối chiếu bản ZIP trong Library của chủ sở hữu với GitHub Asset ID 749540150 theo SHA-256 chính thức (xem `gmww-audio-source-audit-20261115.json`). 74/74 MP3 khớp hash, 133 cue hợp lệ, ffprobe đọc được cả 74 file, 141 mục CSV thiếu nguồn vẫn giữ nguyên. `checksums.sha256` và `missing-audio.csv` nay được importer nhận diện; checksum list được kiểm thực thay vì bỏ qua.

**Giới hạn xác thực GitHub Actions:** `pull_request` với `contents: read` bị GitHub trả 403 khi gọi API Release draft. Vì vậy PR CI chỉ xác minh mã nguồn, unit tests và bằng chứng SHA-256 đã kiểm tra độc lập, **không tuyên bố đã tải ZIP bằng CI**. Kiểm tra tải ZIP thật cần chạy workflow thủ công `validate` trên `main` với quyền Release cần thiết, sau khi mã nhập được đưa lên main bằng một thay đổi riêng an toàn. Không cấp quyền ghi cho workflow chạy mã PR để tránh lộ token. Chưa phát hành Worker/Production.
