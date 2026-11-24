# API E-cards

Đây là danh sách endpoint chuẩn của thiết kế. **Chỉ GET /health đã triển khai**; các endpoint /api/v1 còn lại chưa có runtime hoặc integration test.

## Quy ước chung

- JWT Bearer cho API bảo vệ; auth refresh/logout dùng cookie và CSRF theo [JWT](authentication.md). Role/status/ownership/entitlement kiểm tra hiện tại, không nhận user_id/role từ client.
- JSON snake_case, success dạng {"data":...}, danh sách có meta.next_cursor; DELETE 204 không body, ngoại trừ giỏ trả 200 với giỏ mới và media DELETE trả 202.
- /health hiện trả {"status":"ok"}, là ngoại lệ envelope duy nhất đã triển khai.
- Money bigint gửi chuỗi số nguyên, currency riêng; version/limit là integer an toàn. Timestamp ISO 8601 UTC, date YYYY-MM-DD.
- Pagination limit mặc định 20/tối đa 100; cursor opaque ổn định theo (thời gian,id). Analytics có filter riêng.
- Lỗi gồm error.code, error.message, error.request_id và error.fields khi phù hợp, không có stack trace. X-Request-Id được server tạo/validate và dùng để đối chiếu.
- PATCH yêu cầu version; DELETE card/cart dùng If-Match quoted integer. Thiếu/sai version trả 400, version cũ 409; resource không thuộc quyền trả 404. Body field lạ bị từ chối.
- Idempotency-Key gắn user, endpoint và payload hash; cùng key/cùng payload trả cùng kết quả, khác payload 409. Không dùng signature/secret nhúng browser làm auth.

| HTTP | Mã tiêu biểu |
| --- | --- |
| 400 | VALIDATION_ERROR, DISCOUNT_NOT_APPLICABLE |
| 401 | UNAUTHENTICATED, INVALID_ACCESS_TOKEN, INVALID_REFRESH_TOKEN, AUTHENTICATION_FAILED |
| 403 | FORBIDDEN, FEATURE_NOT_AVAILABLE, FREE_TEMPLATE_LOCKED, SUBSCRIPTION_EXPIRED |
| 404 | NOT_FOUND; bao gồm share hết quyền/thu hồi |
| 409 | VERSION_CONFLICT, QUOTE_STALE, MEDIA_IN_USE, TEMPLATE_QUOTA_EXCEEDED, CHECKOUT_PENDING, DISCOUNT_LIMIT_REACHED |
| 413 | PAYLOAD_TOO_LARGE |
| 429 | RATE_LIMITED, có Retry-After |
| 502/503 | PROVIDER_ERROR, SERVICE_UNAVAILABLE, ANALYTICS_SOURCE_UNAVAILABLE |

## Endpoint

Các bảng dùng đường dẫn đầy đủ, không cần ghép prefix ngầm. Optional JWT: anonymous chỉ nhận thông tin công khai; JWT được gửi nhưng không hợp lệ phải trả 401.

### Hệ thống và danh mục

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| GET | `/health` | Public | 200 | Liveness hiện đã triển khai |
| GET | `/api/v1/occasions` | Public | 200 | Danh mục dịp active |
| GET | `/api/v1/card-styles` | Public | 200 | Kiểu hiển thị active |
| GET | `/api/v1/card-templates` | Public/optional JWT | 200 | Danh mục/preview, quyền khi có danh tính |
| GET | `/api/v1/card-templates/:id` | Public/optional JWT | 200 | Metadata/giá, không lộ thiết kế bị khóa |
| GET | `/api/v1/plans` | Public | 200 | Phiên bản gói/giá đang bán |

### Đăng nhập

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Public + rate limit | 201 | email/password/display_name; server đặt guest |
| POST | `/api/v1/auth/login` | CSRF policy + rate limit | 200/202 | Token nếu đủ yếu tố; MFA pending chỉ challenge, không access/refresh |
| POST | `/api/v1/auth/refresh` | Refresh cookie + CSRF | 200 | Rotate refresh, access JWT mới |
| POST | `/api/v1/auth/logout` | Refresh cookie + CSRF | 204 | Idempotent, thu hồi sid, không cần access còn hạn |
| POST | `/api/v1/auth/logout-all` | JWT | 204 | Thu hồi mọi session user |
| GET | `/api/v1/auth/me` | JWT | 200 | Profile/role/status hiện tại |
| POST | `/api/v1/auth/verification-requests` | JWT + rate limit | 202 | Yêu cầu email, chỉ bật khi có provider |
| POST | `/api/v1/auth/verify-email` | Token một lần | 204 | Token có hạn, dùng một lần |
| POST | `/api/v1/auth/password-reset-requests` | Public + rate limit | 202 | Response chung không dò email |
| POST | `/api/v1/auth/password-resets` | Token một lần | 204 | Đổi password, thu hồi mọi session |

### MFA, xác thực lại và phiên

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/mfa/login-verifications` | Login challenge + CSRF/rate limit | 200 | WebAuthn assertion hợp lệ mới cấp token |
| POST | `/api/v1/auth/mfa/registration-options` | JWT + reauth hoặc bootstrap/recovery được kiểm soát | 200 | Creation options, purpose enroll, không quyền business mới |
| POST | `/api/v1/auth/mfa/registration-verifications` | Đúng enrollment challenge | 201 | Xác minh credential, enroll; không tự vượt policy recovery đặc quyền |
| GET | `/api/v1/me/mfa/credentials` | JWT owner | 200 | Metadata credential của mình, không public key/blob assertion |
| DELETE | `/api/v1/me/mfa/credentials/:id` | JWT owner + reauth | 204 | Revoke, không xóa yếu tố cuối admin/staff |
| POST | `/api/v1/me/mfa/recovery-codes` | JWT + reauth mạnh | 201 | Rotate code, hiển thị một lần, thu hồi bộ cũ |
| POST | `/api/v1/auth/mfa/recovery-verifications` | Password-proven recovery challenge + rate limit | 200 | Capability phục hồi giới hạn, không business/đặc quyền token |
| POST | `/api/v1/auth/reauth/options` | JWT | 200 | Bind action/resource/payload/version, tạo challenge có hạn |
| POST | `/api/v1/auth/reauth/verifications` | JWT + challenge/proof phù hợp policy | 200 | Cấp reauth grant opaque một lần |
| GET | `/api/v1/me/sessions` | JWT owner | 200 | Danh sách phiên của mình, metadata tối thiểu |
| DELETE | `/api/v1/me/sessions/:id` | JWT owner | 204 | Thu hồi phiên; nếu phiên hiện tại thì xóa cookie |

Admin/staff phải hoàn thành MFA, không tự enroll bằng password bị đánh cắp. Guest đã bật MFA không fallback password-only. Challenge/capability recovery chỉ có mục đích hẹp, có TTL/attempt cap và không được dùng như JWT. X-Reauth-Token gắn đúng request, consume cùng transaction thay đổi/audit. Trình tự chi tiết tại [security controls](security-controls.md).

### Thiệp và chia sẻ

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/cards` | JWT owner | 200 | Danh sách của mình; status/limit/cursor |
| POST | `/api/v1/cards` | JWT + entitlement | 201 | Tạo draft, khóa free hoặc ghi quota/license |
| GET | `/api/v1/cards/:id` | JWT owner | 200 | Tài nguyên; hết quyền Plus chỉ metadata quản lý |
| PATCH | `/api/v1/cards/:id` | JWT owner + entitlement | 200 | version bắt buộc, cập nhật và tăng version |
| DELETE | `/api/v1/cards/:id` | JWT owner | 204 | If-Match version, thu hồi share |
| POST | `/api/v1/cards/:id/publish` | JWT owner + entitlement | 200 | version; snapshot mới và token share mới |
| POST | `/api/v1/cards/:id/unpublish` | JWT owner | 200 | version; thu hồi link, trạng thái draft |
| POST | `/api/v1/cards/:id/renew-access` | JWT owner + Plus | 200 | version; quota kỳ mới, card/snapshot cùng mẫu |
| POST | `/api/v1/cards/:id/activate-purchased-access` | JWT owner + license | 200 | version; đổi Plus sang purchased đúng mẫu |
| GET | `/api/v1/shared-cards/:token` | Link còn quyền | 200 | Snapshot đã lọc; hết hạn/revoke trả 404 |

### Media

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/media/upload-intents` | JWT + quota | 201 | kind=image/audio, giữ quota |
| POST | `/api/v1/media/upload-intents/:id/complete` | JWT owner | 200 | Xác minh provider, retry trả cùng media |
| GET | `/api/v1/media` | JWT | 200 | kind/limit/cursor, thư viện của mình |
| GET | `/api/v1/media/:id` | JWT owner | 200 | Metadata và trạng thái xóa |
| DELETE | `/api/v1/media/:id` | JWT owner | 202 | Đánh dấu deleting + outbox; 409 nếu còn tham chiếu |

### Giỏ, quote và thanh toán

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/cart` | JWT | 200 | Giỏ active và version |
| POST | `/api/v1/cart/items` | JWT | 200 | product_type/price_id/cart_version; quantity=1 |
| PATCH | `/api/v1/cart/items/:id` | JWT owner | 200 | price_id/cart_version; tăng item revision/cart version |
| DELETE | `/api/v1/cart/items/:id` | JWT owner | 200 | If-Match cart version, trả giỏ mới |
| DELETE | `/api/v1/cart/items` | JWT owner | 200 | If-Match, xóa dòng giỏ không hủy order |
| POST | `/api/v1/billing/quotes` | JWT | 200 | Cart hoặc direct, discount_code; chưa giữ lượt |
| POST | `/api/v1/billing/checkouts` | JWT + Idempotency-Key | 201 | quote_id, cart_version nếu từ giỏ; tạo order/outbox |
| POST | `/api/v1/billing/webhooks/:provider` | Provider signature | 200/204 | Ack sau inbox+outbox bền vững; không chờ fulfillment |
| GET | `/api/v1/me/orders` | JWT | 200 | Đơn của mình, phân trang |
| GET | `/api/v1/me/orders/:id` | JWT owner | 200 | Trạng thái, breakdown và checkout_url nếu đã sẵn sàng |
| GET | `/api/v1/me/template-licenses` | JWT | 200 | License của mình, phân trang |
| GET | `/api/v1/me/entitlements` | JWT | 200 | Free lock, license, kỳ/quota và feature hiện tại |
| GET | `/api/v1/me/subscription` | JWT | 200 | Subscription hiện tại hoặc data=null |
| POST | `/api/v1/me/subscription/cancel` | JWT owner | 200 | Provider xác nhận hủy gia hạn, không tự refund |

### Hỗ trợ và quản trị

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/staff/users` | staff/admin | 200 | Projection tối thiểu và phân trang |
| GET | `/api/v1/staff/orders/:id` | staff/admin | 200 | Thông tin hỗ trợ theo policy |
| PATCH | `/api/v1/admin/users/:id/role` | admin | 200 | role/reason + reauth; user đã enroll MFA khi nâng quyền, revoke phiên, audit |
| PATCH | `/api/v1/admin/users/:id/status` | admin | 200 | active/suspended + reason/reauth; thu hồi session khi khóa |
| POST | `/api/v1/admin/plans` | admin | 201 | Gói draft |
| POST | `/api/v1/admin/plans/:id/versions` | admin | 201 | Phiên bản quyền draft |
| POST | `/api/v1/admin/plan-versions/:id/prices` | admin | 201 | Giá gói |
| POST | `/api/v1/admin/plan-versions/:id/publish` | admin | 200 | Validate và khóa phiên bản |
| PATCH | `/api/v1/admin/plans/:id/availability` | admin | 200 | Chỉ đổi khả năng bán mới |
| POST | `/api/v1/admin/card-templates/:id/prices` | admin | 201 | Giá mua mẫu mới, không sửa giá đã dùng |
| POST | `/api/v1/admin/discounts` | admin | 201 | Code draft và limits dùng chung |
| POST | `/api/v1/admin/discounts/:id/versions` | admin | 201 | Điều kiện/công thức draft |
| POST | `/api/v1/admin/discount-versions/:id/publish` | admin | 200 | Phát hành version bất biến |
| PATCH | `/api/v1/admin/discounts/:id/availability` | admin | 200 | Đổi is_active cho checkout mới |
| GET | `/api/v1/admin/audit-logs` | admin | 200 | Log đã lọc, phân trang |

### Analytics

| Method | Path | Quyền | HTTP | Mục đích |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/analytics/revenue/summary` | admin | 200 | PostgreSQL/ledger, không dùng GA revenue |
| GET | `/api/v1/admin/analytics/revenue/timeseries` | admin | 200 | PostgreSQL/ledger, không dùng GA revenue |
| GET | `/api/v1/admin/analytics/revenue/products` | admin | 200 | PostgreSQL/ledger, không dùng GA revenue |
| GET | `/api/v1/admin/analytics/revenue/discounts` | admin | 200 | PostgreSQL/ledger, không dùng GA revenue |
| GET | `/api/v1/admin/analytics/revenue/reconciliation` | admin | 200 | PostgreSQL/ledger, không dùng GA revenue |
| GET | `/api/v1/admin/analytics/customers/summary` | admin | 200 | PostgreSQL/ledger, không dùng GA revenue |
| GET | `/api/v1/admin/analytics/traffic/summary` | admin | 200 | GA4 qua backend, metadata freshness |
| GET | `/api/v1/admin/analytics/traffic/timeseries` | admin | 200 | GA4 qua backend, metadata freshness |
| GET | `/api/v1/admin/analytics/traffic/acquisition` | admin | 200 | GA4 qua backend, metadata freshness |
| GET | `/api/v1/admin/analytics/traffic/pages` | admin | 200 | GA4 qua backend, metadata freshness |

## Thiệp: payload và vòng đời

POST cards yêu cầu template_id; access_tier có thể đề nghị nhưng server kiểm tra theo [quyền sử dụng](access-and-subscriptions.md). Nếu không rõ quyền free lần đầu, cần xác nhận rõ access_tier=free; không tự reset lựa chọn hoặc tiêu thụ Plus ngoài ý muốn. Bỏ các field nội dung để lưu nháp, field có mặt phải đúng kiểu.

```json
{
  "template_id": "00000000-0000-4000-8000-000000000001",
  "access_tier": "free",
  "sender_name": "An",
  "sender_email": "an@example.com",
  "recipient_name": "Bình",
  "recipient_email": "binh@example.com",
  "delivery_date": "2026-12-01",
  "recipient_timezone": "Asia/Ho_Chi_Minh",
  "cover_message": "Chúc mừng sinh nhật!",
  "wishes": [{"type": "paragraph", "data": {"text": "Chúc bạn một ngày vui!"}}],
  "media": []
}
```

UUID là ví dụ, phải thay id danh mục thực. Response có id/status/version/created_at/updated_at; server cấp chủ và các trường quyền. Không nhận period, license, access_expires_at, URL Cloudinary hoặc valid/touched/error trực tiếp.

PATCH giữ field bỏ qua, null chỉ xóa field nullable; wishes=[] xóa lời chúc nháp, media nếu có thay toàn bộ liên kết bằng media_id/role/position/caption. Tên/email max 120/254, cover 500, wishes 100 block và JSON 256 KiB là ngưỡng đề xuất cần chốt. Màu #RRGGBB; allowlist block Editor.js và renderer an toàn. Không dùng style/occasion để giả mạo template.

Publish nhận version và expires_at nullable. Hạn link NULL không có nghĩa quyền Plus vô hạn; effective access là giao của hạn link và nguồn quyền snapshot. Validate đủ tên/email/dịp/kiểu/lời chúc, tạo snapshot + media FK và link token mới; rotate vô hiệu token cũ. Snapshot public không có email/owner id/thông tin thanh toán; Cache-Control: no-store, media delivery theo policy quyền.

Unpublish idempotent theo version hiện tại, không gia hạn quyền. Renew và activate-purchased-access yêu cầu card/snapshot cùng template, nếu khác 409 SNAPSHOT_TEMPLATE_CONFLICT. Hai thao tác không phục hồi link đã thu hồi/hết expires_at hoặc hoàn quota cũ.

## Media và tác vụ bất đồng bộ

Upload intent nhận kind=image/audio; backend kiểm tra quota, cấp public_id và upload_params có chữ ký. Complete xác minh provider/owner/intent/metadata, không tin URL client; retry trả cùng media, intent hết hạn 409 UPLOAD_EXPIRED. SDK/proof schema và ngưỡng file cần chốt trước triển khai.

DELETE media còn tham chiếu card_media/card_share_media trả 409. Nếu được xóa, transaction đánh dấu deleting và ghi outbox, trả 202 với data.id/status; chưa phải xác nhận file đã xóa. GET media trả deleting/delete_failed để polling, sau xóa hoàn tất trả 404. Worker retry lỗi provider, không trả xóa thành công giả.

## Quote, checkout và fulfillment

Quote nhận cart_id/cart_version/discount_code hoặc product_type/price_id/discount_code cho direct; không trộn chế độ. Checkout luôn nhận quote_id và cart_version nếu có, không nhận tiền/quyền do client tính. Giá/giỏ/code thay đổi trước checkout trả QUOTE_STALE; một quote tối đa một order.

Checkout trả 201 với order_id, status và checkout_url nullable. Provider checkout tạo qua outbox có thể chưa sẵn sàng; client đọc me/orders/:id đến khi có URL hoặc lỗi. Idempotent retry giữ cùng order. Total=0 qua free-order nội bộ, có thể hoàn tất mà checkout_url=NULL, không tạo payment giả.

Webhook chỉ ack sau inbox/outbox bền vững; worker đối soát amount/currency rồi fulfillment tất cả item trong transaction. Provider lỗi sau thu tiền không mất payment; reconciliation xử lý, không cấp quyền hai lần. Hủy gia hạn chỉ báo thành công sau provider xác nhận. Provider, auto-renew/refund chưa chốt phải khóa tính năng tương ứng.

## Contract chi tiết

[JWT](authentication.md), [quyền](access-and-subscriptions.md), [cart](cart-and-checkout.md), [giá/discount](pricing-and-discounts.md), [analytics](analytics.md), [runtime/rate limit](runtime-and-request-security.md) và [tính toàn vẹn](data-integrity.md) xác định điều kiện nghiệp vụ tương ứng. Không có API login/payment/JWT nào đang chạy chỉ vì đã xuất hiện trong danh sách.

## Security policy bắt buộc khi triển khai

[Security controls](security-controls.md) quy định reauth cho thay role/status, giá/gói/discount/availability và credential, cùng password/email change hoặc refund khi có endpoint tương ứng. Admin/staff chưa đủ MFA không được gọi API đặc quyền. 403 MFA_REQUIRED/REAUTH_REQUIRED; challenge sai/hết hạn trả 401 MFA_VERIFICATION_FAILED. Header reauth không thay JWT/role/ownership. Chưa có runtime MFA/reauth/session management.
