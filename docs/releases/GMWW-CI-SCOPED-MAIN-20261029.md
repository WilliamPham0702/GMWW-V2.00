# GMWW — Release notes CI Scoping trên main (29/10/2026)

## Lý do
Sau khi PR #607 merge, Check Player Web Worker trên main đã chạy nhầm bộ test gameplay/UI lịch sử (hơn 1.200 bài), dẫn đến thất bại dù PR chỉ thay đổi quy trình CI. Deploy Production vẫn được chặn đúng.

## Thay đổi
- Thêm phân loại `ci-policy` cho bộ thay đổi thuần GitHub CI, bộ phân loại, test policy và tài liệu phát hành đã cho phép.
- Bắt buộc cả bộ chọn phạm vi, kiểm thử chính sách và release notes của gói; thiếu bất kỳ bằng chứng nào phải quay về `full`.
- Mọi sửa gameplay/Worker/Player Web, xóa file, hoặc tệp không thuộc danh sách được phép đều quay về `full` (fail-closed).
- Chỉ chạy kiểm thử bất biến an toàn CI trong Check Player Web Worker và Check Player Card Browsers khi thực sự là thay đổi CI-only; bỏ qua Dual Renderer 3D, Browser/Seat và macOS Native IPA không liên quan.
- Giữ chốt chặn Production: thay đổi thuần CI không tự phát hành Worker, Runtime OTA hoặc IPA.

## Kiểm thử
- `node --check .github/scripts/ci-browser-scope.mjs`
- `node --test --test-name-pattern='Unknown Worker|Any other public-room|UI changes outside|Browser, seat, workflow|A deletion, unexpected status|CI-only merge|PR603 account avatar' tests/ci-browser-scope.test.mjs`
- Kiểm tra mode được chọn trên pull request và sau merge vào main.

## Bảo toàn & Rollback
Không thay đổi gameplay, Worker runtime, Player Web, IPA, Runtime OTA, dữ liệu và lịch sử.
Rollback: revert pull request CI policy này; Production không tự được phát hành từ thay đổi CI-only.

## Bổ sung hậu merge
- Giới hạn nhánh kiểm tra PR550 lịch sử trên `main`: không quét nội dung chuỗi của chính các tệp CI-only đã được kiểm toán.
- Giữ điều kiện fail-closed cho mọi sửa luật/gameplay và các tệp lạ.
- Chốt giữ nguyên Production/Runtime OTA/IPA; không tự phát hành từ thay đổi CI-only.

## Bổ sung CI Say Rượu (29/10/2026)
- Tách thay đổi CI-only khỏi workflow **Check Drunk Card Draw and Expelled Spiritualist**: chỉ kiểm tra bộ chọn phạm vi và các bất biến an toàn; không chạy test luật Say Rượu/Nhà Tin Thần Học khi không có thay đổi luật.
- Bổ sung kiểm thử chống bỏ sót: thay đổi Worker, gameplay, luật Say Rượu hoặc thiếu release notes bắt buộc phân loại `full`.
- Thêm workflow Say Rượu vào danh sách thay đổi CI-only được phép và chặn tự phát hành Production. Không thay đổi tính năng game, IPA, Runtime OTA, dữ liệu và lịch sử.
- Rollback: revert PR CI Say Rượu tương ứng.


## Chrome iOS PR642 — sửa CI theo phạm vi (30/10/2026)

- Nhận diện chính xác 4 tệp sửa viewport GM Server: HTML, test, workflow, release notes; hỗ trợ riêng thay đổi phiên bản V3.277 → V3.278 tại 5 tệp định danh Runtime.
- Kiểm tra trước/sau của HTML, chỉ cho phép CSS/JS khóa vùng hiển thị và cập nhật số phiên bản, chặn thay đổi gameplay/IPA/Worker ngoài số phiên bản.
- Không chạy lại test cũ Lên Giàn, icon, bản OTA candidate 3.238 hay build IPA khi chỉ thay viewport. Giữ kiểm tra cú pháp, bản bundle, guard phiên bản, CI Policy Gate, CI Stability, kiểm thử Chrome viewport.
- Các thay đổi chưa được nhận dạng chính xác vẫn chạy CI đầy đủ; bảo vệ Production/IPA/DO, không tự xuất IPA.
- Rollback: revert PR CI-only, sau đó hệ thống quay về bộ test đầy đủ (fail-closed).
