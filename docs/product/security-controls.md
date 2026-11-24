# Kiểm soát bảo mật trước phát hành

Tài liệu chuyển các đề xuất bảo mật thành yêu cầu thiết kế cho E-cards. Hiện chỉ /health được triển khai; các endpoint, schema, scan và test bên dưới **chưa chạy thực tế**. Không xem docs/lint thành công là đã hoàn thành bảo mật.

## Ưu tiên và trách nhiệm

| Mức | Yêu cầu | Điều kiện nghiệm thu |
| --- | --- | --- |
| P0 | MFA bắt buộc admin/staff, xác thực lại hành động nhạy cảm | Chưa hoàn thành MFA không cấp phiên API đặc quyền; không bypass qua refresh/reset/recovery |
| P0 | Authorization theo role, owner và entitlement | Test user A không truy cập tài nguyên B, staff không tự nâng role hoặc xem analytics |
| P0 | Giá/discount/fulfillment do server quyết định | Webhook trùng/sai thứ tự, sửa tiền, slot cuối quota và refund đồng thời không làm sai dữ liệu |
| P1 | Upload và nội dung thiệp an toàn | File được kiểm tra thực, block Editor.js allowlist, test stored XSS và asset riêng tư |
| P1 | Phân quyền hạ tầng, secret và backup | API/worker/migration tách quyền; rotation và restore được kiểm chứng |
| P1 | Audit, cảnh báo và security gates | Có bằng chứng test/scan, người nhận cảnh báo và runbook xử lý |

## MFA và đăng nhập đặc quyền

Chọn WebAuthn/passkey làm phương thức ưu tiên, yêu cầu user verification (UV). Với admin/staff: password hợp lệ là bước đầu, tiếp theo WebAuthn assertion của credential đã đăng ký mới cấp access JWT và refresh cookie. Dùng thư viện WebAuthn được duy trì; server xác minh challenge, origin, RP ID, signature, UV, credential thuộc user và trạng thái hiện tại.

Login trả 202 cùng challenge_id khi cần MFA; không trả access token hoặc refresh cookie ở bước này. Response chỉ cấp 200 token sau khi /auth/mfa/login-verifications thành công. Challenge ngẫu nhiên, một lần, có purpose/user và TTL đề xuất 5 phút; username/password/challenge id không tự cho quyền API. Rate limit theo challenge/user/IP; giới hạn số lần thử, không log assertion/token thô.

Không cho admin/staff chưa enroll MFA tự thêm credential chỉ bằng mật khẩu rồi truy cập đặc quyền. Bootstrap admin đầu tiên qua quy trình vận hành có kiểm soát. Nâng guest thành staff/admin yêu cầu user đã có credential được xác minh, người quản trị có reauth và audit. Tài khoản đặc quyền bị mất toàn bộ credential phải qua recovery đã xác minh riêng; không hạ yêu cầu MFA để mở đường tắt.

Guest có thể tự enroll passkey tùy chọn sau JWT và xác thực lại password. Khi MFA đã bật, login guest cũng phải hoàn thành bước MFA, không tự fallback về password-only. Đăng ký passkey lần đầu trả creation options rồi xác minh attestation response theo policy; thêm credential tiếp theo cần xác thực lại bằng credential đang có. Không tin rp_id/origin/public key do client tự cấu hình.

TOTP/SMS không tự bật làm fallback; nếu bổ sung phải thiết kế secret encryption, replay và recovery tương ứng. Với passkey đồng bộ, sign_count có thể không tăng hoặc bằng 0; dùng kết quả/thông tin rủi ro của thư viện, không mặc định coi mọi trường hợp đó là clone rồi khóa người dùng.

## Recovery và quản lý credential

Sinh recovery codes entropy đủ lớn, hiển thị một lần, database chỉ lưu hash. Mỗi code dùng một lần dưới khóa, không dùng email reset password để bỏ qua MFA. Admin/staff dùng recovery code chỉ được vào luồng phục hồi giới hạn, không nhận phiên business/đặc quyền; việc enroll credential thay thế phải qua xác minh vận hành riêng và audit. Guest có thể phục hồi giới hạn bằng password + code để enroll lại, thu hồi phiên cũ trước khi mở phiên mới.

Không được xóa credential cuối cùng của admin/staff. Không tắt MFA hoặc đổi phương thức khôi phục chỉ bằng session đang tồn tại. Gửi thông báo an toàn khi thêm/xóa credential, đổi/reset mật khẩu, thay role và thu hồi nhiều phiên; email chứa thông tin tối thiểu, không token/secret. Provider email chưa chốt thì notification chưa được coi là hoạt động.

## Xác thực lại hành động nhạy cảm

Các thao tác đổi role/status tài khoản, thay khả năng bán/giá/gói/discount, thêm/xóa credential và yêu cầu refund khi được triển khai cần reauth. User đổi email/password cũng cần reauth. Ưu tiên WebAuthn với admin/staff; guest chưa enroll có thể reauth password cho hành động được phép.

Reauth có challenge purpose riêng, sau xác minh cấp grant opaque một lần, lưu hash. Grant bind user, sid, action, resource id và payload hash/version; hạn đề xuất 5 phút. Frontend gửi X-Reauth-Token cho request đúng action. Không dùng claim MFA từ JWT cũ hoặc timestamp client để chứng minh vừa xác thực.

Consume grant cùng transaction thay đổi nghiệp vụ và audit; idempotent retry của cùng request trả kết quả cũ, không tái sử dụng grant cho payload khác. Thay giá/discount/policy nhạy cảm phải có version rõ ràng. Với endpoint có bước gọi provider, chỉ consume và ghi intent/outbox atomically, không giữ transaction mở để chờ provider. JWT sid bị thu hồi hoặc user bị khóa làm grant mất hiệu lực ngay.

Mã lỗi: 403 MFA_REQUIRED hoặc REAUTH_REQUIRED cho API không đủ mức xác thực; 401 MFA_VERIFICATION_FAILED cho challenge sai/hết hạn; rate limit trả 429. 202 challenge không phải đăng nhập thành công. Chi tiết endpoint chuẩn tại [API](api.md).

## Quản lý phiên

User xem phiên của mình qua /me/sessions và thu hồi từng phiên. Response chỉ trả id, current_session, created_at, expires_at và thông tin thiết bị/rủi ro tối thiểu; không refresh hash, JWT, raw IP hoặc dữ liệu của người khác. Device label/IP chỉ là metadata, không là yếu tố xác thực.

GET/DELETE đều kiểm tra owner; thu hồi session hiện tại làm access sid bị chặn và xóa cookie tương ứng. Logout-all/reset password/suspend thu hồi mọi sid, reauth grant và challenge liên quan. Đổi role lên đặc quyền thu hồi phiên cũ, bắt login lại với MFA; không để guest token cũ tự biến thành admin chỉ vì role DB đổi.

## Quyền truy cập và thanh toán

Mặc định từ chối route/action chưa khai báo policy. Test cả list/detail/search/export/job, không chỉ controller GET. Dùng composite FK cùng owner và procedure bảo vệ quota/ledger theo [toàn vẹn](data-integrity.md). API admin không mặc nhiên cho đọc thiệp riêng.

Không nhận giá cuối, role, license, period từ browser. Webhook xác minh raw body theo provider và đối soát order/currency/amount; order_fulfillments chống cấp hai lần, ledger giữ tiền dư/reconciliation. Refund chưa mở khi chưa có provider/policy/test và reauth tương ứng. UI ẩn nút không phải biện pháp authorization.

## Upload, Editor.js và nội dung chia sẻ

Chỉ allowlist định dạng ảnh/âm thanh đã chốt; chưa chấp nhận SVG/HTML, archive hoặc file thực thi. Kiểm tra nội dung/magic bytes, dimension/thời lượng/dung lượng thực và metadata provider, không chỉ extension/MIME client. Chỉ media đạt kiểm tra mới chuyển ready, chưa ready không gắn card hoặc phục vụ public. SDK/provider phải chứng minh policy upload ký không mở rộng được bằng tham số client.

Nếu cần quét/transcode thêm: đưa asset vào trạng thái kiểm tra hoặc giữ intent pending, không dùng URL public trước khi xong; schema/status bổ sung trước khi bật luồng đó. Không giả rằng Cloudinary upload thành công nghĩa là đã đáp ứng mọi kiểm tra của sản phẩm.

Editor.js chỉ nhận block/data được allowlist, sanitize link và nội dung trước render; cấm script/event handler/javascript URL và HTML tùy ý. Áp CSP theo frontend thực tế; stored XSS ở shared-card có thể đánh cắp/lạm dụng quyền người xem dù refresh cookie HttpOnly. URL media Plus cần delivery có hạn, không public vĩnh viễn.

## Hạ tầng và secret

- API, worker và migration dùng principal DB riêng; runtime không là owner/superuser hoặc có quyền DDL. Đặc quyền procedure được giới hạn, search_path cố định khi dùng SECURITY DEFINER và không cấp PUBLIC tùy tiện.
- Aiven PostgreSQL dùng TLS xác minh certificate; Redis có auth/TLS khi qua mạng, không public cổng Redis/Supervisor management.
- Staging/production có secret khác nhau; JWT private key, Cloudinary secret, DB/Redis/GA credentials chỉ ở backend/secret manager. Không đặt secret VITE_, job payload, log hoặc artifact.
- Có quy trình xoay khóa và thu hồi credential đã lộ; chỉ xóa khỏi Git không đủ. Supervisor chạy user không đặc quyền và secret không nhúng trong file cấu hình commit.
- Backup theo RPO/RTO cần chốt; diễn tập restore DB/order/license/ledger và reconciliation Cloudinary/Redis trên môi trường cách ly. Không chỉ kiểm tra backup tồn tại.

## Audit và cảnh báo

Dùng audit_logs hiện có cho actor/action/resource/outcome/request id và metadata đã lọc. Ghi cả thất bại xác thực/authorization cần thiết mà không lưu password/token/recovery code/nội dung thiệp. Giới hạn cardinality và retention, không công khai log qua API khác owner.

Cảnh báo cho login/MFA failure tăng bất thường, refresh replay, thay role/credential, khóa ký thay đổi, checkout/payment lệch tiền, webhook lỗi kéo dài, reconciliation backlog, Redis down và worker/outbox đứng. Outbox notification idempotent, không để gửi email cảnh báo vô hạn thành kênh lạm dụng. Owner/ngưỡng/runbook phải có trước production.

## Security gates trước phát hành

| Gate | Bằng chứng cần có |
| --- | --- |
| Secret scan | Quét repo/history/artifact phù hợp, chặn secret mới trong CI |
| Dependency scan | Lockfile và runtime dependencies được kiểm tra, finding có policy xử lý |
| Authorization integration | guest/staff/admin/anonymous, user A/B, free/Plus/purchased, list/job và snapshot |
| Authentication | JWT alg/claims/sid, MFA challenge purpose/UV/origin/replay, recovery và enrollment bypass |
| Payment/DB concurrency | Sửa giá, trùng webhook, refund đồng thời, slot cuối, fulfillment crash/replay |
| Content security | Magic bytes/oversized file, stored XSS, link scheme, private/Plus media delivery |
| Recovery/operations | Restore từ backup, rotation, revoke sessions, Redis loss, Supervisor restart và graceful shutdown |

Không thêm lệnh scan/test luôn thành công hoặc cấu hình fake vào package.json. Khi có runtime/công cụ, thêm command thật và gate CI tương ứng; trước đó ghi chưa thực hiện. docs/schema/lint hiện tại không thay thế các gate này.

Nguồn tham chiếu: [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [Passkey Security](https://cheatsheetseries.owasp.org/cheatsheets/Passkey_Security_Cheat_Sheet.html), [Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).
