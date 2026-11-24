# Sơ đồ commerce

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](commerce.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

```mermaid
erDiagram
    users {
        uuid id PK
        text role
        uuid free_template_id FK
        text email UK
        text password_hash
        text display_name
        text status
        timestamptz email_verified_at
        timestamptz created_at
    }
    card_templates {
        uuid id PK
        text code UK
        text name
        smallint occasion_id FK
        smallint style_id FK
        jsonb default_content
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    template_prices {
        uuid id PK
        uuid template_id FK
        bigint amount_minor
        varchar_3_ currency
        text provider
        text provider_price_id
        boolean is_active
        timestamptz created_at
    }
    plan_prices {
        uuid id PK
        uuid plan_version_id FK
        bigint amount_minor
        varchar_3_ currency
        text billing_interval
        text provider
        text provider_price_id
        boolean is_active
        timestamptz created_at
    }
    orders {
        uuid id PK
        uuid user_id FK
        bigint subtotal_minor
        bigint discount_minor
        bigint total_minor
        uuid quote_id UK, FK
        uuid source_cart_id FK
        integer source_cart_version
        uuid discount_version_id FK
    }
    order_items {
        uuid id PK
        bigint subtotal_minor
        bigint discount_minor
        bigint total_minor
        uuid order_id FK
        text product_type
        text product_key
        integer line_number
        uuid plan_price_id FK
    }
    order_fulfillments {
        uuid order_item_id PK, FK
        uuid user_id FK
        uuid order_id FK
        text source_kind
        uuid payment_id FK
        timestamptz fulfilled_at
    }
    payments {
        uuid id PK
        uuid order_id FK
        text provider
        text provider_payment_id
        bigint amount_minor
        varchar_3_ currency
        text status
        bigint refunded_amount_minor
        timestamptz created_at
    }
    template_licenses {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        uuid source_order_item_id UK, FK
        text status
        timestamptz granted_at
        timestamptz revoked_at
    }
    license_events {
        uuid id PK
        uuid order_item_id FK
        uuid license_id FK
        uuid payment_id FK
        text action
        timestamptz created_at
    }
    discounts {
        uuid id PK
        text code UK
        uuid current_version_id FK
        boolean is_active
        integer usage_limit
        integer per_user_limit
        timestamptz created_at
        timestamptz updated_at
    }
    discount_versions {
        uuid id PK
        text application_level
        timestamptz starts_at
        timestamptz ends_at
        uuid discount_id FK
        integer version
        text scope
        text kind
        integer basis_points
    }
    discount_redemptions {
        uuid id PK
        uuid user_id FK
        bigint discount_minor
        uuid discount_version_id FK
        uuid order_id UK, FK
        text status
        timestamptz expires_at
        timestamptz redeemed_at
        timestamptz released_at
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
    discount_plan_targets {
        uuid discount_version_id PK, FK
        uuid plan_id PK, FK
    }
    discount_template_targets {
        uuid template_id PK, FK
        uuid discount_version_id PK, FK
    }
    card_templates o|--o{ users : free_template_id
    card_templates ||--o{ template_prices : template_id
    users ||--o{ orders : user_id
    discount_versions o|--o{ orders : discount_version_id
    orders ||--o{ order_items : order_id
    plan_prices o|--o{ order_items : plan_price_id
    template_prices o|--o{ order_items : template_price_id
    order_items ||--o| order_fulfillments : order_item_id
    orders ||--o{ order_fulfillments : order_id
    users ||--o{ order_fulfillments : user_id
    payments o|--o{ order_fulfillments : payment_id
    orders ||--o{ payments : order_id
    users ||--o{ template_licenses : user_id
    card_templates ||--o{ template_licenses : template_id
    order_fulfillments ||--o| template_licenses : source_order_item_id
    template_licenses ||--o{ license_events : license_id
    order_items o|--o{ license_events : order_item_id
    payments o|--o{ license_events : payment_id
    discount_versions o|--o{ discounts : current_version_id
    discounts ||--o{ discount_versions : discount_id
    discount_versions ||--o{ discount_redemptions : discount_version_id
    users ||--o{ discount_redemptions : user_id
    orders ||--o| discount_redemptions : order_id
    discounts ||--o| discount_counters : discount_id
    discounts ||--o{ discount_user_counters : discount_id
    users ||--o{ discount_user_counters : user_id
    discount_versions ||--o{ discount_plan_targets : discount_version_id
    discount_versions ||--o{ discount_template_targets : discount_version_id
    card_templates ||--o{ discount_template_targets : template_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
