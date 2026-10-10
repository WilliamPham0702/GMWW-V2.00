# GMWW Character V5.20 — Bảng kiểm thử trước khi bật trong game chính

Ngày 10/10/2026. Chủ dự án chỉ đạo: **“Làm bảng test trước okey rồi đưa vào game”**.

## Nguyên tắc nghiệm thu

- Tạo **bảng test có thể mở trực tiếp trên iPhone**, link `/characters/v5/test-board-v520.html`.
- Bảng test hoạt động riêng, dựng `/characters/v5/` trong iframe cùng origin và đo ngay trên thiết bị người dùng; không tạo phòng, không đăng nhập, không gọi API thay đổi dữ liệu.
- **Không tự động bật** renderer V5.10 trong `assets/village/village.mjs`, `src/gmww-members-live.js`, Server GM, IPA hoặc Player Web room. Chỉ triển khai sau khi đủ bài tự động, kiểm tra trực quan và chủ dự án xác nhận **“OK bảng test V5.20”**.
- Nếu một bài không đạt thì giữ nhân vật cũ, sửa và chạy lại kiểm thử. GitHub CI/Chromium PASS **không thay thế FPS iPhone**.

## 10 bài tự động

| Test ID | Nội dung | Tiêu chí |
| --- | --- | --- |
| engine | Render WebGL, SkinnedMesh/16 xương | 1 nhân vật, đã render, Skeleton có 16 bone |
| actions | 9 Action | 9/9 chuyển trạng thái và bone nhận giá trị hữu hạn, chân bước và tay giơ |
| directions | 8 hướng | Xoay tới 8 yaw đúng (sai số tối đa khoảng 0.16 rad) |
| travel | Chạm/ra lệnh đi | Tới cách 1 đơn vị, dừng chính xác |
| sit | Đứng→ngồi→đứng→đi | Chuyển tư thế và hoàn thành điểm đích |
| fallback | WebP cũ | HTTP 200, dữ liệu RIFF/WEBP hợp lệ |
| perf1 | 1 người | FPS trung vị ≥45, P95 frame time ≤40ms |
| perf10 | 10 người | FPS trung vị ≥35, P95 frame time ≤48ms |
| perf20 | 20 người | FPS trung vị ≥30, P95 frame time ≤55ms |
| perf30 | 30 người | FPS trung vị ≥30, P95 frame time ≤55ms |

Các ngưỡng là tiêu chí thử nghiệm ban đầu, không phải cam kết thiết bị nào cũng đạt. Test report lưu tốc độ thật trên iPhone và hệ điều hành của thiết bị.

## 5 xác nhận trực quan do người dùng đánh giá

1. Ngoại hình đẹp, không lỗi khớp.
2. Bước chân/tay và di chuyển tự nhiên, không bước kiểu cua, chân không trượt.
3. Ngồi/đứng đẹp, không bị cắt khi trên iPhone.
4. Cảm ứng, giao diện và xoay máy ổn định trên Safari.
5. Không thay đổi luồng phòng, vai trò, Artifact và Làng hiện có.

## Quy tắc chuyển qua game thật sau khi nhận OK

1. Tạo PR **riêng** để gắn Character 01 vào scene Làng 2D bằng WebGL overlay, ảnh WebP còn fallback cho máy yếu và không hỗ trợ WebGL.
2. Cấu hình feature flag off-by-default, bật theo phiên/nhân vật chọn lọc, có đường rollback ngay.
3. Xử lý `seatId`, `positionX/Y`, `movementStatus`, `moveFromX/Y`, `moveToX/Y`, `moveStartedAt` trên client dựa vào state máy chủ hiện tại. **Không viết lại luật phòng, phân vai, Artifact**.
4. Kiểm thử đủ: Player Web Safari/Chrome/Edge, GM runtime, 1/10/20/30 nhân vật, vào/rời phòng, xếp vị trí, vào trận, reset, mạng chập chờn, fallback.
5. Chỉ thông báo hoàn thành khi CI, Worker Production và kiểm tra thực tế đạt; chưa tự động build IPA.

## Cần bàn giao

- Production `/characters/v5/test-board-v520.html`.
- Màn test tự động có trạng thái Đạt/Chưa đạt/Chưa test và xuất JSON.
- Biên bản kết quả + ý kiến user trước khi bật game thật.
