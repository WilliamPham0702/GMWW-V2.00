# GMWW Runtime V3.237 — Menu GM & thanh icon gọn (26/10/2026)

- Nút ẨN MENU giữ chữ trắng, in đậm và đổi nền/viền theo aria-pressed ON/OFF đúng thiết kế Vai Trò và Người Chơi. Không dùng ký hiệu tròn gây hiểu nhầm.
- Tất cả đống lửa Setup và Trong Trận mở cùng **Menu GM**; chạm vùng ngoài đóng menu, phím Escape cũng đóng, không ảnh hưởng các hộp khác.
- Bỏ hoàn toàn khung kính/nền/viền/đổ bóng bao ngoài thanh công cụ dưới khi vào trận. Chỉ giữ các box riêng.
- Các nút đã có icon Báo, Lên Giàn, Khôi phục chỉ còn icon không có chữ. Đồng hồ vẫn hiện **số đếm ngược** để GM vận hành; ô Hành động giữ nội dung lượt.
- Chỉ GM Runtime HTML/CSS/JS. Không đổi logic Lên Giàn, Player Web, quyền bình chọn, DO, gameplay Core, IPA và dữ liệu phòng.
- Phát hành: CI kiểm tra đúng menu & footer, bundle 6 module, JS syntax, manifest SHA-256, notes tiếng Việt.
- **Rollback**: GMWW Runtime **V3.236**; giữ nguyên IPA, phòng, dữ liệu và phiên bản Worker trước phát hành.
