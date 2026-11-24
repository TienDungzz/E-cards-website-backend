# Database E-cards

Thiết kế PostgreSQL trên Aiven, **chưa có migration hoặc kiểm thử database thực tế**.
File này được sinh từ [schema.json](schema.json); sửa nguồn rồi chạy `npm run docs:generate`.

## Quy ước chung

- Tên bảng/cột dùng snake_case; id UUID do server cấp, ngoại trừ khóa danh mục/khóa ghép đã ghi rõ.
- Nullable=Không nghĩa là NOT NULL; PK tự bắt buộc NOT NULL. Các cột tiền, discriminator, version và counter không được NULL.
- Tiền dùng bigint đơn vị nhỏ nhất cùng currency ISO 4217; API gửi tiền dưới dạng chuỗi số nguyên. Không cộng khác currency.
- Timestamp dùng timestamptz, API dùng ISO 8601 UTC; ngày dự kiến dùng date và múi giờ IANA riêng.
- UNIQUE trên email/code có nghĩa unique index lower(value) khi quy tắc bảng ghi chuẩn hóa không phân biệt hoa thường.
- Các FK đơn dưới đây thể hiện tham chiếu; composite FK, CHECK, partial index và transaction tại [tính toàn vẹn](data-integrity.md) vẫn bắt buộc.
- Lịch sử order, payment, fulfillment, license, usage và ledger không cascade xóa theo tài khoản; dùng ẩn danh/retention. Chỉ bảng nối share/card được cascade có chủ đích.
- Giá/điều kiện đã publish hoặc checkout phải bất biến; nguồn nghiệp vụ không phải dữ liệu client hoặc cache Redis.

## Danh mục bảng

| Bảng | Nhóm | Trách nhiệm |
| --- | --- | --- |
| [users](#users) | identity | Tài khoản và lựa chọn mẫu miễn phí cố định |
| [sessions](#sessions) | identity | Metadata phiên dùng làm sid trong JWT |
| [refresh_tokens](#refresh_tokens) | identity | Refresh token opaque có rotation |
| [auth_tokens](#auth_tokens) | identity | Xác minh email và reset mật khẩu |
| [audit_logs](#audit_logs) | identity | Audit đã lọc thông tin nhạy cảm |
| [occasions](#occasions) | cards | Danh mục dịp/kiểu hiển thị |
| [card_styles](#card_styles) | cards | Danh mục dịp/kiểu hiển thị |
| [card_templates](#card_templates) | cards | Mẫu thiết kế có thể mua hoặc dùng theo gói |
| [cards](#cards) | cards | Thiệp nháp và quyền của chủ sở hữu |
| [upload_intents](#upload_intents) | media | Giữ quyền/quota upload |
| [media_assets](#media_assets) | media | Metadata Cloudinary đã xác minh |
| [card_media](#card_media) | media | Media của bản nháp |
| [card_shares](#card_shares) | cards | Snapshot và link chia sẻ hiện tại |
| [card_share_media](#card_share_media) | media | FK bảo vệ asset trong snapshot |
| [plans](#plans) | plans | Định danh gói free/plus |
| [plan_versions](#plan_versions) | plans | Phiên bản quyền bất biến |
| [plan_prices](#plan_prices) | plans | Giá theo phiên bản gói |
| [features](#features) | plans | Danh mục tính năng |
| [plan_features](#plan_features) | plans | Quyền tính năng của gói |
| [plan_templates](#plan_templates) | plans | Danh mục mẫu của gói |
| [template_prices](#template_prices) | plans | Giá mua lẻ từng mẫu |
| [carts](#carts) | cart | Giỏ nhiều mẫu và tối đa một Plus |
| [cart_items](#cart_items) | cart | Dòng giỏ có revision |
| [checkout_quotes](#checkout_quotes) | cart | Báo giá có hạn chưa giữ lượt |
| [discounts](#discounts) | discount | Mã và giới hạn dùng chung qua mọi phiên bản |
| [discount_versions](#discount_versions) | discount | Điều kiện và công thức giảm bất biến |
| [discount_plan_targets](#discount_plan_targets) | discount | Đối tượng áp dụng mã |
| [discount_template_targets](#discount_template_targets) | discount | Đối tượng áp dụng mã |
| [discount_counters](#discount_counters) | discount | Bộ đếm toàn mã |
| [discount_user_counters](#discount_user_counters) | discount | Bộ đếm mã theo user |
| [orders](#orders) | billing | Đơn và tổng tiền bất biến |
| [order_items](#order_items) | billing | Dòng đơn sau phân bổ discount |
| [discount_redemptions](#discount_redemptions) | discount | Một lượt dùng cho cả order |
| [payments](#payments) | billing | Khoản thanh toán provider |
| [order_fulfillments](#order_fulfillments) | billing | Cấp quyền đúng một lần cho mỗi dòng đơn |
| [subscriptions](#subscriptions) | subscriptions | Thuê bao Plus và lịch sử |
| [subscription_periods](#subscription_periods) | subscriptions | Kỳ đã thanh toán với hạn/quota cố định |
| [period_template_usage](#period_template_usage) | subscriptions | Sổ mẫu không hoàn lượt |
| [template_licenses](#template_licenses) | billing | License mẫu mua lẻ vĩnh viễn |
| [license_events](#license_events) | billing | Lịch sử cấp/thu hồi/mua lại |
| [webhook_events](#webhook_events) | operations | Inbox webhook đã xác minh |
| [subscription_events](#subscription_events) | subscriptions | Audit thay đổi thuê bao |
| [payment_events](#payment_events) | analytics | Ledger tiền append-only |
| [payment_event_allocations](#payment_event_allocations) | analytics | Phân bổ tiền sự kiện về dòng đơn |
| [refund_items](#refund_items) | analytics | Hoàn từng dòng, chưa bật khi thiếu policy |
| [usage_counters](#usage_counters) | operations | Quota thương mại khác số mẫu |
| [usage_reservations](#usage_reservations) | operations | Giữ chỗ quota upload có hạn |
| [outbox_jobs](#outbox_jobs) | operations | Công việc bền vững cho Redis worker |
| [webauthn_credentials](#webauthn_credentials) | identity | Passkey public credential, không chứa private key |
| [mfa_challenges](#mfa_challenges) | identity | Challenge WebAuthn theo mục đích và một lần |
| [mfa_recovery_codes](#mfa_recovery_codes) | identity | Recovery code hash dùng một lần |
| [reauth_grants](#reauth_grants) | identity | Quyền một lần cho request nhạy cảm |

## Schema hợp nhất

### users

Tài khoản và lựa chọn mẫu miễn phí cố định

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `email` | `text` | Không | UK |
| `password_hash` | `text` | Không | — |
| `display_name` | `text` | Có | — |
| `role` | `text` | Không | — |
| `status` | `text` | Không | — |
| `free_template_id` | `uuid` | Có | FK → card_templates.id |
| `email_verified_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |
| `mfa_enabled` | `boolean` | Không | — |

- UNIQUE(lower(email)); role: admin/staff/guest, mặc định guest; status: active/suspended.
- Trigger cấm đổi/reset free_template_id sau lần tạo free thành công; chỉ luồng quản trị thay thế mẫu có audit được phép ngoại lệ.
- MFA bắt buộc admin/staff; nâng role đòi credential đã xác minh và thu hồi phiên cũ. mfa_enabled là policy projection, không phải bằng chứng đã MFA ở phiên.

### sessions

Metadata phiên dùng làm sid trong JWT

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `expires_at` | `timestamptz` | Không | — |
| `revoked_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `password_verified_at` | `timestamptz` | Không | — |
| `mfa_verified_at` | `timestamptz` | Có | — |
| `user_agent_label` | `text` | Có | — |

- UNIQUE(id,user_id); expires_at > created_at; không lưu access token thô.
- Chỉ tạo phiên business sau đủ yếu tố; role đặc quyền yêu cầu mfa_verified_at và credential policy. Refresh không tự nâng mức MFA hoặc làm mới thời điểm xác thực lại.

### refresh_tokens

Refresh token opaque có rotation

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `session_id` | `uuid` | Không | FK → sessions.id |
| `parent_token_id` | `uuid` | Có | UK; FK → refresh_tokens.id |
| `token_hash` | `text` | Không | UK |
| `expires_at` | `timestamptz` | Không | — |
| `used_at` | `timestamptz` | Có | — |
| `revoked_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |

- UNIQUE(id,session_id); FK(parent_token_id,session_id) cùng session.
- Partial UNIQUE(session_id) WHERE used_at IS NULL AND revoked_at IS NULL; token hết hạn phải đổi trạng thái trước khi thay.
- Hạn token không vượt sessions.expires_at; replay thu hồi session; giữ lịch sử hash theo retention.

### auth_tokens

Xác minh email và reset mật khẩu

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `purpose` | `text` | Không | — |
| `token_hash` | `text` | Không | UK |
| `expires_at` | `timestamptz` | Không | — |
| `used_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |

- purpose: verify_email/reset_password; expires_at > created_at; token dùng một lần.

### audit_logs

Audit đã lọc thông tin nhạy cảm

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `actor_user_id` | `uuid` | Có | FK → users.id |
| `action` | `text` | Không | — |
| `target_type` | `text` | Không | — |
| `target_id` | `text` | Không | — |
| `safe_metadata` | `jsonb` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- target_type/target_id là tham chiếu logic, không phải FK đa bảng.

### occasions

Danh mục dịp/kiểu hiển thị

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `smallint` | Không | PK |
| `code` | `text` | Không | UK |
| `label_vi` | `text` | Không | — |
| `label_en` | `text` | Không | — |
| `is_active` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- Ngừng sử dụng bằng is_active; không xóa hàng đang được tham chiếu.

### card_styles

Danh mục dịp/kiểu hiển thị

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `smallint` | Không | PK |
| `code` | `text` | Không | UK |
| `label_vi` | `text` | Không | — |
| `label_en` | `text` | Không | — |
| `is_active` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- Ngừng sử dụng bằng is_active; không xóa hàng đang được tham chiếu.

### card_templates

Mẫu thiết kế có thể mua hoặc dùng theo gói

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `code` | `text` | Không | UK |
| `name` | `text` | Không | — |
| `occasion_id` | `smallint` | Có | FK → occasions.id |
| `style_id` | `smallint` | Có | FK → card_styles.id |
| `default_content` | `jsonb` | Không | — |
| `is_active` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- Mẫu đã bán/được khóa free không xóa; ngừng bán không thu hồi license active.

### cards

Thiệp nháp và quyền của chủ sở hữu

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `template_id` | `uuid` | Không | FK → card_templates.id |
| `occasion_id` | `smallint` | Có | FK → occasions.id |
| `style_id` | `smallint` | Có | FK → card_styles.id |
| `access_tier` | `text` | Không | — |
| `template_license_id` | `uuid` | Có | FK → template_licenses.id |
| `entitlement_period_id` | `uuid` | Có | FK → subscription_periods.id |
| `access_expires_at` | `timestamptz` | Có | — |
| `sender_name` | `text` | Có | — |
| `sender_email` | `text` | Có | — |
| `recipient_name` | `text` | Có | — |
| `recipient_email` | `text` | Có | — |
| `cover_message` | `text` | Có | — |
| `wishes` | `jsonb` | Không | — |
| `background_color` | `varchar(7)` | Có | — |
| `heading_color` | `varchar(7)` | Có | — |
| `text_color` | `varchar(7)` | Có | — |
| `delivery_date` | `date` | Có | — |
| `recipient_timezone` | `text` | Có | — |
| `status` | `text` | Không | — |
| `version` | `integer` | Không | — |
| `published_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id); status: draft/published; version > 0; wishes là mảng block đã validate.
- access_tier: free/plus/purchased; nhóm license/period/hạn theo ba nhánh tại data-integrity.md.
- Composite FK bảo vệ ownership, template license và quota kỳ; màu có dạng #RRGGBB khi khác NULL.

### upload_intents

Giữ quyền/quota upload

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `kind` | `text` | Không | — |
| `expected_public_id` | `text` | Không | UK |
| `status` | `text` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id); kind: image/audio; status: pending/completed/expired.

### media_assets

Metadata Cloudinary đã xác minh

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `upload_intent_id` | `uuid` | Không | UK; FK → upload_intents.id |
| `kind` | `text` | Không | — |
| `cloudinary_asset_id` | `text` | Không | UK |
| `public_id` | `text` | Không | — |
| `resource_type` | `text` | Không | — |
| `cloudinary_version` | `bigint` | Không | — |
| `secure_url` | `text` | Không | — |
| `format` | `text` | Không | — |
| `bytes` | `bigint` | Không | — |
| `width` | `integer` | Có | — |
| `height` | `integer` | Có | — |
| `duration_seconds` | `numeric` | Có | — |
| `status` | `text` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id,kind), UNIQUE(id,user_id), UNIQUE(resource_type,public_id); composite FK intent cùng chủ.
- bytes > 0; dimension/duration khi có phải dương; status: ready/deleting/delete_failed.
- secure_url là metadata nội bộ, không tự trả URL vĩnh viễn cho nội dung Plus cần thu hồi.

### card_media

Media của bản nháp

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `card_id` | `uuid` | Không | PK; FK → cards.id |
| `media_id` | `uuid` | Không | PK; FK → media_assets.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `role` | `text` | Không | — |
| `position` | `integer` | Không | — |
| `caption` | `text` | Có | — |

- PK(card_id,media_id); UNIQUE(card_id,role,position); position >= 0; partial UNIQUE(card_id) WHERE role=audio.
- Composite FK (card_id,user_id) và (media_id,user_id,role); role khớp kind.

### card_shares

Snapshot và link chia sẻ hiện tại

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `card_id` | `uuid` | Không | PK; FK → cards.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `template_id` | `uuid` | Không | FK → card_templates.id |
| `access_tier` | `text` | Không | — |
| `template_license_id` | `uuid` | Có | FK → template_licenses.id |
| `entitlement_period_id` | `uuid` | Có | FK → subscription_periods.id |
| `access_expires_at` | `timestamptz` | Có | — |
| `token_hash` | `text` | Không | UK |
| `published_snapshot` | `jsonb` | Không | — |
| `expires_at` | `timestamptz` | Có | — |
| `revoked_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(card_id,user_id); composite FK cùng chủ card, license/kỳ và quota tương tự cards.
- Snapshot có thể giữ mẫu cũ khi nháp đổi mẫu; link expiry độc lập hạn quyền.

### card_share_media

FK bảo vệ asset trong snapshot

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `card_id` | `uuid` | Không | PK; FK → card_shares.card_id |
| `media_id` | `uuid` | Không | PK; FK → media_assets.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `role` | `text` | Không | — |
| `position` | `integer` | Không | — |
| `caption` | `text` | Có | — |

- PK(card_id,media_id); UNIQUE(card_id,role,position); position >= 0; partial UNIQUE(card_id) WHERE role=audio.
- Composite FK (card_id,user_id) và (media_id,user_id,role); media RESTRICT, liên kết CASCADE khi xóa share.

### plans

Định danh gói free/plus

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `code` | `text` | Không | UK |
| `name` | `text` | Không | — |
| `is_active` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |


### plan_versions

Phiên bản quyền bất biến

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `plan_id` | `uuid` | Không | FK → plans.id |
| `version` | `integer` | Không | — |
| `is_published` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- UNIQUE(plan_id,version); version > 0; sau publish không sửa feature/template/quota của phiên bản.

### plan_prices

Giá theo phiên bản gói

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `plan_version_id` | `uuid` | Không | FK → plan_versions.id |
| `amount_minor` | `bigint` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `billing_interval` | `text` | Không | — |
| `provider` | `text` | Có | — |
| `provider_price_id` | `text` | Có | — |
| `is_active` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- amount_minor >= 0; billing_interval: month/year; giá đã dùng bất biến; tạo hàng mới khi đổi giá.

### features

Danh mục tính năng

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `code` | `text` | Không | PK |
| `value_type` | `text` | Không | — |
| `description` | `text` | Không | — |

- value_type: boolean/integer; limit NULL không tự nghĩa vô hạn.

### plan_features

Quyền tính năng của gói

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `plan_version_id` | `uuid` | Không | PK; FK → plan_versions.id |
| `feature_code` | `text` | Không | PK; FK → features.code |
| `enabled` | `boolean` | Không | — |
| `limit_value` | `bigint` | Có | — |

- PK(plan_version_id,feature_code); limit_value >= 0 khi có; value_type và enabled phải nhất quán.

### plan_templates

Danh mục mẫu của gói

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `plan_version_id` | `uuid` | Không | PK; FK → plan_versions.id |
| `template_id` | `uuid` | Không | PK; FK → card_templates.id |

- PK(plan_version_id,template_id); free có thể cho chọn ban đầu nhiều mẫu nhưng mỗi user chỉ khóa một.

### template_prices

Giá mua lẻ từng mẫu

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `template_id` | `uuid` | Không | FK → card_templates.id |
| `amount_minor` | `bigint` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `provider` | `text` | Có | — |
| `provider_price_id` | `text` | Có | — |
| `is_active` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- amount_minor >= 0; giá đã dùng bất biến.

### carts

Giỏ nhiều mẫu và tối đa một Plus

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `status` | `text` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `version` | `integer` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id); partial UNIQUE(user_id) WHERE status=active; status: active/archived; version > 0.

### cart_items

Dòng giỏ có revision

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `cart_id` | `uuid` | Không | FK → carts.id |
| `product_type` | `text` | Không | — |
| `product_key` | `text` | Không | — |
| `plan_price_id` | `uuid` | Có | FK → plan_prices.id |
| `template_price_id` | `uuid` | Có | FK → template_prices.id |
| `quantity` | `integer` | Không | — |
| `revision` | `integer` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(cart_id,product_key); partial UNIQUE(cart_id) WHERE product_type=plus.
- quantity=1; revision > 0 và tăng mỗi lần sửa; XOR FK giá khớp loại plus/template; product_key từ template_id hoặc hằng plus do server cấp.

### checkout_quotes

Báo giá có hạn chưa giữ lượt

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `cart_id` | `uuid` | Có | FK → carts.id |
| `cart_version` | `integer` | Có | — |
| `input_hash` | `text` | Không | — |
| `pricing_snapshot` | `jsonb` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id); cart_id/cart_version cùng NULL cho direct hoặc cùng có cho giỏ; snapshot chỉ server tạo.

### discounts

Mã và giới hạn dùng chung qua mọi phiên bản

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `code` | `text` | Không | UK |
| `current_version_id` | `uuid` | Có | FK → discount_versions.id |
| `is_active` | `boolean` | Không | — |
| `usage_limit` | `integer` | Có | — |
| `per_user_limit` | `integer` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(lower(code)); limits NULL không áp trần, khác NULL phải > 0 và không thấp hơn used+reserved khi cập nhật.
- FK(current_version_id,id) → discount_versions(id,discount_id); counter không reset khi đổi version.

### discount_versions

Điều kiện và công thức giảm bất biến

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `discount_id` | `uuid` | Không | FK → discounts.id |
| `version` | `integer` | Không | — |
| `scope` | `text` | Không | — |
| `application_level` | `text` | Không | — |
| `kind` | `text` | Không | — |
| `basis_points` | `integer` | Có | — |
| `amount_minor` | `bigint` | Có | — |
| `currency` | `varchar(3)` | Có | — |
| `min_subtotal_minor` | `bigint` | Không | — |
| `starts_at` | `timestamptz` | Không | — |
| `ends_at` | `timestamptz` | Có | — |
| `is_published` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- UNIQUE(discount_id,version), UNIQUE(id,discount_id); scope: plus/template/both; application_level: item/cart.
- percentage: basis_points 1..10000, amount NULL; fixed_amount: amount > 0, currency bắt buộc, basis_points NULL.
- min_subtotal_minor >= 0; ends_at > starts_at khi có; bất biến sau publish.

### discount_plan_targets

Đối tượng áp dụng mã

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `discount_version_id` | `uuid` | Không | PK; FK → discount_versions.id |
| `plan_id` | `uuid` | Không | PK; FK → plans.id |

- PK hai cột; rỗng nghĩa là mọi sản phẩm trong scope.

### discount_template_targets

Đối tượng áp dụng mã

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `discount_version_id` | `uuid` | Không | PK; FK → discount_versions.id |
| `template_id` | `uuid` | Không | PK; FK → card_templates.id |

- PK hai cột; rỗng nghĩa là mọi sản phẩm trong scope.

### discount_counters

Bộ đếm toàn mã

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `discount_id` | `uuid` | Không | PK; FK → discounts.id |
| `used` | `integer` | Không | — |
| `reserved` | `integer` | Không | — |

- used/reserved >= 0; cập nhật nguyên tử dưới khóa discount.

### discount_user_counters

Bộ đếm mã theo user

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `discount_id` | `uuid` | Không | PK; FK → discounts.id |
| `user_id` | `uuid` | Không | PK; FK → users.id |
| `used` | `integer` | Không | — |
| `reserved` | `integer` | Không | — |

- PK(discount_id,user_id); used/reserved >= 0.

### orders

Đơn và tổng tiền bất biến

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `quote_id` | `uuid` | Không | UK; FK → checkout_quotes.id |
| `source_cart_id` | `uuid` | Có | FK → carts.id |
| `source_cart_version` | `integer` | Có | — |
| `discount_version_id` | `uuid` | Có | FK → discount_versions.id |
| `subtotal_minor` | `bigint` | Không | — |
| `discount_minor` | `bigint` | Không | — |
| `total_minor` | `bigint` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `pricing_snapshot` | `jsonb` | Không | — |
| `status` | `text` | Không | — |
| `provider` | `text` | Có | — |
| `checkout_id` | `text` | Có | — |
| `idempotency_key` | `text` | Không | — |
| `request_hash` | `text` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `completed_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id), UNIQUE(user_id,idempotency_key), UNIQUE(provider,checkout_id) khi có.
- status: pending/paid/fulfilled/failed/canceled/expired/reconciliation_required; free-order có thể pending→fulfilled không giả paid.
- Tiền NOT NULL, subtotal >= 0, 0 <= discount <= subtotal, total=subtotal-discount; tổng khớp SUM item.
- Composite FK quote/cart cùng user; một quote tối đa một order; source cart/version cùng có hoặc cùng NULL.

### order_items

Dòng đơn sau phân bổ discount

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `order_id` | `uuid` | Không | FK → orders.id |
| `product_type` | `text` | Không | — |
| `product_key` | `text` | Không | — |
| `line_number` | `integer` | Không | — |
| `plan_price_id` | `uuid` | Có | FK → plan_prices.id |
| `template_price_id` | `uuid` | Có | FK → template_prices.id |
| `quantity` | `integer` | Không | — |
| `subtotal_minor` | `bigint` | Không | — |
| `discount_minor` | `bigint` | Không | — |
| `total_minor` | `bigint` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `product_snapshot` | `jsonb` | Không | — |
| `source_cart_item_id` | `uuid` | Có | — |
| `source_item_revision` | `integer` | Có | — |

- UNIQUE(id,order_id), UNIQUE(order_id,line_number), UNIQUE(order_id,product_key); partial UNIQUE(order_id) WHERE product_type=plus.
- quantity=1, line_number > 0, XOR giá đúng loại; tổng tiền hợp lệ, currency cùng order; source fields cùng có/NULL.
- source_cart_item_id là tham chiếu lịch sử không FK để xóa dòng giỏ không xóa dữ liệu đơn.

### discount_redemptions

Một lượt dùng cho cả order

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `discount_version_id` | `uuid` | Không | FK → discount_versions.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `order_id` | `uuid` | Không | UK; FK → orders.id |
| `status` | `text` | Không | — |
| `discount_minor` | `bigint` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `redeemed_at` | `timestamptz` | Có | — |
| `released_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |

- status: reserved/redeemed/released; composite FK order cùng user, version/mức giảm khớp order qua procedure.

### payments

Khoản thanh toán provider

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `order_id` | `uuid` | Không | FK → orders.id |
| `provider` | `text` | Không | — |
| `provider_payment_id` | `text` | Không | — |
| `amount_minor` | `bigint` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `status` | `text` | Không | — |
| `refunded_amount_minor` | `bigint` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(provider,provider_payment_id), UNIQUE(id,order_id); amount >= 0, refunded trong [0,amount]; currency khớp order.
- status: pending/succeeded/failed/refunded/partially_refunded; không dùng status hiện tại thay ledger cash.

### order_fulfillments

Cấp quyền đúng một lần cho mỗi dòng đơn

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `order_item_id` | `uuid` | Không | PK; FK → order_items.id |
| `order_id` | `uuid` | Không | FK → orders.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `source_kind` | `text` | Không | — |
| `payment_id` | `uuid` | Có | FK → payments.id |
| `fulfilled_at` | `timestamptz` | Không | — |

- FK(order_item_id,order_id) và FK(payment_id,order_id) cùng order; FK(order_id,user_id) bảo vệ chủ.
- source_kind: payment/free_order; payment bắt buộc cho paid, NULL cho total=0 nội bộ đã validate; immutable.
- Tất cả dòng fulfill cùng transaction; khóa order chống hai payment success cấp lại.

### subscriptions

Thuê bao Plus và lịch sử

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `price_id` | `uuid` | Không | FK → plan_prices.id |
| `origin_order_id` | `uuid` | Có | FK → orders.id |
| `provider` | `text` | Có | — |
| `provider_subscription_id` | `text` | Có | — |
| `status` | `text` | Không | — |
| `current_period_start` | `timestamptz` | Có | — |
| `current_period_end` | `timestamptz` | Có | — |
| `cancel_at_period_end` | `boolean` | Không | — |
| `canceled_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id), UNIQUE(provider,provider_subscription_id); partial UNIQUE(user_id) cho pending/active/past_due/canceled.
- status: pending/active/past_due/canceled/expired; period bounds cùng có/NULL, end > start; confirmed periods là nguồn quyền.

### subscription_periods

Kỳ đã thanh toán với hạn/quota cố định

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `subscription_id` | `uuid` | Không | FK → subscriptions.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `plan_version_id` | `uuid` | Không | FK → plan_versions.id |
| `source_order_item_id` | `uuid` | Không | UK; FK → order_fulfillments.order_item_id |
| `provider_period_key` | `text` | Không | — |
| `starts_at` | `timestamptz` | Không | — |
| `ends_at` | `timestamptz` | Không | — |
| `max_distinct_templates` | `integer` | Không | — |
| `status` | `text` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- UNIQUE(id,user_id), UNIQUE(subscription_id,provider_period_key); composite FK subscription cùng chủ.
- ends_at > starts_at; max_distinct_templates > 0; status: confirmed/revoked; nguồn fulfillment phải đúng Plus/user/version.
- Một dòng đơn Plus cấp một kỳ. Gia hạn provider phải tạo renewal order/item và fulfillment idempotent trước kỳ mới.

### period_template_usage

Sổ mẫu không hoàn lượt

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `period_id` | `uuid` | Không | PK; FK → subscription_periods.id |
| `template_id` | `uuid` | Không | PK; FK → card_templates.id |
| `first_used_at` | `timestamptz` | Không | — |

- PK(period_id,template_id); khóa kỳ khi cấp mới; không xóa vì đổi/xóa card.

### template_licenses

License mẫu mua lẻ vĩnh viễn

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `template_id` | `uuid` | Không | FK → card_templates.id |
| `source_order_item_id` | `uuid` | Không | UK; FK → order_fulfillments.order_item_id |
| `status` | `text` | Không | — |
| `granted_at` | `timestamptz` | Không | — |
| `revoked_at` | `timestamptz` | Có | — |

- UNIQUE(user_id,template_id), UNIQUE(id,user_id,template_id); status: active/revoked; active yêu cầu revoked_at NULL.
- Nguồn fulfillment phải là template đúng chủ/mẫu; cấp lại license revoked có audit và giữ license_events.

### license_events

Lịch sử cấp/thu hồi/mua lại

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `license_id` | `uuid` | Không | FK → template_licenses.id |
| `order_item_id` | `uuid` | Có | FK → order_items.id |
| `payment_id` | `uuid` | Có | FK → payments.id |
| `action` | `text` | Không | — |
| `created_at` | `timestamptz` | Không | — |

- Nguồn order item/payment phải cùng user/order và lần cấp; webhook cũ không thu hồi lần mua mới.

### webhook_events

Inbox webhook đã xác minh

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `provider` | `text` | Không | — |
| `event_id` | `text` | Không | — |
| `event_type` | `text` | Không | — |
| `payload_hash` | `text` | Không | — |
| `processing_status` | `text` | Không | — |
| `occurred_at` | `timestamptz` | Không | — |
| `received_at` | `timestamptz` | Không | — |
| `processed_at` | `timestamptz` | Có | — |
| `retry_count` | `integer` | Không | — |

- UNIQUE(provider,event_id); retry_count >= 0; received/processed/failed; payload replay lưu bảo vệ riêng theo retention.

### subscription_events

Audit thay đổi thuê bao

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `subscription_id` | `uuid` | Không | FK → subscriptions.id |
| `payment_id` | `uuid` | Có | FK → payments.id |
| `webhook_event_id` | `uuid` | Có | FK → webhook_events.id |
| `event_type` | `text` | Không | — |
| `effective_at` | `timestamptz` | Không | — |
| `created_at` | `timestamptz` | Không | — |


### payment_events

Ledger tiền append-only

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `payment_id` | `uuid` | Không | FK → payments.id |
| `provider` | `text` | Không | — |
| `provider_financial_event_id` | `text` | Không | — |
| `event_kind` | `text` | Không | — |
| `currency` | `varchar(3)` | Không | — |
| `amount_minor` | `bigint` | Không | — |
| `unallocated_minor` | `bigint` | Không | — |
| `occurred_at` | `timestamptz` | Không | — |
| `recorded_at` | `timestamptz` | Không | — |
| `source_webhook_id` | `uuid` | Có | FK → webhook_events.id |
| `reconciliation_status` | `text` | Không | — |

- UNIQUE(provider,provider_financial_event_id,event_kind); event_kind: capture/refund; adjustment chưa bật khi chưa chốt policy.
- amount >= 0, 0 <= unallocated <= amount; SUM allocations + unallocated = amount.

### payment_event_allocations

Phân bổ tiền sự kiện về dòng đơn

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `event_id` | `uuid` | Không | PK; FK → payment_events.id |
| `order_item_id` | `uuid` | Không | PK; FK → order_items.id |
| `amount_minor` | `bigint` | Không | — |

- PK(event_id,order_item_id); amount >= 0; payment và item cùng order/currency, trừ unallocated giữ riêng.

### refund_items

Hoàn từng dòng, chưa bật khi thiếu policy

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `order_id` | `uuid` | Không | FK → orders.id |
| `payment_id` | `uuid` | Không | FK → payments.id |
| `order_item_id` | `uuid` | Không | FK → order_items.id |
| `provider` | `text` | Không | — |
| `refund_request_key` | `text` | Không | UK |
| `provider_refund_id` | `text` | Có | — |
| `currency` | `varchar(3)` | Không | — |
| `amount_minor` | `bigint` | Không | — |
| `status` | `text` | Không | — |
| `succeeded_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- FK(payment_id,order_id), FK(order_item_id,order_id); currency khớp payment/item.
- amount > 0; tổng refund pending+succeeded không vượt item allocation/payment chưa hoàn; status: pending/succeeded/failed.
- Một provider refund có thể gồm nhiều dòng: không UNIQUE(provider_refund_id) đơn lẻ; UNIQUE(provider,provider_refund_id,order_item_id) khi có.

### usage_counters

Quota thương mại khác số mẫu

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `user_id` | `uuid` | Không | PK; FK → users.id |
| `feature_code` | `text` | Không | PK; FK → features.code |
| `window_start` | `timestamptz` | Không | PK |
| `used` | `bigint` | Không | — |
| `reserved` | `bigint` | Không | — |

- PK(user_id,feature_code,window_start); used/reserved >= 0; policy window theo feature.

### usage_reservations

Giữ chỗ quota upload có hạn

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `upload_intent_id` | `uuid` | Không | FK → upload_intents.id |
| `user_id` | `uuid` | Không | FK → users.id |
| `feature_code` | `text` | Không | FK → features.code |
| `window_start` | `timestamptz` | Không | — |
| `amount` | `bigint` | Không | — |
| `status` | `text` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- UNIQUE(upload_intent_id,feature_code); composite FK counter và intent cùng user; amount > 0; reserved/committed/released.

### outbox_jobs

Công việc bền vững cho Redis worker

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `type` | `text` | Không | — |
| `aggregate_id` | `uuid` | Không | — |
| `deduplication_key` | `text` | Không | UK |
| `safe_payload` | `jsonb` | Không | — |
| `status` | `text` | Không | — |
| `attempts` | `integer` | Không | — |
| `available_at` | `timestamptz` | Không | — |
| `locked_until` | `timestamptz` | Có | — |
| `dispatched_at` | `timestamptz` | Có | — |
| `last_enqueued_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |
| `updated_at` | `timestamptz` | Không | — |

- status: pending/running/completed/failed; attempts >= 0; enqueue không có nghĩa completed.
- aggregate_id là tham chiếu logic theo type, không FK đa bảng; kết quả nghiệp vụ commit mới completed.

### webauthn_credentials

Passkey public credential, không chứa private key

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `credential_id` | `text` | Không | UK |
| `public_key` | `bytea` | Không | — |
| `sign_count` | `bigint` | Không | — |
| `label` | `text` | Không | — |
| `transports` | `jsonb` | Không | — |
| `backed_up` | `boolean` | Không | — |
| `created_at` | `timestamptz` | Không | — |
| `last_used_at` | `timestamptz` | Có | — |
| `revoked_at` | `timestamptz` | Có | — |

- UNIQUE(id,user_id); credential_id base64url canonical; sign_count >= 0, synced passkey không luôn tăng nên dùng policy thư viện.
- Public key/credential/user mapping bất biến; thêm/xóa cần reauth/audit, không xóa credential cuối admin/staff.

### mfa_challenges

Challenge WebAuthn theo mục đích và một lần

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `session_id` | `uuid` | Có | FK → sessions.id |
| `purpose` | `text` | Không | — |
| `challenge` | `text` | Không | UK |
| `capability_hash` | `text` | Có | UK |
| `action` | `text` | Có | — |
| `resource_id` | `text` | Có | — |
| `payload_hash` | `text` | Có | — |
| `attempts` | `integer` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `consumed_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |

- purpose: login/enroll/reauth/recovery; challenge có entropy cao, TTL và attempt cap; capability chỉ cấp hạn chế, không phải business JWT.
- Composite FK(session_id,user_id) cùng chủ khi session khác NULL; purpose/action/resource/payload không được client thay.
- Xác minh library challenge/origin/RP/UV và credential cùng user trước consume; replay không tạo session/grant thêm.

### mfa_recovery_codes

Recovery code hash dùng một lần

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `code_hash` | `text` | Không | UK |
| `created_at` | `timestamptz` | Không | — |
| `used_at` | `timestamptz` | Có | — |
| `revoked_at` | `timestamptz` | Có | — |

- Hash có entropy đủ mạnh; chỉ hiển thị code thô một lần; dùng code không bỏ qua policy phục hồi admin/staff.

### reauth_grants

Quyền một lần cho request nhạy cảm

| Cột | Kiểu | Nullable | Khóa |
| --- | --- | --- | --- |
| `id` | `uuid` | Không | PK |
| `user_id` | `uuid` | Không | FK → users.id |
| `session_id` | `uuid` | Không | FK → sessions.id |
| `token_hash` | `text` | Không | UK |
| `action` | `text` | Không | — |
| `resource_id` | `text` | Không | — |
| `payload_hash` | `text` | Không | — |
| `verified_method` | `text` | Không | — |
| `expires_at` | `timestamptz` | Không | — |
| `consumed_at` | `timestamptz` | Có | — |
| `created_at` | `timestamptz` | Không | — |

- FK(session_id,user_id) cùng chủ; session active, action/resource/payload hash và hạn khớp trước consume.
- Consume cùng transaction nghiệp vụ/audit, idempotent retry cùng thao tác không dùng grant cho request khác.

## Tài liệu liên quan

[Sơ đồ PNG](diagrams/README.md), [API](api.md), [quyền sử dụng](access-and-subscriptions.md), [giỏ hàng](cart-and-checkout.md), [analytics](analytics.md) và [kiểm chứng toàn vẹn](data-integrity.md).
