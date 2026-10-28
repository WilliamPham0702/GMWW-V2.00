# GMWW — RULE Dân Làng không thức ban đêm (28/10/2026)

## Thay đổi
- Loại `role_villager` (Dân Làng thường) khỏi lịch thức đêm tại Server, bất kể thứ tự vai trò trong mẫu ván.
- Không tạo lượt, timer hoặc audio gọi vai Dân Làng thường trong lịch đêm GM/DEMO/Player Web.
- Dân Làng sở hữu Artifact hành động đêm vẫn giữ lượt Artifact độc lập, không bị mất chức năng.
- Vai trò đặc biệt và luật đêm khác không thay đổi.
- `village-wakeup` là bước chuyển tiếp cuối đêm nội bộ; lời gọi “Làng ơi dậy đi” chỉ phát khi chuyển sang ban ngày.

## Kiểm thử đúng phạm vi
`node --test tests/villager-night-wakeup-20261028.test.mjs`
`node --check src/index.js`

## Phát hành
Thay đổi đang nằm trong nhánh PR riêng; **chưa merge và chưa phát hành Production/Runtime OTA/IPA**.
Chỉ triển khai sau khi CI đúng phạm vi SUCCESS và được duyệt phát hành.

## Rollback
Revert commit sửa lịch đêm trên nhánh main (nếu sau này đã phát hành), sau đó build/deploy lại Worker và Runtime OTA bằng quy trình an toàn hiện hành. Không thay đổi bảng dữ liệu, phòng, tài khoản hoặc lịch sử ván.
