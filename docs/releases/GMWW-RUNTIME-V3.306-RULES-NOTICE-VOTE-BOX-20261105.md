# GMWW Runtime V3.306 — luật Phù Thủy/Sát Thủ · thông báo chung · hộp bỏ phiếu Player Web

Ngày: 05/11/2026 · Phạm vi: Worker (Server + Player Web + khung Làng) và Runtime GM (OTA). Không đổi IPA, URL, schema DO, không xóa dữ liệu. Mã nguồn đã merge ở PR #806; bản này tăng phiên bản Runtime để phát hành .gmwwupdate.

## Thay đổi
1. Bỏ trang Chọn Phòng của Player Web; sau ván người chơi về village (Sảnh chờ hoặc Tập hợp theo Quản Trò).
2. Phù Thủy đã dùng bình Cứu thì không còn thấy vết Sói cắn (Server + GM).
3. Người chết đêm qua bị Sát Thủ chọn vẫn được gọi chọn 👍👎; chọn đúng chỉ hủy Sát Thủ, vết cắn còn hiệu lực thì vẫn chết, đã bị Bảo Vệ/Phù Thủy vô hiệu thì sống.
4. Nền làng về ngày khi ở Sảnh chờ.
5. Thông báo Player Web dùng chung một hộp dưới menu trên, tự mất sau 15 giây, thông báo mới thay thông báo cũ.
6. Hộp bỏ phiếu Cứu/Giết nằm ở vị trí icon hành động và kéo di chuyển được.
7. Số phiếu đề cử màu đỏ nhảy và 👍👎 trên đầu người vừa bỏ phiếu giống GM; tiến độ/kết quả phiếu vào hộp thông báo chung.

## Kiểm thử
- PR #806: toàn bộ CI SUCCESS trên HEAD f76a58c (gồm browser-test, chrome-edge); `tests/*.test.mjs` không có lỗi mới so với main (2 file lỗi sẵn: pr630-release-ci, v3186-local-village-cache).

## Rollback
- Worker: rollback phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.305 từ GitHub Releases; không xóa dữ liệu.
