# GMWW — RULE Dân Làng không thức ban đêm (28/10/2026)

## Thay đổi
- Không đưa `role_villager` (Dân Làng thường) vào danh sách lượt thức ban đêm của Server, bất kể thứ tự Vai Trò trong ván mẫu.
- Không còn Audio gọi Dân Làng, đồng hồ chờ hay ô hành động riêng cho Dân Làng trong GM, DEMO và Player Web.
- Dân Làng có Artifact sử dụng ban đêm tiếp tục có lượt Artifact độc lập và thực thi đúng giới hạn; không mất Artifact.
- Các Vai Trò có năng lực ban đêm giữ nguyên; `Làng ơi dậy đi` chỉ phát trong chuyển pha Ban Ngày.
- Không thay đổi cấu trúc dữ liệu Durable Objects, tài khoản, phòng chơi, lịch sử ván và IPA Native V3.264.

## Triển khai Production và chứng cứ
- PR #592 đã merge thành công: https://github.com/WilliamPham0702/GMWW-V2.00/pull/592 (commit `1c81cb5ff948b46e51641ec738fd5078eb4ecec5`).
- Đã kế thừa vào Runtime V3.270 / Server + Player Web tại commit `3847d744f859a8aa3d868a0f14f36684f2e7455a` (PR #593 đồng thời bổ sung các sửa chữa Audio/DEMO).
- CI đúng phạm vi Dân Làng: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40696584499 — **SUCCESS**.
- CI Worker V3.270: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40700395866 — **SUCCESS**.
- CI Browser V3.270: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40700395877 — **SUCCESS**.
- Phát hành và xác minh Production: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40700772803 — **SUCCESS**; triển khai Worker Cloudflare version `e08994f5-159a-447c-b047-c53b7283a527` phục vụ 100%.
- Gói cập nhật Runtime OTA thủ công: https://github.com/WilliamPham0702/GMWW-V2.00/releases/tag/gmww-v3.270 — `GMWW-Runtime-V3.270.gmwwupdate`.
- SHA-256 của gói thủ công: `f13ee9d8d1cc025107dc1dfd185d97abbe7d746bc3fec5cebfa1047d67851d9c` (xác nhận theo GitHub Release asset digest).

## Rollback an toàn
- Bản Worker Production trước phát hành: `aa0464b1-029b-4453-80eb-35aabfa0b4fb` (Cloudflare deployment `b5378215-59b4-4a7f-b1b1-f2d06e6398f9`).
- Nếu có sự cố, khôi phục deployment Worker trước qua cơ chế rollback của Cloudflare và dùng Runtime đã xác minh, hoặc phát hành phiên bản OTA tiến lên chứa bản revert an toàn; không tự hạ phiên bản OTA qua chốt chống downgrade.
- Giữ nguyên namespace/DO storage, room, thông tin người chơi, lịch sử và kênh IPA; không chạy thao tác xóa dữ liệu.
