# Sơ đồ cart

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](cart.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

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
    carts {
        uuid id PK
        uuid user_id FK
        text status
        varchar_3_ currency
        integer version
        timestamptz created_at
        timestamptz updated_at
    }
    cart_items {
        uuid id PK
        uuid cart_id FK
        text product_type
        text product_key
        uuid plan_price_id FK
        uuid template_price_id FK
        integer quantity
        integer revision
        timestamptz created_at
    }
    checkout_quotes {
        uuid id PK
        uuid user_id FK
        uuid cart_id FK
        integer cart_version
        text input_hash
        jsonb pricing_snapshot
        timestamptz expires_at
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
    order_fulfillments {
        uuid order_item_id PK, FK
        uuid user_id FK
        uuid order_id FK
        text source_kind
        uuid payment_id FK
        timestamptz fulfilled_at
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
    users ||--o{ carts : user_id
    carts ||--o{ cart_items : cart_id
    plan_prices o|--o{ cart_items : plan_price_id
    template_prices o|--o{ cart_items : template_price_id
    users ||--o{ checkout_quotes : user_id
    carts o|--o{ checkout_quotes : cart_id
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
    order_items ||--o| order_fulfillments : order_item_id
    orders ||--o{ order_fulfillments : order_id
    users ||--o{ order_fulfillments : user_id
    users ||--o{ template_licenses : user_id
    order_fulfillments ||--o| template_licenses : source_order_item_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
