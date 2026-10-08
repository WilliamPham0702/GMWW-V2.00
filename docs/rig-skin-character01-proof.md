# GMWW Character-01 • Rig + Skin tối giản (bản thử nghiệm, chưa nghiệm thu)

## Yêu cầu đã chốt ngày 08/10/2026
**Chỉ 9 Action** (không giữ 39 Action cũ):
1. Đứng yên – thở tự nhiên
2. Đi bộ – chân bước, tay đánh tự nhiên
3. Chạy nhẹ
4. Ngồi xếp bằng – chân gọn sát người
5. Chuyển từ đứng sang ngồi
6. Chuyển từ ngồi sang đứng
7. Vẫy tay chào
8. Giơ tay bỏ phiếu
9. Ăn mừng chiến thắng / buồn khi thua (một Action `result`, hai kết quả `win|lose`)

**Yêu cầu kỹ thuật không đếm Action:** Rig + Skin mềm, khuỷu/đầu gối không thô hoặc lộ đường nối, chuyển pose mượt, chân trụ không trượt, ngồi xếp bằng tự nhiên, phong cách chibi GMWW, chạy ổn với 30 thành viên, dữ liệu tái sử dụng cho Player Web và GM.

## Thay đổi so với mẫu trước
- `rig-skin-core.mjs`: chỉ 9 Action, nhịp chân trụ + chân đưa về trước, phối hợp displacement trong world với vị trí đặt bàn chân; đầu gối IK, ba trạng thái ngồi/đứng có nội suy tư thế.
- `rig-skin-renderer.mjs`: tay/chân thành đường cong liền mạch với nét bo tròn, không còn các khớp chữ nhật; tạo thân chibi nam cơ bắp, tóc đen, vest xanh ngọc, short và sandal.
- `rig-skin-demo.html`: minh họa kích thước chibi, 9 Action, lựa chọn 2 kết quả thắng/thua và ảnh đối chiếu **Character-01 gốc** (`assets/characters/v253/chibi-01.webp`).
- Demo HTML offline được đóng gói từ `tools/build-rig-skin-offline.mjs`, nhúng ảnh đối chiếu gốc.
- `tests/rig-skin-master.test.mjs`: kiểm thử các Action chốt, chạm đất tương ứng chuyển động root, ngồi gọn, cảnh 30 instance, logic chuyển pose, Skin và đồng bộ timestamp.

## Mức độ hoàn thiện / không được hiểu nhầm
- Skin hiện tại **mô phỏng phong cách Character-01 bằng hình vector**, chưa tách các bộ phận gốc chất lượng nghệ thuật tương đương sprite gốc. Việc chuyển da thật phải làm ở giai đoạn sau khi người dùng đồng ý hướng hình.
- Foot planting đã có kiểm tra trong **demo world 2D phẳng**; chưa nối với walk path/terrain của `village.mjs` hoặc tính đến đổ bóng/địa hình/camera của production.
- Animation chỉ được xem là đạt kỹ thuật khi các bài test, Worker serve và smoke Chromium đều pass. Các bài test không thay thế nghiệm thu nhìn bằng mắt và thử trên iPhone thật.
- Không thay source `assets/village/village.mjs`, `server-game/current` hoặc Worker `src/index.js`; **không cập nhật Production/IPA**. Nhánh này là prototype độc lập.

## Quy trình nghiệm thu
1. Người dùng mở HTML offline hoặc preview nhánh test; so sánh với artwork trong trang.
2. Test Walk/Run (chân trụ, chân đưa, tay đánh), Sit/Sit-down/Stand-up, Vote/Wave, Result thắng/thua.
3. Đánh giá sự mượt khi chuyển Action ở kích cỡ nhân vật thật trong làng.
4. Khi đạt hình ảnh và chuyển động mới bắt đầu thiết kế Skin 2D chính thức từ artwork, kết nối gameplay và mở rộng sang các Character khác.


## Ngày 08/10/2026 – nhận diện Character-01 và tư thế ngồi
- Phần **gương mặt/tóc phía trước** lấy từ artwork gốc `assets/characters/v253/chibi-01.webp`, chỉ crop đầu; không crop toàn thân làm khớp.
- Phần **cơ thể, góc nghiêng, góc sau** vẫn là Rig vector thử nghiệm, **chưa phải Skin phân lớp hoàn chỉnh**.
- 9 Action giữ nguyên. Tư thế ngồi xếp bằng dùng lớp chân riêng và chuyển mờ theo `sitBlend` khi ngồi/đứng.
- Phần xoay khi đi có heading liên tục, không bước ngang mặt trước. **Chỉ trên nhánh thử nghiệm, chưa Production hoặc IPA.**

## Cập nhật bộ trang phục nguyên ảnh gốc (nhánh thử nghiệm)
- Mặt + tóc trước: texture gốc Character-01, xoay cố định 12° để bù độ nghiêng của ảnh nguồn; không có chuyển động lắc/nghiêng đầu.
- Áo mở ngực cơ bắp, quần hoa, dép ở **mặt trước**: lấy chi tiết texture từ **cùng ảnh gốc**, cắt vào mặt nạ phần thân/quần/dép chuyển động riêng.
- Mặt nghiêng trái/phải và sau lưng: vẽ theo outfit gốc (áo xanh ngọc, họa tiết, quần hoa, dép), **chưa phải ảnh gốc được minh họa lại hoàn chỉnh**.
- Giữ 9 Action; vẫn yêu cầu nghiệm thu ngoại hình từng hướng, hành động, chân bám đất trước khi merge hoặc Production.
