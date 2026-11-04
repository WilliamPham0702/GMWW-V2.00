# GMWW — P0 ổn định Audio Auto GM (04/11/2026)

## Hiện tượng
- Một số lượt tự phát audio, lượt sau im lặng; chạm màn hình đôi khi mới nghe.
- Audio theo vai, ban ngày và Lên Giàn không luôn đi theo tiến độ Server.

## Thay đổi trong PR (chưa phát hành)
- Dùng thao tác bật Auto GM để mở khóa AudioContext trên iPhone **trước khi** gọi mạng.
- Ưu tiên cùng một kênh WebAudio đã mở khóa cho mọi file audio; cache decode tối đa 12 đoạn, fallback HTML Audio hoặc giọng tiếng Việt nếu thiếu kênh.
- Mỗi cue vai gọi theo ID lượt Server, thử lại tối đa 3 lần khi không khởi phát được; không bỏ qua cue kế tiếp hoặc phát cue thuộc lượt cũ.
- Khi bật lại 🔊, gọi lại lượt hiện hành. Có heartbeat chỉ kiểm tra lượt Server đang hoạt động, không phát trùng lượt đã xác nhận bắt đầu.
- Giữ cùng hàng đợi audio qua các bước Lên Giàn trong một ngày; đưa audio còn 30 giây, hết giờ vào hàng đợi, bổ sung cue chốt đề cử theo stage đã xác minh.
- Không thay đổi IPA, bộ luật, thời gian cấu hình, Production A/B, DNS hoặc dữ liệu.

## Điều kiện nghiệm thu trước merge/phát hành
1. Chạy kiểm thử focused audio, bundle 7 modules và kiểm tra Worker/Player nếu workflow yêu cầu: required CI SUCCESS trên HEAD cuối.
2. Test iPhone thật: Bật Auto GM từ lần đầu; chuyển ≥5 vai liên tiếp, role-group; Đêm → Ngày → Đề cử → Chốt → Vote → Phán quyết → Đêm tiếp, không chạm để khôi phục audio.
3. Test chuyển app ra nền/vào lại, tắt/bật Audio, thiếu media/TTS, DEMO x2/x5, reconnect và hủy lượt cũ.
4. Không tuyên bố bảo đảm autoplay trên iOS khi hệ điều hành chủ động chặn hoặc AudioContext bị gián đoạn: phải có cảnh báo và thao tác kích hoạt rõ ràng.
5. Nếu merge, tăng Runtime từ V3.296 lên phiên bản mới, phát hành .gmwwupdate + SHA-256 + ghi chú tiếng Việt và rollback về bản gần nhất đã kiểm chứng.

## Ranh giới
PR #777 đang xử lý toàn bộ Auto GM ban ngày; thay đổi hàng đợi/cue tại đây cần được hợp nhất không mất code khi đồng bộ #777 với main. Không merge song song khi chưa giải quyết xung đột.
