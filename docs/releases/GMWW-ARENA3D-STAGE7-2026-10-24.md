# GMWW Arena 3D — Giai đoạn 7 (24/10/2026)

## Đã triển khai trên nhánh nghiên cứu
- Character chibi biển có chớp mắt, ánh nhìn tập trung khi làm phép, gật đầu, tóc/ống tay dao động và biểu cảm má; chuyển động được tính theo thời gian và chỉ ảnh hưởng lớp render.
- Hàm ngân sách hiệu năng quality/balanced/eco cho 6–30 Character, số hạt và pixel ratio tối đa, giới hạn tần suất animation; chuẩn bị kết nối với vòng render sau khi đo trên iPhone.
- Giữ nguyên các mô hình, nghi lễ và phân quyền Giai đoạn 6.
- Kiểm thử trực tiếp GĐ7: expression, giảm chuyển động, hiệu năng và không lộ vai bí mật.

## Trạng thái
Đây là bản nghiên cứu **chưa hoàn tất GĐ7**, chưa đủ điều kiện nghiệm thu iPhone. Ngân sách chất lượng mới là mô hình tính toán, chưa áp dụng điều chỉnh FPS động vào renderer. Chưa deploy STAGING GĐ7.

## Bảo toàn
PR Draft dựa trên PR #467. Không merge, không deploy Production; không thay đổi 2D, phòng, dữ liệu, Runtime, OTA hay IPA.
