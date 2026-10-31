# GMWW Arena 3D — GĐ39: tích hợp main-first an toàn (28/10/2026)

## Nội dung cập nhật
- Tạo nhánh tích hợp 3D độc lập từ `main` mới nhất, chỉ mang theo module trong `assets/village/arena-3d/**`, Worker nghiên cứu STAGING, bài kiểm thử `tests/arena3d-*` và ghi chú Arena.
- Không thay mã Core/runtime 2D, Server Game, Player Web gốc, dữ liệu Durable Objects Production, OTA hay IPA.
- Kế thừa các cải tiến GĐ37 (giảm yêu cầu GM-private chồng lặp) và GĐ38 (Lên Giàn 3D công khai trên GM/Player).
- CI chuyên biệt Arena: Node 22, kiểm tra module và Core, Chrome/WebKit mô phỏng iPhone, ván 30 người, phân quyền GM, reconnect, Vai Trò và Artifact tùy chỉnh.
- STAGING riêng: `https://gmww-arena3d-stage14-staging.williampham0702.workers.dev`. Không deploy Runtime OTA Production bằng workflow này.

## Điều kiện phát hành Production còn thiếu
- Chứng minh tương thích với `main` hiện hành qua CI/E2E toàn bộ nhánh mới; xử lý mọi regression mới.
- Hoàn thiện Player 3D thao tác Vai Trò/Artifact trực tiếp (hiện giữ Player Web/iframe cùng Core), đối chiếu luật của tất cả lá tham gia và phân quyền.
- Nghiệm thu hiệu suất/nhiệt iPhone thật; phát hành OTA SHA-256, release notes đầy đủ và rollback khi hoàn tất.

## Rollback
- Nhánh GĐ39 là riêng biệt, không thay main/Production. Quay về bản STAGING trước thông qua Worker deployment; không đụng dữ liệu Production.
