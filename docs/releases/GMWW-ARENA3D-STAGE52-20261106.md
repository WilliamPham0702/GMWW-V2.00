# Arena 3D GĐ52 — Màn vận hành 2D của GM, cảnh làng thành 3D (STAGING)

- GM dùng ĐÚNG màn 2D hiện có (ghế, kéo hành động, Lên Giàn, đồng hồ, menu). Core vẫn là nguồn duy nhất.
- Chỉ nền làng được thay bằng cảnh 3D thật (`backdrop.html`, camera trực giao nghiêng nên % ghế 2D khớp sàn 3D).
- Nút nhỏ "3D/2D" trong sân chơi: GM chọn chế độ; lựa chọn được gửi lên STAGING (cần token GM) để Player đi theo.
- Chỉ có trong Runtime STAGING (`.github/runtime-staging/gmww-play3d.js`, gắn bởi build-arena3d-staging-runtime). Production Runtime không đổi.
- Chưa làm: xoay 360° (ghế 2D cần theo phép chiếu), nhân vật GLB 3D (chờ file ChatGPT), đo iPhone thật.

## GĐ52b — Nền tranh 2.5D (giống làng 2D nhất)
- Nền mặc định = chính tranh làng GMWW (ngày/đêm) phủ kín khung như 2D → ghế 2D khớp 100%.
- Thêm chiều sâu: camera phối cảnh lắc nhẹ, ánh lửa nhấp nháy, cánh hoa bay, chuyển Ngày/Đêm mượt.
- `?style=village` vẫn là làng dựng bằng code/GLB (xoay trực giao). Xoay 360° thật chưa có ở chế độ tranh.
- Giới hạn: dùng tranh mặc định v260; tranh GM tự đăng tải riêng chưa nạp vào nền 3D.

## GĐ53 — Kiểu tranh cho trang "VÀO LÀNG" (KHÔNG đụng Runtime/2D)
- Trang Arena 3D (STAGING) khi chạy trong app: tranh làng thật làm nền, nhân vật 3D đứng trên sàn tranh (camera trực giao, không méo).
- Không còn cần Runtime STAGING; app giữ nguyên V3.309. Trang CI/QA đứng riêng giữ cảnh cũ.
