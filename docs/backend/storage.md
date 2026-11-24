# PostgreSQL Aiven và Cloudinary

## Kiến trúc đã chọn

Frontend gọi API backend để thao tác dữ liệu nghiệp vụ. Backend truy cập PostgreSQL trên Aiven; file hình ảnh và âm thanh lưu trên Cloudinary. Đã có HTTP server tối thiểu; chưa triển khai mã kết nối, migration hoặc upload.

| Hệ thống | Dữ liệu và trách nhiệm |
| --- | --- |
| Backend API | Validation, quyền truy cập, nghiệp vụ thiệp, điều phối dữ liệu và media |
| PostgreSQL trên Aiven | Dữ liệu thiệp, quan hệ sở hữu/chia sẻ và metadata media |
| Cloudinary | File hình ảnh, âm thanh và URL phân phối media |
| Frontend | Trình sửa thiệp, gọi API và hiển thị media |

Không lưu file nhị phân/base64 trong PostgreSQL hoặc dùng ổ đĩa server làm nơi lưu media lâu dài. Phạm vi lưu video chưa được chốt.

## Dữ liệu media dự kiến

Mỗi media có id nội bộ, chủ sở hữu, định danh Cloudinary (public_id và asset_id khi có), resource_type, version, secure_url, format, số byte và thời gian tạo. Bổ sung width/height cho ảnh, duration cho âm thanh theo metadata thực tế. Không suy ra resource_type từ tên trường frontend; lưu giá trị đã được provider xác nhận.

Thiệp liên kết với media bằng id nội bộ. Không tin URL, public_id, kích thước hoặc chủ sở hữu do client tự khai báo. Thiệp Plus cần delivery có hạn không vượt quyền; chi tiết SDK/chế độ phân phối Cloudinary cần chốt trước phát hành; URL không tự thay thế kiểm tra quyền.

## Luồng upload đề xuất

1. Frontend yêu cầu quyền upload cho ảnh/âm thanh.
2. Backend kiểm tra người dùng/quyền, mục đích, định dạng và giới hạn; cấp tham số upload có chữ ký theo policy server.
3. Frontend gửi file lên Cloudinary bằng tham số được cấp. API secret luôn ở backend.
4. Backend xác minh kết quả upload bằng cơ chế provider trước khi ghi metadata vào PostgreSQL và liên kết media với thiệp.
5. Backend trả tài nguyên đã lưu cho frontend; kiểm tra quyền sở hữu khi sử dụng lại hoặc xóa media.

Chưa triển khai endpoint hay lựa chọn SDK. Nếu chọn upload qua backend thay cho upload trực tiếp, phải cập nhật contract, giới hạn request và timeout tương ứng.

## Nhất quán và vận hành

PostgreSQL transaction không bao trùm Cloudinary. Cần trạng thái media và cơ chế retry/idempotency để xử lý upload thành công nhưng ghi DB thất bại, xóa file lỗi và media mồ côi. Không xóa asset đang được thiệp khác tham chiếu.

Khi triển khai Aiven: cấu hình kết nối TLS xác minh chứng chỉ theo thông tin service thực tế, pool kết nối có giới hạn và migration có phiên bản. Không tắt xác minh TLS để vượt lỗi kết nối. Dùng database riêng cho dev/test/production, quyền truy cập tối thiểu và quy trình backup/restore đã kiểm chứng.

## Biến môi trường dự kiến

Xem [.env.example](../../.env.example). Server đã đọc HOST và PORT; các biến kết nối dịch vụ dưới đây vẫn là danh sách chuẩn bị, chưa được runtime sử dụng.

| Biến | Mục đích |
| --- | --- |
| DATABASE_URL | Chuỗi kết nối PostgreSQL từ service Aiven; chứa credentials riêng tư |
| DATABASE_CA_CERT_PATH | Đường dẫn chứng chỉ CA khi cấu hình TLS thực tế cần |
| CLOUDINARY_CLOUD_NAME | Cloud name |
| CLOUDINARY_API_KEY | API key dùng phía server |
| CLOUDINARY_API_SECRET | Secret để ký request, chỉ ở backend |

Không đưa DATABASE_URL hoặc API secret vào frontend, log hay repository. File .env thật được bỏ qua bởi Git. Các ngưỡng upload, dung lượng DB/pool và timeout cần chốt theo môi trường, ghi trong [hồ sơ năng lực](../templates/capacity.md).

Xóa media chạy bất đồng bộ: API trả 202 sau khi commit deleting/outbox, không đợi provider. Liên kết media nháp/snapshot được bảo vệ bằng FK; xem [tính toàn vẹn](../product/data-integrity.md) và [API](../product/api.md).

Upload cần đáp ứng [security controls](../product/security-controls.md): chưa chấp nhận SVG/HTML/file thực thi, validate nội dung thực, dimension/duration và quota trước ready; upload provider thành công không tự được coi là nội dung an toàn.
