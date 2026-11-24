# Role và quyền sử dụng mẫu

Các quy tắc sản phẩm đã xác nhận nằm ở [tổng quan](README.md). Thiết kế này chưa triển khai runtime; cơ chế đăng nhập chi tiết tại [JWT](authentication.md).

## Vai trò

Một tài khoản có một role trong phiên bản đầu. guest là role mặc định khi đăng ký; anonymous là người chưa đăng nhập. Mua Plus/mẫu không đổi role. Staff/admin dùng tính năng sản phẩm vẫn theo entitlement trừ khi có policy miễn phí riêng được phê duyệt.

| Hành động | anonymous | guest | staff | admin |
| --- | --- | --- | --- | --- |
| Xem danh mục/gói/link còn quyền | Có | Có | Có | Có |
| Quản lý thiệp/media của mình | Không | Theo quyền | Theo quyền | Theo quyền |
| Mua gói hoặc mẫu | Không | Có | Có | Có |
| Tra cứu tối thiểu phục vụ hỗ trợ | Không | Không | Có, theo policy đề xuất | Có, có audit |
| Đổi role/khóa tài khoản/quản lý giá | Không | Không | Không | Có |
| Analytics doanh thu/traffic | Không | Không | Không mặc định | Có |
| Đọc tự do thiệp riêng của người khác | Không | Không | Không | Không |

Role/status không được nhận từ đăng ký/profile. Bootstrap admin riêng, MFA bắt buộc admin/staff; nâng role yêu cầu credential đã xác minh và reauth, thu hồi phiên cũ. Không hạ quyền/khóa admin active cuối cùng. Quyền staff ở bảng là đề xuất cần xác nhận; mọi truy cập hỗ trợ giới hạn dữ liệu và có audit.

## Ba nguồn quyền

| access_tier | Nguồn | Thời hạn | Mẫu/quota |
| --- | --- | --- | --- |
| free | users.free_template_id | Không theo kỳ Plus | Đúng một mẫu đã khóa; không tự giới hạn số thiệp |
| plus | subscription_periods + period_template_usage | Không muộn hơn ends_at kỳ confirmed | Mẫu trong phiên bản gói, không vượt max_distinct_templates |
| purchased | template_licenses active | Vĩnh viễn khi license active | Đúng mẫu đã mua, không chiếm quota mẫu Plus |

Entitlement là hợp các quyền trên, không chỉ một allowed plan. License không tự mở mọi audio/storage/quota Plus; feature đi kèm mua lẻ còn cần chốt. Không lấy email người gửi hoặc dữ liệu UI làm bằng chứng ownership.

## Khóa mẫu free

Lần tạo free thành công đầu tiên khóa lựa chọn trong cùng transaction sau validation. Preview hoặc request tạo thất bại không khóa. Khóa user ngăn hai request đồng thời chọn hai mẫu khác nhau. Không có endpoint reset; xóa card, mua/hết Plus hoặc đổi danh mục không reset free_template_id.

Danh mục ban đầu có thể cho chọn nhiều mẫu; sau chọn chỉ dùng mẫu đã khóa cho luồng free. Mẫu ngừng bán không tự cho đổi; cần luồng thay thế có audit và policy rõ ràng. Mẫu, dịp và kiểu trình bày là khái niệm riêng; không cho clone/import hoặc chỉnh payload để giả mạo mẫu trả phí.

## Chọn quyền khi tạo thiệp

Client có thể yêu cầu access_tier, nhưng backend quyết định theo quyền hiện tại. Nếu không yêu cầu: ưu tiên purchased active cho mẫu → free đã khóa đúng mẫu → plus còn hạn/quota. Nếu chưa khóa free và không có quyền mua lẻ/Plus cho mẫu, yêu cầu xác nhận rõ access_tier=free từ danh mục đủ điều kiện để thiết lập lựa chọn. Không âm thầm dùng quyền Plus hoặc đổi khóa free để vượt giới hạn.

Thiệp đã tạo không cho PATCH access_tier, license hoặc period. Đổi template chỉ được phép trong phạm vi nguồn quyền hiện có: free/purchased cố định mẫu; Plus có thể đổi mẫu đủ điều kiện nhưng vẫn ghi usage và không hoàn lượt. Đổi Plus sang purchased dùng activate-purchased-access; chuyển sang kỳ Plus mới dùng renew-access. Mua license không tự đổi thiệp cũ.

## Plus theo kỳ

Kỳ confirmed có starts_at, ends_at và max_distinct_templates bất biến từ sản phẩm đã trả. Lần dùng mẫu mới ghi period_template_usage dưới khóa kỳ; dùng lại mẫu không thêm lượt, xóa/đổi card không hoàn lượt. Mẫu free đã khóa và mẫu có license active đi qua nguồn quyền riêng, không chiếm quota Plus.

Card và snapshot giữ period/hạn quyền riêng; chỉnh nháp không gia hạn snapshot. Mọi request đọc/ghi kiểm tra thời gian server trong [starts_at,ends_at), trạng thái kỳ, user và quota. Không dựa vào cron/webhook expired chạy đúng giờ; cache không được vượt thời hạn.

Hết kỳ: snapshot Plus hết quyền trả 404 với người có link; owner chỉ xem metadata quản lý, xóa hoặc gia hạn. Giữ dữ liệu, không tự xóa/đổi mẫu. Free và purchased active vẫn hoạt động theo nguồn quyền của chúng.

Đề xuất gia hạn từng thiệp: owner chọn card, server kiểm tra card/snapshot cùng mẫu, mẫu được cấp ở kỳ mới và quota, rồi cập nhật hạn trong transaction. Không tự phục hồi link đã revoke hoặc hết link expires_at. Mua một kỳ không tạo giấy phép trọn đời.

## Mua lẻ vĩnh viễn

Cấp license sau fulfillment đúng một lần của order item template đã thanh toán (hoặc free-order total=0 hợp lệ). Giá đổi, ngừng bán mẫu hoặc hết Plus không thu hồi license active. Không có expires_at trên license. Refund/chargeback có thể revoke theo policy phải chốt trước bật tính năng; webhook cũ không thu hồi license đã mua lại.

activate-purchased-access kiểm tra license cùng user/template, version và mẫu snapshot khớp nháp; cập nhật card/snapshot có audit, không hoàn lượt Plus hoặc phục hồi link đã revoke. Nội dung/media vẫn chịu quyền tài nguyên và quota chung. Không thể thu hồi bản sao đã được tải hợp lệ.

## Subscription và thanh toán

Status subscription: pending/active/past_due/canceled/expired. current_period_start/end là projection; period confirmed chưa bị revoke mới là nguồn quyền. Hủy gia hạn không cắt kỳ đã trả; past_due không tự thêm grace period. Gia hạn provider tạo renewal order/item/fulfillment idempotent rồi cấp kỳ mới; không cộng kỳ chỉ từ một webhook.

Vòng đời: quote → checkout/order → provider xác nhận → inbox/outbox → transaction fulfillment/license/kỳ. Trang return không cấp quyền. Auto-renew, đổi gói, thuế/refund và provider chưa chốt. Chi tiết [cart](cart-and-checkout.md), [giá/discount](pricing-and-discounts.md), [toàn vẹn](data-integrity.md).

## Bảo vệ tài khoản đặc quyền

Áp dụng [security controls](security-controls.md): MFA/passkey, reauth theo request, session revoke, audit và quyền hỗ trợ tối thiểu. Role DB thay đổi không được nâng token guest cũ thành admin; mọi phiên cũ phải bị thu hồi và login lại đủ MFA.
