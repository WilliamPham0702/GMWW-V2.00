# Runtime V3.248 — Setup nhẹ hơn, UI hành động chuẩn

- Sáu mức kích thước iCon cùng một hàng: 25–50–75–100–125–150%. Thay mức trước đây; giữ lựa chọn đã lưu và quy đổi mức cũ gần nhất.
- Khắc phục dòng “Đã tạm dừng” bị ép dọc trên hàng Menu GM: trạng thái DEMO chỉ xuất hiện trong box Hành động, khi DEMO thực sự được bật; mặc định ẩn.
- “Làng ơi dậy đi” là bước chuyển Đêm → Ngày tự động, không render thành nút/box có thể bấm trong timeline. Giữ cue/audio chuyển ngày khi Server xác nhận.
- Tối ưu 6 bước setup: giảm room-state polling fallback từ 750ms xuống 2500ms, reconnect backoff có giới hạn; không POST trùng stage đã xác nhận; không render lại toàn bộ setup nếu fingerprint hiển thị không đổi, vẫn luôn render khi force / Server trạng thái đổi. Không thay đổi giao thức Core, Player Web hay dữ liệu Durable Objects.
- Kiểm thử đúng phạm vi iCon/DEMO/UI/lobby/setup plus build, Worker CI, OTA SHA-256; rollback V3.247. Giữ nguyên IPA.
