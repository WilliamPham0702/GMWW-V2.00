# GMWW Runtime V3.216 — Bổ sung 10 icon và hoàn thiện ánh xạ hành động

Ngày: 25/10/2026

## Nội dung thay đổi
- Bổ sung 10 PNG 1024×1024 nền trong suốt và 10 SVG độc lập, thiết kế từng ảnh riêng, không cắt từ ảnh tổng: Phiếu Con Quạ, Cắn Chuyển Hóa, Chọn Hình Tượng, Xem Artifact, Đổi Artifact, Công Khai Vai Trò, Sao Chép Chức Năng, Hủy Artifact, Buộc Quay Mặt, Sáng Tạo Artifact.
- Tổng số icon của Thư viện tăng từ 39 lên **49**; giữ nguyên toàn bộ 39 icon cũ.
- Đối chiếu danh mục GM do người dùng gửi: **36 dòng chưa gán = 34 actionId duy nhất**, trong đó `action-maid-inherit` và `action-black-woman-leave` xuất hiện ở cả Vai Trò/Artifact.
- Bản hiện hành V3.215 đã có ánh xạ 33/34 ID nhưng nhiều hành động dùng biểu tượng chung. V3.216 bổ sung ID `artifact_action_custom` và chuyển 10 ID sang icon chuyên biệt; các ID còn lại tái sử dụng icon phù hợp. Kỵ Sỹ dùng biểu tượng Hiệp Sĩ; Soi phe ba dùng Soi xét.
- Bảo toàn dữ liệu icon cá nhân qua chuyển đổi `GMWW_ACTION_ICON_LIBRARY_V4` → `V5`; chỉ thay ánh xạ cho các actionId xác minh, không tự tạo actionId.
- Manifest bao gồm checksum SHA-256 từng PNG/SVG; 19/29/39 icon cũ không bị thay hình. Runtime OTA V3.216, IPA native shell V3.110 không thay đổi.

## Giới hạn
- Chỉ thay thư viện icon, hình PNG/SVG, liên kết actionId và OTA. Không sửa Core, quy tắc hành động, cơ chế xác nhận, quyền người chơi, Player Web hay dữ liệu phòng Durable Objects.
- Hai icon cùng action `action_transfer_bite` trái/phải được giữ nguyên vì đây là lựa chọn hướng có chủ đích.
- Phân loại đích `none` đối với `artifact_action_custom`, `artifact_action_reveal_role` vì dữ liệu thiết bị khai báo `targetCount=0, noTarget=true`; không ép kéo vào Character.

## Kiểm thử đúng phạm vi
1. `node --test tests/action-icon-library.test.mjs` — toàn bộ ảnh, manifest, SHA và 34 ID thực tế.
2. `node .github/scripts/assemble-gm-app.mjs --verify`, `node .github/scripts/verify-gmww-versions.mjs`.
3. OTA candidate/manifest SHA-256; đồng bộ Runtime Worker/GM iPhone.
4. Không chạy lại Chrome Player Card, Seat 30, DEMO, IPA ngoài phạm vi thay đổi.

## Phương án rollback
Khôi phục Runtime OTA V3.215 (giữ SHA/manifest đối chiếu), không xoá phòng chơi, người chơi hay chỉnh sửa dữ liệu. Bản V3.216 chỉ tăng Runtime, không phát hành IPA.
