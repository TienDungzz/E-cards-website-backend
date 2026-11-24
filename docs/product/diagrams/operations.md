# Sơ đồ operations

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](operations.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

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
    upload_intents {
        uuid id PK
        uuid user_id FK
        text kind
        text expected_public_id UK
        text status
        timestamptz expires_at
        timestamptz created_at
    }
    usage_counters {
        uuid user_id PK, FK
        text feature_code PK, FK
        timestamptz window_start PK
        bigint used
        bigint reserved
    }
    usage_reservations {
        uuid id PK
        uuid user_id FK
        uuid upload_intent_id FK
        text feature_code FK
        timestamptz window_start
        bigint amount
        text status
        timestamptz expires_at
        timestamptz created_at
    }
    features {
        text code PK
        text value_type
        text description
    }
    outbox_jobs {
        uuid id PK
        text type
        uuid aggregate_id
        text deduplication_key UK
        jsonb safe_payload
        text status
        integer attempts
        timestamptz available_at
        timestamptz locked_until
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
    users ||--o{ upload_intents : user_id
    users ||--o{ usage_counters : user_id
    features ||--o{ usage_counters : feature_code
    upload_intents ||--o{ usage_reservations : upload_intent_id
    users ||--o{ usage_reservations : user_id
    features ||--o{ usage_reservations : feature_code
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
