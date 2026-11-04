# GMWW V3.274 — Khôi phục phát hành Runtime PR613 sau merge (29/10/2026)

## Nguyên nhân
PR #613 đã merge ở commit `2171214cec2c9af92994c27caaa8f75e976dbb1c`; CI trên `main` rơi vào phạm vi toàn bộ trước khi kịp nhận dạng bộ kiểm thử Artifact. Check Player Web Worker không đạt và Deploy Production bị bỏ qua.

## Sửa riêng chốt CI
- Nhận diện chính xác thay đổi **5 file CI/release** trên nhánh đã chứa merge #613, đối chiếu dữ liệu Runtime V3.274.
- Không chạy bộ browser, Seat, DEMO, audio, 3D và IPA ngoài phạm vi; vẫn kiểm tra cú pháp Worker, GM bundle, đồng bộ phiên bản, 8 ca Artifact/Vai Trò và phân quyền.
- Chỉ cho phép phát hành khi Worker, Artifact và CI Policy trên **cùng main SHA** đều SUCCESS, bằng chứng Vai Trò và Artifact ở commit #613 đạt SUCCESS; không có thay đổi source/runtime sau commit đó.
- Phân loại chính xác gói Runtime OTA V3.274 còn thiếu và xác minh manifest SHA-256, gói cập nhật thủ công, health Production. Không phát hành lại IPA V3.264.

## Rollback
Nếu CI, SHA-256 hoặc kiểm tra Production thất bại: không phát hành; nếu đã triển khai thì dùng manifest Runtime V3.273 đã xác minh để rollback. Không xóa hoặc reset Durable Objects, phòng, dữ liệu lịch sử và IPA.
