# GMWW Runtime V3.227 — Icon Action V2 (25/10/2026)

## Phạm vi sáu yêu cầu đã duyệt
1. Icon hành động Vai Trò/Artifact nổi tự do, kéo thả ở mọi vị trí trong màn hình GM; thả ngoài mục tiêu chỉ đổi vị trí, **không** tự chốt game.
2. Hình hiển thị giảm từ 48px còn **24px** (1/2); vùng chạm trong suốt 44px để vẫn thao tác chính xác trên iPhone.
3. Xuất hiện tại đúng tọa độ đống lửa/MENU GM; khi đang có nhiều chức năng hợp lệ, icon đặt lệch nhẹ xung quanh lửa tránh chồng lên nhau. Tự reset sau lượt mới.
4. Kết xuất 49 bộ SVG/PNG frameless từ **chính hình họa tiết nguồn đã kiểm duyệt trên server**; loại bỏ khung huy hiệu/vòng viền/nền medal, không cắt từ ảnh tổng. Giữ nguyên 49 file gốc tại `sea-v1` phục vụ đối chiếu/rollback, file dùng mới ở `action-icons/v2`. Giữ hình người dùng tự upload (không ghi đè ảnh custom).
5. Yêu Tinh sử dụng **🔄** thay cho hai mũi tên trên màn hình trận, vẫn thao tác chọn trái/phải theo Core hiện có.
6. Hình hành động không có nền hộp, viền nút hoặc nhãn chữ; nền PNG RGBA trong suốt và 49 SVG riêng.
 
## Tính năng cần giữ nguyên
- Tìm icon theo actionId và phân quyền GM, nút `ICON: BẬT/TẮT`.
- Khi kéo gần Character hợp lệ, icon hít vào tâm Character, viền sáng nhấp nháy. Bỏ vào Character thực hiện theo `battlePickTargetWithAudio` / `battleConfirm` Core như trước. Không cho thao tác vào mục tiêu không hợp lệ.
- Nút **Khôi phục** sau xác nhận vẫn dùng `/battle-undo` có token Core, đồng thời khôi phục vị trí icon ban đầu.
- Hành động nhiều mục tiêu, không mục tiêu, Artifact, Sát Thủ, thao tác chuyển hướng giữ luồng hiện có.
- Không sửa các quy tắc, role/action schema, khả năng của Player Web, dữ liệu phòng, hay IPA native.

## Kiểm thử bắt buộc (chỉ trong phạm vi Icon Action V2)
- `node --test tests/gmww-action-icons-in-battle.test.mjs tests/gmww-action-icon-stacking.test.mjs tests/action-icon-library.test.mjs tests/action-icon-card-clean.test.mjs`.
- `node .github/scripts/assemble-gm-app.mjs --verify` và `node .github/scripts/verify-gmww-versions.mjs`.
- Đối chiếu **49 ảnh gốc với 49 SVG/49 PNG mới**, kiểm tra SHA-256 theo manifest V2, không cắt cạnh/không nền.
- `node .github/scripts/prepare-update-channel.mjs runtime`, `verify-prepared-runtime.mjs 3.227`, đối chiếu SHA-256 OTA khi server đã cập nhật.
- Không kiểm thử Chrome Player Card, Seat, DEMO, 3D hoặc Native IPA ngoài phạm vi.

## Rollback
Nếu nghiệm thu iPhone chưa đạt, phục hồi Runtime V3.226/manifest OTA đã xác minh, không xoá dữ liệu Durable Objects hoặc chỉnh sửa icon cá nhân, không phát hành IPA mới.
