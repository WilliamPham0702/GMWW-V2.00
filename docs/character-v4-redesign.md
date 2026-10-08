# GMWW – Character Master 01 mới (quyết định chính thức)

> Issue #106 · Ngày 08/10/2026 · Trạng thái: đang thiết kế mẫu, **chưa được nghiệm thu**.
> PR Rig+Skin cũ #99 đã đóng, **không merge**. Production / IPA / Player Web không đổi trong giai đoạn mẫu.

## Quyết định

- Ngừng hoàn toàn hướng lấy **42 artwork chibi cũ** làm bộ cơ sở nhân vật tương lai. Không tiếp tục vá Rig cũ, không thay mặt xong để thân tay chân vẫn vector sơ sài.
- Thiết kế **20 Character mới hoàn toàn** mang phong cách chibi fantasy biển như mẫu đã được chủ dự án lựa chọn.
- **Character Master-01 là cửa nghiệm thu bắt buộc.** Không nhân bản 19 nhân vật khác trước khi master được duyệt cả ngoại hình 4 góc và 9 chuyển động.
- Không xóa thẳng 42 file hiện có khỏi Production vì hiện tại các tài khoản/phòng chơi vẫn có thể tham chiếu chúng; chỉ xóa khỏi luồng lựa chọn sau khi có asset thay thế và công cụ migrate có thể khôi phục. File cũ giữ backup, không đưa vào nghệ thuật của bộ mới.

## Mục tiêu ngoại hình của Master-01

1. Phong cách chibi anime fantasy cao cấp, biển nhiệt đới, độ sâu và bóng đổ nhất quán; không phải dashboard/robot đơn giản.
2. Đầu luôn thẳng (góc nghiêng khi animation **0 độ**), tỷ lệ tay chân và thân không gãy, không xuyên mesh, không lệch đầu so với cổ.
3. Bộ **bốn hình nhìn thực sự khác nhau**, nhất quán nhận diện và outfit:
   - `front`: mặt, thân, tóc trước.
   - `left`: mặt nghiêng trái đúng giải phẫu, quần áo có chiều sâu, không dùng `scaleX(-1)` trên toàn thân để giả hướng.
   - `right`: mặt nghiêng phải thiết kế riêng.
   - `back`: gáy, tóc sau đầu, lưng áo, vai, tay sau, nếp quần, gót dép đúng hướng, **không lộ khuôn mặt trước**.
4. Outfit đầu-tới-chân cùng tông biển, nhất quán đường may/màu/vật liệu giữa mọi góc. Không crop một ảnh full-body rồi cắt làm phần tay chân.
5. Phải rõ động tác khi thu về kích thước 70, 90, 110 px trên nền làng; thân hình dễ nhận biết dù có 30 nhân vật.
6. Từng mặt nhìn được duyệt riêng trước khi animation, ghi hash và phiên bản tránh ảnh cũ quay trở lại.

## Chỉ **9 Action** (không quay lại 39)
`idle`, `walk`, `run`, `sit`, `sit-down`, `stand-up`, `wave`, `vote`, `result`.
- `result` gồm **2 trạng thái** `win` và `lose`, vẫn tính là 1 Action.
- `walk` và `run`: đủ `front/left/right/back`, nhân vật xoay theo hướng đi rồi mới bước.
- `sit`: ngồi xếp bằng thực sự, gót/chân không hình chữ V; đứng↔ngồi có chuyển động trung gian.
- Foot planting trong world-space, không sliding; body alignment và facing không được phụ thuộc vào việc kéo nguyên khung hình.
- Các action khác không nằm trong scope.

## Điều kiện nghiệm thu trước khi nhân rộng
- [ ] Character-01 đã có 4 file hình toàn thân tách biệt, không nền, không chữ/khung UI/biển tên, đồng nhất thiết kế.
- [ ] Artwork mỗi hướng có các phần/layer dùng được cho chuyển động hoặc các sprite frames cho 9 Action; không chỉ là poster tĩnh.
- [ ] Dáng đứng và mặt nghiêng 2 chiều, góc sau lưng được chủ dự án duyệt.
- [ ] 9 Action thể hiện trên MP4 ghi từ **renderer hoạt động**, không phải ảnh minh họa dựng thành video.
- [ ] Đầu không nghiêng/lắc bất kỳ hành động nào.
- [ ] Test 70/90/110 px và 30 nhân vật đồng thời trên iPhone/web.
- [ ] CI JS, video visual review, không dùng 42 asset cũ trong batch v4.
- [ ] Chủ dự án nghiệm thu **Character-01**; sau đó mới thiết kế 19 character còn lại.
- [ ] Chỉ sau đó mới lập kế hoạch thay asset Production/IPA, có backup, migration và rollback.

## Việc đang được làm
- Chuẩn hóa spec, test contract, danh sách 20 slot mới, dựng concept master.
- Các ảnh concept tạo trong chat chỉ là **ý tưởng ngoại hình**, không phải asset sprite / Rig đã nghiệm thu.
