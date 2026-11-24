# Giỏ hàng và discount cart total

## Phạm vi

Người dùng đăng nhập có giỏ hàng chứa nhiều mẫu e-card khác nhau. Mỗi mẫu mua lẻ cấp license vĩnh viễn sau thanh toán xác minh. Thêm giỏ không mở khóa mẫu, không giữ giá hoặc lượt discount.

Đề xuất giỏ có thể chứa nhiều template và tối đa một sản phẩm Plus; nếu provider chưa hỗ trợ checkout hỗn hợp thì trả lỗi rõ ràng, không tự tách hoặc thu tiền hai lần. Checkout Plus trực tiếp và mua lẻ trực tiếp đều dùng cùng pipeline tính giá/order_items. Việc hỗ trợ Plus trong giỏ là lựa chọn thiết kế đề xuất, chưa chốt provider.

## Quy tắc giỏ

- Một giỏ active cho mỗi user; mỗi item có quantity=1 vì license áp dụng theo tài khoản/mẫu, không theo số bản thiệp.
- Không có hai dòng cùng template, kể cả tham chiếu hai phiên bản giá khác nhau; tối đa một dòng Plus. Không cho thêm mẫu đã có license active.
- Giỏ chỉ có một currency; giá lấy từ server. Mẫu ngừng bán, thay giá, license đã sở hữu hoặc Plus xung đột phải được kiểm tra lại lúc quote/checkout.
- Mỗi thay đổi tăng cart.version; sửa một dòng phải tăng cart_items.revision trong cùng transaction. PATCH/DELETE giỏ yêu cầu version để tránh ghi đè giữa nhiều tab; không nhận user_id từ client.
- Chỉ thanh toán toàn giỏ trong phiên bản đầu. Đơn phải có ít nhất một dòng; không có checkout giỏ rỗng.

Giỏ là dữ liệu có thể sửa, đơn đã checkout là snapshot bất biến. Thay đổi giỏ sau đó không sửa đơn/provider checkout đang tồn tại. Khi thanh toán thành công chỉ dọn các cart item đúng id và revision đã checkout; không xóa item mới hoặc dòng đã thay đổi sau checkout.

## Discount cấp sản phẩm và cấp giỏ

Bổ sung application_level=item hoặc cart vào discount_version. scope=plus/template/both xác định loại sản phẩm, còn application_level xác định cơ sở tính giảm; không dùng scope để thay cho cấp giảm.

| Cấp | Cơ sở tính |
| --- | --- |
| item | Tổng subtotal của những dòng phù hợp scope và target plan/template; không giảm dòng ngoài phạm vi |
| cart | Tổng subtotal toàn giỏ sau kiểm tra mọi dòng đều thuộc scope/target được phép; nếu có dòng không hợp lệ thì từ chối code, không âm thầm giảm một phần rồi gọi đó là cart total |

Code cart tổng quát dùng scope=both và không đặt target. min_subtotal_minor kiểm tra trên cơ sở đủ điều kiện của code. Tối đa một code/order, không cộng dồn item discount với cart discount trong phiên bản đầu. Giá sale tự động/stacking chưa được thiết kế.

Cả hai cấp hỗ trợ percentage hoặc fixed_amount. Giảm phần trăm = floor(eligible_subtotal_minor * basis_points / 10000), fixed = min(amount_minor, eligible_subtotal_minor), cùng currency. Code được tính một lần trên cơ sở đủ điều kiện, không lặp giảm cố định cho mỗi item. Checkout nhiều e-card vẫn chỉ tiêu thụ một lượt code trên order, không phải mỗi dòng một lượt.

## Phân bổ giảm giá về từng dòng

Mỗi order_item lưu subtotal_minor, discount_minor, total_minor; tổng các dòng phải bằng các tổng trên order. Không dùng float.

Với tổng giảm D và cơ sở S > 0: mỗi dòng đủ điều kiện nhận floor(D * item_subtotal / S), phần đơn vị còn dư phân cho dòng có phần dư lớn nhất, hòa thì theo line_number tăng dần đã snapshot. Dòng không đủ điều kiện nhận 0. Kết quả luôn ổn định khi retry, tổng phân bổ = D và discount từng dòng không vượt subtotal. S=0 thì D=0, không chia cho 0. Dùng phép tính integer đủ lớn để tránh overflow khi nhân.

Ví dụ minh họa: A=100000, B=200000, cart discount fixed=50000. Phân bổ A=16667, B=33333; tổng phải trả A=83333, B=166667, order total=250000. Đây không phải giá sản phẩm chính thức.

Hoàn tiền theo từng item không vượt item.total_minor đã phân bổ trừ các khoản đã hoàn. Không tính lại discount theo giá hoặc giỏ hiện tại. Nếu hoàn một item làm mất điều kiện giá trị tối thiểu, phiên bản đầu không hồi tố thu lại giảm giá từ item khác; policy thu hồi license/Plus và xử lý hoàn một phần cần được chốt trước bật refund. Không hoàn lượt discount tự động.

## Quote và checkout

1. Client gửi cart_id, cart_version, discount_code tùy chọn để quote.
2. Backend validate giỏ, giá, currency, ownership và điều kiện code; trả quote_id, expires_at, cart_version, từng dòng và tổng tiền. Quote là bản báo giá có hạn, chưa giữ lượt/quyền.
3. Checkout gửi quote_id, cart_version và Idempotency-Key; backend khóa/kiểm tra lại cart và discount, đối chiếu fingerprint gồm item/revision, price version, currency, code version và totals.
4. Có thay đổi thì trả 409 QUOTE_STALE kèm yêu cầu lấy quote mới; không tự thu giá cao hơn hoặc bỏ code để tiếp tục.
5. Hợp lệ: trong transaction tạo order và N order_items snapshot, reserve một lượt code, ghi checkout/outbox và đánh dấu giao dịch pending. Gọi provider ngoài transaction với idempotency ổn định.
6. Webhook hợp lệ đối chiếu order total/currency, chuyển redemption đúng một lần và cấp tất cả license/kỳ Plus cùng transaction. Nếu một dòng không thể cấp theo snapshot, rollback cấp quyền và chuyển đối soát; không mất khoản thu.

Giá và điều kiện code có thể thay đổi sau khi provider checkout đã được tạo; order snapshot trong cửa sổ thanh toán vẫn là nguồn đối chiếu. Quote chưa checkout không có cam kết giữ giá. Total=0 dùng free-order có audit/idempotency như [billing](pricing-and-discounts.md).

Runtime khóa user trước khi kiểm tra pending item/giỏ và thống nhất lock order với discount counter; hai checkout khác giỏ nhưng trùng template không được tạo hai giao dịch song song. Có thể kiểm tra giao cắt order_items của các order pending trong khóa user; không dựa riêng vào UNIQUE cart_id. Không tự chia một khoản thanh toán thành nhiều order không được người mua chấp nhận.

## API dự kiến

| Method | Path | Nội dung |
| --- | --- | --- |
| GET | `/api/v1/cart` | Giỏ active của mình, version, dòng và giá hiện tại; metadata giá chưa cam kết |
| POST | `/api/v1/cart/items` | product_type, price_id, cart_version; thêm quantity=1, trả giỏ/version mới |
| PATCH | `/api/v1/cart/items/:id` | cart_version và price_id mới hợp lệ; không chuyển chủ hoặc sửa tiền |
| DELETE | `/api/v1/cart/items/:id` | If-Match cart version; xóa dòng, trả giỏ/version mới |
| DELETE | `/api/v1/cart/items` | If-Match cart version; xóa giỏ, không hủy order đang checkout |
| POST | `/api/v1/billing/quotes` | cart_id/cart_version/discount_code hoặc direct product_type/price_id; không trộn hai chế độ |
| POST | `/api/v1/billing/checkouts` | quote_id/cart_version nếu từ giỏ; Idempotency-Key bắt buộc; trả order_id/status/checkout_url nullable hoặc free-order; polling me/orders/:id khi provider chưa sẵn sàng |

Đề xuất tất cả mutation giỏ trả 200 kèm data giỏ và version mới. Lỗi: CART_EMPTY, CART_VERSION_CONFLICT, DUPLICATE_CART_ITEM, CURRENCY_MISMATCH, QUOTE_STALE, TEMPLATE_ALREADY_OWNED, CHECKOUT_PENDING, DISCOUNT_NOT_APPLICABLE và DISCOUNT_LIMIT_REACHED. Validation 400, trạng thái xung đột 409; unauthorized/ownership giữ quy ước chung.

Tài liệu là thiết kế; chưa có database migration, quote/cart API hoặc thanh toán thực tế.

Schema hợp nhất tại [database](database.md); order_fulfillments khóa một lần cấp quyền mỗi item. Provider renewal cần renewal order/item riêng trước khi tạo kỳ Plus. Danh sách endpoint chuẩn tại [API](api.md).
