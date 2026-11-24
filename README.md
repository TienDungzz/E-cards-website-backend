# E-cards Website Backend

Backend cung cấp API cho frontend Vue 3 tại thư mục sibling `../E-cards-website`.

## Hiện trạng

Đã có HTTP server Node.js tối thiểu: `GET /health` trả 200, các route còn lại trả 404. JWT, API nghiệp vụ, PostgreSQL, Cloudinary, Redis worker, thanh toán và analytics mới có thiết kế, chưa có runtime/migration tương ứng.

| Thành phần đã chọn | Trách nhiệm |
| --- | --- |
| PostgreSQL trên Aiven | Dữ liệu nghiệp vụ, quyền, đơn hàng, ledger và outbox |
| Cloudinary | Hình ảnh, âm thanh; database lưu metadata |
| JWT + rotating refresh token | Access Bearer, refresh cookie HttpOnly; thu hồi bằng session metadata |
| Redis + worker | Rate limit và queue; BullMQ là thư viện đề xuất |
| Supervisor | Quản lý process API/worker trên Linux khi có runtime |
| GA4 | Traffic; doanh thu lấy từ database/thanh toán đã đối soát |

## Cài đặt và chạy

Cần Node.js nhánh 22 từ 22.13 hoặc Node.js 24+.

```sh
npm ci
npm run dev
```

Sao chép `.env.example` thành file cấu hình môi trường; không commit secret. PowerShell chặn npm.ps1 thì dùng `npm.cmd`.

| Môi trường | Lệnh | File env |
| --- | --- | --- |
| Local, watch | `npm run dev` | `.env` |
| Local, không watch | `npm run start:local` | `.env` |
| Staging | `npm run start:staging` | `.env.staging` |
| Production | `npm start` hoặc `npm run start:production` | `.env.production` |

## Tài liệu và kiểm tra

- [Tổng quan tài liệu](docs/README.md) và [hướng dẫn chạy](docs/getting-started.md).
- [Kế hoạch triển khai](docs/product/implementation-plan.md): theo dõi giai đoạn và task.
- [Sản phẩm](docs/product/README.md), [database](docs/product/database.md), [API](docs/product/api.md) và [ảnh sơ đồ](docs/product/diagrams/README.md).
- [Quy ước thống nhất](docs/conventions.md) và [yêu cầu bảo mật](docs/product/security-controls.md).

```sh
npm run check:config
npm run check
```

`check` kiểm tra docs/cấu trúc/lint và độ đồng bộ schema tự sinh, chưa kiểm thử database/API nghiệp vụ. Sửa `docs/product/schema.json` rồi chạy `npm run docs:generate`; Windows xuất lại PNG bằng `npm run docs:images`. Không cần build cho JavaScript chạy trực tiếp; chưa có suite test nghiệp vụ.
