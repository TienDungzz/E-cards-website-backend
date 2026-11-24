# Kế hoạch triển khai E-cards

Theo dõi triển khai backend qua 9 giai đoạn, 83 task. Hiện có HTTP /health, script local/staging/production, docs/schema generator và checker; các task dưới đây là công việc triển khai tiếp theo, chưa được đánh dấu hoàn thành.

## Cách theo dõi

- Đánh dấu [x] chỉ khi có mã/cấu hình và bằng chứng kiểm thử đáp ứng tiêu chí; tài liệu đã có không đồng nghĩa module đã triển khai.
- Giữ mã task ổn định khi tách issue/PR. Thêm người phụ trách, ngày dự kiến, PR và kết quả kiểm thử ở nhật ký bên dưới; không tự đặt deadline khi chưa chốt nguồn lực.
- Trạng thái: Chưa bắt đầu / Đang làm / Bị chặn / Chờ kiểm tra / Hoàn thành. Nếu bị chặn ghi phụ thuộc và việc cần giải quyết; không đánh dấu task hoàn thành chỉ vì bỏ qua.
- Mỗi giai đoạn chỉ hoàn thành khi các task bắt buộc và tiêu chí nghiệm thu đều đạt. Policy/provider chưa chốt phải khóa tính năng tương ứng, không dựng flow giả thành công.
- Bảo mật, migration, test và docs cập nhật trong từng task. Sửa schema.json thì generate, xuất ảnh và check trước merge.

## Tổng quan tiến độ

| Giai đoạn | Task | Trạng thái | Phụ thuộc chính |
| --- | --- | --- | --- |
| [1. Chốt phạm vi và quyết định triển khai](#giai-doan-1) | 0/7 | Chưa bắt đầu | — |
| [2. Nền tảng backend và môi trường](#giai-doan-2) | 0/9 | Chưa bắt đầu | GĐ 1 |
| [3. Đăng nhập phân quyền và bảo vệ tài khoản](#giai-doan-3) | 0/10 | Chưa bắt đầu | GĐ 2 |
| [4. Danh mục mẫu và quyền sử dụng](#giai-doan-4) | 0/8 | Chưa bắt đầu | GĐ 3 |
| [5. Thiệp media và chia sẻ](#giai-doan-5) | 0/10 | Chưa bắt đầu | GĐ 4 |
| [6. Giá giỏ hàng discount và quote](#giai-doan-6) | 0/9 | Chưa bắt đầu | GĐ 4, worker GĐ 2 |
| [7. Thanh toán và fulfillment](#giai-doan-7) | 0/11 | Chưa bắt đầu | GĐ 6 |
| [8. Quản trị và analytics](#giai-doan-8) | 0/9 | Chưa bắt đầu | GĐ 7; admin danh mục có thể làm sớm |
| [9. Kiểm chứng bảo mật và phát hành](#giai-doan-9) | 0/10 | Chưa bắt đầu | GĐ 8 |

Tiến độ khởi tạo: **0/83 task**. Bảng tổng quan và checkbox cập nhật thủ công khi chốt task; chưa có tự động tính tiến độ.

<a id="giai-doan-1"></a>

## Giai đoạn 1 Chốt phạm vi và quyết định triển khai

**Phụ thuộc:** Không phụ thuộc giai đoạn trước.

- [ ] **1.1** Chọn HTTP framework, driver/ORM PostgreSQL và công cụ migration.
- [ ] **1.2** Xác nhận guest là khách hàng đã đăng ký và chốt quyền cụ thể của staff.
- [ ] **1.3** Chốt danh mục mẫu free, giá mua lẻ, chu kỳ/quota/tính năng Plus.
- [ ] **1.4** Chọn provider thanh toán, email và Redis hosting.
- [ ] **1.5** Chốt domain frontend/backend để cấu hình cookie, CORS và WebAuthn.
- [ ] **1.6** Chốt refund, hết Plus, retention và phục hồi tài khoản đặc quyền.
- [ ] **1.7** Rà soát schema/API, tách tính năng bắt buộc và phần có thể hoãn.

**Nghiệm thu:** Có quyết định kiến trúc và cấu hình sản phẩm đủ để triển khai; schema/API không mâu thuẫn.

<a id="giai-doan-2"></a>

## Giai đoạn 2 Nền tảng backend và môi trường

**Phụ thuộc:** Sau giai đoạn 1; migration chức năng được bổ sung cùng từng module, không cần triển khai toàn bộ bảng trước.

- [ ] **2.1** Tổ chức routes, validation, services, repositories và infrastructure.
- [ ] **2.2** Xây dựng loader cấu hình và validate biến môi trường khi khởi động.
- [ ] **2.3** Kết nối PostgreSQL Aiven qua TLS; cấu hình pool, query/transaction timeout.
- [ ] **2.4** Thiết lập migration theo module, seed danh mục và database test riêng.
- [ ] **2.5** Chuẩn hóa response, error handler, request ID và logging đã che dữ liệu nhạy cảm.
- [ ] **2.6** Kết nối Redis và triển khai rate limit theo nhóm endpoint.
- [ ] **2.7** Tạo worker BullMQ, outbox dispatcher có lease và graceful shutdown.
- [ ] **2.8** Thiết lập integration test PostgreSQL/Redis và CI cơ bản.
- [ ] **2.9** Bổ sung readiness bên cạnh /health, kiểm thử dependency outage.

**Nghiệm thu:** API/DB/Redis/worker chạy được local và staging; lỗi dependency được xử lý có giới hạn, không mất dữ liệu.

<a id="giai-doan-3"></a>

## Giai đoạn 3 Đăng nhập phân quyền và bảo vệ tài khoản

**Phụ thuộc:** Sau giai đoạn 2; email cần provider từ giai đoạn 1.

- [ ] **3.1** Triển khai đăng ký, password hashing và xác minh email.
- [ ] **3.2** Triển khai login, JWT verification và session metadata.
- [ ] **3.3** Triển khai refresh rotation/replay detection, logout và logout-all.
- [ ] **3.4** Triển khai reset password và thu hồi session/challenge/grant liên quan.
- [ ] **3.5** Xây dựng authorization admin/staff/guest và ownership dùng chung.
- [ ] **3.6** Triển khai WebAuthn/passkey MFA, bắt buộc với admin/staff.
- [ ] **3.7** Triển khai enrollment, recovery và bootstrap admin không bypass MFA.
- [ ] **3.8** Triển khai reauth grant một lần gắn đúng thao tác/payload.
- [ ] **3.9** Triển khai danh sách phiên, thu hồi từng phiên, audit và thông báo bảo mật khi có provider.
- [ ] **3.10** Kiểm thử JWT sai/hết hạn, MFA challenge/replay, refresh đồng thời, CSRF và thay role.

**Nghiệm thu:** Không cấp quyền đặc quyền trước MFA; sid bị thu hồi không gọi API được; user A không truy cập tài nguyên B.

<a id="giai-doan-4"></a>

## Giai đoạn 4 Danh mục mẫu và quyền sử dụng

**Phụ thuộc:** Sau giai đoạn 3; cấp quyền thương mại thật chỉ mở sau thanh toán giai đoạn 7.

- [ ] **4.1** Triển khai danh mục occasion, card_style và card_template.
- [ ] **4.2** Triển khai phiên bản gói, feature và danh mục mẫu được cấp.
- [ ] **4.3** Xây dựng entitlement service dùng chung cho API/worker.
- [ ] **4.4** Khóa mẫu free theo user bằng transaction/constraint; không reset khi xóa thiệp.
- [ ] **4.5** Triển khai kỳ Plus, thời hạn và period_template_usage không hoàn lượt.
- [ ] **4.6** Triển khai template license vĩnh viễn, cấp/thu hồi/cấp lại có lịch sử.
- [ ] **4.7** Triển khai GET /me/entitlements và projection dữ liệu frontend.
- [ ] **4.8** Kiểm thử chọn free đồng thời, slot quota cuối, hết kỳ và license độc lập Plus.

**Nghiệm thu:** Free/Plus/purchased độc lập, không lách hạn mức bằng đổi/xóa thiệp. License/kỳ fixture chỉ seed vào môi trường test.

<a id="giai-doan-5"></a>

## Giai đoạn 5 Thiệp media và chia sẻ

**Phụ thuộc:** Sau giai đoạn 4 và worker giai đoạn 2; dùng fixture quyền trước khi billing thật sẵn sàng.

- [ ] **5.1** Triển khai tạo/đọc/sửa/xóa card với optimistic version conflict.
- [ ] **5.2** Xây dựng validator và renderer an toàn cho block Editor.js.
- [ ] **5.3** Triển khai upload intent/quota reservation và ký upload Cloudinary.
- [ ] **5.4** Xác minh file thực, metadata, kích thước/thời lượng và quyền trước status ready.
- [ ] **5.5** Triển khai card_media/card_share_media với composite FK cùng owner.
- [ ] **5.6** Triển khai publish/rotate link/unpublish và API shared-card.
- [ ] **5.7** Kiểm tra quyền Plus khi đọc snapshot/cấp URL media, không phụ thuộc cron.
- [ ] **5.8** Triển khai xóa media async, retry/reconciliation và dọn asset mồ côi.
- [ ] **5.9** Triển khai renew-access và activate-purchased-access có version/reauth theo policy.
- [ ] **5.10** Tích hợp editor frontend, xử lý loading/lỗi/409 và kiểm thử toàn luồng thiệp.

**Nghiệm thu:** Tạo/chia sẻ thiệp được, không lộ email; snapshot giữ asset đúng; Plus hết quyền bị chặn, purchased vẫn theo license.

<a id="giai-doan-6"></a>

## Giai đoạn 6 Giá giỏ hàng discount và quote

**Phụ thuộc:** Sau giai đoạn 4; có thể phát triển song song giai đoạn 5 nếu không sửa chung schema/contract.

- [ ] **6.1** Triển khai giá mua mẫu và giá gói có phiên bản bất biến.
- [ ] **6.2** Triển khai cart nhiều mẫu, chống trùng template và mixed currency.
- [ ] **6.3** Áp dụng cart.version/item.revision và cập nhật nguyên tử.
- [ ] **6.4** Triển khai discount %/fixed_amount ở cấp item/cart.
- [ ] **6.5** Triển khai scope/target/thời hạn và giới hạn lượt toàn cục/theo user.
- [ ] **6.6** Xây dựng quote có TTL/fingerprint và kiểm tra stale giá/giỏ/code.
- [ ] **6.7** Phân bổ discount theo largest remainder integer và lưu breakdown từng dòng.
- [ ] **6.8** Tạo order nhiều dòng, Idempotency-Key, counter/reservation và checkout outbox.
- [ ] **6.9** Tích hợp UI cart/quote/discount và kiểm thử request đồng thời.

**Nghiệm thu:** SUM item khớp order; không vượt lượt mã; thay đổi giá/giỏ cần quote lại, không tự thu giá khác.

<a id="giai-doan-7"></a>

## Giai đoạn 7 Thanh toán và fulfillment

**Phụ thuộc:** Sau giai đoạn 6 và entitlement giai đoạn 4; không mở bán trước khi đạt nghiệm thu.

- [ ] **7.1** Tích hợp tạo checkout provider sandbox qua outbox/idempotency ổn định.
- [ ] **7.2** Triển khai signature verification raw webhook, inbox và outbox bền vững.
- [ ] **7.3** Đối soát provider/order/customer/amount/currency trước fulfillment.
- [ ] **7.4** Triển khai order_fulfillments đúng một lần cho từng item, khóa order.
- [ ] **7.5** Cấp tất cả license hoặc kỳ Plus cùng transaction fulfillment.
- [ ] **7.6** Triển khai free-order total=0 có audit, không tạo payment giả.
- [ ] **7.7** Triển khai cancel-at-period-end và renewal order/item theo policy provider.
- [ ] **7.8** Xử lý webhook trùng/sai thứ tự, late payment và khoản thu dư/reconciliation.
- [ ] **7.9** Triển khai refund theo item allocation, reauth và giới hạn hoàn theo policy đã chốt.
- [ ] **7.10** Kiểm thử worker crash, Redis loss, provider timeout và replay/khôi phục.
- [ ] **7.11** Tích hợp checkout return/polling order trên frontend và đối chiếu tiền sandbox.

**Nghiệm thu:** Không cấp quyền hai lần, không mất dấu tiền; đơn nhiều dòng được fulfill nhất quán. Refund/auto-renew chưa đủ policy/test phải bị khóa.

<a id="giai-doan-8"></a>

## Giai đoạn 8 Quản trị và analytics

**Phụ thuộc:** Sau giai đoạn 7 cho số liệu thật; quản trị danh mục tối thiểu có thể làm sớm để phục vụ các module trước.

- [ ] **8.1** Triển khai staff API projection tối thiểu theo policy hỗ trợ.
- [ ] **8.2** Triển khai admin user role/status, reauth, audit và bảo vệ admin cuối cùng.
- [ ] **8.3** Triển khai quản trị gói/giá/discount phiên bản, không sửa dữ liệu đã bán.
- [ ] **8.4** Xây dựng payment_events append-only và allocation về order item.
- [ ] **8.5** Triển khai revenue summary/timeseries/products/discounts theo currency.
- [ ] **8.6** Triển khai reconciliation dashboard và customer summary từ PostgreSQL.
- [ ] **8.7** Kết nối GA4 server-side, cache/freshness, quota và lỗi nguồn.
- [ ] **8.8** Kiểm thử join nhiều dòng không nhân tiền, refund khác kỳ và timezone/currency.
- [ ] **8.9** Tích hợp dashboard admin, kiểm thử staff/guest bị chặn ngoài quyền.

**Nghiệm thu:** Doanh thu đối chiếu provider; traffic và account count có nguồn/nhãn riêng; API analytics chỉ cho admin.

<a id="giai-doan-9"></a>

## Giai đoạn 9 Kiểm chứng bảo mật và phát hành

**Phụ thuộc:** Sau các giai đoạn chức năng; kiểm thử bảo mật diễn ra từ giai đoạn 2, không đợi đến cuối.

- [ ] **9.1** Hoàn tất integration test authorization/MFA/quota/payment concurrency và các case từ data-integrity.
- [ ] **9.2** Thiết lập secret/dependency scan và security gates thật trong CI.
- [ ] **9.3** Kiểm tra upload/stored XSS, cookie/CORS/CSP và media delivery có hạn.
- [ ] **9.4** Tách quyền DB API/worker/migration, xác minh secret rotation và quyền procedure.
- [ ] **9.5** Cấu hình Supervisor/reverse proxy/HTTPS, log rotation và user không đặc quyền.
- [ ] **9.6** Thiết lập alert auth/payment/Redis/worker/outbox với owner và runbook.
- [ ] **9.7** Diễn tập backup/restore, rollback release và reconciliation sau sự cố.
- [ ] **9.8** Chạy smoke/load phù hợp quy mô và UAT toàn luồng frontend trên staging.
- [ ] **9.9** Hoàn thiện bằng chứng kiểm thử, runbook và checklist phê duyệt phát hành.
- [ ] **9.10** Phát hành production có giám sát, smoke test sau deploy và phương án rollback.

**Nghiệm thu:** Security gate bắt buộc đạt, không còn lỗi nghiêm trọng chưa xử lý; restore/rollback có bằng chứng và có người phụ trách vận hành.

## Nhật ký thực hiện

Dùng một dòng cho mỗi task đang thực hiện; chưa có người phụ trách hoặc lịch cam kết thì để Chưa phân công/Chưa chốt. Bằng chứng có thể là PR, CI artifact hoặc báo cáo kiểm thử đã có quyền truy cập phù hợp, không ghi secret hay dữ liệu khách hàng.

| Task | Trạng thái | Phụ trách | Dự kiến | PR hoặc bằng chứng | Vướng mắc hoặc bước tiếp |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Chưa bắt đầu | Chưa phân công | Chưa chốt | — | Chọn framework, driver/ORM và migration |

## Tài liệu thực hiện

- [Phạm vi sản phẩm](README.md), [API](api.md), [schema](schema.json) và [database](database.md).
- [Quyền](access-and-subscriptions.md), [JWT](authentication.md), [security controls](security-controls.md) và [toàn vẹn dữ liệu](data-integrity.md).
- [Cart](cart-and-checkout.md), [giá/discount](pricing-and-discounts.md), [analytics](analytics.md) và [runtime](runtime-and-request-security.md).
- [Cách chạy](../getting-started.md), [quality gates](../quality/README.md) và [mẫu bàn giao](../templates/review.md).
