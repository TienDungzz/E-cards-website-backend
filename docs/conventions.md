# Quy ước dự án

## Nguồn tài liệu

| Nguồn | Nội dung chính |
| --- | --- |
| product/schema.json | Danh mục bảng, cột, nullable, FK đơn và ghi chú constraint |
| product/database.md, product/diagrams/*.md | Sinh từ schema.json, không sửa tay |
| product/api.md | Danh sách endpoint và quy ước HTTP chính |
| product/*.md theo chức năng | Quy tắc nghiệp vụ, request/response chi tiết và các lựa chọn chưa chốt |
| backend, security, templates | Hướng dẫn kỹ thuật và mẫu kiểm chứng; không tự biến thành tính năng runtime |

Khi thay schema: sửa nguồn → docs:generate → docs:images trên Windows → check. JSON schema ở đây là mô hình tài liệu, không phải SQL migration hoặc bằng chứng constraint đã chạy. Ảnh PNG là artifact, nguồn Mermaid và layouts được sinh cùng schema.

## Định dạng và tên

- UTF-8, LF, kết thúc file bằng một newline; không có trailing whitespace. Không format hoặc đọc file .env thật để xử lý tài liệu.
- JavaScript ESM, hai dấu cách, single quote, semicolon; function tối đa 60 dòng theo lint.
- JSON hai dấu cách. Markdown có một H1, heading theo nội dung; có dòng trống quanh bảng/list/code fence.
- Tên file docs dùng kebab-case; bảng/cột và JSON API dùng snake_case. Code provider/GA giữ tên riêng tại adapter, không lan sang contract nội bộ.
- Path API bắt đầu /api/v1; /health là liveness hiện có ngoài prefix. Tên path là hợp đồng, không đổi chỉ để khớp bảng DB.

## Thuật ngữ

| Thuật ngữ | Nghĩa |
| --- | --- |
| card_template / mẫu | Thiết kế có sẵn, đơn vị mua lẻ hiện được đề xuất |
| card / thiệp | Nội dung cụ thể user tạo từ mẫu |
| occasion | Dịp: birthday, wedding, lunar_new_year, halloween |
| card_style | Cách trình bày: scroll, slider, flipbook, masonry |
| guest | Role mặc định của tài khoản đã đăng ký theo thiết kế; không phải anonymous |
| free / plus / purchased | Nguồn quyền sản phẩm, không phải role |
| session | Metadata sid để thu hồi JWT, không phải cookie session thay access Bearer |
| quote / order | Quote là báo giá chưa giữ lượt; order là snapshot checkout bất biến |
| completed / dispatched | Outbox completed sau kết quả nghiệp vụ commit, không phải lúc enqueue Redis |

## Phân biệt trạng thái

Đã triển khai: chỉ HTTP server, launcher môi trường và tooling docs/lint. Đã chọn về sản phẩm: role, free cố định, Plus theo kỳ, mua lẻ vĩnh viễn, cart/discount/analytics, Redis worker và Supervisor. Thư viện, ngưỡng và policy ghi “đề xuất” phải được chốt/kiểm thử trước phát hành. Không ghi check docs thành công là đã chứng minh an toàn thanh toán/JWT/database.
