# Sơ đồ cards-and-media

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](cards-and-media.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

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
    occasions {
        smallint id PK
        text code UK
        text label_vi
        text label_en
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    card_styles {
        smallint id PK
        text code UK
        text label_vi
        text label_en
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    cards {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        text access_tier
        uuid template_license_id FK
        uuid entitlement_period_id FK
        timestamptz access_expires_at
        smallint occasion_id FK
        smallint style_id FK
    }
    card_shares {
        uuid card_id PK, FK
        uuid user_id FK
        uuid template_id FK
        text access_tier
        uuid template_license_id FK
        uuid entitlement_period_id FK
        timestamptz access_expires_at
        text token_hash UK
        jsonb published_snapshot
    }
    card_media {
        uuid card_id PK, FK
        uuid user_id FK
        text role
        uuid media_id PK, FK
        integer position
        text caption
    }
    card_share_media {
        uuid card_id PK, FK
        uuid user_id FK
        text role
        uuid media_id PK, FK
        integer position
        text caption
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
    media_assets {
        uuid id PK
        uuid user_id FK
        uuid upload_intent_id UK, FK
        text kind
        text cloudinary_asset_id UK
        text public_id
        text resource_type
        bigint cloudinary_version
        text secure_url
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
    template_licenses {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        uuid source_order_item_id UK, FK
        text status
        timestamptz granted_at
        timestamptz revoked_at
    }
    card_templates o|--o{ users : free_template_id
    occasions o|--o{ card_templates : occasion_id
    card_styles o|--o{ card_templates : style_id
    users ||--o{ cards : user_id
    card_templates ||--o{ cards : template_id
    occasions o|--o{ cards : occasion_id
    card_styles o|--o{ cards : style_id
    template_licenses o|--o{ cards : template_license_id
    subscription_periods o|--o{ cards : entitlement_period_id
    cards ||--o| card_shares : card_id
    users ||--o{ card_shares : user_id
    card_templates ||--o{ card_shares : template_id
    template_licenses o|--o{ card_shares : template_license_id
    subscription_periods o|--o{ card_shares : entitlement_period_id
    cards ||--o{ card_media : card_id
    media_assets ||--o{ card_media : media_id
    users ||--o{ card_media : user_id
    card_shares ||--o{ card_share_media : card_id
    media_assets ||--o{ card_share_media : media_id
    users ||--o{ card_share_media : user_id
    users ||--o{ upload_intents : user_id
    users ||--o{ media_assets : user_id
    upload_intents ||--o| media_assets : upload_intent_id
    users ||--o{ subscription_periods : user_id
    users ||--o{ template_licenses : user_id
    card_templates ||--o{ template_licenses : template_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
