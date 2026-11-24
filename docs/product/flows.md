# Luồng frontend và nghiệp vụ

Frontend tham chiếu nằm ở ../E-cards-website. Tại lần đối chiếu hiện tại, API store gọi JSONPlaceholder và submit edit-card chỉ ghi console. Backend chưa có API sản phẩm. Endpoint chuẩn tra tại [API](api.md).

## Đăng nhập và quyền

Login nhận JWT vào bộ nhớ và refresh cookie HttpOnly. Frontend gọi auth/me và me/entitlements để hiển thị role/nguồn quyền; backend kiểm tra lại mọi thao tác. Access hết hạn dùng refresh single-flight, phối hợp nhiều tab; logout thu hồi sid. Không lưu access/refresh token vào localStorage hoặc nhúng secret trong bundle.

## Ánh xạ form

| Field frontend | Payload/API dự kiến |
| --- | --- |
| your_name, your_email | sender_name, sender_email |
| recipient_name, recipient_email | Giữ nguyên; không trả email qua share |
| schedule_delivery | delivery_date, chỉ ngày dự kiến |
| recipient_timezone, cover_message | Giữ nguyên |
| type, style | occasion_id, style_id; không thay template_id |
| background_color, heading_color, text_color | #RRGGBB đã validate |
| Editor.js blocks | wishes, allowlist block và renderer an toàn |
| photo, photo_caption | Upload image → media_id, role=image, caption |
| audio, audio_caption | Upload audio → media_id, role=audio, caption |
| video, video_caption | Chưa nằm trong phạm vi đã chốt |

Chỉ gửi giá trị nghiệp vụ; không gửi nguyên forms/value/valid/touched/error. File/blob URL phục vụ preview/upload, không lưu làm URL thiệp.

## Tạo, upload và chia sẻ

1. Tải danh mục mẫu/dịp/kiểu và entitlement; chọn mẫu theo free đã khóa, license hoặc Plus.
2. Tạo draft với template_id và nguồn quyền khi cần xác nhận; PATCH theo version. Xung đột 409 phải tải/đối chiếu lại, không ghi đè âm thầm.
3. Tạo upload intent → upload Cloudinary → complete xác minh → gắn media_id ready. Tháo media khỏi nháp không tự xóa asset/snapshot.
4. Publish tạo snapshot và token mới. Sửa nháp không đổi snapshot cũ; card_share_media giữ FK asset đã publish.
5. Unpublish/xóa card thu hồi API share. Plus hết thời hạn ngừng phục vụ snapshot; free/purchased không hết chỉ vì subscription hết.

Free lựa chọn đầu được khóa theo user và không reset do xóa card. Plus ghi mẫu vào usage mỗi kỳ, không hoàn lượt. Renew-access gia hạn từng card theo kỳ mới; activate-purchased-access đổi sang license phù hợp, không tự phục hồi link đã revoke/hết expires_at.

## Mua hàng và discount

Thêm nhiều mẫu khác nhau vào cart, có thể có tối đa một Plus theo đề xuất giỏ hỗn hợp. Quote có hạn chưa giữ lượt. Checkout xác minh quote/cart version, giá và code; order nhiều dòng bất biến, discount phân bổ về từng item. Thay giá/giỏ trước checkout trả QUOTE_STALE và cần xác nhận lại.

Provider xác nhận tiền qua webhook đã xác minh; worker đối soát rồi commit toàn bộ fulfillment/license/kỳ. Return page chỉ đọc lại order. Thanh toán thành công dọn đúng cart item revision đã checkout, không xóa dòng mới. Total=0 dùng flow nội bộ, không tạo payment giả.

## Vận hành và analytics

API ghi outbox trong PostgreSQL, worker Redis xử lý idempotent; Supervisor chạy API/worker trên Linux khi runtime có sẵn. Admin đọc doanh thu từ ledger DB; traffic từ GA4 qua backend. GA users không phải số tài khoản. Các giới hạn/quy trình đang là thiết kế; provider email/video/link preview và policy còn mở được tập trung tại [tổng quan](README.md).
