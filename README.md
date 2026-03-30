# FamilyMart Recruitment Assets

Kho tài nguyên phục vụ tuyển dụng FamilyMart, bao gồm banner, logo, QR và hệ thống template email dùng với Google Apps Script.

## Cấu trúc thư mục

- `banner/` — ảnh banner và ảnh bìa truyền thông
- `event/` — hình ảnh theo sự kiện hoặc chiến dịch
- `html/`
  - `template/` — template HTML nguồn
    - `template_mail.html` — template email duy nhất, nhận `contentConfig` và dùng `metadata` chung trong template
  - `preview/` — file preview HTML tĩnh được generate tự động
    - `template_mail.preview.html`
- `logo/` — bộ logo FamilyMart
- `qr/` — mã QR dùng trong email và truyền thông
- `apps script/`
  - `send-mail-pv.gs` — Apps Script gửi email theo trạng thái ứng viên
- `render-preview.js` — script render template sang file preview

## Thành phần chính

### `html/template/template_mail.html`

Template email dùng cho Google Apps Script.

- Hỗ trợ scriptlet Apps Script: `<? ... ?>`, `<?= ... ?>`
- Nhận `contentConfig` để render nội dung động theo từng trạng thái
- Dùng `metadata` cho thông tin chung như banner, hotline, social links
- Hỗ trợ hiển thị tên ứng viên qua biến `nameCV`
- Có sẵn content mẫu để preview khi chưa truyền dữ liệu thật

### `apps script/send-mail-pv.gs`

Script tự động gửi email khi trạng thái ứng viên trong Google Sheets thay đổi.

- Theo dõi sheet `Test`
- Chỉ xử lý khi sửa cột K (`TARGET_COLUMN = 11`)
- Lấy tên từ cột I và email từ cột AF
- Dùng object `EMAIL_CONFIG` để ánh xạ trạng thái → nội dung email
- Render `template_mail` rồi gửi qua `GmailApp`
- Ghi log vào sheet `log_send_mail`

### `render-preview.js`

Script render template trong `html/template/` thành file preview trong `html/preview/` để xem nhanh giao diện mà không cần Apps Script runtime.

## Cách dùng nhanh

1. Chỉnh nội dung thật trong `EMAIL_CONFIG` ở `apps script/send-mail-pv.gs`
2. Nếu cần preview nhanh trong local, chỉnh content mẫu ở đầu `html/template/template_mail.html`
3. Render preview để kiểm tra giao diện
4. Copy template và script sang Google Apps Script project để chạy thực tế

## Render preview

Các lệnh thường dùng:

- `node render-preview.js`
- `node render-preview.js --nameCV="Harold Tran"`
- `node render-preview.js --template=template_mail --nameCV="Harold Tran"`
- `node render-preview.js --all --nameCV="Harold Tran"`
- `node render-preview.js --help`

Kết quả render sẽ nằm trong:

- `html/preview/template_mail.preview.html`

## Luồng gửi email theo trạng thái

Function chính: `guiMailKhiKhongThamGia(e)`

Luồng xử lý:

1. Người dùng chỉnh trạng thái ở cột K
2. Script kiểm tra đúng sheet và đúng cột cần theo dõi
3. Tra trạng thái trong `EMAIL_CONFIG`
4. Lấy dữ liệu ứng viên trong cùng hàng
5. Truyền `contentConfig` vào template `template_mail`
6. Render HTML email
7. Gửi email
8. Ghi log vào `log_send_mail`

## Cấu hình nội dung email

Trong `apps script/send-mail-pv.gs`, nội dung email được định nghĩa bằng object `EMAIL_CONFIG`.

Ví dụ:

```javascript
const EMAIL_CONFIG = {
  "2. KO THAM GIA": {
    mail_title: "[FAMILYMART] KHẢO SÁT LÝ DO KHÔNG THAM GIA ĐÀO TẠO",
    intro_1: "...",
    intro_2: "...",
    survey_label: "...",
    survey_url: "...",
    qr_image: "...",
  },
  "2. NHD": {
    mail_title: "[FAMILYMART] KHẢO SÁT LÝ DO KHÔNG TIẾP TỤC ĐÀO TẠO",
    intro_1: "...",
    intro_2: "...",
    survey_label: "...",
    survey_url: "...",
    qr_image: "...",
  },
};
```

Hiện tại code đang hỗ trợ 2 trạng thái:

- `2. KO THAM GIA`
- `2. NHD`

### Thêm trạng thái mới

Chỉ cần thêm một key mới vào `EMAIL_CONFIG`:

```javascript
"TRẠNG THÁI MỚI": {
  mail_title: "[FAMILYMART] Tiêu đề email",
  intro_1: "...",
  intro_2: "...",
  survey_label: "...",
  survey_url: "...",
  qr_image: "...",
}
```

Không cần tạo thêm template HTML mới.

## Biến dùng trong template

### `contentConfig`

Chứa nội dung riêng cho từng loại email:

- `mail_title`
- `intro_1`
- `intro_2`
- `survey_label`
- `survey_url`
- `qr_image`

### `metadata`

Chứa thông tin dùng chung trong template:

- `header_image`
- `hotline`
- `facebook_url`
- `tiktok_url`
- `instagram_url`
- `website_url`
- `zalo_url`
- `footer_note`

### `nameCV`

Tên ứng viên dùng cho lời chào đầu email.

## Hướng dẫn triển khai lên Google Apps Script

### 1. Copy script

1. Mở Google Apps Script Editor từ Google Sheets
2. Tạo hoặc thay nội dung file `Code.gs`
3. Copy nội dung từ `apps script/send-mail-pv.gs`

### 2. Copy template HTML

1. Tạo file HTML mới trong Apps Script
2. Đặt tên là `template_mail`
3. Copy nội dung từ `html/template/template_mail.html`

### 3. Tạo trigger

Tạo trigger cho function:

- Function: `guiMailKhiKhongThamGia`
- Event source: `From spreadsheet`
- Event type: `On edit`

### 4. Test

Trong Google Sheet, sửa một ô ở cột K thành một trong các giá trị:

- `2. KO THAM GIA`
- `2. NHD`

Sau đó kiểm tra:

- email đã được gửi
- sheet `log_send_mail` có ghi log mới

## Troubleshooting

- **Trigger không chạy**: kiểm tra đúng sheet `Test` và đúng event type `On edit`
- **Template không tìm thấy**: file HTML trong Apps Script phải tên là `template_mail`
- **Không gửi được email**: kiểm tra email ở cột AF có hợp lệ không
- **Preview khác dữ liệu thật**: content mẫu trong template chỉ dùng để preview, dữ liệu thực tế lấy từ `EMAIL_CONFIG`
