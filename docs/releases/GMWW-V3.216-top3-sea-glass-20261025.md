# GMWW Runtime V3.216 — Vinh danh Top 3 theo phong cách biển (ngày 25/10/2026)

## Thay đổi giao diện
- Thiết kế lại bục vàng/bạc/đồng thành bệ vỏ sò/ngọc trai mỏng, bo cong 2.5D, điểm san hô và ánh biển nhẹ, thay hộp chữ nhật dày cũ.
- Bảng Hạng/Tên/Tỷ lệ thắng/Số trận đặt phía dưới bệ, **kính biển bán trong suốt** có blur nhẹ; giữ tỷ lệ và tên lấy trực tiếp từ hệ thống, không dùng dữ liệu minh họa.
- Căn ảnh nhân vật theo trục 50% của mỗi bục, căn chân nhân vật ở tâm mặt bệ; Character giữ nguyên **gameCharacterId** hiện tại của hồ sơ qua ảnh Idle atlas C40/Player Web, không thay bằng ảnh minh họa.
- Nhân vật nhún/đung đưa nhẹ, giữ Reduced Motion trên iPhone; co giãn dưới 390px.
- Chỉ thay đổi phần Top 3 Trang Chủ GM, tăng Runtime/manifest OTA V3.216, không phát hành IPA mới.

## Kiểm thử và phát hành
- `node --test tests/home-top3-podium-sea-v3216.test.mjs tests/home-top3-podium-identity-v3214.test.mjs tests/home-top3-podium-v3211.test.mjs`.
- `node .github/scripts/assemble-gm-app.mjs --verify`; `node .github/scripts/verify-gmww-versions.mjs`; kiểm tra cú pháp GM.
- Production chỉ khi Worker CI bắt buộc đạt SUCCESS, SHA-256 manifest/OTA và health thực tế PASS.
- Giữ dữ liệu thành viên/phòng/DO/lịch sử/gameplay/Player Web/IPA/Icons V3.215; rollback bằng Runtime trước V3.216 nếu cần.
