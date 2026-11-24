# Sơ đồ security

Nguồn: [schema.json](../schema.json). File tự sinh; sửa nguồn rồi chạy `npm run docs:generate`.

[Mở ảnh PNG](security.png). Sơ đồ chỉ hiển thị cột chính; constraint đầy đủ xem [database](../database.md) và [tính toàn vẹn](../data-integrity.md). Schema chưa triển khai.

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
    sessions {
        uuid id PK
        uuid user_id FK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
        timestamptz password_verified_at
        timestamptz mfa_verified_at
        text user_agent_label
    }
    webauthn_credentials {
        uuid id PK
        uuid user_id FK
        text credential_id UK
        bytea public_key
        bigint sign_count
        text label
        jsonb transports
        boolean backed_up
        timestamptz created_at
    }
    mfa_challenges {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        text purpose
        text challenge UK
        text capability_hash UK
        text action
        text resource_id
        text payload_hash
    }
    mfa_recovery_codes {
        uuid id PK
        uuid user_id FK
        text code_hash UK
        timestamptz created_at
        timestamptz used_at
        timestamptz revoked_at
    }
    reauth_grants {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        text token_hash UK
        text action
        text resource_id
        text payload_hash
        text verified_method
        timestamptz expires_at
    }
    audit_logs {
        uuid id PK
        uuid actor_user_id FK
        text action
        text target_type
        text target_id
        jsonb safe_metadata
        timestamptz created_at
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
    users ||--o{ sessions : user_id
    users ||--o{ webauthn_credentials : user_id
    users ||--o{ mfa_challenges : user_id
    sessions o|--o{ mfa_challenges : session_id
    users ||--o{ mfa_recovery_codes : user_id
    users ||--o{ reauth_grants : user_id
    sessions ||--o{ reauth_grants : session_id
    users o|--o{ audit_logs : actor_user_id
```

PK: khóa chính; UK: khóa duy nhất; FK: khóa ngoại. Khóa ghép/partial index và số dòng tối thiểu cần đọc cùng quy tắc nghiệp vụ. [Tất cả sơ đồ](README.md).
