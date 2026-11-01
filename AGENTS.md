# GMWW AUTO-DELIVERY V3.0 — QUY TRÌNH CHÍNH THỨC (01/11/2026)

Chủ dự án đã nghiệm thu task mẫu PR #733 ĐẠT và phê duyệt **GMWW AUTO-DELIVERY V3.0** thay thế quy trình xử lý task cũ cho mọi tính năng. Xem [thiết kế, điều kiện an toàn và lộ trình chuyển đổi](docs/architecture/GMWW-AUTO-DELIVERY-V3.0.md).

- Mỗi task → nhánh riêng từ main mới nhất → tái hiện và sửa → CI theo phạm vi và rủi ro → STAGING khi cần → required checks SUCCESS → merge → deploy an toàn → kiểm tra live → báo kết quả.
- GitHub-first; tự động hóa khi có công cụ thực thi, không tuyên bố kết quả chưa kiểm chứng. Recovery 5 phút, bảo toàn mã nguồn/commit/nhánh.
- Không bỏ required checks; không đổi IPA, URL, dữ liệu/DO, Production, Releases ngoài phạm vi được phê duyệt. Phát hành OTA khi cần phải có .gmwwupdate, SHA-256, release notes tiếng Việt, rollback.
- Quy trình task V3.0 có hiệu lực ngay; **các workflow cũ chỉ vô hiệu hóa sau khi từng workflow thay thế đã PASS**. PR #581 (3D) tiếp tục đóng băng.
- Các quy tắc kiểm thử theo phạm vi bên dưới tiếp tục được giữ như tiêu chuẩn kỹ thuật của V3.0, không còn là cơ chế task riêng biệt.

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
10. Mọi update Server/Runtime/IPA/Player Web phải kèm release notes/changelog. Không tự merge hoặc deploy Production trước khi chủ dự án phê duyệt, bảo toàn phòng/DO/lịch sử/IPA và ghi phương án rollback.

**Kết quả mong muốn:** Một task → một phạm vi tác động → các test cần thiết của task → báo cáo ngắn, chính xác. Không kiểm thử lan man.
