# Giá e-card lẻ và discount

## Quy tắc đã xác nhận và phạm vi

Mỗi loại e-card có giá mua lẻ riêng. Mua lẻ thành công mở khóa vĩnh viễn; khác với Plus chỉ có quyền theo kỳ. Discount áp dụng được cho giá gói Plus và giá mua e-card lẻ.

Thiết kế hiện ánh xạ sản phẩm e-card mua lẻ tới một card_template: mua một mẫu để tài khoản được sử dụng lâu dài, không chỉ một bản thiệp đã tạo. Nếu “loại” được hiểu là cả dịp (occasion), cần đổi đơn vị bán trước migration. Giá cụ thể, phạm vi tính năng kèm mua lẻ và provider thanh toán chưa chốt.

## Quyền mua lẻ vĩnh viễn

Mỗi user/template có một template_license, chỉ cấp sau thanh toán được backend xác minh. License không có expires_at; hết Plus, mẫu ngừng bán hoặc giá thay đổi không thu hồi quyền đã mua. Vĩnh viễn là quyền sử dụng sản phẩm, không phải quyền truy cập nội dung của người khác hay cam kết lưu dữ liệu vô hạn.

Quyền dùng mẫu được hợp nhất từ: free_template_id cố định + template_license active + quyền Plus còn hạn và quota. Mua thêm mẫu không đổi/reset mẫu free, không chiếm quota mẫu Plus và không đổi role. Người chưa có Plus vẫn dùng được các mẫu đã mua, ngoài mẫu free cố định.

Thêm access_tier=purchased cho card/snapshot, tham chiếu license đúng chủ và đúng template, không có period hoặc access_expires_at. Khi license bị revoked do hoàn tiền/tranh chấp theo policy đã chốt, backend không tiếp tục phục vụ quyền của license đó. Không tự thu hồi license active chỉ vì có webhook cũ hoặc hết subscription.

Thiệp Plus cũ không tự đổi sang purchased. Đề xuất owner gọi activate-purchased-access sau khi mua mẫu tương ứng; server kiểm tra card/snapshot cùng mẫu, license active, version và cập nhật bằng transaction có audit. Không phục hồi link đã thu hồi/hết expires_at; không hoàn lượt quota Plus đã dùng. Việc chuyển Plus sang purchased là ngoại lệ hợp lệ do server kiểm soát, không phải PATCH access_tier tùy ý.

Mua lẻ chỉ mở mẫu và tính năng đi kèm được mô tả trong sản phẩm; không tự mở toàn bộ audio/storage/quota Plus. Các giới hạn chung vẫn áp dụng. license giữ tham chiếu template để mẫu ngừng bán vẫn có thể render, không xóa template đã bán.

## Giá và checkout

Giá mẫu có phiên bản qua template_prices: amount_minor là số nguyên đơn vị tiền tệ nhỏ nhất, currency và trạng thái đang bán. Sửa giá tạo bản ghi mới; order_items giữ snapshot bất biến của sản phẩm và giá đã chốt. Không lấy số tiền, phần trăm giảm hoặc license từ client.

Mỗi order có một hoặc nhiều order_items: giỏ có thể chứa nhiều template khác nhau; tối đa một dòng Plus theo đề xuất hỗ trợ giỏ hỗn hợp. Mỗi sản phẩm quantity=1. Xem [giỏ hàng và cart discount](cart-and-checkout.md). Không tự thanh toán hai checkout đồng thời cho cùng mẫu đã sở hữu: khóa user, kiểm tra license và pending order trước khi tạo checkout mới. Retry provider dùng idempotency key ổn định.

## Mô hình discount đề xuất

Hỗ trợ discount code trước; auto-discount có thể bổ sung sau. Mỗi phiên bản discount bất biến khi được sử dụng; đổi điều kiện phải tạo version mới.

| Thuộc tính | Quy tắc |
| --- | --- |
| Cấp áp dụng | application_level=item hoặc cart; cart tính trên tổng giỏ theo điều kiện được mô tả riêng |
| Phạm vi | plus, template hoặc both; tùy chọn giới hạn plan/template cụ thể |
| Kiểu | percentage hoặc fixed_amount |
| Giá trị | percentage dùng integer basis points, 10000 = 100%; fixed_amount dùng amount_minor và currency bắt buộc |
| Thời gian | starts_at <= server_time < ends_at; có thể chưa cấu hình ends_at nếu policy cho phép |
| Điều kiện | is_active, min_subtotal_minor, currency nếu có, usage_limit toàn hệ thống và per_user_limit lưu trên discounts, dùng chung qua mọi version |
| Kết hợp | Tối đa một discount mỗi order, không cộng dồn |
| Plus gia hạn | Mặc định chỉ áp dụng giao dịch đang checkout, không tự giữ giá giảm cho các kỳ gia hạn |
| Refund | Không tự hoàn lượt discount; policy thay đổi phải có audit |

Giảm phần trăm tính floor(eligible_subtotal_minor * basis_points / 10000); giảm cố định giới hạn không vượt eligible_subtotal_minor. discount_minor nằm trong [0, subtotal_minor], total_minor = subtotal_minor - discount_minor. Nếu có thuế/phí, phải thêm các trường/tính toán và công bố trước mở bán; thiết kế hiện chưa tính thuế/phí.

Ví dụ minh họa: subtotal 100000, giảm 10% tương ứng 1000 bps → discount 10000 → total 90000. Chưa phải giá chính thức của sản phẩm.

## Chống vượt lượt và sai giá

Quote chỉ báo giá tạm, không giữ lượt. Checkout khóa bản ghi discount và counter user theo thứ tự ổn định, kiểm tra lại điều kiện, tạo reservation và order snapshot trong transaction. used + reserved không vượt usage_limit/per_user_limit. Hai request cùng slot cuối chỉ một được giữ chỗ.

Discount reservation có trạng thái reserved/redeemed/released. Thanh toán xác minh chuyển reserved → redeemed đúng một lần trong transaction order_fulfillments và cấp quyền. Không giảm used khi webhook trùng/refund. Không trả lượt chỉ vì đồng hồ local qua hạn: phải xác minh checkout/payment provider đã terminal và không thể thanh toán trước khi release. Nếu provider cho thanh toán muộn, giữ reservation cho đến đối soát; không tự cấp quyền khi đã release mà chưa xử lý ngoại lệ.

Nếu provider báo đã thu tiền sau khi order đã hủy/release, chuyển order sang reconciliation_required, lưu payment và outbox đối soát/hoàn tiền theo policy; không âm thầm bỏ mất khoản thu hoặc cấp quyền vượt quota. Khôi phục xử lý phải idempotent.

Giá/discount thay đổi hoặc code hết hạn sau khi checkout được xác nhận không làm thay snapshot order còn hiệu lực trong cửa sổ provider. Không đọc lại giá hiện hành để so số tiền đã thu. Đối chiếu provider amount/currency với total_minor của order.

Nếu giảm 100% tạo total=0, không giả lập webhook thanh toán thành công: dùng luồng free-order nội bộ có audit và idempotency, sau validation/quota mới cấp quyền trong transaction; không gọi provider nếu provider không nhận số tiền 0.

## Contract liên quan

| Method | Path | Quyền và nội dung |
| --- | --- | --- |
| GET | `/api/v1/card-templates/:id` | Công khai; metadata, giá mua lẻ đang bán, trạng thái sở hữu khi đăng nhập |
| GET | `/api/v1/me/template-licenses` | Đăng nhập; license mẫu của mình, phân trang |
| POST | `/api/v1/billing/quotes` | Đăng nhập; cart_id/cart_version hoặc một sản phẩm direct, discount_code tùy chọn; trả quote_id, từng dòng và totals, chưa giữ lượt |
| POST | `/api/v1/billing/checkouts` | Đăng nhập; quote_id và version nếu từ giỏ; Idempotency-Key bắt buộc; kiểm tra quote, giữ lượt và tạo order nhiều dòng |
| POST | `/api/v1/cards/:id/activate-purchased-access` | Owner; version, chuyển quyền card/snapshot cùng mẫu sang license vĩnh viễn hợp lệ |
| POST | `/api/v1/admin/card-templates/:id/prices` | Admin; tạo giá mua lẻ mới |
| POST | `/api/v1/admin/discounts` | Admin; tạo code draft |
| POST | `/api/v1/admin/discounts/:id/versions` | Admin; tạo phiên bản điều kiện/giá trị |
| POST | `/api/v1/admin/discount-versions/:id/publish` | Admin; validate và phát hành phiên bản |
| PATCH | `/api/v1/admin/discounts/:id/availability` | Admin; dừng/mở áp dụng checkout mới, không thay order cũ |

Quote/checkout trả breakdown và discount_code được áp dụng. Lỗi 400 DISCOUNT_NOT_APPLICABLE cho code không hợp lệ/hết hạn/sai đối tượng; 409 DISCOUNT_LIMIT_REACHED khi hết lượt; 409 TEMPLATE_ALREADY_OWNED nếu đã sở hữu active; 409 CHECKOUT_PENDING nếu còn giao dịch cho cùng mẫu. Rate limit quote/code để tránh dò mã.

Provider và policy refund/chargeback chưa chọn. Nội dung trên là thiết kế, chưa có migration, endpoint hoặc thanh toán thực tế.

Discount cart total phân bổ về từng dòng theo largest remainder, không cộng dồn với code item. Hoàn từng dòng dùng số tiền sau phân bổ đã snapshot, không tính lại giá giảm. Chi tiết và ví dụ tại [cart](cart-and-checkout.md).

Giới hạn lượt thuộc discounts, không thuộc discount_versions; version chứa công thức/targets/thời gian bất biến. Đổi limits dưới khóa và không được nhỏ hơn used+reserved. Endpoint chuẩn tại [API](api.md), schema tại [database](database.md).
