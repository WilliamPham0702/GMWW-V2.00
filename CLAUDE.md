# CLAUDE.md — GMWW-V2.00 (Game Ma Sói)

## Dự án
- Game Ma Sói tự phát triển, mã nguồn trên GitHub, chạy trên Cloudflare.
- Mục tiêu: sửa/hoàn thiện lõi game (game core) và vận hành game.
- Đồng phát triển với ChatGPT: việc giao GPT thì GPT làm, việc giao Claude thì Claude làm.
- Chủ dự án tự test trên web và iPhone.

## Quy tắc làm việc
- Trả lời ngắn gọn, bullet, tập trung kết quả; tiết kiệm token.
- Chỉ chạy CI liên quan đến task.
- Không xin duyệt/xác nhận lặt vặt; làm trọn task và giao bản có thể test (Runtime OTA hoặc IPA).
- Yêu cầu chưa rõ: hỏi lại trước khi làm, không tự đoán. Thích câu hỏi dạng trắc nghiệm.
- Xong việc: chỉ báo "xong/lỗi" + file Runtime tải về hoặc việc người dùng cần làm. Không viết dài.
- Deploy/merge: người dùng chỉ cần trả lời "OK" là đủ xác nhận.
- Prompt dành cho ChatGPT: luôn đưa trong code block (có nút copy).
- Pipeline build và sửa core chạy trên GitHub, không chạy trên Cloudflare A.

## Thuật ngữ
- GM = Game Master (quản trò) = chính chủ dự án. "GM thao tác" nghĩa là chủ dự án tự thao tác.
- "Server" = phía GM (màn hình GM Server của GMWW, nơi chủ dự án điều hành), KHÔNG phải Cloudflare Worker.
- IPA: chỉ cần bản chưa ký; người dùng tự ký/cài bằng Sideloadly.

## Hạ tầng
- Đang chạy trực tiếp tại link workers.dev: `gmww-v2-00.williampham0702.workers.dev`.
- `gamemasoi.pages.dev` đang lệch với bản workers.dev — sẽ sửa sau.
- Cloudflare A (đang dùng, hay hết quota; quota thực tế reset đầu tháng) và Cloudflare B (dự phòng).
- Backup A/B (Issue #773, giao Claude): ưu tiên A; khi A hết quota thì GM Server hiện thông báo và chuyển sang B trong phần cài đặt; người chơi vẫn dùng cùng link workers.dev; chuyển sang B thì mở ván mới, không tiếp tục ván cũ.
- Task backup A/B đang tạm dừng cho đến khi A thực sự hết quota.

## Luật game đã chốt (bộ bài 63 vai)
- Hoàn thiện hành động của các lá vai còn thiếu; chỉ upload lên server sau khi xong tất cả.
- Kẻ Trộm: chọn vai mới từ đủ 63 lá, giữ nguyên số lần đã dùng.
- Thợ Săn Sói: mục tiêu chết cùng lúc; Bảo Vệ chỉ che chắn mục tiêu nếu thợ săn chết ban đêm.
- Cupid: cặp đôi chết cùng lúc.
- Báo Thù: theo phe của mục tiêu (kể cả phe thứ ba).
- Cô Bé: mặc định không bị phát hiện khi chơi online.
- Hồn Ma: tin nhắn tự đăng.
- Sói Quỷ: người bị chuyển hoá được báo riêng vào đêm kế tiếp.
- Người Đưa Tin: thông báo vai hiển thị cho cả làng.
- Tráng Gương: mỗi artifact có đúng một chủ trong mỗi ván; sau lượt đêm của mục tiêu bị sao chép, chủ được gọi lại ("<vai B> ơi dậy đi", rồi "Tráng Gương ơi") và nhận mọi hành động của vai B; vẫn gọi dù chủ đã chết/không còn artifact để không lộ thông tin (giống vai đã chết vẫn giữ lượt trong timeline).

## 2D / 3D
- Dự án Arena 3D đã HUỶ (06/11/2026). Chỉ giữ bản 2D.
- Gỡ toàn bộ 3D khỏi main qua PR #838 (draft); người dùng tự xoá Cloudflare STAGING Workers, GitHub prereleases và nhánh PR #581.
- Không đụng vào game 2D đang cài (Runtime, màn hình 2D); không cài Runtime thử nghiệm đè lên app thật.
