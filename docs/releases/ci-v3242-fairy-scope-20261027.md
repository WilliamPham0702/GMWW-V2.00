# CI-only: V3.242 icon audio + Yêu Tinh

Tách PR sửa chính sách CI khỏi mã gameplay PR #542. Nhận diện **đúng 11 blob Git** (SHA-1 của Git blob) đã kiểm toán, mọi thay đổi bổ sung đều quay lại `full`. Phân loại riêng commit CI-only để không deploy Production trùng V3.241.

- Worker CI chạy đúng `tests/gmww-v3242-icon-audio-fairy.test.mjs`, `tests/gmww-action-icons-in-battle.test.mjs`, kiểm tra ghép 6 module, Worker syntax và phiên bản.
- Workflow Lên Giàn, shortcut #501, menu candidate V3.238 và Native IPA bỏ test không liên quan, không hạ chuẩn cho code khác.
- Production V3.242 yêu cầu Worker CI SUCCESS cùng SHA và kiểm tra thật 50 ảnh + OTA SHA-256; bản CI-only không deploy.
- Không thay gameplay, GM/Player Web/IPA, dữ liệu. Mọi path hoặc bytes ngoài whitelist fail-closed.

## Bổ sung sửa harness
Test VM icon #501 thiếu mock chế độ âm thanh, không liên quan hành vi thực. Tinh gọn lời gọi audio để player đã có tự xử lý mute, cập nhật đúng SHA Git của ba file GM/test V3.242 đã sửa. Policy repair chỉ 3 file CI, không đổi gameplay; thiếu hoặc thêm file bất kỳ sẽ chạy full.
