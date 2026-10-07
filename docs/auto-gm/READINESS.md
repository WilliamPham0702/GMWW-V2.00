# GMWW V2 — Tài nguyên sẵn sàng cho Auto GM / Player Web

Trạng thái: **chỉ chuẩn bị, chưa triển khai tính năng**. Tạo từ V2.35 tại commit `a1bd82ebd665b618850866820ec6359efbb64f61` ngày 2026-10-02. Mọi thay đổi ở nhánh thiết kế Lá Bài/Artifact phải được tiếp nhận bằng cách đọc lại source mới nhất trước khi tích hợp. Không thay đổi gameplay, artwork, schema hiện tại, Bundle ID hoặc dữ liệu local.

## 1. Tài nguyên hiện hữu đã đối chiếu
- IPA: `server-game/current/{GMWW.html,app.js,style.css}`; iOS wrapper: `server-game/GMWW-Server`; build: `.github/workflows/build-server-game-ipa.yml`. IPA build thủ công, unsigned; việc ký/cài đặt là bước riêng.
- Player Web/Worker: `src/index.js`, `src/gmww-members-live.js`, `src/gmww-members-page.js`; cấu hình `wrangler.jsonc`; kiểm tra `.github/workflows/check-player-web.yml`.
- Worker `gmww-v2-00` có Durable Object `ROOMS` với SQLite storage và WebSocket. Alarm hiện có dùng cho vòng đời phòng; **chưa đồng nghĩa với Auto GM**.
- `package.json` dùng Wrangler 4.145.0; `npm run check` thực hiện dry-run.
- V2.35 đang phát triển đồng thời; không được lấy V2.32 làm HEAD để ghi đè thay đổi mới.

## 2. Tài nguyên cần có khi bắt đầu xây dựng
| Nhóm | Thành phần | Trạng thái |
|---|---|---|
| Nguồn chuẩn | HEAD mới nhất + snapshot schema Lá Bài/Artifact đã chốt | Chờ phiên thiết kế |
| Hợp đồng dữ liệu | Schema version, action/effect IDs, phạm vi thông tin công khai/bí mật, điều kiện/giới hạn | Chờ đối chiếu catalog mới |
| Máy chủ | Durable Object lưu phase/deadline/phaseId/version; giao dịch idempotent | Cần thiết kế & lập trình |
| Đồng bộ | WebSocket events + REST fallback + resume khi mất kết nối | Có nền tảng, cần mở rộng |
| Đồng hồ | Server-authoritative deadline, alarm, thời gian còn lại khi GM tắt/bật Auto GM | Chưa triển khai |
| Hai chế độ | Hỗ trợ Online và Online 100%, cùng engine; khác phạm vi Player Web | Đã chốt yêu cầu |
| Artifact | Mọi Artifact tương tác trên điện thoại trong cả hai chế độ | Đã chốt yêu cầu |
| Hết giờ | Chưa thực hiện thì bỏ lượt và qua bước tiếp theo; không tự chọn mục tiêu | Đã chốt yêu cầu |
| Bỏ phiếu | Điện tử ở cả hai chế độ; phiếu trắng khác không bỏ phiếu | Cần triển khai |
| Voice | Chỉ Online 100%: nghiên cứu WebRTC SFU, thiết bị, chi phí và bảo mật | Nghiên cứu, chưa chọn nhà cung cấp |
| Kiểm thử | Tối đa 30 người/phòng; reconnect, concurrency, timeout, privacy | Chuẩn bị kịch bản |

## 3. Kiến trúc đề xuất — chưa áp dụng vào code
- **Một state machine phía server**, lưu `matchId`, `phaseId`, `phaseVersion`, `phase`, `deadlineAt`, `remainingMs`, `autoGmEnabled`, `pausedAt`.
- Lệnh GM, action của người chơi và alarm đều qua cùng hàm chuyển trạng thái có kiểm tra `phaseId` và idempotency key; không xử lý hai lần khi GM kết thúc sớm đúng lúc hết giờ.
- Auto GM mặc định ON khi vào trận. GM có thể can thiệp khi vẫn ON hoặc chuyển OFF/ON; OFF giữ phase và thời gian còn lại, ON tiếp tục, không reset.
- **Thời lượng chỉ đặt tập trung ở cấu hình Ván Mẫu khi đến giai đoạn triển khai**; không thêm trường thời lượng riêng cho Lá Bài/Artifact. Giai đoạn chuẩn bị hiện tại không tạo hay thay đổi Ván Mẫu.
- Hỗ trợ Online: người chơi bỏ phiếu trên điện thoại; các tương tác vai trò khác tùy thiết kế cuối cùng; nếu một bước bắt buộc GM thao tác, chờ GM chứ không bịa kết quả.
- Online 100%: mọi hành động hợp lệ trên Player Web; tách voice khỏi game engine, tránh phụ thuộc thoại để game vận hành.
- Không gửi thông tin vai trò/đích bí mật trong broadcast chung; validate quyền ở server; giới hạn payload và chống replay.

## 4. Những điều không được làm trước khi Lá Bài và Artifact hoàn thành
- Không thay đổi `server-game/current/app.js`, `server-game/shared/artwork.js`, catalog, `src/index.js`, gameplay hoặc dữ liệu production.
- Không tạo Ván Mẫu mới, chưa gán thời lượng mặc định cố định.
- Không build IPA hoặc deploy Worker từ nhánh chuẩn bị này.
- Không đổi Bundle ID, localStorage keys, IndexedDB store hoặc xóa dữ liệu người chơi.
- Không tích hợp voice, không giả định hạ tầng 30 người đã qua kiểm thử tải.

## 5. Danh sách nghiệm thu trước khi lập trình
1. Nhận bản Lá Bài và Artifact hoàn chỉnh; lấy HEAD mới nhất và so sánh file thay đổi từ nhánh chuẩn bị.
2. Lập ma trận action → điều kiện → effect → phase → mode → người thực hiện → xử lý hết giờ; kiểm tra từng vai trò và Artifact.
3. Chốt hợp đồng dữ liệu riêng tư/công khai, giao thức event, lỗi và cách khôi phục.
4. Thiết kế migration bảo toàn toàn bộ dữ liệu và ảnh/audio; tạo fixture từ bản cũ.
5. Thiết lập kiểm thử unit, integration, E2E cho hai chế độ và tải tối đa 30 người.
6. Kiểm tra quyền triển khai GitHub Actions; Cloudflare trực tiếp chỉ cần khi đo vận hành/quan sát production.

## 6. Rủi ro và câu hỏi mở
- Kết nối Cloudflare trực tiếp chưa được xác thực; GitHub Actions có cấu hình triển khai, nhưng chưa xác nhận hạn mức/billing thực tế.
- Chưa đo mức tải WebSocket/Durable Object cho 30 người/phòng; cần benchmark trước phát hành.
- Thoại 30 người cần khảo sát SFU và chi phí theo phút, không nên triển khai P2P mesh 30 chiều.
- Hành động tập thể, vai trò đa chức năng, quyền sửa lựa chọn trước deadline và phiếu hòa cần đối chiếu catalog/luật hoàn chỉnh trước khi chốt cách xử lý.
- Các file source và phiên bản có thể đổi trong lúc phiên khác đang làm; phải rebase và chạy kiểm thử trước mọi PR tích hợp.

## 7. Kiểm tra sẵn sàng không can thiệp
Chạy `node scripts/check-auto-gm-readiness.mjs` từ root để kiểm tra file/cấu hình bắt buộc, đồng bộ version IPA và sự hiện diện của các điểm tích hợp. Script chỉ đọc, không truy cập tài khoản, không deploy, không chỉnh source.
