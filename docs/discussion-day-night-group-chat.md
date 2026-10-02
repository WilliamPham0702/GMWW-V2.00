# GMWW V2 — Thiết kế thảo luận ngày và chat nhóm ban đêm
Ngày: 2026-10-02
Trạng thái: nghiên cứu/thiết kế, CHƯA triển khai production.

## Yêu cầu
- Ban ngày: thảo luận theo lượt (cách phân lượt và thời lượng do bộ điều phối của trận quyết định); GM có quyền điều phối/can thiệp.
- Ban đêm: một số vai trò có quyền thức cùng nhau được phép thảo luận trong phòng chat riêng ngay trong Player Web. Ví dụ Bầy Sói cùng thức có thể thảo luận trước khi thống nhất Cắn.
- Không mặc định cho tất cả thành viên cùng phe chat. Quyền phải dựa trên nhóm **cùng thức** thực tế, giai đoạn, hiệu ứng và quy tắc của Lá Bài.
- Không tạo hộp thời gian riêng trên từng Lá Bài/Artifact. Thời gian quản lý tập trung trong cấu hình trận.
- Không can thiệp code gameplay hay data đang được thiết kế ở phiên khác.

## Khuyến nghị kiến trúc
Tận dụng **RoomDurableObject** (một Durable Object làm authority cho mỗi phòng), SQLite storage hiện hữu và WebSocket /ws/:code. Không dùng một phòng chat toàn cục hoặc dịch vụ chat bên ngoài khi chưa có nhu cầu. Có thể tách module thuần để kiểm thử độc lập khi tích hợp.

Mỗi phiên thảo luận có định danh ngẫu nhiên `discussionId` gắn `matchId`, `phaseRevision`, `kind=day_turn|night_group`, `wakeGroupId` (night), `opensAt`, `closesAt`, `status`, `eligibleParticipantIds`, `ruleVersion`. Server là nguồn chân lý. Dữ liệu `eligibleParticipantIds` chỉ lưu nội bộ, tuyệt đối không gửi trong public room state.

### Quyền truy cập
1. Server tính danh sách người được phép từ trạng thái thực tế tại thời điểm mở lượt (vai trò/đa vai trò, cùng thức, chết/đuổi/đóng băng/chặn chức năng, hiệu ứng ẩn danh, GM override nếu luật cho phép).
2. Server xác thực danh tính trên HTTP hoặc WebSocket bằng token phiên, **không** tin vào `participantId`, `wakeGroupId` hoặc `roleId` do trình duyệt gửi. Hiện WebSocket nhận participantId qua query và chỉ kiểm tra có trong phòng; phải gia cố xác thực trước khi cho phép tin nhắn riêng. Không dùng GM_SYNC_TOKEN cho người chơi.
3. Khi mỗi tin nhắn đến, server kiểm tra lại: đúng phòng, đúng match/revision, đúng discussion đang mở, đúng thành viên, còn quyền gửi, chưa hết giờ; sau đó mới lưu và gửi đến socket được phép. Phân biệt quyền **đọc** và **gửi** (ví dụ GM có thể theo dõi tùy cấu hình nhưng không tự nhận danh tính thành viên).
4. Không phát sự kiện `night_group` hoặc số thành viên nhóm lên room broadcast chung; không dùng public REST trả lịch sử chat riêng.

### Giao thức đề xuất (chưa tích hợp)
- `discussion_open`: gửi riêng cho người đủ quyền, mang ID và thời hạn.
- `discussion_message`: client gửi ID, clientMessageId UUID, nội dung text. Server xác thực, giới hạn độ dài/tần suất, lọc HTML, cấp sequence và timestamp; chỉ fan-out đến thành viên hợp lệ.
- `discussion_ack`: xác nhận gửi, idempotency theo participantId + clientMessageId.
- `discussion_close`: đóng phiên, chặn gửi và ngừng phân phối.
- `discussion_resume`: sau reconnect xác thực lại, chỉ trả lịch sử giới hạn đúng nhóm và phiên hiện hành.
- `day_turn_open/close`: điều phối lượt ngày; giao diện ngày có thể hiển thị người đang có lượt và đồng hồ. Nếu chế độ ngày dùng thoại, quyền micro chỉ thuộc người/lượt theo quy tắc; phần này tách khỏi chat đêm.

### Lưu trữ, quyền riêng tư và tải
- SQLite DO: metadata phiên thảo luận và tối đa N tin nhắn gần nhất của **phiên đang mở**, không lưu toàn bộ nội dung chat lâu dài theo mặc định.
- Kết thúc phiên/đêm: khóa ngay, xóa lịch sử theo chính sách được duyệt; người chết/biến phe/mất quyền không thể xem tiếp nội dung mới. Trường hợp hồi sinh/đổi phe tính lại quyền khi mở phiên kế tiếp.
- Giới hạn gợi ý để kiểm thử: tối đa 500 ký tự/tin, 1 tin/giây/người (tunable), tối đa 100 tin/phiên; chống spam, XSS, lặp tin và gửi muộn. Không đính kèm hình/âm thanh trong MVP.
- 30 người chơi/phòng: kiểm thử đồng thời nhiều nhóm riêng, reconnect, đóng phiên trong lúc gửi, hai vai trò thức cùng lượt, GM override và ngăn rò rỉ tin nhắn sang nhóm khác.
- Không dùng lịch sử chat riêng làm dữ liệu public leaderboard/log.

### Phụ thuộc Lá Bài và Artifact
Phiên thiết kế cung cấp metadata **nhóm thức** (wakeGroupId), luật ai biết ai, quyền chat (chatAllowed), các vai trò thức chung, trường hợp người cùng phe nhưng không được biết nhau, trạng thái bị chặn, đổi vai trò, đa vai trò và các Artifact can thiệp. Đây là metadata để engine đọc, không thêm thời gian riêng cho từng lá.

### Trình tự tích hợp an toàn
1. Chốt schema nhóm thức và các ngoại lệ từ Lá Bài/Artifact.
2. Viết mô-đun phân quyền + test tình huống không rò rỉ (unit test), sau đó gia cố xác thực socket.
3. Thêm chat room-scoped trong DO, không sửa các API cũ; dùng feature flag mặc định OFF.
4. Thêm Player Web UI chat riêng theo phiên, không lộ thông tin nhóm ở public state.
5. Gắn vào Auto GM/timer; kiểm thử 30 người và lỗi mạng trên staging; chỉ deploy khi đạt.

## Quyết định còn cần làm rõ trước khi viết giao diện
Cụm “thảo luận từng tuyến” được hiểu tạm là thảo luận theo lượt; xác nhận cụ thể cách phân lượt và liệu ngày có dùng chat, thoại hay cả hai. Chat đêm được hiểu là text chat. Chính sách GM xem nội dung chat riêng cần quyết định rõ; mặc định GM chỉ điều phối và không phát tán tin riêng.
