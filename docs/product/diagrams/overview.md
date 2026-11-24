# Sơ đồ overview

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](overview.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

```mermaid
erDiagram
    users {
        uuid id PK
        text role
        uuid free_template_id FK
        text email UK
    }
    sessions {
        uuid id PK
        uuid user_id FK
        timestamptz expires_at
        timestamptz revoked_at
    }
    refresh_tokens {
        uuid id PK
        uuid session_id FK
        uuid parent_token_id UK, FK
        text token_hash UK
    }
    auth_tokens {
        uuid id PK
        uuid user_id FK
        text purpose
        text token_hash UK
    }
    audit_logs {
        uuid id PK
        uuid actor_user_id FK
        text action
        text target_type
    }
    occasions {
        smallint id PK
        text code UK
        text label_vi
        text label_en
    }
    card_styles {
        smallint id PK
        text code UK
        text label_vi
        text label_en
    }
    card_templates {
        uuid id PK
        text code UK
        text name
        smallint occasion_id FK
    }
    cards {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        text access_tier
    }
    upload_intents {
        uuid id PK
        uuid user_id FK
        text kind
        text expected_public_id UK
    }
    media_assets {
        uuid id PK
        uuid user_id FK
        uuid upload_intent_id UK, FK
        text kind
    }
    card_media {
        uuid card_id PK, FK
        uuid user_id FK
        text role
        uuid media_id PK, FK
    }
    card_shares {
        uuid card_id PK, FK
        uuid user_id FK
        uuid template_id FK
        text access_tier
    }
    card_share_media {
        uuid card_id PK, FK
        uuid user_id FK
        text role
        uuid media_id PK, FK
    }
    plans {
        uuid id PK
        text code UK
        text name
        boolean is_active
    }
    plan_versions {
        uuid id PK
        uuid plan_id FK
        integer version
        boolean is_published
    }
    plan_prices {
        uuid id PK
        uuid plan_version_id FK
        bigint amount_minor
        varchar_3_ currency
    }
    features {
        text code PK
        text value_type
        text description
    }
    plan_features {
        uuid plan_version_id PK, FK
        text feature_code PK, FK
        boolean enabled
        bigint limit_value
    }
    plan_templates {
        uuid template_id PK, FK
        uuid plan_version_id PK, FK
    }
    template_prices {
        uuid id PK
        uuid template_id FK
        bigint amount_minor
        varchar_3_ currency
    }
    carts {
        uuid id PK
        uuid user_id FK
        text status
        varchar_3_ currency
    }
    cart_items {
        uuid id PK
        uuid cart_id FK
        text product_type
        text product_key
    }
    checkout_quotes {
        uuid id PK
        uuid user_id FK
        uuid cart_id FK
        integer cart_version
    }
    discounts {
        uuid id PK
        text code UK
        uuid current_version_id FK
        boolean is_active
    }
    discount_versions {
        uuid id PK
        text application_level
        timestamptz starts_at
        timestamptz ends_at
    }
    discount_plan_targets {
        uuid discount_version_id PK, FK
        uuid plan_id PK, FK
    }
    discount_template_targets {
        uuid template_id PK, FK
        uuid discount_version_id PK, FK
    }
    discount_counters {
        uuid discount_id PK, FK
        integer used
        integer reserved
    }
    discount_user_counters {
        uuid user_id PK, FK
        uuid discount_id PK, FK
        integer used
        integer reserved
    }
    orders {
        uuid id PK
        uuid user_id FK
        bigint subtotal_minor
        bigint discount_minor
    }
    order_items {
        uuid id PK
        bigint subtotal_minor
        bigint discount_minor
        bigint total_minor
    }
    discount_redemptions {
        uuid id PK
        uuid user_id FK
        bigint discount_minor
        uuid discount_version_id FK
    }
    payments {
        uuid id PK
        uuid order_id FK
        text provider
        text provider_payment_id
    }
    order_fulfillments {
        uuid order_item_id PK, FK
        uuid user_id FK
        uuid order_id FK
        text source_kind
    }
    subscriptions {
        uuid id PK
        uuid user_id FK
        uuid price_id FK
        uuid origin_order_id FK
    }
    subscription_periods {
        uuid id PK
        uuid user_id FK
        uuid source_order_item_id UK, FK
        timestamptz starts_at
    }
    period_template_usage {
        uuid template_id PK, FK
        uuid period_id PK, FK
        timestamptz first_used_at
    }
    template_licenses {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        uuid source_order_item_id UK, FK
    }
    license_events {
        uuid id PK
        uuid order_item_id FK
        uuid license_id FK
        uuid payment_id FK
    }
    webhook_events {
        uuid id PK
        text provider
        text event_id
        text event_type
    }
    subscription_events {
        uuid id PK
        uuid subscription_id FK
        uuid payment_id FK
        uuid webhook_event_id FK
    }
    payment_events {
        uuid id PK
        uuid payment_id FK
        text provider
        text provider_financial_event_id
    }
    payment_event_allocations {
        uuid order_item_id PK, FK
        uuid event_id PK, FK
        bigint amount_minor
    }
    refund_items {
        uuid id PK
        uuid order_item_id FK
        uuid order_id FK
        uuid payment_id FK
    }
    usage_counters {
        uuid user_id PK, FK
        text feature_code PK, FK
        timestamptz window_start PK
        bigint used
    }
    usage_reservations {
        uuid id PK
        uuid user_id FK
        uuid upload_intent_id FK
        text feature_code FK
    }
    outbox_jobs {
        uuid id PK
        text type
        uuid aggregate_id
        text deduplication_key UK
    }
    webauthn_credentials {
        uuid id PK
        uuid user_id FK
        text credential_id UK
        bytea public_key
    }
    mfa_challenges {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        text purpose
    }
    mfa_recovery_codes {
        uuid id PK
        uuid user_id FK
        text code_hash UK
        timestamptz created_at
    }
    reauth_grants {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        text token_hash UK
    }
    card_templates o|--o{ users : free_template_id
    users ||--o{ sessions : user_id
    sessions ||--o{ refresh_tokens : session_id
    refresh_tokens o|--o| refresh_tokens : parent_token_id
    users ||--o{ auth_tokens : user_id
    users o|--o{ audit_logs : actor_user_id
    occasions o|--o{ card_templates : occasion_id
    card_styles o|--o{ card_templates : style_id
    users ||--o{ cards : user_id
    card_templates ||--o{ cards : template_id
    occasions o|--o{ cards : occasion_id
    card_styles o|--o{ cards : style_id
    template_licenses o|--o{ cards : template_license_id
    subscription_periods o|--o{ cards : entitlement_period_id
    users ||--o{ upload_intents : user_id
    users ||--o{ media_assets : user_id
    upload_intents ||--o| media_assets : upload_intent_id
    cards ||--o{ card_media : card_id
    media_assets ||--o{ card_media : media_id
    users ||--o{ card_media : user_id
    cards ||--o| card_shares : card_id
    users ||--o{ card_shares : user_id
    card_templates ||--o{ card_shares : template_id
    template_licenses o|--o{ card_shares : template_license_id
    subscription_periods o|--o{ card_shares : entitlement_period_id
    card_shares ||--o{ card_share_media : card_id
    media_assets ||--o{ card_share_media : media_id
    users ||--o{ card_share_media : user_id
    plans ||--o{ plan_versions : plan_id
    plan_versions ||--o{ plan_prices : plan_version_id
    plan_versions ||--o{ plan_features : plan_version_id
    features ||--o{ plan_features : feature_code
    plan_versions ||--o{ plan_templates : plan_version_id
    card_templates ||--o{ plan_templates : template_id
    card_templates ||--o{ template_prices : template_id
    users ||--o{ carts : user_id
    carts ||--o{ cart_items : cart_id
    plan_prices o|--o{ cart_items : plan_price_id
    template_prices o|--o{ cart_items : template_price_id
    users ||--o{ checkout_quotes : user_id
    carts o|--o{ checkout_quotes : cart_id
    discount_versions o|--o{ discounts : current_version_id
    discounts ||--o{ discount_versions : discount_id
    discount_versions ||--o{ discount_plan_targets : discount_version_id
    plans ||--o{ discount_plan_targets : plan_id
    discount_versions ||--o{ discount_template_targets : discount_version_id
    card_templates ||--o{ discount_template_targets : template_id
    discounts ||--o| discount_counters : discount_id
    discounts ||--o{ discount_user_counters : discount_id
    users ||--o{ discount_user_counters : user_id
    users ||--o{ orders : user_id
    checkout_quotes ||--o| orders : quote_id
    carts o|--o{ orders : source_cart_id
    discount_versions o|--o{ orders : discount_version_id
    orders ||--o{ order_items : order_id
    plan_prices o|--o{ order_items : plan_price_id
    template_prices o|--o{ order_items : template_price_id
    discount_versions ||--o{ discount_redemptions : discount_version_id
    users ||--o{ discount_redemptions : user_id
    orders ||--o| discount_redemptions : order_id
    orders ||--o{ payments : order_id
    order_items ||--o| order_fulfillments : order_item_id
    orders ||--o{ order_fulfillments : order_id
    users ||--o{ order_fulfillments : user_id
    payments o|--o{ order_fulfillments : payment_id
    users ||--o{ subscriptions : user_id
    plan_prices ||--o{ subscriptions : price_id
    orders o|--o{ subscriptions : origin_order_id
    subscriptions ||--o{ subscription_periods : subscription_id
    users ||--o{ subscription_periods : user_id
    plan_versions ||--o{ subscription_periods : plan_version_id
    order_fulfillments ||--o| subscription_periods : source_order_item_id
    subscription_periods ||--o{ period_template_usage : period_id
    card_templates ||--o{ period_template_usage : template_id
    users ||--o{ template_licenses : user_id
    card_templates ||--o{ template_licenses : template_id
    order_fulfillments ||--o| template_licenses : source_order_item_id
    template_licenses ||--o{ license_events : license_id
    order_items o|--o{ license_events : order_item_id
    payments o|--o{ license_events : payment_id
    subscriptions ||--o{ subscription_events : subscription_id
    payments o|--o{ subscription_events : payment_id
    webhook_events o|--o{ subscription_events : webhook_event_id
    payments ||--o{ payment_events : payment_id
    webhook_events o|--o{ payment_events : source_webhook_id
    payment_events ||--o{ payment_event_allocations : event_id
    order_items ||--o{ payment_event_allocations : order_item_id
    orders ||--o{ refund_items : order_id
    payments ||--o{ refund_items : payment_id
    order_items ||--o{ refund_items : order_item_id
    users ||--o{ usage_counters : user_id
    features ||--o{ usage_counters : feature_code
    upload_intents ||--o{ usage_reservations : upload_intent_id
    users ||--o{ usage_reservations : user_id
    features ||--o{ usage_reservations : feature_code
    users ||--o{ webauthn_credentials : user_id
    users ||--o{ mfa_challenges : user_id
    sessions o|--o{ mfa_challenges : session_id
    users ||--o{ mfa_recovery_codes : user_id
    users ||--o{ reauth_grants : user_id
    sessions ||--o{ reauth_grants : session_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
