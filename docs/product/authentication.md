# Đăng nhập bằng JWT

## Quyết định

Backend cấp JWT access token sau password và MFA nếu policy tài khoản yêu cầu. Admin/staff bắt buộc WebAuthn/passkey có user verification; guest có thể enroll tùy chọn. Refresh token là chuỗi ngẫu nhiên opaque, không phải JWT, được gửi qua cookie HttpOnly. Đây là thiết kế đã chọn; runtime hiện chỉ có /health, chưa có endpoint auth, migration hay thư viện JWT.

JWT là định dạng token có chữ ký, không tự an toàn hơn server session. Cookie là phương tiện lưu/gửi token, không phải đối thủ của JWT. JWT ký thông thường không mã hóa payload. Không đưa email người nhận, nội dung thiệp, mật khẩu hoặc thông tin thanh toán vào token.

## Access token

Đề xuất access token sống 10 phút. Response login/refresh gồm data.access_token, data.token_type=Bearer, data.expires_in=600 và user projection tối thiểu. Frontend giữ access token trong bộ nhớ, gửi Authorization: Bearer <token>; không lưu localStorage/sessionStorage, URL hoặc log. Response auth dùng Cache-Control: no-store.

JWT chứa sub=user id, sid=session id, jti ngẫu nhiên, iss, aud, iat, exp; nbf nếu dùng phải được kiểm tra. Dùng typ dành cho access token và allowlist RS256 với khóa server quản lý; không cho client/header chọn thuật toán hoặc URL lấy khóa. kid chỉ tra trong keyring tin cậy. Kiểm tra chữ ký, issuer, audience, hạn và kiểu claim, không chỉ decode. Chưa chọn SDK; khi triển khai dùng thư viện JWT được duy trì, không tự viết crypto.

Role có thể trả trong user projection cho UI; quyền thực tế đọc từ user đang active. Plus, license, discount và quota luôn kiểm tra trạng thái hiện tại trong database, không đóng gói quyền vĩnh viễn trong JWT. API bảo vệ kiểm tra sid chưa thu hồi và user active để logout/khóa tài khoản có hiệu lực ngay; có DB read nên thiết kế này không phải hoàn toàn stateless. DB không sẵn sàng phải từ chối có kiểm soát, không bỏ qua kiểm tra quyền.

## Refresh token và phiên đăng nhập

Mỗi lần đăng nhập hoàn tất đủ các yếu tố tạo một auth session; bước MFA pending không có business session/access/refresh. Refresh token có ít nhất 256 bit ngẫu nhiên; database chỉ lưu hash, không lưu token thô. Đề xuất thời hạn tuyệt đối phiên 7 ngày, không kéo dài vô hạn sau mỗi refresh. Thời hạn cookie/token mới không vượt session.expires_at. Những con số này là cấu hình đề xuất, không phải đặc tính bắt buộc của JWT.

Cookie production: tên __Host-ecards_refresh, Secure, HttpOnly, Path=/, không Domain. SameSite=Lax nếu triển khai cùng site; chỉ dùng None; Secure khi thực sự cần cross-site. Local HTTP dùng tên ecards_refresh riêng và không Secure, không mang cấu hình local lên staging/production. Frontend không đọc được cookie refresh. Cần kiểm tra domain thực tế và third-party cookie policy trước triển khai.

Refresh: khóa session/token trong transaction, kiểm tra hạn và trạng thái, đánh dấu token cũ used, tạo token mới và JWT mới. Chỉ có một refresh token chưa used/revoked trong session. Giữ lịch sử hash token đã dùng để phát hiện replay; token cũ bị dùng lại thì thu hồi toàn bộ session cùng refresh còn lại. Access token có sid đó cũng bị từ chối.

Frontend phải serialize refresh (single-flight), phối hợp nhiều tab; không retry cùng refresh token sau khi response bị mất. Với policy replay nghiêm ngặt, mất response hoặc refresh song song có thể buộc đăng nhập lại; không nới bằng cách chấp nhận lại token cũ vô điều kiện. Logout thu hồi session, không xóa lịch sử phát hiện replay trước thời hạn retention.

## CSRF, CORS và XSS

Các API nghiệp vụ chỉ nhận bearer header, không chấp nhận refresh cookie làm quyền truy cập API. Endpoint login/refresh/logout dùng cookie phải bảo vệ riêng: allowlist Origin chính xác, từ chối Origin thiếu/null với browser endpoint này, yêu cầu application/json và custom header X-CSRF-Protection: 1; không cho simple form request đi qua. Preflight/CORS chỉ cho origin tin cậy, credentials=true theo nhu cầu, không dùng wildcard với credentials. Đây là policy browser-client đã chọn; client native cần flow riêng nếu bổ sung.

Cookie HttpOnly giảm khả năng JavaScript đọc refresh token, không làm ứng dụng miễn nhiễm XSS. Cần renderer an toàn cho Editor.js, CSP phù hợp, HTTPS production và không đưa token vào telemetry. Access token trong bộ nhớ vẫn có thể bị lạm dụng khi trang đang bị XSS.

## Thu hồi và khóa ký

Logout hiện tại thu hồi session sid. Logout-all, reset mật khẩu và suspend user thu hồi mọi session. Đổi role thu hồi phiên cũ và yêu cầu login lại theo MFA policy mới; mỗi request vẫn đọc quyền hiện tại. Cơ chế đổi mật khẩu phải thu hồi phiên và có audit. Khi khóa ký bị lộ, ngừng chấp nhận kid đó và yêu cầu đăng nhập lại theo quy trình incident.

Khóa ký riêng chỉ ở backend/secret manager; keyring xác minh giữ khóa cũ trong giai đoạn rotation có kiểm soát, không quá policy TTL cộng clock skew. Không đặt private key hoặc refresh token vào biến VITE_. Chưa thêm biến khóa thực vào .env vì runtime chưa đọc; khi triển khai phải validate cấu hình và không tự sinh khóa production mỗi lần restart.

## Contract đăng nhập

| Method | Path | Kết quả |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | email/password; 200 token nếu đủ yếu tố, 202 challenge nếu cần MFA; pending không có access/refresh |
| POST | `/api/v1/auth/mfa/login-verifications` | 200 token sau assertion hợp lệ và consume challenge |
| POST | `/api/v1/auth/refresh` | Cookie refresh; 200 access mới và refresh cookie đã rotate |
| POST | `/api/v1/auth/logout` | Cookie refresh + CSRF policy; 204, thu hồi session và xóa cookie; không yêu cầu access token còn hạn |
| POST | `/api/v1/auth/logout-all` | Bearer hợp lệ; 204, thu hồi mọi session của user và xóa refresh cookie hiện tại |
| GET | `/api/v1/auth/me` | Bearer hợp lệ; 200 profile hiện tại, không trả token/hash |

Login sai trả 401 AUTHENTICATION_FAILED chung; MFA pending trả 202, xác minh sai/hết hạn trả 401 MFA_VERIFICATION_FAILED; refresh sai/hết hạn/replay trả 401 INVALID_REFRESH_TOKEN, xóa cookie. Bearer sai/hết hạn/thu hồi trả 401 INVALID_ACCESS_TOKEN; không có quyền role/feature trả 403 theo quy tắc sản phẩm. Logout idempotent trả 204 ngay cả cookie không có/đã thu hồi, nhưng vẫn tuân thủ CSRF policy. Xóa cookie phải trùng tên/path/domain của lúc cấp.

Đăng ký, verify email và reset password giữ contract hiện có, không tự cấp role hoặc subscription. Rate limit login/refresh/reset và kiểm tra password hash bằng công cụ phù hợp khi triển khai.

## Bằng chứng cần có

Integration test cho token sửa chữ ký/alg=none, sai iss/aud/typ, hết hạn, revoked sid, user suspended, đổi role, refresh rotation/replay, hai tab refresh song song, rollback khi tạo token mới lỗi, logout bằng access hết hạn, cookie flags và CORS/CSRF từ origin lạ. Chưa có các test này; docs checker không kiểm tra bảo mật JWT.

Tham chiếu: [OWASP JWT](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html), [RFC 9700 — refresh token protection](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).

## Liên kết thiết kế

Danh sách endpoint chuẩn tại [API](api.md), metadata session/refresh trong [database](database.md), kiểm thử transaction tại [tính toàn vẹn](data-integrity.md). Không có shared secret ẩn ở frontend; rate limit, Redis worker và Supervisor theo [runtime](runtime-and-request-security.md).

## MFA, reauth và quản lý phiên

[Security controls](security-controls.md) là nguồn chính cho MFA admin/staff, enrollment/recovery không bypass, reauth grant một lần và session management. Login pending MFA không được cấp token trước; refresh không làm mới mfa_verified_at/password_verified_at. Thay role/reset/suspend thu hồi phiên và challenge/grant liên quan; thu hồi từng session phải kiểm tra owner.

Reauth bind action/resource/payload/version và sid, xác minh WebAuthn hoặc password cho guest chưa MFA; các thao tác quản trị, credential và đổi thông tin nhạy cảm yêu cầu X-Reauth-Token. Session/grant cũ không được giữ quyền đặc quyền sau role change. Danh sách endpoint tại [API](api.md), schema tự sinh tại [database](database.md).
