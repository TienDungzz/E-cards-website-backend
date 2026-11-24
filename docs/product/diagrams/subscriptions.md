# Sơ đồ subscriptions

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](subscriptions.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

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
    plans {
        uuid id PK
        text code UK
        text name
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    plan_versions {
        uuid id PK
        uuid plan_id FK
        integer version
        boolean is_published
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
    subscriptions {
        uuid id PK
        uuid user_id FK
        uuid price_id FK
        uuid origin_order_id FK
        text provider
        text provider_subscription_id
        text status
        timestamptz current_period_start
        timestamptz current_period_end
    }
    subscription_periods {
        uuid id PK
        uuid user_id FK
        uuid source_order_item_id UK, FK
        timestamptz starts_at
        timestamptz ends_at
        integer max_distinct_templates
        uuid subscription_id FK
        uuid plan_version_id FK
        text provider_period_key
    }
    period_template_usage {
        uuid template_id PK, FK
        uuid period_id PK, FK
        timestamptz first_used_at
    }
    order_fulfillments {
        uuid order_item_id PK, FK
        uuid user_id FK
        uuid order_id FK
        text source_kind
        uuid payment_id FK
        timestamptz fulfilled_at
    }
    subscription_events {
        uuid id PK
        uuid subscription_id FK
        uuid payment_id FK
        uuid webhook_event_id FK
        text event_type
        timestamptz effective_at
        timestamptz created_at
    }
    plans ||--o{ plan_versions : plan_id
    plan_versions ||--o{ plan_prices : plan_version_id
    plan_versions ||--o{ plan_features : plan_version_id
    features ||--o{ plan_features : feature_code
    plan_versions ||--o{ plan_templates : plan_version_id
    users ||--o{ subscriptions : user_id
    plan_prices ||--o{ subscriptions : price_id
    subscriptions ||--o{ subscription_periods : subscription_id
    users ||--o{ subscription_periods : user_id
    plan_versions ||--o{ subscription_periods : plan_version_id
    order_fulfillments ||--o| subscription_periods : source_order_item_id
    subscription_periods ||--o{ period_template_usage : period_id
    users ||--o{ order_fulfillments : user_id
    subscriptions ||--o{ subscription_events : subscription_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
