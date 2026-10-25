# GMWW Arena 3D — Lô GĐ23–25 (25/10/2026)

Phạm vi: PR #487 nghiên cứu độc lập, Cloudflare Worker/DO STAGING tách biệt, chưa merge, không Production, không sửa game 2D, IPA, OTA hoặc dữ liệu. Đây là phiên bản thử nghiệm kỹ thuật, không phải phát hành game mới.

## GĐ23 — Tối ưu 6–30 Character
- Tại 6–19 Character giữ đầy đủ chi tiết tạo hình 3D đang có.
- Với 20–23 Character giảm 4 draw calls cho các chi tiết rất nhỏ: chấm sáng mắt và má hồng; tại 24–30 Character cắt thêm 5 phụ kiện trang trí thứ yếu (9 tổng). Chế độ Tiết kiệm pin vẫn ẩn 13 chi tiết như trước.
- **Giữ nguyên** thân, tay chân, đầu, mắt, tóc chính, ghế, vị trí các Seat và hiệu ứng Core; nhận diện nhân vật/chọn đầu vẫn hoạt động. Không thay đổi thuộc tính nhân vật, ID, vai trò, luật, kết quả hoặc quyền GM.
- Phương án giới hạn đồ họa chỉ ảnh hưởng đến lớp mô phỏng 3D; số draw calls được kiểm tra trên Chrome/WebKit thực sự thay vì chỉ so nhãn.
- Khi số người giảm hoặc chuyển về chế độ thường, các mesh chi tiết được phục hồi và cập nhật lại ma trận.

## GĐ24 — Chuyển động và hành động phép
- Bảo toàn lượt Core: actor di chuyển từ ghế đến vị trí thi triển, đứng làm phép và chỉ đi về khi Core chuyển lượt/kết thúc hành động.
- Không dọn thông tin di chuyển của nhân vật đang đứng ở vị trí làm phép; chỉ dọn dữ liệu travel của người đã về ghế.
- Tự dọn deadline hiệu ứng đã hết hạn theo vòng vẽ, tránh tích lũy qua nhiều ngày/đêm. Không xóa VFX đang hoạt động.
- Regression trong trình duyệt với Sói cắn (đầu sói bay), Phù Thủy, Tiên Tri Hào Quang và Bảo Vệ; chỉ các hành động Core được quyền GM cấp mới phát nội dung bí mật.
- Giữ bộ E2E Core thật 2 client/Artifact/tối thiểu 1 diễn hoạt phép đã được áp dụng từ GĐ16, không mở test Player Card 2D hay OTA không liên quan.

## GĐ25 — Kiểm soát hiệu năng phiên dài trên iPhone
- Bổ sung bộ thống kê **cục bộ trong tab trình duyệt**, gộp theo cửa sổ phút với bộ nhớ giới hạn tối đa 30 cửa sổ gần nhất, không lưu liên tục mỗi frame nhiều giờ.
- Chỉ thống kê số khung, CPU vẽ cao nhất, khoảng khung cao nhất, tỷ lệ khung trễ, Character tối đa và Draw Calls trung bình; không thu tên thành viên, mã phòng, vai trò, token, Artifact hoặc kết quả ban đêm.
- Khi chuyển nền hoặc mất WebGL, đóng cửa sổ hiện tại và ngưng lấy mẫu để không ghi thời gian ngủ thành lag. Dữ liệu không gửi Worker; chỉ sao chép khi người dùng nhấn nút.
- Có kiểm thử mô phỏng **90 phút dữ liệu hiệu năng**, chứng minh bộ nhớ cửa sổ không tăng vô hạn, và browser smoke kiểm tra số liệu trực tiếp trên cảnh 3D.
- **Không tuyên bố đã thử 90 phút trên iPhone vật lý**: đo pin/nhiệt không có API tin cậy trong Safari; chỉ có thể nghiệm thu bằng máy thật khi user chạy một phiên dài và quan sát độ nóng/pin.

## Kiểm thử đúng phạm vi & kiểm soát phát hành
- Node test trong suite Arena GĐ18/GĐ19 gồm mốc 6/12/20/30, 13 mesh Eco, 4/9 mesh crowd, giữ quyền phép, thu hồi VFX hết hạn; mô phỏng xu hướng 90 phút và tab sleep/WebGL.
- Browser Chrome/WebKit STAGING: 6/12/20/30, số draw calls giảm theo mốc 20/30, bật/tắt Eco, nghi lễ 4 vai trò, thay đổi đội hình liên tiếp, module đo có cửa sổ hữu hạn.
- Core E2E thật STAGING: GM/Player phân quyền, Bảo Vệ, đêm/ngày, đề cử/bỏ phiếu, reconnect, kết thúc và vai trò/Artifact tùy chỉnh nhiều mục tiêu.
- Không chạy các kiểm thử không liên quan (Chrome Player Card, game 2D, Seat Production, IPA hay OTA).
- **Cần điền kết quả CI và version Worker từ GitHub Actions sau khi thực tế SUCCESS; tuyệt đối không xem là hoàn thành trước khi test.**

## Rollback
Rollback Worker STAGING về GĐ22 version `dd78c369-351c-4f5f-989c-00b71dfc55d7`, hoặc revert các commit GĐ23–25 trên nhánh PR #487. Không ảnh hưởng Production.

## Kết quả đã kiểm chứng tại STAGING — cả lô GĐ23–25
- GitHub Actions / CI / Chrome / WebKit / Core E2E: **SUCCESS** https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40171674011.
- Worker STAGING (Cloudflare version): **`755963dd-47f3-4c0a-bce7-65c0a21a2122`**, từ commit mã `752846fd2ee8abe50f2eefcf186ea713a93ed313`.
- Chrome và WebKit (giả lập iPhone, GPU phần mềm), với cố định chế độ **Mượt**: 6 người **46**, 12 người **46**, 20 người **42**, 30 người **37 draw calls**. Giảm **9/46 ≈ 19,6% draw calls** khi ở 30 người so với giữ đầy đủ chi tiết (cùng một cảnh khác nhau về mật độ người). Chỉ đây là bằng chứng giảm draw calls, **không phải cam kết FPS tăng 19,6%**.
- Browser: đổi đội hình nhiều lần 6/12/20/30, bật/tắt Tiết kiệm pin, ghi số đo phiên dài, 4 vai diễn hoạt Sói/Phù Thủy/Tiên Tri Hào Quang/Bảo Vệ và kiểm tra phân quyền UI: **PASS**, không ghi nhận uncaught browser error.
- Core E2E thật trên DO STAGING (hai client): GM thử Bảo Vệ, đêm→ngày, đề cử→bỏ phiếu, kết thúc ván, viewer reconnect, từ chối viewer truy cập GM-only (HTTP 401): **PASS**.
- Vai trò tùy chỉnh Shield hai mục tiêu và Artifact Heal một mục tiêu từ Core: **PASS**. Phần hiển thị VFX vẫn theo cấp quyền GM.
- Node unit: chứng minh 90 phút dữ liệu giả lập vẫn chỉ giữ tối đa 30 cửa sổ trong tab; background/WebGL loss loại trừ mẫu nền: **PASS**.
- Các FPS số đo headless ở Chrome ~8, WebKit ~2 với GPU phần mềm không phản ánh hiệu năng Safari iPhone vật lý. **Chưa có số đo FPS khi 30 người làm phép đồng thời trên iPhone thật, chưa có kiểm chứng 30–60 phút chơi thật, pin/nhiệt thật**.
- **Kết luận kỹ thuật:** hoàn tất lô GĐ23–25 trên nhánh nghiên cứu và STAGING riêng, đủ điều kiện trình một **đợt nghiệm thu iPhone thực tế cho cả lô**, không nghiệm thu từng giai đoạn. PR #487 vẫn Draft, không merge, không deploy Production. Rollback STAGING về GĐ22 version `dd78c369-351c-4f5f-989c-00b71dfc55d7`.

## Báo cáo đo Safari iPhone thật — 30 Character (người dùng cung cấp)

Bộ đo `gmww.arena.mobile-qa.19-21` được dùng trên bản STAGING GĐ23–25; chuỗi version này là module chẩn đoán, **không phải mã phiên bản Worker**.

| Chỉ số | Số đo iPhone |
|---|---:|
| Character | 30 |
| Draw calls | **37** (giảm 9 so với mức đầy đủ 46, xấp xỉ 19,6%) |
| Tổng frame của phiên đo | 463 |
| Mẫu giữ lại gần nhất | 240 |
| FPS trung bình trên mẫu | **19 FPS** |
| FPS mục tiêu của khung mới nhất | 12 Hz |
| Khoảng cách khung hình: median / P95 | 34 / 87 ms |
| CPU vẽ: median / P95 | 2 / 3 ms |
| CPU vẽ đỉnh ghi theo phiên | 31 ms |
| Khoảng khung lớn nhất theo phiên | 109 ms |
| Pixel ratio | 1 |
| WebGL context lost / restored | 0 / 0 |
| Bộ nhớ thống kê phiên | 1 / 30 cửa sổ; `minutesObserved=0` |
| Nhiệt / hao pin | Không đo được bằng API trình duyệt |

**Diễn giải đúng:** FPS 19 là trung bình của **240 mẫu gần nhất**, có thể gồm khung idle 12Hz và khung lúc chuyển động mục tiêu 30Hz. `requestedPaintHz=12` chỉ là mục tiêu của khung mới nhất, không phải giới hạn của toàn bộ 240 mẫu. Median 34ms (~29Hz) và P95 87ms (~11Hz) phù hợp với chuỗi mẫu trộn chuyển động và nghỉ; **không xác nhận 30 FPS ổn định khi làm phép**. CPU vẽ P95 chỉ 3ms nhưng đã có khung đỉnh 31ms; điều này chưa chứng minh GPU/pin/nhiệt ổn định.

**Kết luận nghiệm thu từng phạm vi:** ĐẠT về số Character 30, đúng 37 draw calls và không mất WebGL trong phiên đo ngắn trên iPhone thật. **CHƯA NGHIỆM THU** về chuyển động Core/animation cụ thể, FPS lúc đang thi triển phép, pin/nhiệt và độ ổn định phiên kéo dài (mới `minutesObserved=0`, không phải test 30–60 phút). Không tự merge PR hoặc deploy Production từ báo cáo này.
