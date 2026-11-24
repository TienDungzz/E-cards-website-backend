# Tích hợp API frontend

Danh sách endpoint chính tại [product/api.md](../product/api.md), schema tại [database](../product/database.md), ánh xạ form tại [flows](../product/flows.md). Không duy trì bảng endpoint thứ hai tại đây.

Runtime chỉ có GET /health. Frontend đang dùng JSONPlaceholder và chưa gửi submit thiệp lên backend tại lần đối chiếu hiện tại. Khi tích hợp cần base URL theo môi trường, JWT Bearer, refresh cookie/CSRF, version conflict, quote/cart revision và polling các thao tác được chấp nhận bất đồng bộ.

[JWT](../product/authentication.md), [Cloudinary/Aiven](storage.md) và [runtime](../product/runtime-and-request-security.md) xác định ranh giới tích hợp. Tài liệu không phải bằng chứng endpoint đã hoạt động.
