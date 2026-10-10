# GMWW AI Support — kết nối an toàn (chưa kích hoạt Production)

## Mục đích
- Icon nổi trên giao diện **GM Server/IPA**: có thể kéo, tự bám mép, ghi nhớ vị trí riêng; bấm để mở/thu nhỏ chat.
- Chat tự do và **Báo lỗi tự động** (Health Check Server/Player Web/Runtime + GitHub Actions CI chỉ đọc).
- Không hiển thị icon này trong Player Web công khai.
- Trợ lý AI chỉ hỗ trợ đọc, giải thích, đề xuất bản vá. **Không có chức năng tự sửa GitHub, merge hay deploy Cloudflare**. Phê duyệt mã nguồn bằng PR riêng.

## Thiết lập trước khi kích hoạt (chỉ sau khi duyệt PR và phát hành bản Runtime kế tiếp)
Tài khoản OpenAI API cần có khả năng sử dụng Responses API và hạn mức thanh toán phù hợp.

1. Tạo OpenAI API key tại <https://platform.openai.com/api-keys>. Không gửi khoá trong chat, GitHub Issues, commits hoặc hình chụp.
2. Tạo **mã truy cập riêng** cho GMWW AI Support (tối thiểu 24 ký tự ngẫu nhiên); đây **không phải** OpenAI API key.
3. Trong thư mục repository, chạy:
   ```sh
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put GMWW_AI_SUPPORT_TOKEN
   ```
   Nhập các giá trị khi Wrangler hỏi. Không thêm vào `wrangler.jsonc` hoặc `.env` đã commit.
4. Trước khi phát hành, kiểm tra route `GET /api/gm/ai-support/config`: `configured: true`. Route này không chứa bất kỳ secret nào.
5. Trong GMWW, nhấn icon nổi → nhập **mã truy cập riêng** → Kết nối → chat. Mã chỉ giữ trong bộ nhớ trang, không lưu vào LocalStorage/game state.
6. Cấu hình giới hạn chi tiêu trên trang quản lý OpenAI API. Kịch bản giới hạn AI tại Worker là 8 yêu cầu/phút/IP; không thay thế hạn mức billing.

Tùy chọn: `GMWW_AI_MODEL` là một **biến môi trường Worker không bí mật** có thể đặt thành model OpenAI hợp lệ (mặc định `gpt-4.1-mini`). Chỉ dùng model mà API project của bạn có quyền gọi.

## Tính năng được triển khai
- Cloudflare endpoint `POST /api/gm/ai-support/chat`: yêu cầu `Authorization: Bearer <GMWW_AI_SUPPORT_TOKEN>` và `OPENAI_API_KEY` ở phía server.
- Mỗi request gửi tối đa 1.200 ký tự người dùng và 8 lượt lịch sử; không lưu hội thoại server (`store:false`), không truyền thông tin cá nhân của người chơi.
- **Báo lỗi**: có thêm báo cáo mã trạng thái và thời gian phản hồi các dịch vụ; tránh raw log, role/artifact, người chơi, mã phòng, token.
- Cloudflare đọc lịch sử GitHub Actions công khai để hỗ trợ trả lời, không có GitHub write token trong giao diện.

## Kiểm thử trước deploy
```sh
node --test tests/gmww-ai-floating-support.test.mjs
npm test
npm run check
```
Kiểm tra trên Safari/iPhone sau khi phát hành mới; việc CI thành công không chứng minh riêng trải nghiệm cảm ứng trên iPhone.

## Lưu ý phát hành
- PR #203 nằm trên branch `feature/gmww-ai-floating-support-v1`, chưa merge main.
- Version ở main hiện có thể thay đổi; không ép thông báo cập nhật bằng cách thay byte trong gói V3.81 đã phát hành.
- Chỉ phát hành trong Runtime **mới hơn** cùng manifest được hash đầy đủ và xác thực OTA, sau khi được phê duyệt.
- PR #199 tạo nút đưa báo cáo sang ChatGPT riêng (ngoài game) và đang được review độc lập. Khi tích hợp cả hai, cần kiểm tra UI không hiển thị chức năng trùng lặp không cần thiết.
