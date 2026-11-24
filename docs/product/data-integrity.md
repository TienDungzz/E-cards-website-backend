# Tính toàn vẹn dữ liệu

Nguồn schema duy nhất là [schema.json](schema.json), sinh ra [database](database.md) và sơ đồ. Đây là thiết kế cần triển khai; chưa có SQL migration, constraint thực tế hoặc integration test PostgreSQL.

## Quy tắc nền

Mọi cột không ghi nullable phải NOT NULL. CHECK không thay NOT NULL và không tự bảo vệ tổng liên bảng hoặc quyền theo thời gian. Dùng PK/FK/UNIQUE/CHECK cho cấu trúc; composite FK/trigger/procedure có khóa cho nghiệp vụ. Runtime role không có quyền bỏ qua procedure để sửa ledger/quota/fulfillment trực tiếp; migration role tách riêng.

Không dựa vào UUID khó đoán làm authorization. Không có transaction chung giữa PostgreSQL, Redis, Cloudinary và provider thanh toán. Lịch sử đã xác nhận không xóa cascade theo user/template. Dữ liệu cá nhân áp dụng ẩn danh/retention đã chốt, không tự reset quyền bằng xóa tài khoản.

## Ràng buộc liên bảng bắt buộc

| Phạm vi | Ràng buộc |
| --- | --- |
| Card/media | UNIQUE cards(id,user_id), media_assets(id,user_id,kind); FK ghép card_media(card_id,user_id) và (media_id,user_id,role) bảo vệ cùng chủ/kind |
| Upload | UNIQUE upload_intents(id,user_id); FK media_assets(upload_intent_id,user_id) và usage_reservations cùng chủ intent |
| Snapshot | UNIQUE card_shares(card_id,user_id); FK share→card cùng user, template snapshot có thể khác nháp; card_share_media giữ FK asset RESTRICT |
| Free | Trigger cấm reset/đổi user.free_template_id đã gán; tạo free kiểm tra/gán cùng transaction với card |
| Plus ownership | UNIQUE subscriptions(id,user_id), subscription_periods(id,user_id); FK period→subscription và card/share→period cùng user |
| Plus quota | FK (entitlement_period_id,template_id) → period_template_usage(period_id,template_id), ở cả card và share; cấp usage dưới khóa kỳ |
| License | UNIQUE template_licenses(id,user_id,template_id); FK card/share trỏ license đúng user/template, status kiểm tra dưới khóa |
| Refresh | UNIQUE refresh_tokens(id,session_id); FK(parent_token_id,session_id) cùng session, UNIQUE(parent_token_id), partial unique token chưa used/revoked |
| Quote/order/cart | UNIQUE(id,user_id) tại quote/cart/order; FK ghép bảo vệ cùng chủ; source cart/version cùng có hoặc cùng NULL; quote_id UNIQUE trên order |
| Giá sản phẩm | Order/cart item XOR plan_price/template_price, product_type đúng và product_key đúng template/hằng Plus; quantity=1, không NULL |
| Discount | FK current_version_id thuộc đúng discounts.id; redemption cùng user/order/version và discount_minor snapshot |
| Fulfillment | order_fulfillments.order_item_id PK; FK(item,order), (payment,order), (order,user) dùng UNIQUE đích; payment/free_order đúng điều kiện |
| Kỳ/license từ order | Nguồn fulfillment đúng user, loại sản phẩm, mẫu/phiên bản gói; kỳ mới không tạo trực tiếp từ webhook trùng |
| Refund | FK(payment_id,order_id) và (order_item_id,order_id), currency đúng; khóa item/payment khi reserve hoàn |
| Ledger | Event/payment/item cùng order/currency; SUM allocations + unallocated = event.amount; không nhân tiền qua join N items |

Composite FK tùy chọn dùng NULL có chủ đích: CHECK chặn nhóm cột nửa có/nửa không, không áp MATCH FULL lên nhóm chứa user_id luôn NOT NULL một cách máy móc. Reference thiếu key UNIQUE tương ứng phải được phát hiện trong migration review.

## Ba nhánh quyền card và snapshot

- free: license/period/access_expires_at NULL; template khớp khóa free user.
- plus: period/access_expires_at NOT NULL, license NULL; user/template đã ghi quota, hạn không vượt period.ends_at.
- purchased: license NOT NULL, period/access_expires_at NULL; license active, đúng mẫu/chủ.

access_tier không cho PATCH tự do. Plus→purchased chỉ qua procedure activate có audit; renew chỉ chuyển kỳ hợp lệ. Snapshot có thể giữ mẫu cũ; renew/activate cùng card phải từ chối nếu hai mẫu khác nhau, tránh dùng quota/license mẫu B cho snapshot A.

Quyền thời gian kiểm tra tại request-time trong [starts_at,ends_at), không CHECK(now()) hoặc trông chờ cron. Transaction dài lấy lại thời gian thực trước cấp quyền, không dùng thời điểm đầu transaction kéo dài quyền sau hết hạn. Hết Plus không ảnh hưởng license active.

## Snapshot và xóa media

Publish atomically thay published_snapshot và card_share_media từ media ready đã xác minh. Renderer chỉ lấy asset qua liên kết có cấu trúc, không tự đọc URL tùy ý trong JSON. Sửa nháp chỉ thay card_media. Unpublish giữ dữ liệu để quản lý/gia hạn, purge snapshot cần luồng riêng có audit.

DELETE media kiểm tra cả hai bảng nối dưới khóa rồi đổi deleting + outbox, trả 202. Không cho gắn asset deleting; worker gọi provider ngoài DB transaction, hoàn tất xóa idempotent. Lỗi giữ delete_failed/job retry. Xóa card/share chỉ cascade bảng nối, không cascade asset/usage/license/ledger.

## Thứ tự khóa và transaction

Các luồng dùng cùng thứ tự khi có liên quan: user → cart/quote → discount và counter (theo id) → order/payment → subscription/period/license → card/share → media (theo id). Auth dùng user → session → refresh token nếu cần; mọi worker phải theo cùng thứ tự với API. Không gọi provider khi giữ row lock; retry deadlock/serialization hữu hạn và idempotent.

| Thao tác | Bất biến tại commit |
| --- | --- |
| Tạo free | Validation/INSERT lỗi thì rollback cả lựa chọn mẫu |
| Dùng mẫu Plus | Khóa kỳ, kiểm tra usage có sẵn trước đếm trần; mẫu cũ không tốn thêm lượt dù quota đầy; không DELETE usage khi xóa card |
| Sửa giỏ | Mọi thay đổi tăng cart.version; mọi sửa dòng tăng item.revision, để dọn giỏ không xóa dòng đã đổi |
| Quote/checkout | Quote không giữ slot; checkout khóa/đối chiếu fingerprint, tạo order/item/discount reservation/outbox đồng thời |
| Chốt tổng đơn | Đơn có ít nhất một item, cùng currency; SUM item subtotal/discount/total bằng order; snapshot bất biến |
| Counter discount | used/reserved không âm, không vượt limits dùng chung trên discounts qua mọi version; mỗi order dùng một lượt |
| Fulfillment | Khóa order, payment accepted/free-order hợp lệ, INSERT tất cả order_fulfillments và license/kỳ trong cùng transaction |
| Gia hạn | Mỗi kỳ có một source_order_item_id đã fulfill Plus; provider renewal cần order/item mới, không cấp kỳ bằng event id khác |
| Refund | Tổng pending+succeeded không vượt phần item/payment chưa hoàn; không dùng provider_refund_id UNIQUE đơn khi một refund có nhiều dòng |

Đổi limits discount chỉ được >= used+reserved dưới cùng khóa; thay công thức/targets/thời gian tạo version mới bất biến. Discount %/fixed tính trên eligible subtotal, largest remainder phân bổ theo line_number ổn định. Hoàn tiền dùng allocation cũ; không tự hoàn lượt mã.

Một order có thể có nhiều payment attempt hoặc thậm chí khoản thu dư, nhưng fulfillment mỗi item chỉ một. UNIQUE provider payment id không thay thế khóa order. Tiền đã thu lần hai phải ghi ledger/unallocated và reconciliation, không cấp quyền thêm hoặc bỏ mất khoản thu.

## Outbox, inbox và nguồn sự thật

Webhook ack sau khi ghi inbox + outbox bền vững; provider verification ngoài transaction được đối chiếu lại trước commit. Worker có lease, nhận lại job sau crash; job id Redis không thay PK/UNIQUE PostgreSQL. Enqueue thành công chỉ cập nhật dispatched_at/last_enqueued_at, completed sau kết quả nghiệp vụ commit. Reconciliation tìm outbox chưa complete sau Redis loss.

Giữ payload webhook replay ở nơi bảo vệ theo retention; payload_hash đơn thuần không đủ replay. Thanh toán muộn sau release discount chuyển reconciliation_required; không cấp quyền vượt lượt. Free-order total=0 có audit và fulfillment, không fake provider payment. License mua lại giữ events; webhook refund cũ chỉ revoke đúng lần cấp.

Ledger append-only theo financial event provider đã chuẩn hóa, không chỉ webhook id. Không xóa capture khi payment thành refunded; refund theo thời điểm riêng. Allocation + unallocated khớp event amount, cross-currency bị từ chối. GA chỉ là traffic, không là bằng chứng tiền/tài khoản.

## Checklist kiểm chứng trước phát hành

Chạy PostgreSQL thật, nhiều connection và fixture provider. Hiện **chưa có** các test này:

| Nhóm | Trường hợp phải kiểm tra |
| --- | --- |
| Constraint/NULL | Mọi field bắt buộc NULL bị từ chối; FK sai user/template/order/currency không commit |
| Free | Hai request khác mẫu chỉ một được khóa; rollback không để khóa dở; xóa/nâng hạ gói không reset |
| Plus | Hai request dùng slot cuối không vượt trần; mẫu cũ ở quota đầy vẫn dùng; hết hạn không phụ thuộc cron |
| Snapshot/media | Asset chỉ còn trong snapshot không bị xóa; deleting không thể gắn; renew khác mẫu bị chặn |
| JWT | Rotate/replay/rollback, revoked sid, user suspended, role cũ, refresh song song, CSRF/cookie flags |
| Cart/quote | Stale cart/price/code, duplicate template qua hai price, quote khác owner, revision cleanup, pending direct/cart trùng |
| Discount | Slot cuối toàn cục/per-user, version mới không reset lượt, rounding, fixed sai currency, cart sai scope, 100% |
| Fulfillment | N item commit cùng nhau, webhook trùng/sai thứ tự, hai payment success một order, renewal và free-order |
| Refund/ledger | Cross-order/currency, concurrent partial refund, refund nhiều item, net âm kỳ sau, không nhân thu qua join |
| Recovery | Worker crash sau provider thành công, Redis loss/re-enqueue, late payment sau release, duplicate license/revocation cũ |
| Analytics | Metadata watermark, khác currency/timezone, GA quota/config lỗi không trả zero giả |

Check docs/schema/lint chỉ kiểm tra tính nhất quán tài liệu và code tooling. Không thay thế migration, quyền DB, integration/security/load test hoặc xác minh dịch vụ thực tế.

## Toàn vẹn MFA và reauth

Theo [security controls](security-controls.md), WebAuthn credential user mapping bất biến, credential_id UNIQUE; challenge có purpose/user/sid/TTL và consume một lần. Session chưa đủ MFA không có access/refresh business; sessions.mfa_verified_at ghi sau verification, refresh không tự cập nhật mốc này. Bootstrap/recovery admin không tự enroll chỉ bằng password hoặc email reset.

Role change khóa user, kiểm tra credential policy và reauth grant, consume grant + audit + thay role + revoke sessions atomically. Không xóa MFA cuối admin/staff, không cho cập nhật mfa_enabled để bypass. Khi cấp login/refresh kiểm tra lại role/status/credential trong transaction để race đổi role không tạo phiên thiếu MFA.

Recovery code dùng hash, tiêu thụ dưới khóa user/code. Reauth FK(session_id,user_id) cùng chủ; grant chỉ dùng cho action/resource/payload/version đúng, session active, còn hạn. Consume cùng transaction nghiệp vụ; replay khác request bị từ chối, idempotent replay cùng kết quả không consume lần hai.

Test bắt buộc: challenge login bị dùng làm enroll/reauth; credential của user khác; UV/origin/RP sai; challenge/recovery code dùng đồng thời; xóa MFA cuối; nâng role với session guest cũ; recovery/reset bỏ qua MFA; refresh làm mới xác thực gần đây; sửa payload sau reauth; revoke sid trong lúc consume grant; notification retry không leak secret. Schema tự sinh có 4 bảng bảo vệ tương ứng, nhưng chưa có migration/test thực tế.
