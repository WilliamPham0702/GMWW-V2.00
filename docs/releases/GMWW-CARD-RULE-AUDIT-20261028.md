# Kiểm toán rule 28/10/2026 — bản sửa bước đầu, chưa phát hành

Đã đối chiếu 63 Vai Trò/44 Artifact trong bản tham chiếu export 18/10 và luật canonical mới nhất. Có đầy đủ liên kết Action/Effect trong danh mục, nhưng nhiều rule chưa có executor. Xem ma trận từng lá trong `docs/audits/card-rule-audit-20261028.md` và JSON cùng tên danh mục. Không ghi đè toàn bộ thư viện từ export cũ.

## Đã sửa và kiểm chứng

- Giữ đầy đủ function rules ở GM payload/private DTO; Artifact không làm rơi functions. Không sửa artwork/audio/theme.
- Giữ phase both/any/setup/trigger và mode custom/eachDay/nPerNight. Quota custom tính toàn ván; kiểm tra cửa sổ đêm/số mục tiêu/noSelf/cấm lặp/quota theo mục tiêu. Lịch sử Soi ghi đúng người được soi, không nhầm người nhận thông báo riêng.
- Một Artifact có đúng một chức năng onceGame có thể suy ra singleUse nếu chưa có cờ. Không gộp nhiều chức năng, không đè singleUse:false, không bịa targetCount/noSelf cho function thiếu metadata. Giữ action metadata cũ ở cả ngày/đêm.
- Thần Gấu nhận đúng role_bear_god và giới hạn tổng ván.
- Ban Ngày dispatch bằng ID cụ thể, không đoán Giết từ dead_vote; executor chưa có trả lỗi trước khi trừ lượt.
- Bổ sung ID thật Cô Gái Digan/Tiên Tri Thối/Vampire, kết quả phe/chức năng/nhóm ba người riêng tư.
- Người Sói soi ra Sói nhưng không nhập đàn/roster riêng, không cản Sói Tuyết đơn độc, không làm Thiếu Nữ chết khi thăm. Lycan và Sói Trùm soi thường ra không Sói. Nhận biết đàn dùng phe hiện tại.
- Kẻ Hủy Diệt chỉ Giết đúng năm vai trong mô tả; chọn sai tự chết xuyên bất tử. Soi không thể giả thành tác động chết.
- Theo lựa chọn người dùng: Tiên Tri Hào Quang đọc tên Vai Trò, mô tả được đồng bộ. Tráng Gương/Đá Hoán Đổi cấp lại lượt mới; đã đồng bộ mô tả, executor sao chép/đổi vai chưa hoàn thiện.

## Kết quả kiểm chứng

Local PASS: 112 test contract/day/night và phụ thuộc trực tiếp; 7 test soi xét; 6 test payload/day-action; 6 test migration mô tả đã chốt. Tổng **131 test liên quan**. Cú pháp Worker/GM, assembly và diff đã kiểm tra. Wrangler dry-run PASS, không deploy.

Review độc lập phát hiện hai lỗi tương thích (function mặc định đè action cũ, suy diễn singleUse cho nhiều function); đã có RED→GREEN và sửa. Không phát hiện rò rỉ quyền riêng tư trong phần review. Test rule mới đã tái hiện lỗi trước sửa. Hai case audio legacy không liên quan có lỗi fixture đã được ghi nhận trong phiên trước; không sửa audio hoặc chạy E2E ghế/3D/IPA trong nhánh này.

Chưa CI GitHub/chưa STAGING/chưa Server/chưa Production/chưa iPhone. Không tuyên bố toàn bộ 107 lá hoàn thiện: mạng phụ/biến phe/đổi lá/hiệu ứng thụ động/phiên bỏ phiếu thứ hai/điều kiện thắng riêng và cooldown/trigger còn backlog chi tiết trong ma trận. Export cũ không chứng minh mọi chỉnh sửa mới trên iPhone đã được kiểm tra.

## Luật người dùng đã chốt — 28/10/2026

Đồng bộ mô tả thật trong GM migration, phần function và ma trận 107 lá: Già Làng (chặn mọi chết đêm đó, trừ 1 mạng, 0 mạng chết); Hơi Thở Lão Già (chết đêm kế tiếp); Bình Giấc Mơ (khóa 2 ngày đêm); Đồng Xu Tuổi Trẻ (không công bố vai thì chết); Kim Cương Phủ Nhận (loại Artifact dùng mãi mãi đã sử dụng); Trượng Luân Hồi (hồi sinh với vai cũ); Lam Ngọc Định Mệnh (copy Artifact và dùng cùng); Hư Không Vô Tận (GM giao luật Offline). Thêm kiểm thử migration/idempotence và giữ Action ID/media.

**Chưa hoàn thiện executor thực thi các luật vừa chốt; tuyệt đối không coi đã vận hành hoặc phát hành Production.**

## GitHub và rollback

Base `58195b2796c7e29e9007a5d1bcf8e06d4405d584`, branch dự kiến `fix/card-rule-contract-audit-20261028`. Đã được chủ repo cho phép và đẩy nhánh riêng qua GitHub; không mở PR mới. Chưa deploy. Nếu được phép push, phải rebase lên main mới trước khi CI vì main đã có thay đổi không liên quan. Workflow chỉ test/dry-run, không deploy. Không migration/xóa phòng/DO/lịch sử. Bỏ/revert commit khi chưa phát hành là rollback; Production hiện chưa đổi.
\n## Giai đoạn tiếp — Executor Bình Giấc Mơ (chưa phát hành)\n\n- Server nhận action `artifact_action_lock_function` của Artifact hợp lệ trong lượt Ban Đêm và Ban Ngày; tạo trạng thái `disabled_2n` thực để chặn dùng chức năng.\n- Bổ sung kiểm tra trạng thái mất năng lực cho hành động Ban Ngày, tương ứng với chặn Ban Đêm đang có.\n- Hết hai chu kỳ ngày/đêm tính từ pha kích hoạt, trạng thái tự kết thúc. Cấm khóa chồng để không tiêu hao nhầm lượt; night undo khôi phục tương tác và lượt Artifact.\n- Thêm integration test DO cho ngày/đêm, block, idempotent, không trừ lượt khi từ chối, tự hết hạn và rollback. Không sửa IPA/UI/media, phòng/DO/lịch sử, không deploy.\n\n## Giai đoạn tiếp — Executor Hơi Thở Lão Già (chưa phát hành)\n\n- Server nhận chính xác Artifact `artifact_07`, không lẫn với các lá dùng cùng Action ID. Xác nhận đánh dấu ở đêm/ngày N; chỉ giải quyết chết vào bình minh sau đêm N+1.\n- Tôn trọng miễn nhiễm chết ban đêm, người đã chết/được đuổi; không công bố cái chết trước khi đến hạn. Hỗ trợ retry/idempotent và rollback ban đêm.\n- Thêm test DO ngày/đêm, chống giết sớm/lặp, miễn nhiễm và chống nhận diện nhầm Artifact. Không deploy Production.\n
## Giai đoạn tiếp — Kim Cương Phủ Nhận (chưa phát hành)

- Ban Ngày: kiểm chứng chính xác `artifact_15` / `artifact_action_negate`, chỉ chọn chủ Artifact dùng mãi mãi (`usageMode=unlimited`, `singleUse=false`) đã thực sự kích hoạt.
- Xóa liên kết Artifact trong assignments, lưu tombstone trên đối tượng Artifact để chặn kích hoạt lại; không xóa data lịch sử, không thay đổi Vai Trò.
- Chặn cả kích hoạt Artifact từ Player Web, GM ban ngày/ban đêm và tái xuất hiện từ private delivery snapshot sau reconnect.
- Không hồi tố hủy các hiệu ứng đã xảy ra. Test điều kiện hợp lệ, không mất lượt khi từ chối, replay idempotent, vai trò/hồ sơ giữ nguyên.
