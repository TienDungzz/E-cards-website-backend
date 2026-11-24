# Kiến trúc backend E-cards

## Hiện trạng

Đã có HTTP server tối thiểu tại src/server.mjs với GET /health; chưa triển khai API nghiệp vụ, database, storage hoặc auth. Backend cung cấp API cho frontend, lưu dữ liệu thiệp trong PostgreSQL trên Aiven và lưu hình ảnh/âm thanh trên Cloudinary. Đây là kiến trúc đã chọn, chưa có kết nối dịch vụ được triển khai. Xem [API đề xuất](api.md).

Frontend có trình sửa thông tin, lời chúc, ảnh, âm thanh, video và kiểu hiển thị. Store edit-card giữ forms trong bộ nhớ, submit chỉ ghi console. Không dùng trạng thái field valid/touched/error làm schema lưu trữ hoặc bằng chứng validation server.

## Phân chia trách nhiệm dự kiến

| Thành phần | Trách nhiệm |
| --- | --- |
| routes/controllers | Nhận HTTP request, gọi service, trả response |
| validation | Kiểm tra payload, query, params và kích thước |
| services | Nghiệp vụ thiệp, quyền sở hữu và chia sẻ |
| repositories | Truy cập dữ liệu và transaction |
| gateways | Tích hợp storage và dịch vụ ngoài |
| middlewares | Xác thực, request ID, xử lý lỗi và giới hạn request |

Đây là thiết kế, chưa phải cây thư mục hiện có. Chỉ tạo module khi có triển khai. Chỉ thêm dependency khi có mã sử dụng thực tế.

## Dữ liệu

Thiệp dự kiến có định danh, chủ sở hữu là tài khoản đã đăng nhập, trạng thái nháp/công khai, nội dung đã validate và thời gian tạo/cập nhật. PostgreSQL chỉ lưu metadata/tham chiếu Cloudinary; không lưu URL blob tạm của browser. Nội dung Editor.js cần schema và allowlist block.

Cloudinary là nơi lưu hình ảnh và âm thanh đã chọn. Frontend có cấu hình Cloudinary công khai, chưa xác nhận luồng upload hoàn chỉnh. Khi triển khai, secret và việc ký upload thuộc backend. Chi tiết tại [lưu trữ và tích hợp](storage.md). Endpoint xem trước link hiện là mẫu bên thứ ba; cần chốt provider và kiểm soát URL trước khi tích hợp server.

Trước phát hành cần migration PostgreSQL, test API/quyền truy cập, giới hạn payload/upload, CORS theo origin thực tế, quản lý secret và log không chứa nội dung riêng tư. Xem [bảo mật](../security/README.md), [chịu tải](reliability.md) và [chất lượng](../quality/README.md).

## Nguồn thiết kế

[Product](../product/README.md) giữ quy tắc E-cards; [schema.json](../product/schema.json) sinh database/sơ đồ, [API](../product/api.md) là danh sách endpoint chính. JWT đã chốt; rate limit/Redis worker/Supervisor đã nằm trong phạm vi thiết kế, chưa chạy trong runtime.
