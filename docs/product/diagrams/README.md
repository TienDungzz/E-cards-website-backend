# Sơ đồ database E-cards

Ảnh mở trực tiếp, không cần Mermaid. Schema đang là thiết kế, chưa có migration.

| Nhóm | PNG | Nguồn Mermaid |
| --- | --- | --- |
| Tổng thể | [overview.png](overview.png) | [overview.md](overview.md) |
| Bảo mật/MFA/reauth | [security.png](security.png) | [security.md](security.md) |
| Tài khoản/JWT | [identity.png](identity.png) | [identity.md](identity.md) |
| Thiệp/media | [cards-and-media.png](cards-and-media.png) | [cards-and-media.md](cards-and-media.md) |
| Subscription/quota Plus | [subscriptions.png](subscriptions.png) | [subscriptions.md](subscriptions.md) |
| Giá/license/discount | [commerce.png](commerce.png) | [commerce.md](commerce.md) |
| Cart/checkout | [cart.png](cart.png) | [cart.md](cart.md) |
| Ledger/analytics | [analytics.png](analytics.png) | [analytics.md](analytics.md) |
| Outbox/quota upload | [operations.png](operations.png) | [operations.md](operations.md) |

Nguồn chung: [schema.json](../schema.json). Sửa nguồn rồi chạy `npm run docs:generate`; Windows tạo PNG bằng `npm run docs:images`. Không sửa tay database.md, Mermaid hoặc layouts.json. `npm run check:schema` phát hiện tài liệu tự sinh lệch nguồn; PNG cần xuất và kiểm tra trực quan lại khi schema thay đổi.

PK là khóa chính, FK là khóa ngoại, UK là unique. Mũi tên PNG trỏ từ bảng con về bảng cha; diagram chỉ hiển thị cột chính. UNIQUE ghép, partial index, CHECK, transaction và ràng buộc số dòng tối thiểu xem [database](../database.md) và [toàn vẹn](../data-integrity.md).
