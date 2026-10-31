# GMWW — KHO RUNTIME CHUNG, KHÔNG NHÂN BẢN FILE (31/10/2026)

## Mục tiêu và đường dẫn cố định

**Kho phát hành Runtime:** https://github.com/WilliamPham0702/GMWW-V2.00/releases

Mỗi task được phát triển, nghiệm thu bằng PR riêng. Khi được duyệt và main CI SUCCESS,
hai con đường phát hành hiện có (GitHub-first hoặc Production) đều nhắm đến đúng
**một bản phát hành gốc** `gmww-runtime-v<version>`, chứa:
- `GMWW-Runtime-V<version>.gmwwupdate`
- `GMWW-Runtime-V<version>.gmwwupdate.sha256`
- `manual-manifest.json`

Không tạo lại bản copy để đưa vào kho. Liên kết riêng mỗi phiên bản không đổi;
link kho chung luôn là GitHub Releases. Người dùng vẫn nhận file trong chat,
vẫn có OTA và Server Production theo quy trình đã kiểm soát.

## Trình tự vận hành

1. Phát triển trên PR riêng. QA/Preview sử dụng GitHub Actions artifact riêng trong thời hạn lưu kiểm thử; **không phải** bản Production.
2. Chỉ sau required checks SUCCESS và nghiệm thu mới merge/release theo release gate.
3. Workflow phát hành GitHub-first dùng tag `gmww-runtime-v<version>`.
4. Deploy Production nếu cần tạo Release thì **cùng tag đó**, xác thực SHA-256,
   đối chiếu asset gốc nếu tồn tại. Không dùng `gmww-v<version>` làm nơi tải
   Runtime mới, không `--clobber`, không ghi đè bytes của phiên bản đã phát hành.
5. Người dùng mở Releases, chọn `GMWW RUNTIME V...`, mở Assets và tải file.
   Không tự hạ cấp phiên bản Runtime đang có.

## An toàn và tương thích

- Giữ nguyên IPA, Oracle, Worker/Production hiện hành, Durable Objects, dữ liệu/lịch sử.
- Không đổi phiên bản trong PR quản lý kho, không tự phát hành lại Runtime.
- Bản sao theo tháng `gmww-backup-YYYY-MM` là cơ chế bảo vệ rollback trước khi
  dọn retention, giữ nguyên; **không có thêm bản sao mỗi PR chỉ để làm kho tải**.
- Các release lịch sử `gmww-v...` và `gmww-runtime-v...` cũ chưa bị xóa:
  chỉ chuẩn hóa các bản phát hành trong tương lai. Không dọn file chỉ vì giống tên.
- Nếu release đã tồn tại nhưng SHA-256 khác, job thất bại an toàn; không ghi đè.
- Nếu bản phát hành chưa đủ điều kiện, không đưa vào Releases chính thức.
- Rollback dùng bản đủ điều kiện đã xác minh, không hạ cấp qua mất dữ liệu.
