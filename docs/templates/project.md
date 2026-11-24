# Hồ sơ dự án: <tên dự án>

Sao chép file này thành `docs/project.md` ở dự án đích và thay toàn bộ chỗ giữ chỗ trước bàn giao.

| Thuộc tính | Giá trị cần điền |
| --- | --- |
| Mục tiêu, người dùng | Chức năng chính và phạm vi |
| Người phụ trách | Nhóm / vai trò |
| Bộ quy chuẩn | v1.0.0; ngày áp dụng |
| Stack và phiên bản | Ngôn ngữ, runtime, framework, database, Redis/queue và công cụ vận hành nếu có |
| Kiến trúc | Repo đơn / monorepo; sơ đồ các phần giao tiếp |
| Cài đặt và chạy | Lệnh từ checkout sạch, file env mẫu, migrate/seed nếu dùng |
| Test và build | Lệnh thật; bước cần dịch vụ phụ trợ |
| Triển khai / rollback | Môi trường, pipeline, health check, cách phục hồi |

## Kiến trúc đã chốt cho E-cards

Backend cung cấp API cho frontend. PostgreSQL trên Aiven lưu dữ liệu nghiệp vụ; Cloudinary lưu hình ảnh và âm thanh. JWT access/refresh đã chốt; HTTP framework và driver/ORM chưa chốt. Redis worker và Supervisor thuộc thiết kế, chưa triển khai. Xem [thiết kế lưu trữ](../backend/storage.md).

## Ánh xạ các thành phần

Điền từng thành phần có dùng; xóa hàng không liên quan sau khi ghi lý do không áp dụng. Đường dẫn bên dưới chỉ là gợi ý.

| Phạm vi / thành phần | Có dùng? | Đường dẫn thực tế | Trách nhiệm / lý do không áp dụng |
| --- | --- | --- | --- |
| Backend routes / controllers | Điền | apps/api/src/modules/<feature> | HTTP boundary |
| Validation / middlewares | Điền | Điền | Dữ liệu ngoài, auth, lỗi |
| Services / repositories | Điền | Điền | Use case / persistence |
| Gateways / adapters | Điền | Điền | Tích hợp dịch vụ ngoài |
| Jobs / events / migrations | Điền | Điền | Tác vụ nền / dữ liệu |
| Authentication / authorization / policies | Điền | Điền | Xác thực, quyền theo tài nguyên và tenant |
| Rate limit / timeouts / concurrency | Điền | Điền | Chặn lạm dụng và giới hạn công việc đang xử lý |
| Cache / queue / workers | Điền | Điền | Có dùng thì ghi TTL, dung lượng, retry và quyền sở hữu dữ liệu |
| Observability / health / edge config | Điền | Điền | Số đo, cảnh báo, readiness, proxy tin cậy và bảo vệ origin |
| Security / load tests | Điền | Điền | Test quyền, limiter, lỗi phụ thuộc, ngưỡng tải |

## Chất lượng và hiệu năng

- Danh sách quality gate, lệnh chạy thật, entry point động cần bảo vệ khi tìm dead code.
- Giới hạn `code.maxFunctionLines`: mặc định 60 dòng/hàm, tính cả dòng trống/comment và hai dòng biên; ghi giá trị chọn, lý do điều chỉnh, parser và phạm vi lint thực tế.
- Test nghiệp vụ quan trọng và ranh giới tích hợp; cách tạo dữ liệu test.
- Các dịch vụ ngoài, timeout/retry, giới hạn request và xử lý khi dịch vụ lỗi.

## Bảo mật và năng lực backend

Điền bằng chứng thật theo `docs/security/README.md` và `docs/backend/reliability.md`. Sao chép mẫu `docs/templates/security.md` thành `docs/security-review.md`, mẫu `docs/templates/capacity.md` thành `docs/capacity.md`; thay chỗ giữ chỗ và điều chỉnh liên kết theo vị trí sau khi chép.

- Phân loại dữ liệu, sơ đồ trust boundary, endpoint công khai/quản trị, bảng quyền theo role/object/tenant và abuse cases.
- Secret store và quyền truy cập, quy trình cấp/thu hồi/rotation, phạm vi audit log và thời hạn lưu không lộ bí mật.
- Cơ chế session/token, CSRF/CORS/CSP theo chức năng, validation, upload/webhook/SSRF nếu áp dụng.
- Mỗi nhóm endpoint: identity dùng tính quota, rate/window/burst, kích thước body/response, timeout và concurrent work tối đa. Ghi rõ xử lý khi limiter/cache/DB/queue lỗi.
- Đường đi qua CDN/WAF/load balancer nếu dùng, cách chặn truy cập origin vòng qua lớp bảo vệ, danh sách proxy tin cậy và cách xác định client IP.
- Mức tải mục tiêu, p95/p99, error/reject rate, số replica, ngân sách CPU/RAM/connection pool/queue/chi phí dịch vụ ngoài; báo cáo burst/sustained/soak và phục hồi.
- Lệnh security test, secret/dependency/SAST scan, môi trường load test, ngưỡng chặn CI và kết quả theo đúng commit.
- Runbook ứng phó sự cố, người trực, cảnh báo, rollback và khôi phục backup đã thử với RPO/RTO theo yêu cầu dự án.

## Tài liệu bổ sung

Ghi vị trí API contract, runbook, backup/restore và ADR thực tế bằng liên kết khi đã tạo. Không để liên kết tới file chưa tồn tại.

## Ngoại lệ

| Quy tắc | Phạm vi và lý do | Cách giảm tác động | Người duyệt | Ngày xem lại |
| --- | --- | --- | --- | --- |
| Điền hoặc ghi không có | Điền | Điền | Điền | Điền | YYYY-MM-DD |
