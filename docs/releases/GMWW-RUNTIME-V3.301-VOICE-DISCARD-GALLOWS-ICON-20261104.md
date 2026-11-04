# GMWW Runtime V3.301 — Hủy thoại chưa gửi + icon Lên Giàn mẫu B (04/11/2026)

**Loại:** Runtime OTA (`.gmwwupdate` + SHA-256), Worker và Player Web. **Không đổi IPA** (shell vẫn là V3.264), không đổi dữ liệu, DO hay URL.

## Có gì mới
- **Thoại (GM + Player Web):** nút 🗑️ hủy bản ghi đang thu hoặc bản nháp chưa gửi.
  - Không gửi gì lên server, không xóa tin đã gửi.
  - Gửi thoại vẫn bằng nút ↑ như cũ. (PR #786)
- **Lên Giàn (GM):** lệnh **MỞ ĐỀ CỬ** dùng icon dây treo + cờ sói (mẫu B). Player Web đã có icon này từ PR #798. Cách vote không đổi.

## Kiểm thử
- Test hủy thoại `tests/gmww-chat-voice-discard-20261104.test.mjs`, test icon B, bộ ghép GM/Player và kiểm đồng bộ phiên bản: ĐẠT.
- Toàn bộ `npm test`: không có lỗi mới.

## Nghiệm thu trên iPhone
1. Mở phòng Online.
2. Ghi một đoạn thoại, bấm 🗑️: bản nháp biến mất và không có tin nào được gửi.
3. Ghi lại một đoạn, bấm ↑: tin được gửi bình thường.
4. Ban ngày mở **MỞ ĐỀ CỬ**: icon B hiển thị đúng.

## Rollback
Kích hoạt lại Runtime V3.300 (bản OTA trước vẫn còn trên GitHub Releases); Worker rollback về version trước theo quy trình V3.
