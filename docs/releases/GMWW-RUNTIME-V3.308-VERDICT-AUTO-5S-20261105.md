# GMWW Runtime V3.308 — Phán quyết Lên Giàn tự qua bước sau 5 giây

Ngày: 05/11/2026 · Phạm vi: Worker (Player Web) và Runtime GM (OTA). Không đổi IPA, URL, schema DO, không xóa dữ liệu.

## Yêu cầu
Hộp "PHÁN QUYẾT CỦA ĐẠI DƯƠNG": GM không bấm tắt thì sau 5 giây tự đóng, qua lượt và sang bước kế tiếp (trước là 30 giây).

## Thay đổi
1. GM: hẹn giờ tự xác nhận phán quyết (`battleGallowsAcceptVerdict`) đổi 30 giây → 5 giây, tính từ mốc `resolvedAt` của Server nên mở lại app không đếm lại. Hết giờ thì tự gọi `acknowledge` rồi sang bước kế như bấm TIẾP TỤC.
2. GM: nhãn "tự qua bước sau 5 giây".
3. Player Web: hộp phán quyết tự đóng sau 5 giây, nhãn "Tự đóng sau 5 giây".

## Kiểm thử
- tests/verdict-auto-advance-5s-20261105.test.mjs

## Rollback
- Worker: quay về phiên bản trước trên Cloudflare (gmww-v2-00).
- Runtime: khôi phục V3.307 từ GitHub Releases; không xóa dữ liệu.
