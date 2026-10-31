# GMWW-V2.00

## 📦 KHO TẢI RUNTIME CHUNG — MỘT LINK CỐ ĐỊNH

**[MỞ KHO RUNTIME GMWW TRÊN GITHUB RELEASES](https://github.com/WilliamPham0702/GMWW-V2.00/releases)**

- **Mỗi PR/task vẫn độc lập.** Sau khi đủ CI, nghiệm thu và phát hành, file gốc `GMWW-Runtime-Vx.xxx.gmwwupdate` nằm trong cùng kho Releases dưới tag `gmww-runtime-vx.xxx`, cạnh checksum `.sha256` và manifest. Không tạo bản copy chỉ để đưa vào kho.
- **Chọn phiên bản** rồi bấm `Assets → GMWW-Runtime-....gmwwupdate` để tự tải trên iPhone. Chỉ dùng bản đã phát hành; QA chưa merge chỉ có trong [GitHub Actions](https://github.com/WilliamPham0702/GMWW-V2.00/actions), không được coi là Production.
- **Workflow GitHub-first và Production cùng một Release chính thức**: kiểm tra SHA-256 trước khi dùng lại, không ghi đè file/bản phát hành đã có; vẫn cập nhật Server và gửi file trong chat như trước.
- **Bảo toàn an toàn**: bản cũ/rollback và backup tháng được quản lý theo chính sách riêng, không xóa hay sao chép thêm trong thay đổi này.

[Quy tắc lưu trữ & rollback](docs/releases/GMWW-RUNTIME-CENTRAL-ARCHIVE-20261031.md)

Current development version: **V2.26**

## Foundation
- Independent GitHub repository
- Cloudflare Worker deployment
- Worker entry: `src/index.js`
- Health check: `/health`

## Version rule
Every delivered file/release increments sequentially from V2.01.
