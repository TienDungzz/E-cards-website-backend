# Sản phẩm E-cards

Backend phục vụ tạo/chia sẻ thiệp điện tử. Hiện chỉ `GET /health` hoạt động; toàn bộ schema/API sản phẩm dưới đây là thiết kế, chưa có migration hoặc integration test.

## Quy tắc đã xác nhận

- Có đăng nhập; role gồm admin, staff, guest. Thiết kế bổ sung MFA bắt buộc admin/staff và reauth cho thao tác nhạy cảm. JWT access token và refresh token opaque trong cookie HttpOnly; quyền vẫn kiểm tra ở backend.
- Free khóa một mẫu theo tài khoản từ lần tạo free thành công đầu tiên; xóa thiệp/nâng hạ gói không đổi lựa chọn.
- Plus mở tính năng/mẫu trong kỳ đã trả, có hạn thời gian và số mẫu; đổi/xóa thiệp không hoàn lượt. Thiệp Plus hết quyền ngừng phục vụ công khai.
- Mẫu mua lẻ có giá riêng và license vĩnh viễn; quyền này không hết khi Plus hết hạn, không đổi role hay khóa free.
- Cart chứa nhiều mẫu; discount hỗ trợ sản phẩm hoặc tổng giỏ, theo % hoặc số tiền.
- PostgreSQL trên Aiven lưu nghiệp vụ; Cloudinary lưu ảnh/âm thanh; Redis dùng cho limiter/worker và Supervisor quản lý process Linux.
- Doanh thu từ DB/provider đã đối soát; traffic từ GA4; số tài khoản không được suy từ GA users.

## Tài liệu chính

| Tài liệu | Phạm vi |
| --- | --- |
| [Kế hoạch triển khai](implementation-plan.md) | 9 giai đoạn, task checklist và nhật ký thực hiện |
| [API](api.md) | Danh sách endpoint và contract chung |
| [Database](database.md) / [nguồn schema](schema.json) | Schema hợp nhất, cột và constraint dự kiến |
| [Ảnh sơ đồ](diagrams/README.md) | Tổng thể và từng nhóm nghiệp vụ |
| [Quyền và subscription](access-and-subscriptions.md) | Role, free/Plus/purchased và vòng đời quyền |
| [Security controls](security-controls.md) | MFA, reauth, session, upload, secret và release gates |
| [JWT](authentication.md) | Token, cookie, rotation và thu hồi |
| [Giá và discount](pricing-and-discounts.md) | Mua lẻ, công thức giảm, giữ lượt và thanh toán |
| [Cart và checkout](cart-and-checkout.md) | Nhiều dòng, quote, phân bổ tiền và dọn giỏ |
| [Analytics](analytics.md) | Chỉ số tiền, GA4 và API quản trị |
| [Runtime](runtime-and-request-security.md) | Rate limit, worker, Supervisor và browser trust |
| [Tính toàn vẹn](data-integrity.md) | Composite FK, transaction, outbox và test bắt buộc |
| [Luồng frontend](flows.md) | Ánh xạ form và hành vi tích hợp |

## Điểm còn cần chốt

Thiết kế coi guest là khách hàng đã có tài khoản và đơn vị mua lẻ là một mẫu (không phải một bản thiệp hoặc cả occasion). Quyền hỗ trợ chi tiết của staff, danh mục free, giá/chu kỳ/quota Plus, feature đi kèm mua lẻ, provider thanh toán, thuế/refund/chargeback và retention cần chốt trước triển khai.

Giỏ hỗn hợp Plus+mẫu và gia hạn quyền từng thiệp là cách triển khai đề xuất. Video, link preview, provider email và giờ gửi tự động chưa chốt; delivery_date chỉ là ngày dự kiến. Không tự thêm khả năng gửi email chỉ vì form frontend đã có trường ngày.

Bắt đầu từ [quy ước](../conventions.md), [cài đặt](../getting-started.md) và [kiến trúc](../backend/README.md).
