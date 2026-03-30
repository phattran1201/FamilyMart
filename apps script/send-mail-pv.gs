function guiMailTheoTrangThai(e) {
  // ==============================
  // 1) CẤU HÌNH
  // ==============================
  const TARGET_SHEET_NAME = "Test"; // Tên sheet cần theo dõi
  const TARGET_COLUMN = 11; // Cột K

  // Mỗi status mapping đến config data để truyền vào template
  const EMAIL_CONFIG = {
    "2. KO THAM GIA": {
      mail_title: "[FAMILYMART] KHẢO SÁT LÝ DO KHÔNG THAM GIA ĐÀO TẠO",
      intro_1:
        "Cảm ơn bạn đã quan tâm và tham gia vào quy trình tuyển dụng của FamilyMart. Chúng mình rất tiếc khi biết rằng bạn đã không tham gia khóa đào tạo. Dù vậy, chúng mình rất mong được lắng nghe phản hồi của bạn về các khó khăn gặp phải.",
      intro_2:
        "Để giúp FamilyMart hiểu rõ hơn về các vấn đề của bạn và cải thiện quy trình tuyển dụng, chúng mình rất mong bạn dành chút thời gian hoàn thành khảo sát ngắn dưới đây:",
      survey_label: "Link KHẢO SÁT LÝ DO KHÔNG THAM GIA ĐÀO TẠO",
      survey_url: "https://forms.gle/btQ3su7YHuZn2TDs7",
      qr_image:
        "https://github.com/phattran1201/FamilyMart/blob/main/qr/khong-dao-tao.png?raw=true",
    },
    "2. NHD": {
      mail_title: "[FAMILYMART] KHẢO SÁT LÝ DO KHÔNG TIẾP TỤC ĐÀO TẠO",
      intro_1:
        "Cảm ơn bạn đã quan tâm và tham gia vào quy trình tuyển dụng của FamilyMart. Chúng mình rất tiếc khi biết rằng bạn đã không tiếp tục tham gia khóa đào tạo. Dù vậy, chúng mình rất mong được lắng nghe phản hồi của bạn về trải nghiệm trong khóa đào tạo vừa qua.",
      intro_2:
        "Để giúp FamilyMart hiểu rõ hơn về các vấn đề của bạn và cải thiện quy trình tuyển dụng, chúng mình rất mong bạn dành chút thời gian hoàn thành khảo sát ngắn dưới đây:",
      survey_label: "Link KHẢO SÁT LÝ DO KHÔNG TIẾP TỤC ĐÀO TẠO",
      survey_url: "https://forms.gle/FJtdRzyhHXt93iW29",
      qr_image:
        "https://github.com/phattran1201/FamilyMart/blob/main/qr/khong-tiep-tuc.png?raw=true",
    },
  };

  const DATA_START_COLUMN = 9; // Cột I
  const DATA_END_COLUMN = 24; // Từ I -> AF (32 - 9 + 1 = 24)

  const COL_INDEX_HO_TEN = 0; // Cột I trong mảng data DATA_START_COLUMN -> DATA_END_COLUMN
  const COL_INDEX_EMAIL = 23; // Cột AF trong mảng data DATA_START_COLUMN -> DATA_END_COLUMN

  const MAIL_SENDER_NAME = "Tuyển dụng FamilyMart";

  // ==============================
  // 2) KIỂM TRA EVENT HỢP LỆ
  // ==============================
  // Tránh lỗi nếu hàm bị gọi thủ công hoặc event không đầy đủ
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();
  const column = range.getColumn();

  // Nếu người dùng dán nhiều ô cùng lúc thì bỏ qua để tránh xử lý sai
  if (range.getNumRows() > 1 || range.getNumColumns() > 1) return;

  // ==============================
  // 3) ĐIỀU KIỆN KÍCH HOẠT
  // ==============================
  // Chỉ xử lý khi sửa đúng cột K
  if (column !== TARGET_COLUMN) return;

  // Chỉ xử lý khi sửa đúng sheet "Test"
  if (sheet.getName() !== TARGET_SHEET_NAME) return;

  // Chỉ xử lý khi giá trị mới nằm trong EMAIL_CONFIG
  // e.value là giá trị mới nhập vào, rất nhanh vì lấy từ event
  const emailConfig = EMAIL_CONFIG[e.value];
  if (!emailConfig) return; // Giá trị không nằm trong config, bỏ qua

  // ==============================
  // 4) LẤY DỮ LIỆU 1 LẦN DUY NHẤT
  // ==============================
  // Lấy toàn bộ dữ liệu từ cột I đến AF trong cùng 1 hàng
  // để giảm số lần gọi tới Spreadsheet service
  const rowData = sheet
    .getRange(row, DATA_START_COLUMN, 1, DATA_END_COLUMN)
    .getValues()[0];

  const hoTen = rowData[COL_INDEX_HO_TEN]; // Cột I
  const email = rowData[COL_INDEX_EMAIL]; // Cột AF

  // Nếu không có email thì không gửi
  if (!email) {
    Logger.log(
      `⚠️ Không có email ở dòng ${row}, bỏ qua gửi mail cho ${hoTen}.`,
    );
    return;
  }

  // ==============================
  // 5) TẠO NỘI DUNG EMAIL HTML
  // ==============================
  // Dùng 1 template duy nhất, truyền config khác nhau qua contentConfig parameter
  const emailTemplate = HtmlService.createTemplateFromFile("template_mail");
  emailTemplate.contentConfig = emailConfig;
  emailTemplate.nameCV = hoTen;

  const htmlMessage = emailTemplate.evaluate().getContent();

  // ==============================
  // 6) GỬI EMAIL
  // ==============================
  GmailApp.sendEmail(
    email,
    emailConfig.mail_title,
    "Your email doesn't support HTML.",
    {
      name: MAIL_SENDER_NAME,
      htmlBody: htmlMessage,
    },
  );

  // ==============================
  // 7) GHI LOG
  // ==============================
  const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

  const logSheet = e.source.getSheetByName("log_send_mail");
  if (logSheet) {
    logSheet.appendRow([now, email, hoTen]);
  } else {
    Logger.log(`⚠️ Không tìm thấy sheet log: ${"log_send_mail"}`);
    const newLogSheet = e.source.insertSheet("log_send_mail");
    newLogSheet.appendRow(["Thời gian", "Email ứng viên", "Họ tên"]);
  }

  Logger.log(
    `✅ [GỬI MAIL OK] - Status: ${e.value} | Ứng viên: ${hoTen} | Email: ${email} | Lúc: ${now}`,
  );
}
