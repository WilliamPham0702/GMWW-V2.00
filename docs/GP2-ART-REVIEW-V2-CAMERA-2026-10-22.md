# GMWW GP2 — kiểm tra 30 Character & camera iPhone (2026-10-22)

**Trạng thái: đang nghiên cứu nghiệm thu kỹ thuật. KHÔNG MERGE/PRODUCTION.**

## Những điểm được xác nhận
- Đã truy cập và dùng **30 artwork Character thực tế** từ Library `/GMWW-V2-ASSETS/CHARACTER/GMWW-CHAR-001..030.png` để chồng hình lên hai ảnh GP2 candidate (không phải hình vuông placeholder).
- Chú ý: đây là nguyên liệu PNG ở Library, **không phải ảnh đã chạy qua atlas engine**. Một số PNG Character 11–30 còn nền trắng; ảnh minh họa vì vậy chưa xác nhận rendering Player Web thực tế.
- Tọa độ tranh ứng viên lửa là `(52,53.9)`; mã layout nhánh GP2 hiện là `(50,64)`. Chưa đồng bộ, **không thể gắn nền ứng viên vào runtime**.
- Nếu ép toàn bộ khung `864×1536` xuống màn hình `390×844`, giữ Character kích thước thật **50×67px trên Player Web**, có **67 cặp bounding-box chồng nhau**; với bản `56×74px` có 68 cặp. Đây là kết quả tính hình chữ nhật chiếm chỗ, không phải đo FPS.
- Với **camera thế giới ảo 864×1536 CSS px, không giảm kích thước Character**, 30 seat ứng viên v2 có **0 cặp trùng bounding-box** trên thế giới ảo; người chơi chỉ xem được một phần sân trong viewport 390×844, cần kéo camera để quan sát.
- Tài nguyên minh họa QA cục bộ đã tạo: ảnh Ngày/Đêm, 30 artwork thật, camera LEFT/FIRE/RIGHT trên kích thước iPhone, và bản xem riêng không popup. Bộ này **không nằm trong Production hoặc PR files**.

## Phần mã nguồn mới ở nhánh Draft
- `assets/village/gp2-world-camera.mjs`: phép chiếu world→viewport, viewport→world, pan có giới hạn, native scale = 1; KHÔNG import vào GM/Player Web cho đến khi art được duyệt.
- `tests/fixtures/gp2-artwork-review-v2.json`: mốc lửa và 30 tọa độ để QA (khác cấu hình live).
- `tests/gp2-artwork-review-v2.test.mjs`: 30 điểm, khoảng cách vùng chiếm chỗ, chặn tích hợp artwork chưa duyệt.
- `tests/gp2-unscaled-camera.test.mjs`: hồi quy overlap 390×844, 30 điểm world-space, zoom/pan không scale Character.

## Chốt chặn chưa đạt
1. **Artwork**: tranh hiện tại có hàng rào, quầy và mái chạm vùng đi được; chưa có cặp ảnh Ngày/Đêm cuối cùng đạt diện tích tối thiểu 30 Character ở pixel thật.
2. **Phép chiếu render**: camera mới là module độc lập, **chưa được đấu dây vào GM Server/Player Web**, chưa kiểm thử cảm ứng/drag/hit-test hoặc đồng bộ realtime.
3. **Kích thước thật**: cần kiểm thử atlas renderer Character 01–30, tên vai trò, Artifact, trạng thái và các lớp z-index (không chỉ raw PNG Library).
4. **Thiết bị**: chưa QA iPhone thật, nhiệt/FPS/bộ nhớ.
5. **Nghiệm thu**: người dùng chưa phê duyệt artwork; cần CI SUCCESS, QA thực tế và nghiệm thu trước merge.

Không sửa dữ liệu, không xuất IPA và không triển khai Production.
