# GMWW Action Rig + Skin — Character-01 proof

## Phạm vi được người dùng chốt
39 hạng mục, gồm **33 động tác** thuộc 5 nhóm và **6 khả năng hệ thống** trong nhóm chuyển động nâng cao. Danh sách chuẩn, ID cố định và nhãn tiếng Việt trong `assets/village/rig-skin-core.mjs`.

## Bản mẫu đã xây dựng (không thay Production)
- `assets/village/rig-skin-core.mjs`: bộ clip dạng điều khiển khớp, pose tính theo thời gian, điều chỉnh tốc độ, cá tính, chuyển tiếp và dấu thời gian đồng bộ.
- `assets/village/rig-skin-renderer.mjs`: cấu trúc xương SVG có **từng bộ phận riêng** (không tái dùng một ảnh toàn thân rồi cắt bằng clip-path); cho phép thay palette Skin mà giữ rig.
- `assets/village/rig-skin-demo.html`: phòng lab chọn Action, đổi hai Skin mẫu, tốc độ, chuyển tiếp và mô phỏng 30 instance. Trang tách biệt khỏi Player Web & GM IPA.
- `tests/rig-skin-master.test.mjs`: kiểm tra cấu trúc, danh mục, trạng thái, biến đổi chuyển động, Skin và đồng bộ thời gian.
- `.github/workflows/check-rig-skin-proof.yml`: test Node, smoke bằng local Worker, chụp màn hình ở browser, tải ảnh kiểm thử thành artifact.

## Chưa hoàn thành để sử dụng chính thức
1. Đây là **Skin vector minh họa**, chưa phải Skin bóc tách từ asset `character-01` gốc và chưa đạt nghiệm thu thẩm mỹ.
2. 33 clip đã có mẫu xử lý pose, nhưng vẫn cần review tay, chân, trọng lực, tiếp đất bằng mắt và chỉnh frame/keyframe cho từng clip.
3. Foot-lock hiện chỉ bù chân trong không gian rig; để hết lướt trên địa hình cần phối hợp tọa độ, vận tốc và va chạm của World/Site movement. Không được xem chức năng này hoàn tất trên Production.
4. Dữ liệu đồng bộ timestamp `sampleSynchronizedAction` là **hợp đồng thuần thuật toán**, chưa nối live GM và Player Web hoặc xử lý clock drift thực.
5. Chưa đưa vào `assets/village/village.mjs` và `server-game/current`, chưa phát hành IPA. Không mở rộng Character 02–42 trước khi mẫu Character-01 được nghiệm thu.
6. FPS hiển thị trên trang là chỉ báo chạy thực tế theo trình duyệt, chưa phải cam kết tốc độ trên iPhone hoặc Worker Production.

## Nghiệm thu mẫu cần thực hiện
- Xem cả 33 Action, không có đứt khớp, cắt tay/chân, nhân vật đi như tờ giấy.
- Walk/Run phải thấy bàn chân đưa lên hạ xuống và tay đối xứng, Sit phải xếp bằng sát gọn (không dang chân).
- Switch Skin 1→2 không đổi cấu trúc xương và không tạo chuyển động khác.
- Thử đồng thời 30 bản sao trong lab, đo trên iPhone và máy tính. Không lấy thông số demo desktop làm chuẩn cho production.
- Khi pass mới kết nối runtime Player Web và GM IPA, quản lý phiên bản/rollback và theo dõi đồng bộ.

## Truy cập ở branch/preview
Dùng bản Worker triển khai từ **nhánh thử nghiệm** rồi mở `/village/rig-skin-demo.html`. Trang sẽ không xuất hiện trên Production hiện tại cho đến khi triển khai asset ở môi trường test.
