# GMWW – Reference Audio theo Ván Mẫu (15/11/2026)

## Thay đổi
- Ván Mẫu giữ `audioReleaseTag=gmww-audio-v1` (phiên bản cố định), phòng Quick Play nhận tham chiếu khi chủ phòng chọn Ván Mẫu. Không copy MP3 vào SQLite hoặc metadata phòng.
- Giữ nguyên engine đêm/ngày, thông báo, audio theo lượt và endpoint Player Web. Chỉ khi cue gốc đã xác định `cards/system/artifacts`, Worker đọc manifest trên GitHub Release và trả **đúng byte MP3** sau khi kiểm SHA-256 + kích thước.
- Chặn URL tùy ý; chỉ URL content-addressed trong repo `WilliamPham0702/GMWW-V2.00` và release tag `gmww-audio-vN`.
- Chỉ người chơi thuộc phòng và clip thuộc lượt đang chạy mới được gọi endpoint audio hiện có.
- Bao gồm fallback cho thông báo sáng và đồng hồ đếm ngược 30 giây.
- Không đổi IPA, Runtime, Cloudflare URL, DO Production và không thêm dịch vụ trả phí.
- **Fail closed:** nếu release/manifest/MP3 chưa có hoặc hash sai, không trả audio mới, vẫn giữ đường cũ khi GM đã nạp clip.

## Nghiệm thu và thứ tự phát hành (bắt buộc)
1. Draft `gmww-audio-import-v1` phải có asset `gmww-audio-v1-verified.zip` và kiểm đúng SHA-256.
2. Tách 74 MP3, `manifest.json` và `checksums.sha256` lên GitHub Release `gmww-audio-v1`; kiểm đầy đủ 76 asset, URL công khai trả nội dung đúng hash. Mỗi bản audio phải giải mã được. Không đổi release đã publish.
3. Required CI của PR tích hợp phải SUCCESS trên HEAD cuối cùng; không bỏ qua Gate. Chỉ sau đó mới merge/phát hành Worker-only, có verify SHA, smoke Production và rollback.
4. iPhone/iPad: test 5 vai liên tục, Sói Tuyết → Bảo Vệ, ngày, 30 giây cuối, Lên Giàn, kết thúc và phe thắng; không phát nhầm, không lặp clip, reconnect tự đúng giờ.
5. 141 liên kết chưa có tệp trong save **chưa được giả định là có audio**; thiếu clip phải báo đúng.

## Rollback
Cloudflare Worker rollback về version trước deploy, giữ DO thật, DNS, IPA, Runtime; GitHub Release assets version cũ giữ nguyên. Không xóa bộ audio hoặc đổi tag của các Ván Mẫu đã lưu.
