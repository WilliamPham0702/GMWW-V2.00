# GMWW Arena 3D — Giai đoạn 6: Chibi biển và nghi lễ phép (24/10/2026)

## Nội dung nâng cấp
- 40 thiết kế Character chibi 3D procedural, 5 kiểu dáng tóc/trang phục kết hợp 8 phối màu biển. Đầu, tóc, mắt, váy, vỏ sò, vương miện, dây thắt lưng có biến thể.
- 6–30 Character sử dụng InstancedMesh cố định; ngân sách render Character/VFX tối đa 37 draw calls, không nhân theo số người chơi.
- Nhân vật có chuyển động tóc, áo, bước chân, nhịp thở, giơ tay và thi triển; tiếp tục đứng lên → bước ra → làm phép → trở về ghế. Hỗ trợ Reduce Motion.
- 5 loại nghi lễ dễ phân biệt: Bảo vệ (vỏ sò/ngọc), Tiên Tri (ngôi sao), Phù Thủy cứu (sen biển), Tấn công (sóng trăng) và Bỏ phiếu (ấn vàng), tông xanh biển, trắng, vàng và màu pastel.
- Bộ sưu tập hai trang 01–30 và 11–40, nút thử riêng từng nghi lễ trên giao diện STAGING iPhone.

## Phân quyền và an toàn
- Chỉ preview tổng hợp mới tự mô phỏng phép. Phòng thật chỉ hiển thị loại phép khi GM/Core xác thực; không lộ vai, phe, token hay mục tiêu riêng tư.
- Chỉ thay đổi tài nguyên Arena 3D và bài kiểm thử trực tiếp. Không chỉnh luật game, src/index.js, 2D Production, OTA, IPA, Runtime, Durable Objects hay CSDL Production.
- Nhánh nghiên cứu từ commit Giai đoạn 5 e06aba58f8ac82a6f344060f924d6bf3f38a634f, PR Draft chồng lớp lên PR #464.
- Dùng Worker riêng gmww-arena3d-core-staging, tuyệt đối không deploy Worker gmww-v2-00.
- Rollback STAGING bằng cách redeploy commit GĐ5; không xóa dữ liệu.
- 40 mẫu hiện là tạo hình procedural, chưa phải 40 file sculpt GLB độc lập.

## Kiểm thử đúng phạm vi
- Node: stage6-art, phase3 character, spell-vfx, casting và ritual-walk.
- STAGING browser 390px: 6/12/20/30 Character, 40 art profile, năm phép, ngồi lại đúng ghế, kiểm tra FPS tham khảo, không lỗi JS.
- iPhone Safari vật lý: mỹ thuật, chuyển động, pin/nhiệt/FPS sau 5 phút. FPS GPU giả lập không thay thế nghiệm thu iPhone.
- Không chạy Chrome Player Card, seat/gameplay, OTA hay IPA CI ngoài phạm vi tác động.

## Tiêu chí nghiệm thu
- [ ] Unit / bảo mật / dry-run PASS
- [ ] Worker STAGING và trình duyệt iPhone-size PASS
- [ ] Người dùng xác nhận mỹ thuật và animation trên Safari iPhone ĐẠT
- [ ] Tuyệt đối giữ PR Draft, không merge hoặc Production
