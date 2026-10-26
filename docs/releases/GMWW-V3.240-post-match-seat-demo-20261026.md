# GMWW Runtime V3.240 — Sửa Seat và DEMO sau kết thúc ván

Ngày: 26/10/2026. Phát hành Runtime OTA Production, **không cập nhật IPA**.

## Những thay đổi
- Sau khi kết thúc ván có công bố thắng/thua, thao tác **Phòng/Thoát** yêu cầu Server xác nhận giải phóng toàn bộ người chơi, Seat và phân vai trước khi GM thoát.
- Không còn giữ người chơi ảo ở Seat do bộ lọc đã chọn cục bộ trên iPhone.
- Khi một phòng đã kết thúc ván nhưng vẫn giữ trạng thái DEMO, hệ thống tự dọn Seat/assignments còn sót rồi cho phép nhấn lần lượt Offline / Online / DEMO. **Không reset phòng đang chơi**.
- RESET phòng xóa bộ hẹn giờ, kế hoạch và quyền sở hữu chạy DEMO (lease/clock/plan) của trận trước.
- Danh sách phòng được đồng bộ chế độ thực tế từ Server, không giữ nhãn DEMO từ bộ nhớ cũ.

## Bảo toàn
- Giữ nguyên lịch sử trận và phiếu kết quả `matchCompletion`, tài khoản, xếp hạng, Ván Mẫu và Core luật WOLF-01 đã có ở V3.239.
- Khi chọn **Chơi lại / Chọn ván mới**, người chơi vẫn được giữ lại chủ động. Chỉ đường dẫn **Phòng / Thoát** hoặc chuyển chế độ sau khi ván đã hoàn tất mới giải phóng Seat.
- Không cập nhật build IPA, Native shell hiện tại **V3.110**; phát hành theo cơ chế Runtime OTA đã tích hợp trên iPhone.

## Chốt phát hành
- CI Worker, cú pháp và hợp đồng phiên bản; kiểm thử `post-match-room-cleanup.test.mjs`, `forced-end-game.test.mjs`, `match-completion-server.test.mjs` và `v3175-post-create-room-mode.test.mjs`.
- So khớp app đã gộp với sáu module nguồn; không chạy Chrome Card hoặc test IPA ngoài phạm vi.
- Manifest Runtime `V3.240` phải chứa URL và SHA-256 hợp lệ, từng tệp phải được xác minh trùng hash của Server; health và update manifest Production phải xác nhận V3.240.
- Không công bố thành công khi CI, triển khai Production hoặc SHA-256 chưa được xác minh.

## Rollback
- Nếu phát hành có lỗi, khôi phục mã Worker/Runtime từ commit đã kiểm chứng **V3.239** trước PR #532, phát hành qua phiên bản OTA **cao hơn** theo quy tắc tăng phiên bản (không ép iPhone hạ version hoặc xóa DO).
- Giữ nguyên Durable Objects, dữ liệu thành viên, lịch sử và IPA. Đối chiếu manifest và SHA-256 sau rollback.
