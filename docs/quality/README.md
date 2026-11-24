# Kiểm tra chất lượng

Chạy npm ci trước khi kiểm tra. Node.js nhánh 22 từ 22.13 hoặc 24+; dùng npm.cmd nếu PowerShell chặn npm.ps1.

| Lệnh | Phạm vi |
| --- | --- |
| npm run check:config | Schema cấu hình project-standards.json |
| npm run check:docs | File bắt buộc và liên kết nội bộ |
| npm run check:structure | Tooling và HTTP server đã có |
| npm run check:schema | Kiểu FK đơn/cột/PK trong schema thiết kế và artifact tự sinh không lệch nguồn |
| npm run lint | JavaScript ESM, format cơ bản và tối đa 60 dòng/hàm |
| npm run check:quality | Chạy lint và schema gate |
| npm run check | Docs, cấu trúc và toàn bộ quality gate |
| npm run check:static | Kiểm tra tĩnh, quality gate chưa thực thi |
| npm run docs:generate | Sinh database.md, Mermaid và layouts.json từ schema.json |
| npm run docs:images | Xuất PNG trên Windows bằng System.Drawing |

Nguồn schema là docs/product/schema.json; sửa nguồn rồi generate, xuất ảnh, check. Không sửa artifact tự sinh để vượt gate. check:schema không tạo kết nối PostgreSQL, không chạy DDL, không xác minh đầy đủ constraint liên bảng/partial index hoặc tính đúng nghiệp vụ; xem [kế hoạch toàn vẹn](../product/data-integrity.md).

Quy ước format nằm tại [.editorconfig](../../.editorconfig), [.gitattributes](../../.gitattributes), [ESLint](../../eslint.config.mjs) và [conventions](../conventions.md). Không đọc hoặc format .env thật bằng công cụ tài liệu; .env.example là mẫu công khai.

Các checker nhận --root, --config, --json; quality hỗ trợ --gate và structure hỗ trợ --scope. Bộ điều phối thực thi quality command khi có --run; npm run check đã bao gồm cờ này. Exit code 0 là không có lỗi trong phần đã chạy, 1 là lỗi kiểm tra, 2 là lỗi CLI/cấu hình.

CI cần npm run check:config và npm run check. Hiện chưa có suite test nghiệp vụ, migration, JWT/Redis/payment runtime; không khai báo lệnh test/build giả. JavaScript server chạy trực tiếp, không cần build. Khi có triển khai phải thêm test API/DB/security/provider và bằng chứng phù hợp trước phát hành.

## Security gates chưa triển khai

[Security controls](../product/security-controls.md) định nghĩa secret/dependency scan, auth/authorization/MFA integration, payment/DB concurrency, content security và backup/recovery trước phát hành. Chỉ thêm command vào quality.required khi có công cụ/test thật; hiện chưa có các gate này, không tạo lệnh giả hoặc coi lint là security test.
