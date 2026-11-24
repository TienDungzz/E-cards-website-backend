# Analytics: doanh thu và Google Analytics

## Nguồn dữ liệu và quyền truy cập

Backend cung cấp API analytics cho dashboard quản trị. Doanh thu lấy từ PostgreSQL và thanh toán đã được đối soát với provider. Google Analytics 4 (GA4) cung cấp hành vi truy cập: active users, sessions, page views và nguồn traffic; không thay thế ledger thanh toán hoặc danh sách tài khoản sản phẩm.

Chỉ admin được gọi các endpoint trong tài liệu này. Staff mặc định không xem doanh thu hoặc GA, trừ khi sau này có permission analytics riêng được phê duyệt. Không nhận user_id/role/property_id tùy ý để quyết định quyền hoặc nguồn report. Đây là thiết kế, chưa có endpoint, migration hay kết nối GA4 thực tế.

| Số liệu | Nguồn chính |
| --- | --- |
| Tiền thu, hoàn tiền, giảm giá, mẫu bán chạy, doanh số Plus/mua lẻ | PostgreSQL + provider events đã xác minh |
| Tài khoản đăng ký, role, tài khoản trả phí, license và subscription hiện hành | PostgreSQL, không suy ra từ GA |
| Người dùng truy cập, session, page views, acquisition | GA4 Data API |

GA user không tương đương một tài khoản: có anonymous, nhiều thiết bị và giới hạn tracking/consent. Dashboard phải ghi rõ nhãn và nguồn. Không dùng event purchase browser hoặc GA revenue làm nguồn cấp quyền hay tính tổng thanh toán chính thức.

## Định nghĩa thống kê tiền

Phiên bản đầu báo cáo tiền thu theo sự kiện thanh toán, không phải doanh thu kế toán phân bổ theo thời gian cung cấp Plus. Nếu cần accrual/MRR/ARR thì thiết kế chỉ số riêng, không đổi nghĩa các trường dưới đây.

| Chỉ số | Công thức/ý nghĩa |
| --- | --- |
| collected_minor | Tổng capture/sale thành công đã xác minh, sau discount, theo occurred_at của khoản thu |
| refunded_minor | Tổng refund đã thành công, theo thời điểm refund; không chỉ SUM payment hiện còn status=succeeded |
| net_collected_minor | collected_minor - refunded_minor; có thể âm nếu hoàn tiền đơn kỳ trước |
| paid_orders | COUNT DISTINCT order có khoản thu được chấp nhận lần đầu trong khoảng; không đếm webhook/payment attempt trùng |
| free_orders | Đơn total=0 đã hoàn tất qua flow nội bộ, không giả là tiền thu/payment provider |
| sold_items | Số dòng hàng được fulfill thành công; refund không âm thầm xóa lịch sử bán |
| discount_granted_minor | Discount snapshot của đơn lần đầu hoàn tất, kể cả đơn 0; có chỉ số số tiền thu riêng |
| average_paid_order_minor | Tổng order.total_minor của tập paid_orders / paid_orders; null khi không có đơn, không dùng net kỳ có refund khác kỳ |

Không cộng tiền khác currency và không tự quy đổi tỷ giá. API trả theo currency riêng; nhóm theo product_type=plus/template cho doanh số và theo template_id cho mẫu. Các số tiền/đếm lớn trả chuỗi số nguyên để tránh mất chính xác JavaScript; tỷ lệ trả decimal kèm định nghĩa/precision. Không xem net_collected là lợi nhuận: phí provider, thuế và chargeback chưa có ledger/policy, phải trả coverage rõ ràng thay vì giả là đã trừ.

Mua lại không được tính trùng chỉ vì webhook gửi lại. Hai khoản thu thực sự khác nhau cho cùng order vẫn là hai khoản tiền đã nhận: báo phần dư là unmatched/excess collection cần đối soát, không bỏ mất tiền hoặc fulfill thêm lần nữa.

## API doanh thu dự kiến

Prefix /api/v1/admin/analytics. Tất cả endpoint dùng Bearer JWT, kiểm tra admin hiện tại, validate filter và rate limit riêng.

| Method | Path | Kết quả |
| --- | --- | --- |
| GET | `/api/v1/admin/analytics/revenue/summary` | Tổng thu/hoàn/net, paid/free orders, item count và discount theo currency |
| GET | `/api/v1/admin/analytics/revenue/timeseries` | Bucket day/week/month, fill bucket trống, khoản thu và hoàn theo ngày sự kiện |
| GET | `/api/v1/admin/analytics/revenue/products` | Phân rã theo product_type/template_id, số item và tiền đã phân bổ, sort/pagination |
| GET | `/api/v1/admin/analytics/revenue/discounts` | Code/version, số đơn dùng mã, discount snapshot và tiền thu của các đơn dùng code |
| GET | `/api/v1/admin/analytics/revenue/reconciliation` | Khoản thu thừa/chưa phân bổ, refund thiếu mapping, event chưa đối soát và đơn pending lâu |
| GET | `/api/v1/admin/analytics/customers/summary` | Số tài khoản/số khách trả phí/Plus/license từ DB; không dùng GA để đếm tài khoản |

Query doanh thu: from/to là ISO 8601 có offset, khoảng [from,to); timezone là IANA dùng để chia bucket, mặc định Asia/Ho_Chi_Minh theo cấu hình sản phẩm, không phụ thuộc timezone host. from < to, range tối đa 366 ngày cho truy vấn đồng bộ theo đề xuất. currency tùy chọn; nếu bỏ thì response chia nhóm, không có một total chung khác tiền tệ. product_type, template_id, discount_id chỉ cho endpoint tương thích; filter lạ hoặc tổ hợp không hỗ trợ trả 400.

Mọi response có meta.source, generated_at, data_as_of, timezone, from, to, currencies và coverage. data_as_of là watermark event đã xử lý, không giả định bằng thời điểm request. Read nhiều chỉ số cùng snapshot DB để tránh tổng summary và breakdown lệch do webhook mới đến. Đối soát có data_quality flag; chưa biết phải trả unavailable/partial, không giả bằng 0.

Đề xuất endpoint đồng bộ timeout có giới hạn, cache Redis 60 giây và giới hạn 10 request/phút/admin. Cache key gồm filter/timezone/currency và quyền truy cập; Redis hỏng có thể đọc DB với giới hạn concurrency thấp. Không để report scan không giới hạn làm nghẽn checkout. Export CSV là tính năng tùy chọn sau, chưa khai báo endpoint/job giả.

## Ledger và tránh đếm trùng

Bổ sung payment_events append-only cho capture/refund đã xác minh; event không được biến mất khi payment chuyển status. UNIQUE(provider, provider_financial_event_id, event_kind). Không dùng webhook_event_id làm khóa tiền: một chuyển trạng thái tiền có thể xuất hiện qua nhiều loại webhook; adapter chuẩn hóa định danh financial event provider.

Một report tiền thu aggregate ledger trước khi join order_items để tránh nhân một payment thành N lần theo số dòng giỏ. Product report dùng allocation theo item.total_minor đã trừ discount; phân bổ integer largest remainder, lưu kết quả bất biến. Refund theo mapping refund_item và phần đã phân bổ, không phân bổ lại bằng giá hiện tại.

Giữ phần chưa gán được item dưới bucket unallocated/reconciliation. Tổng item allocation + unallocated phải bằng event amount theo currency. Refund ngoài hệ thống không có item mapping vẫn xuất hiện trong refunded_minor và unallocated, không làm report im lặng giảm tiền. Không tự sửa ledger cũ. Sai lệch chuyển đối soát; event adjustment/correction chỉ mở sau khi có schema và policy riêng, hiện chưa bật.

Báo cáo discount là số liệu attribution của đơn, không phải ledger cash riêng. Khi lọc code không lấy toàn bộ payment qua join nhiều redemption. Chỉ COUNT DISTINCT order và phân bổ item liên quan; quy tắc cart/item discount tại [giỏ hàng](cart-and-checkout.md).

## Google Analytics 4 qua backend

Backend gọi GA4 Data API runReport bằng service account/OAuth phía server, tài khoản được cấp quyền đọc property thực tế. Property id do server cấu hình allowlist; không trả service account key hoặc Google access token cho frontend. Google credentials quản lý qua secret manager/ADC khi triển khai, không đưa vào VITE_ hoặc repo.

GA tracking trên frontend là luồng thu thập riêng (GA tag/consent khi áp dụng). Fetch report không tự tạo dữ liệu nếu frontend chưa được cấu hình tracking. Chưa xác nhận GA property hoặc tracking đã có; endpoint phải trả trạng thái chưa cấu hình thay vì dữ liệu giả.

| Method | Path | GA metrics/dimensions dự kiến |
| --- | --- | --- |
| GET | `/api/v1/admin/analytics/traffic/summary` | activeUsers, totalUsers, newUsers, sessions, screenPageViews, engagementRate cho cả khoảng |
| GET | `/api/v1/admin/analytics/traffic/timeseries` | Các metric phù hợp theo date; không cộng unique user từng ngày để suy ra unique user cả kỳ |
| GET | `/api/v1/admin/analytics/traffic/acquisition` | sessionDefaultChannelGroup hoặc sessionSource/sessionMedium cùng sessions/activeUsers; xác minh compatibility trước triển khai |
| GET | `/api/v1/admin/analytics/traffic/pages` | pagePath và screenPageViews/activeUsers, allowlist dimensions, phân trang có trần |

Traffic query dùng start_date/end_date_exclusive dạng YYYY-MM-DD theo timezone GA property. Adapter đổi end_date_exclusive thành endDate inclusive đúng contract GA. Response trả property_timezone; không áp timezone revenue tùy ý lên date report GA. Khi ghép dashboard hai nguồn phải chuẩn hóa khoảng ngày/múi giờ và hiển thị khác biệt nếu không đồng nhất.

Metrics GA là dữ liệu tổng hợp có thể trễ và chịu policy/consent, không phải account ledger. Tổng unique user/channel breakdown có thể không cộng thành summary. Không gửi email, nội dung thiệp hoặc identifier nhạy cảm lên GA để đối soát. Không trả drilldown dữ liệu cá nhân cho dashboard.

## Cache, worker và lỗi GA

Đề xuất cache traffic 15 phút, worker Redis warm cache cho dashboard phổ biến khi có nhu cầu; không khởi tạo job trùng trên mỗi lần mở trang. Cache lưu fetched_at, property, query fingerprint, freshness; chỉ admin được đọc. Không cần chép toàn bộ GA vào database giai đoạn đầu.

Tôn trọng quota GA theo property, giới hạn concurrency và retry exponential backoff có trần cho lỗi transient/quota; lỗi permission/config không retry vô hạn. Cache cũ chỉ trả khi còn trong giới hạn stale đã cấu hình và meta.stale=true; không có cache thì trả 503 ANALYTICS_SOURCE_UNAVAILABLE hoặc ANALYTICS_NOT_CONFIGURED nếu chưa cấu hình. Không lẫn 429 rate-limit nội bộ với quota upstream, không trả zero giả. Lỗi traffic không làm API doanh thu PostgreSQL ngừng hoạt động.

## Kiểm thử bắt buộc

Webhook trùng không tăng thu; refund kỳ sau cho net âm đúng kỳ; đổi status payment không xóa capture lịch sử; đơn nhiều dòng không nhân tiền; khác currency không cộng; discount cart allocation khớp tổng; đơn 100% không tạo tiền thu; late/excess capture hiện ở reconciliation; refund không mapping vẫn tính; DST/timezone và ngày ranh giới; permissions guest/staff bị chặn; BigInt JSON không mất chính xác; GA hết quota/permission lỗi/missing config/stale cache; unique user summary không SUM daily users.

Chưa có migration, report SQL, kết nối GA hoặc integration test; các kiểm tra docs/lint không chứng minh tính đúng số liệu tài chính.

Nguồn: [GA Data API runReport](https://developers.google.com/analytics/devguides/reporting/data/v1/basics), [GA API quickstart](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart), [quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas), [errors](https://developers.google.com/analytics/devguides/reporting/data/v1/errors).
