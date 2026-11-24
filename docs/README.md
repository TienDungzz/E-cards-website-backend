# Tài liệu E-cards Website Backend

Runtime hiện có HTTP server tối thiểu, chưa có API nghiệp vụ. Tài liệu phân biệt yêu cầu sản phẩm, thiết kế đề xuất và bằng chứng triển khai.

| Phần | Vai trò |
| --- | --- |
| [Bắt đầu](getting-started.md) | Cài đặt, môi trường và lệnh chạy |
| [Quy ước](conventions.md) | Naming, format, nguồn chính và trạng thái triển khai |
| [Kế hoạch triển khai](product/implementation-plan.md) | Giai đoạn, task và điều kiện nghiệm thu |
| [Sản phẩm](product/README.md) | Phạm vi, quyền, cart/billing/analytics và điểm chưa chốt |
| [Database](product/database.md) | Tự sinh từ [schema.json](product/schema.json) |
| [API](product/api.md) | Danh sách endpoint chuẩn |
| [Sơ đồ ảnh](product/diagrams/README.md) | PNG và nguồn Mermaid được sinh đồng bộ |
| [Backend](backend/README.md) | Phân chia trách nhiệm và tích hợp |
| [Lưu trữ](backend/storage.md) | PostgreSQL Aiven và Cloudinary |
| [Bảo mật](security/README.md) | Quy chuẩn tham chiếu, không thay test thực tế |
| [Chịu tải](backend/reliability.md) | Policy và kiểm chứng vận hành |
| [Chất lượng](quality/README.md) | Checks hiện có và giới hạn bằng chứng |

Các mẫu [hồ sơ](templates/project.md), [review](templates/review.md), [quyết định](templates/decision.md), [bảo mật](templates/security.md) và [capacity](templates/capacity.md) dùng khi có triển khai để ghi bằng chứng thật.
