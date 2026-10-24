# GMWW Arena 3D — Character & hiệu ứng phép thuật biển (24/10/2026)

## Mục đích
Tiếp tục bản Arena 3D PR #452, sau giai đoạn nhân vật đứng dậy, bước vào vùng làm phép và trở về ghế. Tăng sức biểu cảm chibi và làm hiệu ứng phân biệt từng nhóm hành động mà không tự thay đổi luật hay công bố vai trò bí mật.

## Release notes tiếng Việt
1. **Bộ phép thuật 3D theo màu biển** (`assets/village/arena-3d/spell-vfx.mjs`): thêm vòng glyph tại người thi triển và mục tiêu, ngọc phát sáng, cầu ánh sáng tại mục tiêu. Mỗi nhóm phép có màu và ký hiệu riêng:
   - Bảo Vệ: turquoise và biểu tượng vỏ sò.
   - Tiên Tri: tím ngọc trai / sao.
   - Phù Thủy cứu: xanh ngọc / sen biển.
   - Tấn công: hồng ánh trăng; không áp dụng luật chết ngay.
   - Lên Giàn/Bỏ phiếu: vàng ngọc trai.
2. **Phân quyền không đổi**: chỉ khi Core STAGING đã xác thực quyền GM và trả về cue phép hợp lệ mới kích hoạt VFX vào đúng người/đúng mục tiêu. Không đoán vai/đích trên client, không phát cue bí mật xuống Player Web. Mẫu phòng giả chỉ mô phỏng hiệu ứng cục bộ.
3. **Character anime/chibi biển**: bổ sung má hồng, cổ áo thủy thủ và biến thể tóc đuôi bên; giữ phụ kiện, phối màu và biểu cảm gốc. Đây vẫn là **mô hình procedural kỹ thuật**, chưa phải 40 model nghệ thuật thủ công.
4. **Giới hạn GPU**: vòng glyph và hạt ngọc sử dụng hình học tái sử dụng/InstancedMesh, tối đa **4 draw calls** mới khi có phép. Các Character vẫn chia sẻ geometry cho 6–30 người. Hiệu ứng 16 hạt mặc định, 7 hạt ở chế độ tiết kiệm pin, 4 hạt khi người dùng chọn reduced motion; tắt hẳn khi phép kết thúc.
5. **Kết nối chế độ tiết kiệm pin**: nút trong GM Dashboard cập nhật số hạt thay vì thay đổi bất kỳ trạng thái game nào.
6. **Không ảnh hưởng Seat**: người thi triển đang bước ra làm phép theo lượt Core; hiệu ứng hướng tới đúng vị trí hiển thị hiện thời, ghế vẫn đứng tại vị trí gốc, chuyển lượt thì xóa VFX cũ.
7. **Kiểm thử đúng phạm vi**: `tests/arena3d-spell-vfx.test.mjs`, `tests/arena3d-phase3.test.mjs`, `tests/arena3d-phase4.test.mjs`, `tests/arena3d-casting.test.mjs`; thêm kiểm chứng Chromium/WebKit màn hình iPhone tại Worker STAGING. Không kích hoạt test IPA, OTA hoặc game 2D không liên quan theo ý định tác vụ.

## Hạn chế & điều kiện nghiệm thu
- Đây là bản dựng 3D chibi kỹ thuật và các glyph cơ bản, chưa phải nghệ thuật 3D sculpt/VFX hoàn chỉnh bằng độ phân giải và chiều sâu của ảnh concept.
- Chưa có phép đo nhiệt/pin/FPS Safari iPhone vật lý; GPU phần mềm GitHub CI có thể chậm hơn thực tế.
- Hiệu ứng chỉ được kích hoạt cho actionId được Core map/allowlist và đúng quyền hiện hành; vai trò chưa map sẽ không tự chạy phép.

## Link & rollback
- Preview: `https://gmww-arena3d-core-staging.williampham0702.workers.dev/village/arena-3d/live.html`.
- PR #452 tiếp tục **Draft**, **không merge main**, không deploy Production, không thay đổi GMWW Core/Room/Durable Object Production, Runtime/OTA, IPA hoặc game 2D Production.
- Nếu phát sinh lỗi Staging, rollback bằng cách redeploy commit Worker STAGING đã kiểm tra thành công trước phần spell glyphs; không cần rollback Production.
