# GMWW V3.207 — Hoàn thiện cổng CI sau merge PR #475

Ngày 25/10/2026.

Bản phát hành Runtime V3.207 gồm thay đổi PR #475: Sát Thủ phản hồi 👍/👎, Nhà Tinh Thần Học soi đủ hai mục tiêu và phát audio theo lượt, quyền bỏ phiếu Lên Giàn hợp lệ cho GM/Player Web.

Bổ sung kiểm tra phân loại commit `main`: ba file sửa bộ chọn CI, unit test và ghi chú này chạy đúng kiểm thử DEMO; thay đổi ngoài phạm vi không được bỏ qua kiểm thử. Lên Giàn được chạy bằng workflow_dispatch trên đúng SHA main; Player Web Worker phải SUCCESS trên push cùng SHA. Giữ kiểm tra npm source, phiên bản OTA, SHA-256, health Production, manifest và rollback. Không thay đổi dữ liệu, schema DO, phòng chơi hoặc IPA native.

Nếu deploy không thành công, không coi bản này là đã phát hành; bản Cloudflare Production trước triển khai vẫn là baseline rollback `ac1d0f38-94f1-4746-97bf-87e60bf941b3`.
