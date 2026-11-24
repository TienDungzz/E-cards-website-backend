# Cài đặt và chạy backend

Cần Node.js nhánh 22 từ 22.13 hoặc 24+. Chạy npm ci tại thư mục backend; dùng npm.cmd nếu PowerShell chặn npm.ps1.

| Môi trường | Lệnh | File cấu hình | NODE_ENV |
| --- | --- | --- | --- |
| Local | npm run dev hoặc npm run start:local | .env | development |
| Staging | npm run start:staging | .env.staging | production |
| Production | npm start hoặc npm run start:production | .env.production | production |

Local dùng trực tiếp Node.js và file .env: npm run dev tự khởi động lại khi mã thay đổi, npm run start:local chạy không watch. Staging và production chạy không watch. Server mặc định APP_ENV=local và NODE_ENV=development nếu chưa được cấu hình; launcher staging/production đặt APP_ENV theo môi trường và NODE_ENV=production. Không cần cài cross-env hoặc nodemon.

Sao chép [.env.example](../.env.example) thành file tương ứng và điền cấu hình riêng từng môi trường. File env không bắt buộc nếu hạ tầng đã inject biến môi trường; biến process có ưu tiên cao hơn file. Local không qua launcher. Staging/production chỉ nạp file riêng, không nạp .env của local.

HOST mặc định 127.0.0.1, PORT mặc định 3000. Khi chạy container/hạ tầng cần truy cập qua network, đặt HOST=0.0.0.0 theo cấu hình triển khai. Các file env thật đã được Git bỏ qua.

Server tối thiểu có GET /health trả 200 và JSON status ok; route khác trả 404. Health chỉ xác nhận tiến trình HTTP, chưa kiểm tra Aiven hoặc Cloudinary. Chưa triển khai auth, API thiệp, kết nối PostgreSQL hoặc upload media. Các biến dịch vụ trong env mẫu hiện chưa được runtime sử dụng.

## Kiểm tra

Chạy npm run check:config và npm run check để kiểm tra cấu hình, tài liệu, cấu trúc và lint. JavaScript chạy trực tiếp bằng Node, chưa cần bước build. Khi triển khai dịch vụ thật, thêm migration, kiểm thử API và kiểm tra readiness của dependency.

Xem [API](backend/api.md), [kiến trúc](backend/README.md) và [lưu trữ](backend/storage.md).

## Chỉnh tài liệu và sơ đồ

Sửa schema tại docs/product/schema.json, chạy npm run docs:generate rồi npm run docs:images trên Windows; sau đó check. Database/diagrams được tự sinh, không sửa tay. Endpoint chuẩn tại [product/api.md](product/api.md); phân biệt nguồn chính theo [quy ước](conventions.md). Không cần đọc/chỉnh .env thật để làm việc với tài liệu.
