# GMWW Player Web — hotfix Receipt/Đăng nhập ngày 27/10/2026

- **Sự cố Production:** `/gmww-members-live.js` phát sinh lỗi do `patchPrivatePlayerCards` tìm chuỗi `refreshPrivateRole` cũ. Bản Player mới có kiểm tra `wolfWakeEpoch` ở giữa API `/me` và `handleSeatSwapRequests`.
- **Sửa:** chỉ thay đúng câu lệnh gọi `/me` duy nhất bằng private receipt reader, giữ nguyên xử lý quyền Sói, Role/Artifact và các API còn lại. Không thay dữ liệu tài khoản, Room/DO, lịch sử, gameplay hoặc IPA.
- **Test bắt buộc:** JavaScript Player ghép được, biên dịch hợp lệ; đăng nhập, vào phòng, lấy receipt và reconnect qua Worker local. Worker CI cùng SHA SUCCESS mới được phát hành.
- **Phát hành:** hotfix Worker-only trên nền V3.243, không phát hành Runtime OTA hay IPA.
- **Xác minh Production:** `/api/health` hoạt động, `/gmww-members-live.js` trả HTTP 200 và JavaScript hợp lệ. Không tạo tài khoản Production thật khi smoke-test.
- **Rollback:** lưu mã Worker deployment/version đang chạy trước hotfix; nếu xác minh thất bại, phục hồi deployment/version cũ trong Cloudflare Workers Versions & Deployments. Không reset hoặc xóa Durable Objects.
