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

## Bằng chứng phát hành an toàn sau PR #598
- PR #598 đã merge: GM Giết/Cứu/Cấm-Mở chat dùng icon, 🦩 di chuyển và không hiển thị danh sách cấm chat; `Check GM Chat Flamingo and 3 Persistent Actions` SUCCESS trên merge PR #613.
- PR #613 source SHA `28f62f91dea9538b79b06177cd1d7cdbd7703e57`: `Check Approved Role Card Settings`, `Check GM card artwork centering (20261029)`, `CI Policy Gate` và `Check Player Web Worker` đều SUCCESS tại pull_request.
- Main merge SHA `2171214cec2c9af92994c27caaa8f75e976dbb1c`: `Check GM card artwork centering (20261029)` và `Check GM Chat Flamingo and 3 Persistent Actions` đều SUCCESS tại push.
- SHA Production cuối cùng: yêu cầu `Check Player Web Worker`, `Check GM card artwork centering (20261029)`, `CI Stability Gate` đều SUCCESS trên cùng commit. Không đòi hai workflow PR-only phải chạy trên main; vẫn giữ nguyên kiểm tra CI Policy từ PR gốc.
- Release V3.274 bao gồm thay đổi GM/chat #598 đã merge trước đó; không tạo IPA mới, không can thiệp phòng, Durable Objects và lịch sử. Chỉ xác nhận phát hành khi OTA manifest + SHA-256 + health thực tế đạt.
