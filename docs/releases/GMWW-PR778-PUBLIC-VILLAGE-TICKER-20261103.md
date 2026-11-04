# GMWW — PR #778: Lịch sử Thông cáo Làng và ticker 🎬

Ngày: 03/11/2026. Phát hành: Worker/Player Web only (không tăng Runtime, không thay IPA).

## Thay đổi
- Hiển thị dòng **🎬:** ngay bên dưới tiêu đề **Chat Làng**. Toàn bộ thông cáo công khai của lượt đêm/ngày liên quan chạy ngang một vòng, tự lặp, tốc độ dễ đọc (~28px/s).
- Lịch sử thông cáo công khai được giữ theo **matchId + số đêm** trong Durable Object, hợp nhất không trùng ID, không biến mất khi người chơi trả lời/hiệu ứng thay đổi, tải lại Player Web hoặc chuyển kênh chat.
- Công bố **“Nô đã bị Sát Thủ chọn”** và **“Nô đã lựa chọn sai và đã chết”** thành hai sự kiện độc lập, đúng thời điểm; không nêu danh tính người đóng Sát Thủ và không tiết lộ dấu GM.
- Đêm mới chỉ đọc lại thông cáo ngày trước đã công khai; không công bố hành động bí mật đang diễn ra.
- Bỏ thông cáo công khai khỏi dòng hội thoại. Tin nhắn chữ và voice trở thành các dòng không viền/không nền riêng; màu tên người gửi phân biệt kênh và người.
- Tôn trọng chế độ giảm chuyển động; cho phép đọc nội dung đầy đủ qua nhãn truy cập.

## Bảo toàn và an toàn
- Không đổi quy tắc chọn/giết, không đổi ID phòng, DNS, Cloudflare A/B, IPA, Runtime, URL Player Web hoặc dữ liệu gốc.
- Key archive mới `villagePublicBulletin:<matchId>:<cycleNight>` chỉ lưu các thông cáo đã lọc public; dữ liệu GM/chọn dấu được giữ riêng.
- Không sửa/xoá các tương tác lịch sử hoặc các bản lưu trước đó.

## Kiểm chứng phát hành
- Required CI và V3 focused/authorization: chỉ merge khi SUCCESS trên HEAD mới nhất.
- Test thông cáo chọn → kết quả, dedupe/refresh, phân biệt ván/ngày, không rò người thực hiện và đêm bí mật.
- Test gói Player Web (`assemble-player-web.mjs --verify`) và smoke Production Worker/API/JS sau khi tự phát hành.
- Nếu smoke thất bại, rollback **Worker version trước phát hành** về 100%; dữ liệu phòng và kho thông cáo không xoá; không rollback IPA hay Runtime.

**Nghiệm thu trên iPhone:** Nhìn thấy 🎬 dưới Chat Làng, cả hai câu được chạy nối tiếp và lặp lại; chat chữ/voice không còn các khung riêng; refresh vẫn giữ thông cáo và không lộ vai.
