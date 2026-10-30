# GĐ3 — Thẩm định tên miền miễn phí (2026-10-30)

## Kết luận kiểm tra chính thức
- Cloudflare Workers Custom Domains phải được gắn trên **Cloudflare zone đang hoạt động thuộc quyền kiểm soát của account**; không thể tạo custom domain cho zone không sở hữu. Nguồn: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ (29/09/2026).
- Kết quả truy vấn đọc `GET /zones` trên kết nối Cloudflare hiện tại: HTTP 200, tổng 0 zones. Đây là phạm vi **tài khoản/kết nối hiện được cấp quyền**, không kết luận người dùng không có tên miền ở nơi khác.
- DuckDNS cấp host DNS miễn phí (https://www.duckdns.org/faqs.jsp), nhưng tên miền `*.duckdns.org` không mặc nhiên trở thành Cloudflare zone của chủ game. Chỉ đặt DNS/CNAME không bảo đảm Worker sẽ nhận host, TLS chứng chỉ hoặc WebSocket hoạt động. **Không đặt alias DuckDNS làm mặc định.**

## Phương án được xét
| Phương án | HTTPS / URL | Nhận xét |
|---|---|---|
| Subdomain của zone đang sở hữu và thêm vào Cloudflare | Giữ hostname mới, chuyển trực tiếp Worker | Ưu tiên nếu có zone hoạt động; hiện kết nối không hiển thị zone |
| Tên miền được cấp quyền quản lý DNS và delegate vào Cloudflare (nếu nhà cấp cho phép) | Giữ hostname mới | Chỉ chấp nhận sau đăng ký/ủy quyền/verify thực tế; không giả định có dịch vụ miễn phí sẵn |
| DuckDNS trỏ vào một máy chủ reverse proxy | Có thể giữ hostname nếu proxy lo HTTPS/WebSocket | Cần server/tài nguyên; thêm độ trễ/rủi ro; không chọn cho link chính nếu chỉ muốn đổi tên |
| GitHub Pages / trang chuyển hướng HTTPS | Truy cập link mới rồi redirect về workers.dev | Không proxy realtime, nhưng thanh địa chỉ đổi URL; chỉ chấp nhận nếu người dùng phê duyệt behavior chuyển hướng |

## Gate để bật lựa chọn link mới trên GM
1. Hostname do chủ sở hữu kiểm soát và có thể gia hạn/duy trì miễn phí; không tự tuyên bố tên đã đăng ký.
2. HTTPS hợp lệ; request đến cả Player Web và API; WebSocket handshake, login và reconnect hoạt động; không phụ thuộc proxy trung gian nếu chưa nghiệm thu độ trễ.
3. Phục vụ cùng một hệ thống game; không nhân đôi room/chat/history.
4. Chức năng chia sẻ link **không đổi Cloudflare/Oracle**. Cloudflare/Oracle chỉ được chọn sau khi kết thúc ván (giai đoạn sau).
5. Link cũ `https://gmww-v2-00.williampham0702.workers.dev/` luôn được giữ và dùng làm fallback.

## Trạng thái
Đã đánh giá kỹ thuật; chưa đăng ký tên miền, chưa cấp HTTPS hoặc thay đổi Worker/DNS/IPA/OTA/dữ liệu. Link mới trong UI phải để **chưa khả dụng** cho đến khi gate 1–3 hoàn thành.
