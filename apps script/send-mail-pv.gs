/**
 * ==========================================================================
 * HỆ THỐNG GỬI MAIL TỰ ĐỘNG THEO TRẠNG THÁI (ULTIMATE OPTIMIZED VERSION)
 * Đặc tả:
 * - Đọc dữ liệu hàng loạt (Batch Reading).
 * - Ghi dữ liệu log hàng loạt (Batch Writing).
 * - Tốc độ thực thi được tối ưu cho việc xử lý hàng trăm dòng ngay lập tức.
 * ==========================================================================
 */

function guiMailTheoTrangThai(e) {
  /**
   * --------------------------------------------------------------------------
   * 1. CẤU HÌNH CƠ BẢN
   * --------------------------------------------------------------------------
   */
  const TARGET_SHEET_NAME = "Test"; // Tên trang tính cần theo dõi
  const TARGET_COLUMN = 11; // Cột K (Trạng thái)
  const MAIL_SENDER_NAME = "Tuyển dụng FamilyMart";

  // Danh sách các trạng thái kích hoạt gửi mail
  const EMAIL_CONFIG = {
    "2. KO THAM GIA": {
      mail_title: "[FAMILYMART] KHẢO SÁT LÝ DO KHÔNG THAM GIA ĐÀO TẠO",
      intro_1: "Cảm ơn bạn đã quan tâm và tham gia quy trình tuyển dụng FamilyMart. Chúng mình rất tiếc khi bạn chưa tham gia khóa đào tạo.",
      intro_2: "Để cải thiện quy trình tuyển dụng, FamilyMart mong bạn dành ít phút hoàn thiện khảo sát:",
      survey_label: "Link KHẢO SÁT LÝ DO KHÔNG THAM GIA ĐÀO TẠO",
      survey_url: "https://forms.gle/btQ3su7YHuZn2TDs7",
      qr_image: "https://raw.githubusercontent.com/phattran1201/FamilyMart/refs/heads/main/qr/khong-dao-tao.png",
    },
    "2. NHD": {
      mail_title: "[FAMILYMART] KHẢO SÁT LÝ DO KHÔNG TIẾP TỤC ĐÀO TẠO",
      intro_1: "Cảm ơn bạn đã quan tâm. Chúng mình rất tiếc khi bạn chưa thể tiếp tục hành trình cùng FamilyMart.",
      intro_2: "Mong bạn dành chút thời gian hoàn thiện khảo sát giúp chúng mình phát triển hơn:",
      survey_label: "Link KHẢO SÁT LÝ DO KHÔNG TIẾP TỤC ĐÀO TẠO",
      survey_url: "https://forms.gle/FJtdRzyhHXt93iW29",
      qr_image: "https://raw.githubusercontent.com/phattran1201/FamilyMart/refs/heads/main/qr/khong-tiep-tuc.png",
    },
  };

  /**
   * --------------------------------------------------------------------------
   * 2. CHỈ TRÍCH XUẤT DỮ LIỆU CẦN THIẾT
   * --------------------------------------------------------------------------
   */
  const DATA_START_COLUMN = 9; // Cột I (Dữ liệu ứng viên)
  const DATA_NUM_COLUMNS = 24; // Số lượng cột từ I tới AF (AF là cột 32 => 32 - 9 + 1 = 24 cột)
  const COL_INDEX_HO_TEN = 0; // Tên ứng viên nằm ở vị trí 0 của mảng (tương đương cột I)
  const COL_INDEX_EMAIL = 23; // Email ứng viên nằm ở vị trí 23 của mảng (tương đương cột AF)

  if (!e || !e.range) {
    console.warn("⏩ [BỎ QUA] - Không có vùng bị tác động.");
    return "EXIT: No event/range";
  }

  const range = e.range;
  const sheet = range.getSheet();

  if (sheet.getName() !== TARGET_SHEET_NAME) {
    console.info(`⏩ [BỎ QUA] - Đang sửa trang "${sheet.getName()}", không phải "${TARGET_SHEET_NAME}".`);
    return "EXIT: Wrong sheet";
  }

  const startRow = range.getRow();
  const numRows = range.getNumRows();
  const startCol = range.getColumn();
  const numCols = range.getNumColumns();

  // ĐIỀU KIỆN CHỈ CHẠY CHO CỘT K
  if (startCol > TARGET_COLUMN || startCol + numCols - 1 < TARGET_COLUMN) {
    const skipMsg = "⏩ [BỎ QUA] - Sửa các cột khác, dừng kiểm tra để tránh gửi mail lặp.";
    console.info(skipMsg);
    return skipMsg;
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Xếp hàng 30 giây nếu hệ thống bận
  } catch (err) {
    console.error("🔴 [LỖI] - Quá tải tạm thời: " + err.message);
    return "FAILED: Concurrency error";
  }

  try {
    /**
     * Đọc toàn bộ giá trị Trạng Thái và Thông Tin ứng viên và đưa vào bộ nhớ một lần (Batch Reading).
     * Thay vì đọc từng dòng (chậm), ta đọc 1 khối dữ liệu (nhanh).
     */
    const statusValues = sheet.getRange(startRow, TARGET_COLUMN, numRows, 1).getValues();
    const dataValues = sheet.getRange(startRow, DATA_START_COLUMN, numRows, DATA_NUM_COLUMNS).getValues();

    let processCount = 0;

    // Tạo 1 mảng để chứa tất cả Log, ghi xuống Sheet 1 lần lúc xong
    let logDataArray = [];

    for (let i = 0; i < numRows; i++) {
      const currentStatus = statusValues[i][0];
      const emailConfig = EMAIL_CONFIG[currentStatus];

      if (!emailConfig) continue;

      const rowData = dataValues[i];
      const hoTen = rowData[COL_INDEX_HO_TEN];
      const email = rowData[COL_INDEX_EMAIL];
      const currentActualRow = startRow + i;

      let logStatus = "Thành công";
      let logNote = ""; // Bỏ trống trừ khi có lỗi

      // Xử lý logic email trống an toàn
      if (!email || String(email).trim() === "") {
        logStatus = "Thất bại";
        logNote = `❌ Dòng ${currentActualRow}: Thiếu địa chỉ Email tại cột AF`;
        console.warn(`⚠️ [THẤT BẠI] - Hàng ${currentActualRow}: Ứng viên ${hoTen} chưa có Email.`);
      } else {
        try {
          const emailTemplate = HtmlService.createTemplateFromFile("template_mail");
          emailTemplate.contentConfig = emailConfig;
          emailTemplate.nameCV = hoTen;
          const htmlMessage = emailTemplate.evaluate().getContent();

          GmailApp.sendEmail(email, emailConfig.mail_title, "", {
            name: MAIL_SENDER_NAME,
            htmlBody: htmlMessage,
          });
          console.log(`✅ [GỬI XONG] - Hàng ${currentActualRow}: ${hoTen} (${email})`);
        } catch (err) {
          logStatus = "Thất bại";
          logNote = `❌ Dòng ${currentActualRow} - Lỗi: ${err.message}`;
          console.error(`🔴 [LỖI] - Hàng ${currentActualRow} (${hoTen}): ${err.toString()}`);
        }
      }

      // Đẩy dữ liệu log của dòng này vào mảng ghi nhớ
      logDataArray.push([currentActualRow, hoTen, email || "N/A", logStatus, logNote]);
      processCount++;
    }

    // TỐI ƯU SIÊU TỐC (Batch Writing):
    // Thay vì dùng vòng lặp gọi hàm ghi file nhiều lần, ta viết 1 lệnh in toàn bộ mảng Log xuống.
    if (logDataArray.length > 0) {
      batchWriteLogToSheet(e.source, logDataArray);
    }

    const report = `🏁 HOÀN TẤT: Đã kiểm tra ${numRows} dòng, thực hiện và ghi Log ${processCount} hồ sơ.`;
    console.log(report);

    SpreadsheetApp.flush();
    return report;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Hàm ghi nhật ký tốc độ cao (Batch Log Writing)
 */
function batchWriteLogToSheet(ss, logDataArray) {
  const logSheetName = "log_send_mail";
  let logSheet = ss.getSheetByName(logSheetName);
  const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

  if (!logSheet) {
    logSheet = ss.insertSheet(logSheetName);
    logSheet.appendRow(["Thời gian", "Dòng", "Họ tên", "Email", "Trạng thái", "Chi tiết"]);
    logSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#f8f9fa").setBorder(true, true, true, true, true, true);
  }

  // Cấu trúc lại mảng log (thêm Thời Gian vào vị trí đầu tiên của mỗi dòng)
  const finalLogData = logDataArray.map((row) => [now, ...row]);

  // TỐI ƯU GIAO DIỆN (Batch Formatting): Chuẩn bị mảng màu nền vàng cho các dòng lỗi
  const backgrounds = [];

  for (let i = 0; i < finalLogData.length; i++) {
    const status = finalLogData[i][4];

    if (status === "Thất bại") {
      backgrounds.push(Array(6).fill("#fff2cc"));
    } else {
      backgrounds.push(Array(6).fill(null));
    }
  }

  // Lấy dòng cuối cùng đang có dữ liệu
  const lastRow = logSheet.getLastRow();

  // Ghi TOÀN BỘ dữ liệu và màu sắc xuống trang tính bằng các lệnh Batch siêu tốc
  const targetRange = logSheet.getRange(lastRow + 1, 1, finalLogData.length, 6);
  targetRange.setValues(finalLogData);
  targetRange.setBackgrounds(backgrounds);
}
