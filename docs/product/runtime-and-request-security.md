# Rate limit, Redis worker, Supervisor và xác thực request

## Quyết định và hiện trạng

Dự án lưu lượng nhỏ nhưng vẫn có rate limit, worker dùng Redis và quản lý tiến trình bằng Supervisor. Đề xuất chọn BullMQ cho queue Node.js. Hiện runtime chỉ có HTTP /health; chưa có Redis client, limiter, worker hoặc cấu hình Supervisor đang chạy. Không coi tài liệu này là tính năng đã triển khai.

## Browser không giữ được secret trước người dùng

Mọi giá trị JavaScript có thể dùng để gửi request đều nằm trong môi trường người dùng kiểm soát. Người dùng có thể xem request, headers, body và token của chính họ bằng DevTools. Obfuscation, biến VITE_, SHA256 hoặc mã hóa payload phía browser không làm secret trở thành bí mật với chủ trình duyệt.

Cookie HttpOnly ngăn JavaScript trên trang đọc cookie, không ẩn cookie khỏi chủ trình duyệt/DevTools. HTTPS bảo vệ đường truyền, không che request khỏi máy gửi. CORS/Origin không chứng minh request đến từ ứng dụng chính chủ: client ngoài browser có thể tự gửi header. Không thể đảm bảo chỉ frontend của mình gọi được public API bằng secret nhúng trong bundle.

Backend xác thực danh tính và quyền, không tin client. Dùng [JWT](authentication.md), validation, quyền ownership/role/entitlement hiện tại, CSRF cho các endpoint dùng cookie và rate limit. Không thiết kế X-Secret-Key bắt buộc ở browser hoặc dùng chữ ký SHA256 browser để thay kiểm tra quyền.

## Frontend cần gửi gì

| Request | Dữ liệu cần gửi |
| --- | --- |
| Login | JSON email/password qua HTTPS; Origin browser, Content-Type và header CSRF theo policy auth |
| API bảo vệ | Authorization: Bearer access_token; Content-Type: application/json khi có JSON body |
| Refresh/logout | Refresh cookie HttpOnly tự gửi với credentials phù hợp, X-CSRF-Protection: 1 và origin được allowlist |
| Checkout/thao tác cần chống trùng | Idempotency-Key ngẫu nhiên theo một thao tác; backend ràng buộc user/payload/result |
| Sửa dữ liệu | version/If-Match đúng contract để chống ghi đè |

Các giá trị trên không cần và không thể ẩn hoàn toàn khỏi người dùng. JWT của user A không cấp quyền tài nguyên user B. Header timestamp/nonce do browser gửi không chứng minh quyền hoặc tính chính chủ; không bắt buộc chúng cho browser chỉ để tạo cảm giác bảo mật.

Nếu cần giữ credential tích hợp không tới browser, dùng server/BFF giữ credential và gọi dịch vụ nội bộ. Browser vẫn có thể xem request browser→BFF; BFF phải xác thực người dùng, chống CSRF, rate limit và kiểm tra quyền riêng. Đây là phương án tùy chọn, chưa thay kiến trúc JWT trực tiếp hiện tại.

## X-Timestamp và X-Signature

Header thường được đặt tên X-Signature nhưng không có tên chuẩn chung cho mọi hệ thống. SHA256 là hàm băm, không phải mã hóa. Với server-to-server có shared secret thực sự được giữ ở hai server, có thể thiết kế HMAC-SHA256 kèm key id, timestamp, nonce, method, path/query và hash của raw body.

Đây chỉ là hướng tích hợp server-to-server tùy chọn, chưa có endpoint hoặc contract canonicalization. Không triển khai công thức SHA256(timestamp + body + secret) cho browser. Nếu dùng HMAC sau này phải chốt raw bytes/canonicalization, cửa sổ thời gian, nonce dùng một lần lưu nguyên tử, constant-time comparison, rotation và chống replay. Timestamp đơn lẻ không ngăn gửi lại trong cửa sổ hợp lệ. Webhook thanh toán/Cloudinary tuân thủ chữ ký riêng của provider, không thay bằng chữ ký browser tự chế.

## Rate limit dùng Redis

Đề xuất một Redis dùng chung counter để khi tăng số API process vẫn có giới hạn toàn hệ thống. Dùng thuật toán/câu lệnh Lua nguyên tử cho tăng counter và TTL, không INCR rồi EXPIRE rời rạc. Key gồm môi trường + route class + danh tính tin cậy. Chỉ tin forwarded IP từ reverse proxy đã cấu hình; không lấy user_id client gửi làm khóa.

Ngưỡng dưới đây là cấu hình khởi đầu đề xuất cho lưu lượng nhỏ, cần đo và điều chỉnh, chưa áp dụng runtime:

| Nhóm | Ngưỡng đề xuất | Khóa |
| --- | --- | --- |
| API đọc công khai | 60 request/phút | IP |
| API đã đăng nhập | 120 request/phút | user id và trần IP bổ sung |
| Login thất bại | 10 lần/15 phút/IP + 5 lần/15 phút/cặp email-IP | IP và email đã chuẩn hóa/hash; không khóa toàn cục tài khoản chỉ từ email |
| Refresh | 20 request/phút | session đã xác minh; IP chặn sớm token rác |
| Reset/verify email | 3 request/15 phút | IP + định danh hash, response không tiết lộ email |
| Quote/checkout/upload-intent | 10 request/phút | user và IP |

Vượt quota trả 429 + Retry-After; lỗi Redis không được báo nhầm 429. Khi Redis down: auth nhạy cảm, checkout/upload và endpoint ghi trả 503 nếu không thể thực thi limiter; API đọc được fallback limiter cục bộ có trần thấp với cảnh báo, không tuyên bố còn giới hạn toàn hệ thống. Có cap sớm theo IP và timeout dependency để request rác không kéo dài kết nối Redis/DB.

Webhook dùng route/budget riêng, xác minh provider trước xử lý nghiệp vụ; không chia sẻ hạn mức browser có thể làm nghẽn webhook. Khi quá tải/không ghi được event+outbox, trả lỗi phù hợp để provider retry; không trả thành công rồi bỏ event. /health là liveness và có thể được kiểm tra nội bộ; bổ sung readiness cho DB/Redis trước production, không đổi /health thành kiểm tra mọi dependency.

## Queue và worker Redis

Topology ban đầu: một API process, một worker process; concurrency worker khởi đầu 2, điều chỉnh theo giới hạn PostgreSQL/Cloudinary/provider. Redis là broker, worker là process Node riêng. PostgreSQL trên Aiven giữ dữ liệu nghiệp vụ và outbox bền vững.

Luồng: API ghi dữ liệu + outbox cùng transaction → dispatcher có lease đọc outbox và enqueue BullMQ với job id ổn định từ outbox id → worker xử lý → ghi kết quả/idempotency vào PostgreSQL. Dispatcher có thể là vòng lặp trong worker ban đầu, không nằm trong vòng đời request HTTP. Khóa/lease DB bảo vệ khi vô tình chạy hai dispatcher.

Enqueue Redis thành công không đồng nghĩa tác vụ nghiệp vụ completed. Lưu dispatched_at/last_enqueued_at riêng; chỉ completed khi kết quả nghiệp vụ đã commit. Có reconciliation cho outbox chưa completed bị mất Redis/job đã bị remove. Job id chống trùng trong queue không thay thế unique/idempotency trong PostgreSQL; worker có thể chạy lại sau crash.

Các job dự kiến: xử lý webhook đã lưu, xóa/đối soát media Cloudinary, dọn upload/quota reservation và đối soát thanh toán. Job gửi email chỉ bật khi chọn provider và policy gửi. Không chạy cấp license/quota hoặc trạng thái paid chỉ từ payload job; worker đọc bản ghi DB và xác minh provider theo contract.

Đề xuất tối đa 5 lần retry transient error với exponential backoff + jitter; permanent validation error không retry vô hạn. Job hết retry giữ dấu vết failed và cảnh báo để xử lý có audit. Timeout SDK/provider có giới hạn; SIGTERM ngừng nhận job mới, chờ job đang chạy có deadline rồi thoát. Retry phải idempotent, không cam kết exactly-once.

Job payload chỉ chứa id và metadata tối thiểu, không JWT, refresh token, mật khẩu hoặc toàn bộ dữ liệu thiệp. Redis dùng auth/TLS khi qua mạng và không public trực tiếp. Queue Redis dùng noeviction và persistence/backup phù hợp; counter rate-limit có TTL. Có thể dùng chung Redis lúc đầu nhưng prefix/DB index không cách ly RAM: theo dõi memory, queue lag, failed jobs và outbox age; tách instance khi cần. Mất Redis không được mất sự thật thanh toán/license vì PostgreSQL còn outbox và ledger.

## Supervisor

Supervisor quản lý API/worker trên Linux/Unix; Windows local hiện tại dùng các terminal/process riêng hoặc WSL/Linux container khi cần thử Supervisor. Không cài Supervisor như dependency npm và không thêm script trỏ worker chưa tồn tại.

Khi có worker runtime, tạo cấu hình deploy riêng cho staging/production với hai program: API và worker, mỗi program numprocs=1. Supervisor chạy Node trực tiếp bằng absolute path, không chạy dev/watch hoặc đặt chồng một process manager khác. Env lấy từ secret/config hệ thống; giữ biến môi trường riêng từng môi trường.

Cấu hình cần autostart, autorestart=unexpected, startretries có giới hạn, stopsignal=TERM, stopasgroup/killasgroup và stopwaitsecs dài hơn deadline shutdown worker. Chạy bằng user không đặc quyền, directory đúng release, log rotation và không ghi secret. Dùng Unix socket có quyền phù hợp cho supervisorctl; không mở giao diện quản trị ra Internet.

Supervisor khởi động lại process bị crash, không thay thế retry job, database transaction, Redis persistence hoặc health monitoring. Chỉ tạo file cấu hình chạy thật sau khi có entrypoint worker và đường dẫn deploy được xác nhận.

## Biến cấu hình dự kiến và kiểm thử

Khi triển khai thêm REDIS_URL, QUEUE_PREFIX, WORKER_CONCURRENCY, limiter window/threshold và timeout. Không có browser shared secret. Hiện chưa thêm biến giả vào .env.example vì runtime chưa đọc Redis/worker.

Test bắt buộc: counter nguyên tử nhiều process, 429/Retry-After, IP spoof, Redis down/reconnect, queue mất/replay, worker crash sau provider thành công trước DB commit, outbox enqueue lại, duplicate webhook, SIGTERM giữa job và restart Supervisor. Kiểm tra credential không xuất hiện trong frontend/job/log; token của một user không truy cập được user khác. Chưa có các test này.

Nguồn: [browser là public client](https://datatracker.ietf.org/doc/html/rfc6749#section-2.1), [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs), [Supervisor](https://supervisord.org/introduction.html).

## Worker analytics

Worker có thể làm mới GA cache 15 phút và đối soát financial events cho [dashboard analytics](analytics.md). Không dùng cache làm nguồn sự thật tiền; cache thiếu/hỏng không sửa ledger. Giới hạn GA concurrency/quota và deduplicate job theo property/query/window. Không cấp quyền cho worker chỉ từ payload report.

## Giới hạn và thông báo bảo mật

MFA/options/verification/reauth/recovery có rate limit theo user/challenge/IP và TTL/attempt cap; Redis lỗi không được cho bypass MFA. Đề xuất 5 lần xác minh sai/challenge và 10 request tạo challenge/phút/user, cần đo/chốt trước phát hành. Cảnh báo refresh replay/thay credential/role qua outbox idempotent với dữ liệu tối thiểu; provider email chưa chốt thì không tuyên bố đã gửi thông báo. Xem [security controls](security-controls.md).
