# GMWW Arena 3D — GĐ32–34: iPhone, kiểm toán Core và cổng tích hợp (25/10/2026)

## Phạm vi và trạng thái
- Tiếp tục trên **PR Draft #487**, nhánh `feature/arena3d-stage14-16-dynamic-artifacts-audio`; **không** tự merge, thay main, deploy Production hay sửa game 2D/Player Web/OTA/IPA chính thức/phòng dữ liệu.
- **GĐ32 — iPhone:** Runtime **V3.223** trên Production đã cung cấp nút **VÀO LÀNG** để mở Arena 3D **STAGING bên trong ứng dụng GMWW iPhone**. Chủ dự án xác nhận đã mở được; đó mới là chứng nhận **lối vào**, chưa phải chứng nhận trọn ván 3D. Không yêu cầu cài bản QA IPA chưa ký.
- Workflow `arena3d-qa-iphone-ipa.yml` là bản **IPA QA chưa ký**; không phải IPA cài được bằng một cú chạm trên Safari, không được đưa vào mục TẢI IPA chính thức. Không biến đánh giá iPhone thành bài Chrome/WebKit headless.
- **GĐ33 — kiểm toán Core:** thêm `tests/arena3d-stage33-parity.test.mjs` và gắn CI tự chạy cho nhánh nghiên cứu. Kiểm tra Core source hiện có khớp 26 action IDs của Arena, các role nội bộ được đối chiếu, tham chiếu action của 28 role đều hợp lệ, 26 signature 3D khác nhau, Artifact tùy chỉnh không hiện khi Core chưa cấp quyền.
- **GĐ34 — cổng tích hợp:** ở thời điểm khảo sát, nhánh nghiên cứu đã phân kỳ với `main` (235 commit trước `main`, 229 commit sau `main` theo so sánh GitHub; giá trị thay đổi theo thời điểm). **Không merge trực tiếp #487** vì có nguy cơ kéo Core/game 2D/Runtime cũ vào Production. Cần tách chỉ phần Arena vào nhánh tích hợp lấy từ HEAD `main`, xử lý xung đột và chạy lại CI đúng phần ảnh hưởng, rồi mới xem xét phát hành canary theo phê duyệt.

## Bằng chứng và giới hạn GĐ33
- Core nguồn trên nhánh nghiên cứu có 26 action IDs; catalog 3D mô tả 28 role mặc định (trong đó một số role được khai báo ngoài phần nguồn gốc `00-core-and-library.part`). **Không được gọi đây là kiểm toán đủ mọi role/artifact người dùng tự tạo**.
- Audio cue trong GĐ26 là định danh âm thanh, **không** phải bản thu có sẵn. Chưa kiểm nghiệm toàn bộ âm thanh, pin/nhiệt, FPS hoạt cảnh trên iPhone vật lý.
- Khi đổi thẻ role/Artifact hoặc Core thêm/bớt action, bài audit sẽ báo lỗi để cập nhật mapping trước khi phát hành; không tự đoán luật game.
- CI chỉ áp dụng test liên quan trực tiếp GĐ33 và các chốt STAGING của workflow hiện có. **Chưa đánh dấu PASS** đến khi GitHub Actions của HEAD mới hoàn tất.

## GĐ32 — Bài nghiệm thu thực tế sẽ cần khi hoàn thiện ứng viên
1. Trên IPA GMWW iPhone hiện cài: Trang Chủ → **VÀO LÀNG** → Arena 3D; xác nhận không mở Safari và có thể về Trang Chủ.
2. Tạo phòng **STAGING** mới → 30 Character/Seat → khóa Seat → phát Vai Trò/Artifact → Vào Trận; không dùng phòng thật.
3. Hành động Core 0–5 mục tiêu, Sói cắn, Phù Thủy/Bảo Vệ/Tiên Tri; diễn hoạt người thực hiện đứng dậy, hiệu ứng đi đến mục tiêu; bí mật chỉ GM thấy.
4. Đêm/Ngày → đề cử/bỏ phiếu Lên Giàn → kết thúc; thử làm mới/mất kết nối và kiểm đúng state sau reconnect.
5. Trong tab **📊 Đo hiệu năng iPhone**: chép báo cáo ẩn danh; ghi cảm nhận nóng/pin và lỗi văng ứng dụng nếu có. Không suy FPS từ kết quả mô phỏng trình duyệt.

## Phát hành và rollback
- Chưa phát hành build mới cho STAGING ở commit GĐ33 nếu chưa chạy workflow_dispatch triển khai riêng; vì GĐ33 là kiểm toán mã/test, không đổi renderer.
- Worker STAGING bản GĐ29–31 đã được xác nhận trước đó: `7ac53fa4-6449-49d0-a121-e82dd9572acc`; rollback GĐ26–28: `6e729ed6-9f3e-4e59-be59-563a144ff216`.
- Bản Runtime tích hợp cổng iPhone V3.223 đã nằm trên kênh chính; không liên quan merge #487. Production/room data được giữ nguyên.

**Không dùng tài liệu này để tự cho rằng iPhone đã nghiệm thu 30 người, toàn bộ 63 vai/44 Artifact hoặc rằng PR đã sẵn sàng merge.**

## GĐ33 — Nâng cấp thực tế hiệu ứng phép
- Mã `spell-vfx.mjs` giờ đọc `accentHue` và `streakCount` từ **chữ ký 26 hành động đã xác nhận bởi Core**: cùng họ phép vẫn có thay đổi màu sắc nhẹ và số hạt khác nhau.
- Dải màu bị giới hạn **xanh biển / lam / tím ngọc**, không thêm đỏ-đen; 5–12 hạt cho hiệu ứng đã xác nhận, các lượt preview/demo giữ cơ chế trước đó.
- Không thêm draw call: vẫn dùng InstancedMesh và bốn nhóm đối tượng VFX hiện có; không đổi loại tác động, mục tiêu, GM/Player permissions, âm thanh, Core hoặc luật chơi.
- Bài unit test kiểm tra toàn bộ Core signature, màu sắc và ngân sách hạt. Chỉ xác nhận chạy đúng kỹ thuật sau khi CI của commit cuối kết thúc SUCCESS.

## Kết quả thực thi cuối GĐ33 (25/10/2026)
- Commit đã triển khai: `76918f0210b48a53d888930d1bf0bf358e7cf172`.
- GitHub Actions `40194418159`: **SUCCESS** cả job kiểm toán/CI và job deploy/browser/Core E2E STAGING. https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40194418159
- **Cloudflare STAGING Worker version:** `09fb836b-a115-4bc0-8d9c-2afc183e28e9`, có log Cloudflare xác nhận deploy. Kênh có thể truy cập từ nút VÀO LÀNG trên GMWW iPhone.
- Browser Chrome/WebKit 6/12/20/30 Character **PASS**; Core E2E 2 client, quyền GM, reconnect, Role/Artifact tùy chỉnh **PASS**. Các FPS trên CI là **GPU phần mềm**, không đại diện iPhone vật lý.
- **Rollback STAGING:** phiên bản GĐ29–31 `7ac53fa4-6449-49d0-a121-e82dd9572acc`. Chưa thử thao tác rollback thật vì triển khai hiện tại SUCCESS và không có lỗi.
- **PR #487 Draft; không merge và không thay đổi Production/IPA/OTA/2D.** GĐ32 nghiệm thu trọn ván và GĐ34 nhánh tích hợp an toàn vẫn chưa đóng.

## Bản tích hợp GĐ34 từ main — thực thi ngày 25/10/2026
- Chủ dự án phê duyệt triển khai trọn gói đến Production **chỉ khi đạt các chốt an toàn**; không cần nghiệm thu giữa các lô. Trạng thái hiện tại **CHƯA PHÁT HÀNH CHÍNH THỨC**.
- Tích hợp an toàn trên **PR duy nhất #487**: tạo merge commit `c379a30a040e232ac99cc44c90d298443a926512` với cả hai parent, lấy **toàn bộ tree main V3.226** (`7451fae4e01a2d73d4086544fd29c5b09f762721`) làm nền; chỉ ghép 60 tệp chuyên Arena 3D/kiểm thử/STAGING. GitHub compare main…PR sau tích hợp: **behind=0, ahead=245, 60 files**; PR base đã đổi thành main; không chạm main và phòng Production.
- Khắc phục một kiểm thử cũ `arena3d-casting.test.mjs`: renderer hiện xác thực/chuẩn hoá lời gọi phép qua `normalizeRitualCue` trước `field.setCastingTurn`, không cấp trực tiếp response.
- Xây dựng **Player Web 3D công khai**: `/village/arena-3d/player.html?room=<CODE>`, `player.mjs`, kết nối cùng Core và public room projection, xoay camera/Ngày-Đêm/reconnect/6–30 Character. Player tương tác lá Vai/Artifact, đề cử, vote bằng **iframe same-origin `/join/<CODE>`** của Player Web hiện hữu; không đưa GM bearer token hoặc dữ liệu Vai bí mật vào renderer 3D.
- GM Arena liên kết cả Player Web Core và Player 3D theo mã phòng. Thêm unit test public secrecy 6/12/20/30 và Chrome/WebKit Player 3D browser smoke.
- Cloudflare STAGING từng lỗi tải asset 10013 (đã kiểm tra là deploy thất bại), nên thêm retry **chỉ lỗi 10013, tối đa 3 lần**, vẫn bắt buộc chứng minh Cloudflare Worker mới 100% traffic và chạy E2E; tuyệt đối không coi retry là tự động PASS.
- CI Arena trên nền main và test Player 3D/casting đã SUCCESS trước deploy mới. Đợt STAGING mới dùng message có marker riêng; test Chrome/WebKit/Core 30 phải có kết quả từ GitHub Actions mới coi là PASS.

### Những việc chưa được xác nhận cho phát hành chính thức
- Worker STAGING hiện vẫn sử dụng namespace biệt lập, giao diện GM còn nút tạo/lấp dữ liệu giả và nhãn STAGING; phải chuyển thành UX chính thức, không tự khởi tạo người chơi.
- Player Web 3D dùng lớp 3D công khai cùng iframe Player Web Core 2D cho hành động; chưa phải UI tương tác 3D riêng hoàn toàn.
- Chưa tạo Worker/Durable Objects kênh Production riêng cho Arena, chưa chuyển nút VÀO LÀNG trên Runtime OTA/IPA từ STAGING sang URL Production chính thức; chưa phát hành Player Web 3D cho người chơi thật.
- Catalog animation xác nhận 28 role mặc định/26 action source tại thời điểm kiểm toán, không đủ bằng chứng phủ hết 63 role/44 Artifact và audio tên vai theo bản thu thật.
- Chưa có đo dài phiên iPhone vật lý mới hoặc bằng chứng tất cả chốt Production CI/SHA-256/rollback sau lần phát hành cuối. **Giữ Draft #487 và không deploy Production trước khi đóng các mục trên.**

## GĐ34 — Bằng chứng STAGING + Player 3D (25/10/2026)
- GitHub Actions STAGING [40198521294](https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40198521294) **SUCCESS** tất cả job, triển khai Cloudflare thực tế Worker version `20449e85-65d1-437e-8a7d-dd808b31fa42`. Đã thử đợt trước có lỗi Cloudflare 10013: **không** coi lần đó là thành công, lần sau đã được xác nhận deploy.
- Chrome/WebKit headless 6/12/20/30 Character, tối ưu draw calls 46/46/42/37, **PASS**. Player 3D (trang `player.html`) cùng Core + iframe Player Web **PASS** cả Chromium/WebKit, 0 GM-only endpoint trong request ẩn danh. WebKit headless dùng GPU phần mềm báo khoảng 2 FPS; **không đại diện iPhone thật**.
- E2E Core thật: 2 client, role Bảo Vệ, phát vai/reconnect, đêm/ngày, lên giàn, kết thúc **PASS**; 30 người/30 Seat trong phòng test **PASS**; Vai tự tạo + Artifact thử 2 và 1 mục tiêu **PASS**; truy cập GM-private từ Player bị HTTP **401**.
- CI phạm vi PR Arena 3D: Check Player Web Worker, Check 30-Player, Check Dual Renderer, Check P0 scope selector, OTA SHA-256/Runtime guard, dedicated Arena tests đều **SUCCESS** ở commit `6b4ddc5eca612e3ebdf8efe11491ef64f7f55f48`. Những workflow chung chỉ tránh bài test lịch sử Runtime/Chrome Card **khi chính xác PR chỉ thay đổi Arena 3D**; nếu có thay đổi ngoài whitelist, vẫn chạy gate chung.
- Người chơi 3D hiện đã có lựa chọn **không gọi `/api/arena-staging/.../gallows`** để truy cập public room/WS trên Core sản xuất; hành động, lá vai, vote tiếp tục qua Player Web theo cùng origin. Điều này **chưa** có nghĩa main Production đã phát hành bản 3D mới.
- Phát hành chính thức còn bị chặn bởi những mục đã liệt kê: GM chưa bỏ cấu hình/bot thử, kênh phòng live chưa hoàn thiện, Player 3D chưa native action UI, toàn bộ rule/artifact/voice vẫn chưa được đối chiếu đầy đủ, chưa cập nhật OTA iPhone Production từ STAGING.

## GĐ35 — Đồng bộ V3.227 và tích hợp ngữ cảnh GM iPhone (25/10/2026)
- Sau khi PR #513 được merge vào `main`, đồng bộ ngay **mã nguồn hiện hành V3.227** (`main=463bd4214fba15509f13eb3945820d88cb4bb9db`) theo cách main-first; commit tích hợp `358d6fcbf2118e8a7ed28508fe9d6b030c6fb6f7`. Giữ toàn bộ Icon Action V2 đã merge, **không** viết đè `app.js`, `GMWW.html`, cấu hình Role/Core, Player Web bằng snapshot cũ V3.226.
- Chuyển portal `VÀO LÀNG` trong ứng viên Runtime sang chính origin `https://gmww-v2-00.williampham0702.workers.dev/village/arena-3d/live.html` và bỏ nhãn STAGING khi chạy Production. Trang chính thức dùng **cùng Worker/RoomDurableObject Core thật**, không tạo namespace dữ liệu thứ hai.
- Tích hợp đoạn bridge ở `server-game/src/20-members-and-roster.part` và `server-game/current/app.js`: iframe Arena cùng origin gửi handshake không nhạy cảm; ứng dụng GMWW chỉ trả roomCode và bearer token GM hiện có về **đúng contentWindow + origin Production**, khi phòng hợp lệ. Arena gọi lại `GET /api/gm/rooms/:code` để xác minh quyền thật trên Core; token không đưa vào URL hoặc postMessage cho host khác.
- Chặn **ngay tại handler**, không chỉ bằng `hidden`/disabled, cả thao tác tạo người giả/lấp Seat và phát bốn vai thử trong chế độ Production. Staging vẫn có fixture kiểm thử biệt lập.
- Thêm `tests/arena3d-portal-handoff.test.mjs`: nguồn/bundle bridge giống nhau, chặn giả mạo origin/source, token sai, phòng không hợp lệ/iframe ẩn; test cũng kiểm tra đường dẫn chính thức. Sửa cập nhật bài kiểm thử `arena3d-native-gm-bridge.test.mjs` theo kiến trúc mới.
- **CI dành riêng Arena code GĐ35** sau sửa assertion: GitHub Actions run `40214700286` SUCCESS (syntax, kiểm tra Core/Player/bridge và dry run STAGING). CI liên quan 2D/Runtime tổng vẫn có kiểm thử legacy khác phạm vi thất bại; các workflow đó **chưa được giải quyết/chưa SUCCESS tất cả** và không được coi là đạt chỉ vì unit Arena xanh.
- Chưa tăng Runtime OTA lên phiên bản mới sau V3.227, chưa merge PR #487, chưa deploy production 3D, chưa có SHA-256/rollback của phiên bản phát hành cuối, và chưa có xác minh end-to-end iPhone Production thật. **KHÔNG ĐƯỢC BÁO HOÀN THÀNH hoặc cắt bỏ các chốt này.**

### Cổng phát hành còn phải đóng
1. Hoàn thiện UI tạo/chọn ván và phân vai **thật** trong Arena 3D hoặc luồng GM chính thức, không phụ thuộc bốn lá kiểm thử; xác minh role/Artifact động, action/animation/audio theo cấu hình ván.
2. Chạy full game GM ↔ Player 3D/Core trên STAGING sau code portal mới (tạo phòng, người thật, chọn ván/phân vai, reconnect, Ngày/Đêm, treo giàn, kết thúc). Chrome/WebKit không tương đương phép đo iPhone thật.
3. Rà soát quyền GM/Player và bridge bản chính thức, kiểm tra Game 2D không bị hồi quy; CI phát hành bắt buộc phải SUCCESS đúng SHA.
4. Chuẩn bị Runtime OTA kế tiếp, ghi chú tiếng Việt, bản manifest+SHA-256 và rollback; cập nhật Player Web/iPhone `VÀO LÀNG`; sau merge/deploy phải xác minh Worker/asset/room/wss trên Production thật.

## GĐ35 — Tích hợp nền V3.227, kết thúc ván 3D (26/10/2026)

- Đã đồng bộ nhánh PR #487 với `main` từ bản V3.227 và commit sửa CI/asset Icon Action V2 cuối cùng `3b0b1f54250fdab4aef0de1821eba18bcc82993a`. Merge commit main-ancestor: `8729ea50ab036920e6cf228935813b2e0662038b`. **Không merge vào main hoặc deploy Production trong bước này**.
- Bổ sung chính thức trên giao diện Arena 3D: nút **Kết thúc ván**, chọn Phe Dân/Phe Sói/Phe Ba/Phe Khác, xác nhận GM, buộc phải có phòng đang chơi + `matchId`, gửi POST tới `/api/gm/rooms/:room/end` bằng bearer GM hiện tại. Không cho phép Player/bất kỳ phiên thiếu GM tự ghi kết quả. Sau Core chấp nhận, đồng bộ lại room và xoá lựa chọn phe thắng. Không sửa luật tính thắng, không kết thúc tự động.
- Unit `tests/arena3d-gm-end.test.mjs` xác nhận đường đi UI → Core, kiểm tra không quyền GM / lobby / `matchId` thiếu / phe thắng rỗng hoặc sai / GM hủy thao tác đều không gửi mutation.
- E2E `tests/arena3d-stage30-crowd-core-e2e.mjs` được nâng từ gọi trực tiếp API thành nhấn nút **Kết thúc ván** trong GM 3D sau một ván Core 30 người, đêm/ngày, phát vai, reconnect, lên giàn. Bắt buộc xác minh lobby realtime ở cả GM và người xem. Đã thêm bước E2E này vào STAGING workflow; kết quả còn phụ thuộc GitHub Actions commit cuối.
- Lối vào cùng origin Production đã được chuẩn bị từ GĐ34: app GMWW gửi room code và bearer trực tiếp bằng `postMessage` đúng frame, Core xác minh lại, không lưu token vào URL; chế độ Production ẩn/gạt cứng các thao tác tạo người giả/phát vai thử.
- **Chưa phát hành:** GM 3D vẫn phụ thuộc phần cấu hình phân Vai/Artifact từ Core hiện hữu, Player 3D vẫn dùng iframe Player Web để xử lý hành động riêng tư, chưa xác minh đủ các Vai/Artifact tuỳ biến và audio thực, chưa có Runtime OTA tăng phiên bản, SHA/rollback Production hoặc xác minh iPhone thật bản tích hợp. STAGING không thay thế nghiệm thu Product khi thiếu các chốt này. Không được đánh dấu hoàn thành.

### Chốt phát hành bắt buộc
1. Kiểm chứng STAGING WebKit/Chromium, Core 30/30 người, private 401, GM UI end ván và reconnect trên commit mới.
2. Đảm bảo luồng tạo/tập hợp/phát vai trong Arena 3D có thể sử dụng Core thật, không còn hành động demo trong Production, dữ liệu trận không phân nhánh.
3. Khi đủ phạm vi sản phẩm mới tạo Runtime OTA V3.228 **hoặc phiên bản lớn hơn nếu main thay đổi**, release notes tiếng Việt, manifest SHA-256, CI SUCCESS, rollback và xác minh Production thực tế.
