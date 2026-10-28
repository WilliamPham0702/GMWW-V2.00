# GMWW Arena 3D — GĐ40: tiết kiệm GPU trên Player iPhone (28/10/2026)

## Cập nhật nội dung
- Khi Player 3D mở **Lá Vai / Hành động** (Player Web cùng nguồn Core trong iframe toàn màn hình), dừng hoàn toàn việc dựng WebGL ở phía sau. Đóng Lá Vai thì vẽ lại theo nhịp FPS thích ứng, không thực hiện "vẽ bù" nhiều khung hình.
- Khi ứng dụng bị ẩn hoặc WebGL mất context cũng tạm dừng vẽ; sau khi trở lại, tự thiết lập lại lịch vẽ.
- Đồng bộ HTTP/WebSocket tới Core, vai trò, phiếu bầu và dữ liệu người chơi **không dừng**; không lưu token, không thêm API GM, không thay luật game, không sửa Server hoặc 2D.
- Bổ sung chẩn đoán công khai `renderPaused`/`paintFrames` cho kiểm thử, không chứa dữ liệu bí mật.

## Xác minh đúng phạm vi
- `tests/arena3d-stage40-player-pause.test.mjs`: unit bảo đảm pause/resume của lịch vẽ, đồng bộ Core không dừng, không lộ quyền GM.
- `tests/arena3d-player-browser.mjs`: Chrome và WebKit iPhone giả lập phải xác nhận số lần render **không tăng** khi Lá Vai mở, và **tăng trở lại** khi đóng.
- CI chuyên biệt Arena + STAGING, kiểm chứng trên GitHub Actions; số liệu tiêu thụ pin/nhiệt độ vật lý **chưa đo**, không khẳng định giảm bao nhiêu độ hoặc bao nhiêu % pin.

## Triển khai và hoàn nguyên
- Chỉ nhánh [PR #581](https://github.com/WilliamPham0702/GMWW-V2.00/pull/581) và Worker STAGING độc lập; không thay Production/IPA/Runtime OTA.
- Rollback: hoàn nguyên commit GĐ40; nếu đã lên STAGING có thể quay về Cloudflare Worker version trước GĐ40. Không đụng dữ liệu Core Production.

## Chốt kiểm thử STAGING
- Trigger phát hành thử bằng GitHub Actions của PR #581 sau CI unit thành công; điều kiện đánh giá là Chrome/WebKit và Core 30 người thực sự SUCCESS, không tính commit này là đã phát hành Production.

## Kết quả STAGING đã xác minh
- **CI và E2E: SUCCESS** — [Actions run #40661777067](https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40661777067), commit `1d11167b4a7c165ffbb99b8de0acd0ee5533b46b`.
- Cloudflare Worker độc lập: `gmww-arena3d-stage14-staging`, version mới **`3aab6685-6c0a-4248-b476-a2ad7a8a0f4d`**. Version trước để rollback: `4a9f6467-1d71-458b-ac72-5a75452c83d8`.
- Chrome và WebKit: Player 3D mở/đóng Lá Vai, xác thực GM, 6/12/20/30 Character PASS. Core hai client, Vai Trò/Artifact tùy chỉnh, trọn ván 30 người PASS, anonymous GM-only bị từ chối 401.
- FPS WebKit giả lập trong CI khoảng **1 FPS**; không xem đây là số đo iPhone vật lý. Phải tối ưu và đo trực tiếp trên thiết bị trước khi Production.
- Không merge PR #581, không cập nhật IPA, Runtime OTA, Player Web 2D hay dữ liệu Production.
