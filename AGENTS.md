# GMWW AUTO-DELIVERY V3.0 — MẶC ĐỊNH TỪ 01/11/2026

**Quy trình mới đã được phê duyệt sau nghiệm thu Player Web trên iPhone.** Chính sách vận hành: docs/architecture/GMWW-AUTO-DELIVERY-V3.0.md. Chỉ dẫn này ưu tiên hơn quy tắc giao nhận và phát hành cũ bên dưới nếu có xung đột.

- Một task → một nhánh → một PR; xác minh nguyên nhân gốc và kiểm thử đúng phạm vi, không tạo vòng PR chữa CI.
- V3 Scope Gate; CI cơ bản + CI tích hợp theo rủi ro; required CI Policy Gate SUCCESS cùng SHA mới merge.
- Worker/Player Web → Worker-only deploy và smoke + rollback; Runtime thật thay đổi → bản OTA mới .gmwwupdate + SHA-256 + Release notes tiếng Việt và rollback; không phát hành OTA giả/trùng.
- Mặc định bảo toàn dữ liệu, DO, URL gamemasoi.pages.dev, IPA và PR #581 3D đã đóng băng.
- Chủ dự án phê duyệt quy trình V3 cho phát hành an toàn thường lệ khi CI/health đạt. Native, DO migration, xóa dữ liệu, đổi URL và thay đổi nhạy cảm cần phê duyệt riêng.
- Không báo phát hành xong khi chưa xác minh GitHub/Cloudflare thật. Nếu bế tắc 5 phút, đổi hướng và giữ commit.
- Không xóa hàng loạt workflow kiểm thử cũ trước khi thay thế tương đương được xác minh.

---

# GMWW — Quy tắc bắt buộc khi xử lý task và kiểm thử

## Nguyên tắc số 1: CHỈ KIỂM THỬ ĐÚNG PHẠM VI

Đây là yêu cầu bắt buộc từ chủ dự án (24/10/2026), áp dụng cho mọi lỗi và task GMWW ở Server, GM iPhone, Runtime, Player Web, Offline, Online, DEMO.

1. Trước khi sửa, xác định **triệu chứng, nguyên nhân gốc, các hàm/API/file liên quan và nguy cơ hồi quy trực tiếp**. Không suy luận rằng toàn bộ file `src/index.js` hoặc `app.js` đổi nghĩa là mọi chức năng game đã đổi.
2. Phải có **test tái hiện lỗi ban đầu**, tiếp theo là **test xác nhận sau sửa**. Chỉ chạy thêm test hồi quy của những luồng thật sự bị tác động bởi thay đổi.
3. Mỗi bài test phải giải thích được: **nó kiểm chứng yêu cầu nào / rủi ro nào của chính task**. Không có quan hệ rõ ràng thì **không tự chạy**, không thêm vào danh sách nghiệm thu.
4. Ví dụ: lỗi box chiến thắng hiện lại khi Phát Vai → kiểm tra vòng đời kết thúc → chọn lại phòng/tạo ván → Phát Vai, lịch sử/kết quả từng mã ván; **không tự chạy test Chrome mở lá, 30 seat hay cảnh làng** nếu các chức năng đó không bị sửa.
5. Ví dụ: PR #440 Player Web chỉ thấy một người, không nhận Role/Artifact, move storm → kiểm tra danh sách online, join/refresh/reconnect, nhận/mở Role và Artifact trên Chrome/Edge, đồng bộ phase và chặn move; **không thêm test 30 ghế/cảnh nền/DEMO rule không liên quan**.
6. CI cho PR phải **chọn test theo phạm vi thực tế**, không chạy nguyên gói E2E chỉ vì sửa file lớn. Tách script theo chức năng và đặt tên bước mô tả đúng nội dung. Nếu workflow tự chạy test ngoài phạm vi, phải sửa routing CI trên PR riêng; không coi test thừa là điều kiện nghiệm thu của task đang sửa.
7. Không bỏ qua kiểm tra an toàn bắt buộc về cú pháp, tính toàn vẹn bản build, dữ liệu, phân quyền. **Trước phát hành Production** có thể cần bộ kiểm thử release toàn diện riêng; **tách nó khỏi kiểm thử xác nhận bugfix** và báo rõ lý do.
8. Không chạy lại toàn bộ CI sau mỗi sửa nhỏ nếu có thể gom commit; ưu tiên kiểm tra đúng bài lỗi trước. Khi thất bại, đọc **dòng AssertionError/root cause**, không coi `exit code 1` hoặc các request phụ/404 là nguyên nhân khi chưa có chứng cứ.
9. Không được khai báo `SUCCESS` cho test chưa chạy. Báo **PASS / FAIL / CHƯA CHẠY** với bằng chứng, nêu rõ test nào cố ý bỏ qua vì không liên quan.
10. Mọi update Server/Runtime/IPA/Player Web phải kèm release notes/changelog. Được áp dụng AUTO-DELIVERY V3.0 theo phê duyệt thường trực cho phạm vi an toàn khi required CI cùng SHA SUCCESS; thay đổi nhạy cảm phải phê duyệt riêng, bảo toàn phòng/DO/lịch sử/IPA và có rollback.

**Kết quả mong muốn:** Một task → một phạm vi tác động → các test cần thiết của task → báo cáo ngắn, chính xác. Không kiểm thử lan man.

---

# Cấu trúc mã (từ 13/11/2026)

- Worker: `src/index.js` chỉ giữ hằng số phiên bản + ghép; mã nằm trong `src/worker/` (`http/`, `room/`, `support/`) — xem `src/worker/README.md`. Luật game vẫn ở `src/gmww-*-rules.js`.
- GM Server: `server-game/src/<nhóm>/<NN-tên>.part` → `server-game/current/app.js` — xem `server-game/src/README.md`.
- Player Web: `src/player-web-src/<nhóm>/<NN-tên>.part` → `src/gmww-members-live.js` — xem `src/player-web-src/README.md`.
- Test/CI đọc nguồn qua `.github/scripts/worker-source.mjs` và `.github/scripts/source-groups.mjs`, không đọc thẳng đường dẫn file cũ.
