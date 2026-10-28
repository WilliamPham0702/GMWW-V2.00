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

## Rule còn cần bổ sung

Già Làng (phạm vi/quota Rung Chuông); Hơi Thở Lão Già (độ trễ/mốc chết); Bình Giấc Mơ (thời hạn khóa); Đồng Xu Tuổi Trẻ (hậu quả không công bố); Kim Cương Phủ Nhận (ngoại lệ); Trượng Luân Hồi (nguồn vai mới); Lam Ngọc Định Mệnh (phạm vi liên kết); Hư Không Vô Tận (rule tự động riêng hay GM xử lý).

## GitHub và rollback

Base `58195b2796c7e29e9007a5d1bcf8e06d4405d584`, branch dự kiến `fix/card-rule-contract-audit-20261028`. Auto-review từ chối push: user chưa xác nhận quyền gửi payload lên GitHub. Không dùng đường vòng. Chỉ có bản local và gói báo cáo/patch để review. Nếu được phép push, phải rebase lên main mới trước khi CI vì main đã có thay đổi không liên quan. Workflow chỉ test/dry-run, không deploy. Không migration/xóa phòng/DO/lịch sử. Bỏ/revert commit khi chưa phát hành là rollback; Production hiện chưa đổi.
