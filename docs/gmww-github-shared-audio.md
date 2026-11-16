# GMWW – Kho Audio gốc dùng chung (GitHub Releases)

**Đích thiết kế:** một file audio được lưu đúng một lần trong GitHub Releases, tên file là SHA-256; một Ván Mẫu chỉ chứa phiên bản kho audio và danh sách ID cần phát. Phòng chơi tải đúng clip theo lượt qua Player Web. Không dùng TTS thay thế, không sao chép nhị phân sang mỗi phòng.

## Hiện trạng được kiểm tra ngày 14/11/2026

Repository chính **không có bất kỳ file .mp3/.m4a/.wav/.ogg rời nào**. Một số clip cũ được nhúng trong JavaScript, nhưng bộ audio gốc đầy đủ đang tồn tại trong IndexedDB tại thiết bị đã gán file. Metadata, tên tệp và `verifiedBinary` không đủ để phát audio. Để đưa toàn bộ file thật lên GitHub cần **một lần xuất audio từ thiết bị**.

## Quy trình một lần, không lộ dữ liệu GM

1. Tại GM Server đang lưu đầy đủ audio: dùng chức năng **XUẤT SAVE** đã có để lưu file `gmww-save-v1` vào Files trên iPhone/iPad. **Không tải nguyên file Save lên GitHub hoặc ChatGPT** (vì chứa dữ liệu không liên quan đến âm thanh).
2. Tải/mở `tools/gmww-audio-extract.html` bằng trình duyệt trên thiết bị, chọn file Save. Trang chạy offline, chỉ tạo `gmww-audio-pack.json` với `{target,mime,size,base64}` của các tệp âm thanh. File này có thể tải lên GitHub vì không chứa người dùng, phòng, token, trạng thái trận. Kiểm tra danh sách clip thiếu được hiển thị ở cuối.
3. Đưa `gmww-audio-pack.json` lên một GitHub Release tạm tên `gmww-audio-import-v1`. Chạy workflow **Publish verified GMWW audio to GitHub Releases** với nguồn `gmww-audio-import-v1` và đích `gmww-audio-v1`. Workflow từ chối đường dẫn nguy hiểm, trùng ID, sai MIME/kích thước, tạo tên file SHA-256, manifest và checksums; chỉ publish phiên bản mới, không ghi đè các bản cũ.
4. Trước khi cho Ván Mẫu sử dụng kho: đối chiếu toàn bộ những ID âm thanh cần thiết theo role/timeline, audio ngày, Lên Giàn và thắng trận; mọi file cần được **nghe thực tế trên iPhone/iPad**. Tích hợp ứng dụng/Worker qua PR độc lập; required CI SUCCESS, smoke Production, rollback. **Không tự động thay thế IPA/Runtime hoặc dữ liệu thật.**

## Mẫu manifest

```json
{
  "format": "gmww-shared-audio-v1",
  "version": 1,
  "releaseTag": "gmww-audio-v1",
  "clips": {
    "system:audio_system_day_wakeup": {
      "sha256": "<SHA-256 thực tế>",
      "mime": "audio/mpeg",
      "size": 0,
      "file": "<SHA-256 thực tế>.mp3",
      "url": "https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-audio-v1/<SHA-256 thực tế>.mp3"
    }
  }
}
```

**Lưu ý:** cấu trúc minh họa, không phải clip thật hay số byte thật. Khi có manifest thật, Worker sẽ dùng allowlist nguồn GitHub, proxy cùng domain, xác thực SHA-256, bảo toàn chính sách chỉ phát audio đúng lượt. Ván Mẫu trỏ đến release cụ thể; cập nhật clip sẽ tạo `gmww-audio-v2`, không ảnh hưởng ván đang chạy.

Phạm vi PR này chỉ tạo công cụ xuất gói Audio an toàn và workflow xuất bản; **chưa tự nhận đã tải bộ audio đầy đủ lên GitHub**, vì chưa có các file gốc của người dùng.
