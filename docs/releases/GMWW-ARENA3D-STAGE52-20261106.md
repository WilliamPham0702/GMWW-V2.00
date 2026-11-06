# Arena 3D GĐ52 — Màn vận hành 2D của GM, cảnh làng thành 3D (STAGING)

- GM dùng ĐÚNG màn 2D hiện có (ghế, kéo hành động, Lên Giàn, đồng hồ, menu). Core vẫn là nguồn duy nhất.
- Chỉ nền làng được thay bằng cảnh 3D thật (`backdrop.html`, camera trực giao nghiêng nên % ghế 2D khớp sàn 3D).
- Nút nhỏ "3D/2D" trong sân chơi: GM chọn chế độ; lựa chọn được gửi lên STAGING (cần token GM) để Player đi theo.
- Chỉ có trong Runtime STAGING (`.github/runtime-staging/gmww-play3d.js`, gắn bởi build-arena3d-staging-runtime). Production Runtime không đổi.
- Chưa làm: xoay 360° (ghế 2D cần theo phép chiếu), nhân vật GLB 3D (chờ file ChatGPT), đo iPhone thật.
