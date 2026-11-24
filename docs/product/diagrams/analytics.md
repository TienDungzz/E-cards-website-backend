# Sơ đồ analytics

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](analytics.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

```mermaid
erDiagram
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
    payment_events {
        uuid id PK
        uuid payment_id FK
        text provider
        text provider_financial_event_id
        text event_kind
        varchar_3_ currency
        bigint amount_minor
        bigint unallocated_minor
        timestamptz occurred_at
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
        text provider
        text refund_request_key UK
        text provider_refund_id
        varchar_3_ currency
        bigint amount_minor
    }
    webhook_events {
        uuid id PK
        text provider
        text event_id
        text event_type
        text payload_hash
        text processing_status
        timestamptz occurred_at
        timestamptz received_at
        timestamptz processed_at
    }
    order_fulfillments {
        uuid order_item_id PK, FK
        uuid user_id FK
        uuid order_id FK
        text source_kind
        uuid payment_id FK
        timestamptz fulfilled_at
    }
    orders ||--o{ order_items : order_id
    orders ||--o{ payments : order_id
    payments ||--o{ payment_events : payment_id
    webhook_events o|--o{ payment_events : source_webhook_id
    payment_events ||--o{ payment_event_allocations : event_id
    order_items ||--o{ payment_event_allocations : order_item_id
    orders ||--o{ refund_items : order_id
    payments ||--o{ refund_items : payment_id
    order_items ||--o{ refund_items : order_item_id
    order_items ||--o| order_fulfillments : order_item_id
    orders ||--o{ order_fulfillments : order_id
    payments o|--o{ order_fulfillments : payment_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
