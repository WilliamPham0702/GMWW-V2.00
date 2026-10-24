# GMWW · Bổ sung hiệu chỉnh vị trí treo Lên Giàn — 24/10/2026

## Phạm vi thay đổi
- Thêm **⚖️ Đặt vị trí treo** trong menu GM. Chạm vị trí muốn treo trực tiếp trên bản đồ ban ngày; xác nhận và lưu tọa độ độc lập với 🔥 Đặt vị trí đống lửa.
- Tọa độ treo nằm trong cấu hình bối cảnh Làng do GM được quyền chỉnh, được Durable Object lưu dưới `gallowsAnchors.day`, công bố read-only cho Player Web qua `/api/village-scene`. Người chơi đang trong trận nhận thay đổi qua đồng bộ bối cảnh và khôi phục cache khi tải lại.
- Xóa hoàn toàn đường dây/cây/thanh trang trí và nhãn nổi **trên đầu** Character bị treo; chỉ còn nhân vật nổi và bóng đổ.
- Thay chuyển động CSS lắc/đảo góc bằng **Walk có sẵn** của Character40 trên GM iPhone và Player Web. Trong lúc treo, chính Character được chọn đi bộ tại chỗ; các Character còn lại giữ chế độ tĩnh của trận.
- Khi GM cứu/giết, hủy đề cử, đổi chế độ, sang đêm hoặc phục hồi, Character dừng Walk và trở về đúng Seat cũ theo snapshot.
- Nếu chưa hiệu chỉnh vị trí treo, tiếp tục hiển thị theo điểm treo trước đây phía trên lửa. Khi thay ảnh nền, điểm treo của ảnh được thay phải được đặt lại.

## An toàn và kiểm thử
- Không đổi luật Lên Giàn, cấm chọn/cấm vote, kết quả 👍/👎, vai trò/Artifact hoặc dữ liệu phòng.
- Không thay đổi vị trí Seat, nhóm Seat 6–30, menu GM hay nền đã lưu.
- Bổ sung kiểm tra riêng: lưu tọa độ/validate, hiển thị Player Web, sử dụng Walk, dọn CSS trang trí và so khớp bundle GM.

## Phát hành
- Đã chuẩn bị **ứng viên Runtime OTA V3.202**, đang chờ CI/duyệt PR #462. Chưa merge hoặc triển khai Production; không nâng cấp IPA.
- Phát hành sau khi CI/guard OTA xác nhận V3.202 lớn hơn Production, tạo SHA-256 và ghi chú bản phát hành. Rollback: khôi phục Runtime trước; metadata `gallowsAnchors` là tùy chọn và tương thích ngược.
