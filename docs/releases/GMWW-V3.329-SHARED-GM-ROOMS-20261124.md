# GMWW Runtime V3.329 — Một bản chung cho iPhone + PC (Offline/Online)

Ngày: 24/11/2026. Thiết kế đã chốt với chủ dự án:

- Phạm vi: ván đang chơi (ghế, người chơi, vai đã phát, Đêm/Ngày, timeline, trạng thái). Ván Offline đã nằm trên Durable Object của phòng (roomMode offline), nên "bản chung" = hai máy mở cùng một phòng; không tạo kho dữ liệu mới, không DO migration.
- Đồng bộ: tự động mỗi thao tác (mỗi lệnh ghi thẳng lên server; máy kia nhận qua realtime).
- Chống ghi đè: khóa thiết bị V3.328 (máy đang điều khiển mới ghi; máy kia thấy 🔒 + Giành quyền).
- Mới: danh sách phòng của GM (Quản lý phòng) lấy thêm phòng GM từ server (tối đa 15 giây/lần), nên PC thấy phòng tạo trên iPhone và ngược lại. Phòng người chơi vẫn ở mục riêng.
- Thư viện (Vai/Artifact/Ván mẫu), ảnh, audio vẫn lưu riêng từng máy.
- Timer phòng online: đã chạy trên server (alarm Durable Object, Auto GM) từ trước; máy GM chỉ hiển thị theo hạn server, khóa màn hình không làm lệch lượt.
- Rollback: cài lại Runtime V3.328.
