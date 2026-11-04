# GMWW Runtime V3.303 — Audio lượt đồng bộ Server ↔ GM ↔ mọi Player Web

Ngày: 04/11/2026 · Phạm vi: Worker (Server + Player Web) và Runtime GM (OTA). Không đổi IPA, URL, schema DO hiện có (chỉ thêm khóa `annTarget:*`, `annBlob:*`), không xóa dữ liệu.

## Lỗi
Sau V3.302, audio từng lượt vẫn không phát đồng bộ trên Server và tất cả Player Web.

## Nguyên nhân gốc
1. Audio lượt chỉ được tải lên khi app GM **tự phát** lượt đó. App GM chạy nền (chuyển sang Player Web, khóa máy) hoặc Server tự chuyển lượt theo giờ → không ai tải → Player không có audio.
2. Mỗi lượt GM phải tải lại toàn bộ file (base64) rồi Player mới tải xuống → trễ vài giây, mỗi máy một thời điểm.
3. Player phát từ đầu tại thời điểm nhận được, không theo giờ Server → máy nhanh/chậm lệch nhau; máy vào trễ phát lại từ đầu.

## Thay đổi
- Server: thư viện audio theo phòng, lưu theo hash nội dung. Server tự xác định clip của lượt hiện tại và **tự đẩy** `announcement_ready` (URL ẩn danh + giờ bắt đầu lượt của Server) tới mọi thiết bị mỗi khi đổi lượt/pha. Player chỉ đọc được clip của lượt đang diễn ra; không lộ Vai Trò.
- Runtime GM V3.303: ngay lượt đầu, tải trước **toàn bộ clip của đêm** + "Làng ơi dậy đi" (chỉ tải clip mới/đổi). Các lượt sau và các đêm sau Server tự phát kể cả khi app GM chạy nền. Runtime ≤V3.302 vẫn tương thích (clip lượt hiện tại được đưa vào thư viện).
- Player Web: phát theo giờ Server — máy nhận trễ sẽ nghe tiếp đúng đoạn đang phát, clip đã hết thì không phát lại muộn; clip được cache, đêm sau không tải lại; hỗ trợ lượt nhóm nhiều clip.

## Kiểm thử
- Test mới V3.303: ánh xạ lượt→clip, thư viện (hash, chống trùng, dọn clip cũ), Server tự đẩy lượt kế tiếp không cần GM, quyền đọc clip, Player phát đúng vị trí/bỏ clip đã hết/cache/chặn URL lạ.

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.302 từ GitHub Releases; không xóa dữ liệu.
