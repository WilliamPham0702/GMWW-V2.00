# GMWW Arena 3D — Giai đoạn 14: Vai trò và Artifact tùy chỉnh
Ngày 25/10/2026. PR Draft #490, kế thừa PR #485. Không merge/deploy Production, không thay đổi gameplay 2D/IPA/phòng và dữ liệu Production.

## Thay đổi
- Core xác nhận thành công mới được thi triển hiệu ứng. Action tùy chỉnh phải thuộc lá vai trò riêng hoặc Artifact đúng chủ sở hữu trong cùng ván; không đoán danh tính qua public Player Web.
- Ánh xạ các effect ID hợp lệ thành 9 nhóm phép: đầu sói bay, soi xét/đũa phép, khiên, hồi sinh, tấn công, nguyền, trinh sát, vote. Mã lạ dùng hiệu ứng trung tính, không ngụy tạo chức năng.
- Bổ sung vai trò tùy chỉnh và Artifact cho GM-only cast; đồng bộ âm thanh WebAudio tắt mặc định. Không giả mạo file ghi âm tên vai trò.
- Khi GM hoàn tác hành động, xóa cue phép gần nhất chỉ khi token undo khớp và Core xác nhận. Không sửa quy tắc hoặc kết quả game.
- Thêm ba mẫu Artifact: đầu sói, khiên ngọc, hồi phục. Chỉ chạy ở preview giả lập, không kích hoạt trong phòng thật.

## Bằng chứng và giới hạn
- CI unit: kiểm tra chủ sở hữu, đúng ván, action, pha, hiệu ứng; bảo mật GM-only, ưu tiên action Core chuẩn. Smoke Chrome/WebKit và E2E Core undo thực chạy trên STAGING riêng.
- Không kết luận mọi Artifact tùy chỉnh đã được kiểm thử thực tế từ các nút preview. Không đo pin/FPS/nhiệt trên iPhone vật lý.
- Giọng đọc tên vai trò và kết quả soi cần file âm thanh thực được nạp vào Thư viện Audio.

## Isolation và rollback
- Worker riêng gmww-arena3d-stage14-staging, SQLite Durable Objects riêng. Preview: https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html
- Nếu phát sinh sự cố: khôi phục phiên bản Worker STAGING trước đó hoặc tắt STAGING. Giữ PR Draft #490; không tác động Production và game 2D.
- Chỉ kiểm thử action/VFX/undo/GM-private trực tiếp và phụ thuộc thiết yếu, không kiểm tra lan man các tính năng khác.