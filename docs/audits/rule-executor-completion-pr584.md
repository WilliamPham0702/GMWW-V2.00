# GMWW — Executor 107 lá: theo dõi triển khai PR #584

Ngày: 28/10/2026. Cơ sở đồng bộ: Native/Runtime V3.264.

## Phạm vi phê duyệt
63 Vai Trò, 44 Artifact. Không xem có Action ID/nút/icon là có executor hợp lệ. Mỗi lá phải có kết quả thực thi Server, quota/timing/interaction, GM/Player Web/private visibility, undo/reconnect/idempotency, demo và bài test tương tác phù hợp.

## Đã bổ sung xử lý trên nhánh (chưa nghiệm thu 107/107)
- Thợ Săn: chặn mục tiêu Phe Ba trước khi lưu hành động.
- Sói Thợ Săn: phân biệt đánh dấu với Sói Cắn; chết liên kết và giới hạn thay mục tiêu theo luật.
- Già Làng: chặn chết cùng đêm khi Rung Chuông, trừ một mạng, chết khi đã dùng hai mạng, có kiểm soát đêm.
- Lực Sỹ: hấp thụ một vết Cắn có hiệu lực, sự kiện công khai, chống trừ mạng lặp sau retry.
- Con Quạ: cộng hai phiếu bất lợi trong phiên Lên Giàn đúng mục tiêu.
- Người Yêu Hòa Bình: cấm phiếu GIẾT trong bỏ phiếu thường và do GM vận hành.
- Ấn Thị Trưởng: phiếu của chủ tính thành hai, không tạo người bỏ phiếu ảo.
- Vòng Hoa Hòa Bình: chủ chỉ được bỏ phiếu CỨU.
- Vạc Ma Thuật: Server xác thực Dân thường.
- Sương Hào Quang: Server xác thực Phe Ba.
- Nhẫn Sự Thật: Server xác thực Sói.
- Trượng Tiên Tri: Server đọc riêng Vai Trò.
- Khiên Bảo Hộ: lưu hiệu ứng bảo vệ vào đêm kế tiếp, giải quyết Cắn và hết hạn ở bình minh.

**Chưa nghiệm thu**: toàn bộ Player Web/GM UI, các tổ hợp liên kết, asset, audio, tính năng DEMO và tất cả lá còn lại. Bốn Artifact xem/kiểm tra hiện mới có kết quả Server, cần hoàn thiện xác nhận/hiển thị riêng theo Player Web. Không đánh dấu các lá này là đã hoàn tất 100%.

## Kiểm thử / chốt phát hành
- CI chuyên biệt: `Check RULE Executors 107 (focused)` với các test `tests/card-executors-*.test.mjs`.
- Các workflow không thuộc phạm vi cũ có thể lỗi do kiểm thử UI lỗi thời; không tự sửa/loại bỏ chúng để giả tạo SUCCESS.
- **Không merge, không phát hành OTA** đến khi ma trận 107 lá đạt đủ điều kiện CI bắt buộc, Native/IPA giữ nguyên trong các thay đổi của PR này.
- Khi đủ điều kiện: đồng bộ Runtime version, SHA-256, release notes tiếng Việt, rollback, xác minh Production.

Mốc hiện tại: triển khai **một phần**, PR giữ Draft. Không khẳng định 107 lá đã hoạt động.

## Xác minh thực tế 29/10/2026

- Đã merge `main` 157b499d vào nhánh bằng commit d8f97e8, giữ cả Strongman executor và privateRoleGroupRecognition. Không force push. Tiếp tục đồng bộ main 8c88afba (PR #612) trong checkpoint kế tiếp.
- CI tại d8f97e8: `Check RULE Executors 107 (focused)` SUCCESS, run 40845716172; `CI Policy Gate` SUCCESS, run 40845716303. Đây là kết quả bộ test, **không phải chứng nhận 107 lá**.
- Sửa literal `\n` làm test catalog không parse được; giữ nguyên assertion và chạy lại: 65/65 PASS. Hunter: 2/2 PASS. GM assembly 7 module, syntax và Worker dry-run PASS.
- Chạy Worker thật với SQLite cục bộ, HTTP thật, không dùng Production: soi, miễn chết đêm, Phù Thủy giết và Sói/bình minh PASS. Assertion Tiên Tri cũ `CÓ SÓI` đã được đối chiếu với luật/voice hiện tại `Người bạn soi là Sói`, đồng thời xác minh boolean wolf.
- HTTP thật cho Vạc Ma Thuật, Sương Hào Quang, Nhẫn Sự Thật, Trượng Tiên Tri: kết quả riêng, kiểm quyền GM/sở hữu, retry cùng request, xung đột request, single-use quota, reconnect và không lộ Artifact qua public API PASS.
- 84 bài liên quan scheduler, Dân Làng, Say Rượu, Nhà Tinh Thần Học, GM vote bundle PASS sau khi bổ sung dependency thật vào VM fixture. Không thêm mock executor. Bầy chỉ còn Sói chết phải bỏ lượt cắn; assertion cũ đòi lượt cắn đã được sửa theo hành vi này.
- Ma trận riêng đủ 107 ID: `docs/audits/pr584-acceptance-107.json`. Chưa lá nào được chứng nhận toàn bộ tiêu chí; mỗi ô chưa kiểm giữ NOT_VERIFIED. Không đổi kết quả test thành PASS dựa trên inventory/nút/icon.

### Chặn phát hành còn tồn tại

Nhiều Artifact vẫn rơi vào `DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED`; các luồng sao chép/hoán đổi/cấp Artifact, giao tiếp riêng, DEMO/audio/UI, undo và tương tác chéo chưa đủ bằng chứng. Đây là phần triển khai/kiểm thử còn phải làm, không phải yêu cầu chủ dự án chọn kỹ thuật.

**Không merge PR vào main, không phát hành Production/OTA.** Chưa tạo Runtime Update thủ công cho PR này. Không đổi IPA, không ghi/xóa dữ liệu Production. Rollback Production không cần kích hoạt vì chưa có triển khai; checkpoint nhánh có thể revert sau khi đối chiếu head mới nhất, không force push.

### Sửa kết quả riêng trên Player Web

Phát hiện và sửa Online/DEMO bỏ sót `result.message` của Artifact ban ngày, đồng thời thay JSON soi đêm bằng `revelation.message` dễ đọc. Hai bài test chạy trực tiếp hàm UI thật đã FAIL trước sửa và PASS sau sửa. Chưa chứng nhận UI 107 lá; chưa phát hành.

## Tiếp tục triển khai 29/10 — executor và DEMO

- Thẩm Phán + Bùa Tai Ương: kích hoạt trước phiên đầu, tối đa hai phiên đầy đủ; lưu riêng phiên đầu, giữ cái chết, dựng lại quyền người còn sống cho phiên hai. Chặn chuyển Đêm sớm; chống lặp request/ack; giữ quota một lần/ván. GM chấp nhận kết quả phiên đầu sẽ mở phiên hai thay vì tự sang Đêm.
- Tự động và DEMO dùng cùng executor. Kiểm thử Worker thật với người thật bỏ đề cử/vote trong DEMO đã đi qua phiên hai và sang Đêm; kiểm thử GM thủ công và Auto GM cũng đạt.
- Ấn Dân Làng: executor ngày/đêm ghi trạng thái mất năng lực vĩnh viễn thật. Kiểm thử Player Web HTTP, sở hữu, quota, retry, hoàn tác đêm và reconnect; trạng thái không tự hết khi đổi ngày/đêm.
- Sửa điều kiện thắng nhận đúng faction ID chuẩn `wolf`, `wolves`, `village`, `third`; trước sửa DEMO có thể kết luận Dân thắng dù vẫn còn Sói. Có test tái hiện FAIL trước sửa.
- DEMO chốt đề cử qua Server: hòa/không đề cử thì không treo ai, không tự chọn mục tiêu và không dừng vì GALLOWS_NO_UNIQUE_NOMINEE. Vote dùng tally Server để giữ trọng số Artifact/Con Quạ.
- Bộ chọn hành động Online/DEMO nhận phase `both`, chặn actor bị khóa và Artifact một lần đã dùng ở chu kỳ trước, kể cả snapshot lượt Đêm cũ.

Chưa nghiệm thu toàn bộ 107/107. Ma trận cập nhật bằng chứng riêng theo từng tiêu chí; các phần chưa kiểm giữ NOT_VERIFIED/PARTIAL. Chưa phát hành Production/OTA/IPA; rollback vẫn là revert checkpoint trên nhánh sau khi kiểm tra head, không force push hoặc thay dữ liệu Production.

### Bằng chứng checkpoint 58dc429 (29/10)

208/208 test focused cục bộ PASS; bốn chương trình HTTP Worker/SQLite thật PASS. CI RULE focused (bao gồm HTTP thật), CI Policy Gate, DEMO Hybrid và các check luật Say Rượu/Phù Thủy/Dân Làng SUCCESS trên head này. Check Lên Giàn phát hiện fixture cũ; đã sửa fixture đề cử hợp lệ, policy DEMO người thật, kiểm hành vi paused và manifest bảy module. Nhóm 61 bài Lên Giàn PASS cục bộ. Không bỏ test hoặc sửa engine để đáp ứng assertion cũ. Các CI icon/OTA candidate/Preview có lỗi riêng, không dùng chúng làm bằng chứng PASS và không phát hành từ checkpoint.

### Artifact nội tại Lên Giàn

- Lá Phiếu Âm Giới: quyền bỏ phiếu của chủ đã chết tách khỏi quyền đề cử/lên giàn; người chết thường vẫn bị chặn. Server, GM roster, Player Web và DEMO cùng dùng danh sách quyền vote. Không hồi sinh người sở hữu; giữ hiệu lực cấm vote, quota một phiếu, retry và reconnect. Tỷ lệ đề cử chỉ tính người đủ quyền đề cử.
- Áo Choàng Hoàng Tử: sửa nhánh GM chốt trực tiếp/đóng vote sớm không áp dụng kết quả bảo hộ; kiểm thử thật cả hai đường. Đã tạm gỡ riêng sửa này để kiểm chứng test thật FAIL đúng lỗi Cloak, sau đó phục hồi.
- DEMO chọn phiếu theo ràng buộc CỨU/GIẾT và bỏ qua actor không có phiếu hợp lệ khi hai ràng buộc xung đột; không tự tạo phiếu hoặc đổi luật đếm.

Chưa phát hành; các ô chưa nghiệm thu đủ vẫn giữ NOT_VERIFIED/PARTIAL.

### Hắc Ngọc Hủy Diệt (#25) — checkpoint tiếp theo 29/10

- Thêm executor hủy bí mật Artifact của **người khác** chỉ khi chưa lật/chưa dùng. Đối chiếu sở hữu từ assignment + card Durable Object, trạng thái cùng ván, từ chối lá đã lật/đã sử dụng, lá không tồn tại hoặc đã bị loại.
- Kiểm tra lại điều kiện hợp lệ **trong transaction** trước khi loại bỏ; giữ nguyên thông tin riêng tư, không phát danh tính lá bị hủy ở kết quả/broadcast. Tận dụng đường thu hồi đã có và bộ lọc private delivery trên reconnect.
- Unit test và Worker HTTP/SQLite E2E: kiểm quyền GM, chủ sở hữu, chặn tự hủy, chặn lá đã lật, giữ nguyên lá không hợp lệ, retry/idempotency, quota, cập nhật lá sau reconnect, bảo mật public.
- Ma trận `pr584-acceptance-107.json` ghi PASS/PARTIAL theo phạm vi có bằng chứng; **Artifact #25 chưa được chứng nhận đầy đủ**, các hạng mục UI/DEMO/audio/undo và tương tác toàn bộ bài chưa hoàn thành.

PR vẫn Draft. Chỉ merge sau khi 107/107 được chứng nhận và required checks SUCCESS; chưa phát hành Worker/Runtime/IPA, không sửa dữ liệu Production.


### Checkpoint PR #584 — Đá Hoán Đổi (#40) và khóa nghiệm thu 107/107 (29/10)

- Đã thêm executor **Ban ngày** cho Đá Hoán Đổi: hoán đổi Vai Trò, Phe, roleCard và ảnh lá của đúng hai người; giữ nguyên login/seat và Artifact của từng người, đặt lượt sử dụng Vai Trò mới cho cả hai.
- Ghi vai trò riêng tư và snapshot cho reconnect trong transaction, không broadcast danh tính Vai Trò. Kiểm thử unit `tests/card-executors-artifact-role-swap-20261029.test.mjs` và HTTP Worker/SQLite thật `tests/worker-artifact-role-swap-e2e.mjs` đã PASS; test Worker được cô lập để không chạm giới hạn đăng ký/đăng nhập từ các bài khác.
- **Chưa chứng nhận** #40: thực thi Ban đêm, undo, GM/Player UI, audio, DEMO và tương tác chéo vẫn chưa đủ; các ô nghiệm thu có bằng chứng ngày được đánh dấu PARTIAL, không phải PASS toàn bộ.
- Thêm `.github/scripts/check-rule-acceptance-107.mjs` và bài kiểm thử vào workflow RULE focused. Cổng phát hành kiểm đủ 63 Vai Trò + 44 Artifact, 14 tiêu chí/lá, bằng chứng và tính khớp catalog. Tại checkpoint, Worker HTTP, GM bundle, dry-run và regression PASS, **cổng chứng nhận FAIL đúng thiết kế** vì 0/107.
- Artifact #17, #23, #32 và luồng thông điệp riêng vẫn chưa hoàn tất. PR tiếp tục Draft, **không merge/Production/Runtime OTA/IPA** và không sửa dữ liệu Production.


### Checkpoint tiếp theo 29/10 — Ngọc Ghen Tuông (#17), Tráng Gương (#23)

- **#17 Ngọc Ghen Tuông, thực thi Ban ngày**: xác thực chủ + mục tiêu khác người; Artifact bị lấy phải chưa lật/chưa dùng, còn trong ván. Dùng bộ bài `gameConfig.artifacts` và gói `roleCatalog:artifact:ID` thật để cấp lá thay thế chưa phân phối; không tạo lá giả. Không có lá hợp lệ thì trả lỗi trước khi trừ lượt. Chuyển Artifact, cập nhật assignment, key của chủ và snapshot riêng trong transaction, giữ nguyên Vai Trò, seat, các người khác và bảo mật công khai. Bằng chứng `tests/card-executors-artifact-steal-20261029.test.mjs`, `tests/worker-artifact-steal-e2e.mjs` (Worker/SQLite/HTTP PASS trên CI run 40868827903).
- **#23 Tráng Gương, thực thi Ban ngày trong phạm vi tương thích**: đã hỗ trợ sao chép duy nhất chức năng `action_stab` từ Du Côn thành chức năng bổ sung của chủ Tráng Gương, lượt dùng mới và giữ Vai Trò/Phe gốc. Các chức năng nguồn chưa có dispatcher tương thích bị từ chối trước khi tiêu hao Artifact, không giả lập thành công. Bằng chứng `tests/card-executors-artifact-function-copy-20261029.test.mjs`, `tests/worker-artifact-function-copy-e2e.mjs` (Worker/SQLite/HTTP PASS trên CI run 40869345554).
- Cách ly hành động sao chép theo từng `loginId` thay vì chỉ theo `roleId` để một người có năng lực sao chép không làm người khác cùng Vai Trò tự có năng lực đó. Regression riêng: `tests/card-executors-mirror-owner-isolation-20261029.test.mjs` — đang chờ CI head mới.
- Giới hạn còn lại của #17/#23: Ban đêm, mọi biến thể sao chép, DEMO tương thích, UI tương tác thật, audio, undo và tương tác chéo toàn bộ 107 lá **chưa được chứng nhận**. Ma trận chỉ tăng các ô có bằng chứng lên `PARTIAL`; số lá `CERTIFIED` vẫn **0/107**.
- Cổng `Check RULE Executors 107 (focused)` kiểm tra các test kỹ thuật rồi **chủ động FAIL ở bước nghiệm thu 107/107** cho đến khi hoàn tất 14 tiêu chí trên từng lá. **PR giữ Draft, không merge, không phát hành Worker/Player Web/Runtime OTA/IPA, không sửa dữ liệu Production.**


### Checkpoint tiếp theo — #32, Hồn Ma và executor Ban đêm (29/10/2026)

- **Lam Ngọc Định Mệnh (#32)**: thêm liên kết sở hữu bí mật, không chuyển lá của người bị chọn. Khi Artifact nguồn được lật, chủ Lam Ngọc được sử dụng bản sao **độc lập một lần** cho nhóm chức năng kiểm tra đã có executor thật: Vạc Ma Thuật (#09), Sương Hào Quang (#24), Nhẫn Sự Thật (#29), Trượng Tiên Tri (#39). Nguồn mất/quyền không hợp lệ sẽ từ chối, không trừ lượt. Thông tin liên kết chỉ có trong `/me` của chính chủ. Kiểm thử Worker HTTP/SQLite `tests/worker-artifact-link-e2e.mjs`.
- **Hồn Ma**: API người chơi xác thực gửi một từ mỗi Ngày khi đã chết; chặn tên người chơi, không công khai trước GM duyệt; GM có thể duyệt/từ chối và cấm gửi tiếp trong ván khi vi phạm. Mỗi người chỉ xem tin của mình, GM xem danh sách pending; không broadcast nội dung pending. Unit + HTTP Worker thật: `tests/card-executors-ghost-clue-20261029.test.mjs`, `tests/worker-ghost-clue-e2e.mjs`. Chưa có nghiệm thu hoàn chỉnh phần nhập liệu trên giao diện thực tế.
- **Executor Ban đêm #23/#32/#40**: thực hiện thay đổi quyền/Role hoặc liên kết thật qua lượt đêm, snapshot trước/sau cho Undo chính xác cùng lượt; kiểm tra hoàn tác Vai Trò, Artifact và quyền khi reconnect tại `tests/worker-artifact-night-transformations-e2e.mjs`.
- **DEMO**: lọc mục tiêu hợp lệ cho Tráng Gương (#23), Lam Ngọc (#32), Đá Hoán Đổi (#40) trước khi chạy, tránh chọn sai và dừng DEMO. Regression `tests/card-executors-demo-transform-targets-20261029.test.mjs`, còn phải nghiệm thu một ván DEMO trọn vẹn.
- CI run **40871853717**: unit regression + HTTP/SQLite Worker E2E + GM bundle/Worker dry-run PASS; cổng 107/107 FAIL đúng thiết kế. Các commit tiếp theo về DEMO vẫn phải chạy CI lại trên head cuối.
- **Không đủ điều kiện hoàn tất:** #32 mới hỗ trợ một tập con đã có executor, #23 còn các chức năng nguồn khác, #34 và các executor chưa triển khai, audio, UI GM/Player Web trực quan, DEMO đầy đủ và mọi tương tác chéo 107 lá còn thiếu. Ma trận `pr584-acceptance-107.json` giữ **0/107 CERTIFIED**. PR #584 vẫn DRAFT; không merge, Production, Runtime OTA hoặc IPA; không thay đổi dữ liệu.


### Bổ sung Khăn Hồn Ma (#34) — checkpoint 29/10

- Executor Ban ngày chỉ cho phép chọn người đã bị loại ở chu kỳ trước; dùng cùng ledger quota Artifact Server và không tiêu hao khi mục tiêu không hợp lệ.
- Gửi yêu cầu **riêng** cho người bị loại. Người được yêu cầu gửi chính xác một chữ cái Unicode qua API có xác thực; chỉ chủ Khăn Hồn Ma đọc được kết quả trên `/me`. Người khác không xem được manh mối hay danh tính người dùng Artifact từ WebSocket. Trạng thái pending/đã phản hồi lưu theo ván và hỗ trợ reconnect; hết Ngày yêu cầu thì không thể phản hồi muộn.
- Bộ test: `tests/card-executors-ghost-letter-20261029.test.mjs`, `tests/worker-artifact-ghost-letter-e2e.mjs` (Worker HTTP/SQLite riêng). **Chưa đánh dấu PASS khi CI của checkpoint chưa hoàn tất.**
- Chưa nghiệm thu phần giao diện nhập chữ trên Player Web/GM, audio, DEMO/undo và các tình huống chéo 107 lá. Vẫn giữ PR Draft và khóa phát hành.
