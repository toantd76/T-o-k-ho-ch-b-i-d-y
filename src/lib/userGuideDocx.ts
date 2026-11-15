import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  LineRuleType,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import { AppSettings, TeacherProfile } from '../types/lesson';
import { DOCX_STANDARD_FORMAT } from './docxExporter';

export interface AdminGuideMetadata {
  parentAgency: string;
  issuingAgency: string;
  documentNumber: string;
  issuePlace: string;
  issueDateText: string;
  signerTitle: string;
  signerName: string;
  recipients: string[];
}

export interface GuideSubsection {
  heading: string;
  paragraphs: string[];
}

export interface GuideTableData {
  caption: string;
  headers: string[];
  colWidthsPercent: number[];
  rows: string[][];
}

export interface GuideSection {
  id: string;
  title: string;
  paragraphs?: string[];
  subsections?: GuideSubsection[];
  table?: GuideTableData;
}

export function createDefaultAdminGuideMetadata(profile?: TeacherProfile): AdminGuideMetadata {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();

  const school = (profile?.schoolName || 'Trường THPT Đắk Song').trim();
  const schoolUpper = school.toUpperCase();
  const dept = (profile?.departmentName || '').trim();

  return {
    parentAgency: dept ? schoolUpper : 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
    issuingAgency: dept ? `TỔ CHUYÊN MÔN ${dept.toUpperCase()}` : schoolUpper,
    documentNumber: 'Số: 01/HD-KHBD',
    issuePlace: school.toLowerCase().includes('đắk song') ? 'Đắk Song' : 'Địa danh',
    issueDateText: `ngày ${dd} tháng ${mm} năm ${yyyy}`,
    signerTitle: dept ? 'TỔ TRƯỞNG CHUYÊN MÔN' : 'HIỆU TRƯỞNG',
    signerName: profile?.teacherName || 'Trần Công Toàn',
    recipients: [
      'Ban Giám hiệu (để báo cáo);',
      'Các tổ chuyên môn;',
      'Giáo viên toàn trường (để thực hiện);',
      'Lưu: VT, CM.',
    ],
  };
}

export const USER_GUIDE_DOCUMENT_TITLE = 'HƯỚNG DẪN';
export const USER_GUIDE_DOCUMENT_SUBJECT =
  'Sử dụng ứng dụng Kế Hoạch Bài Dạy AI trong thiết kế, rà soát và xuất bản kế hoạch bài dạy';

export const USER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'muc-dich',
    title: 'I. MỤC ĐÍCH, PHẠM VI ÁP DỤNG VÀ YÊU CẦU HỆ THỐNG',
    subsections: [
      {
        heading: '1. Mục đích ban hành',
        paragraphs: [
          'Tài liệu này hướng dẫn giáo viên và tổ chuyên môn quy trình khai thác thống nhất ứng dụng Kế Hoạch Bài Dạy AI nhằm hỗ trợ xây dựng, rà soát tính sư phạm, kiểm tra ngữ pháp và xuất bản Kế hoạch bài dạy (giáo án) đúng thể thức hành chính, tiết kiệm thời gian soạn giảng và bảo đảm chuẩn Chương trình Giáo dục phổ thông 2018.',
        ],
      },
      {
        heading: '2. Phạm vi áp dụng và căn cứ chuẩn hóa',
        paragraphs: [
          'Ứng dụng đáp ứng nhu cầu soạn thảo giáo án ở các cấp học (Tiểu học, THCS, THPT, GDTX) với 05 nhóm mẫu chuẩn: Mẫu Tiểu học 2 cột, Mẫu THCS/THPT chuỗi hoạt động 4 bước, Mẫu THCS/THPT chuẩn Phụ lục IV (Công văn 5512/BGDĐT-GDTrH), Mẫu tích hợp STEM/STEAM và Mẫu Ôn tập/Luyện tập chuyên sâu.',
          'Các nội dung tích hợp trong kế hoạch bài dạy tuân thủ định hướng: Khung Năng lực số theo Công văn 3456/BGDĐT-GDPT ban hành ngày 27/06/2025 (ký hiệu viết gọn: CV 3456) và Khung nội dung Giáo dục Trí tuệ nhân tạo theo Quyết định 2422/QĐ-BGDĐT ban hành ngày 18/08/2026 (ký hiệu viết gọn: QĐ 2422).',
        ],
      },
      {
        heading: '3. Yêu cầu kỹ thuật và cơ chế lưu trữ dữ liệu',
        paragraphs: [
          'Ứng dụng vận hành trực tiếp trên trình duyệt web hiện đại (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari), hỗ trợ giao diện Sáng/Tối và chế độ Tập trung khi soạn thảo.',
          'Toàn bộ kế hoạch bài dạy, lịch sử phiên bản, mẫu riêng của tổ chuyên môn, hồ sơ giáo viên và cài đặt xuất bản được lưu cục bộ trên thiết bị người dùng thông qua IndexedDB. Giáo viên không cần cài đặt phần mềm bổ trợ và không phải tự nhập khóa API AI cá nhân; kết nối AI được xử lý an toàn qua máy chủ của hệ thống.',
        ],
      },
    ],
  },
  {
    id: 'tong-quan',
    title: 'II. TỔNG QUAN CÁC PHÂN HỆ CHỨC NĂNG',
    paragraphs: [
      'Thanh điều hướng bên trái màn hình tổ chức ứng dụng thành 07 phân hệ làm việc rõ ràng, giúp giáo viên chuyển đổi linh hoạt giữa các giai đoạn thiết kế bài dạy:',
    ],
    table: {
      caption: 'Bảng 1. Tóm tắt các phân hệ chức năng trên thanh điều hướng',
      headers: ['STT', 'Phân hệ', 'Chức năng chính'],
      colWidthsPercent: [10, 28, 62],
      rows: [
        ['1', 'Tổng quan', 'Thống kê số lượng kế hoạch (nháp, hoàn thiện), mở nhanh bản nháp đang dở, mở Bài dạy minh họa hoặc đi tắt tới các tác vụ chính.'],
        ['2', 'Tạo kế hoạch', 'Quy trình 4 bước thiết lập thông số bài dạy, tải tài liệu nguồn, chọn tùy chọn sư phạm và khởi tạo bằng AI hoặc khung thủ công.'],
        ['3', 'Không gian soạn thảo', 'Chỉnh sửa chi tiết từng mục, chạy kiểm tra logic bằng mã, nhận xét chuyên môn AI, kiểm tra ngữ pháp, sửa cục bộ bằng AI, xem trước A4 và xuất Word/PDF.'],
        ['4', 'Thư viện kế hoạch', 'Quản lý toàn bộ giáo án đã lưu trên máy theo trạng thái (Nháp, Hoàn thiện, Lưu trữ, Thùng rác); tìm kiếm, nhân bản, đổi tên hoặc khôi phục.'],
        ['5', 'Mẫu kế hoạch', 'Xem trước bố cục và chọn áp dụng các mẫu tham khảo dựng sẵn (bao gồm Phụ lục 4 - Công văn 5512) hoặc mẫu riêng đã lưu.'],
        ['6', 'Cài đặt', 'Thiết lập hồ sơ giáo viên mặc định, thông số định dạng trang in/Word (Times New Roman 13 pt), kiểm tra trạng thái AI và sao lưu/khôi phục JSON.'],
        ['7', 'Hướng dẫn sử dụng', 'Tra cứu quy trình thao tác chi tiết và xuất tài liệu hướng dẫn dạng Word (.docx) chuẩn văn bản hành chính để ban hành.'],
      ],
    },
  },
  {
    id: 'quy-trinh',
    title: 'III. QUY TRÌNH THAO TÁC CHI TIẾT',
    subsections: [
      {
        heading: '1. Bước chuẩn bị: Thiết lập Hồ sơ mặc định và Thông số xuất bản (Cài đặt)',
        paragraphs: [
          'Trước khi soạn bài đầu tiên, giáo viên mở mục Cài đặt để kiểm tra và cập nhật Hồ sơ giáo viên & Mặc định bài mới gồm: Họ và tên giáo viên, Tên trường, Tổ chuyên môn, Cấp học mặc định, Lớp mặc định, Sĩ số lớp, Môn học mặc định, Bộ sách thường dùng, Phương tiện dạy học và Đặc điểm lớp học. Hệ thống thiết lập sẵn thông tin mặc định phù hợp thực tế giảng dạy (ví dụ: Trường THPT Đắk Song, môn Tin học lớp 10, sĩ số 44 học sinh, máy chiếu, khoảng 2/3 học sinh trình độ từ Trung bình trở lên) và cho phép điều chỉnh bất kỳ lúc nào.',
          'Tại mục Cài đặt xuất bản Word & Bản in, giữ nguyên chuẩn mặc định: Phông chữ Times New Roman, Cỡ chữ 13 pt, Giãn dòng 1 (Single), Lề A4 (Trên 20 mm, Dưới 20 mm, Trái 25 mm, Phải 15 mm) để tệp Word xuất ra khớp chuẩn thể thức.',
        ],
      },
      {
        heading: '2. Khởi tạo Kế hoạch bài dạy theo quy trình 4 bước (Tạo kế hoạch)',
        paragraphs: [
          'Bước 1 — Thông tin bài học: Nhập Tên bài dạy (bắt buộc), chọn Cấp học, Lớp, Môn học, Bộ sách, Loại bài (Bài mới, Luyện tập, Thực hành, Ôn tập, Dự án), Số tiết, Thời lượng mỗi tiết, Cách chia tiến trình (Chia rõ từng tiết hoặc Xuyên suốt) và Mẫu trình bày. Nếu soạn theo đúng mẫu Công văn 5512, chọn mẫu "Kế hoạch bài dạy THCS / THPT (Phụ lục 4 - Công văn 5512)".',
          'Bước 2 — Tài liệu & Bối cảnh lớp học: Giáo viên có thể tải lên tài liệu PDF, DOCX, TXT hoặc ảnh PNG/JPEG (tối đa 10 MB/tệp và 20 MB/bài). Đối với tệp PDF nhiều trang, sử dụng ô chọn phạm vi trang (ví dụ: 1-4, 6) để trích xuất đúng bài học; nếu PDF là bản quét/ảnh không có lớp văn bản, nhấn "Trích xuất bằng AI". Ngoài ra có thể dán trực tiếp văn bản và chỉnh sửa Sĩ số, Đặc điểm học sinh, Khó khăn thường gặp, Thiết bị, Mạng Internet.',
          'Bước 3 — Yêu cầu thiết kế & Tích hợp sư phạm: Đánh dấu các thành phần cần tạo gồm Phương pháp dạy học tích cực, Trò chơi học tập, Phiếu học tập cá nhân/nhóm, Câu hỏi củng cố (chọn số câu và dạng câu hỏi), Rubric đánh giá, STEM/STEAM, Năng lực số (CV 3456), Sử dụng AI có kiểm chứng (QĐ 2422), An toàn mạng, GDQPAN, Đạo đức lối sống, Bảo vệ môi trường và Hỗ trợ học hòa nhập.',
          'Bước 4 — Kiểm tra tóm tắt & Tạo kế hoạch: Rà soát lại bảng tóm tắt. Chọn "Tạo kế hoạch bằng AI" để hệ thống xử lý qua tác vụ nền (hiển thị tiến độ dung lượng KB và thời gian giây theo thời gian thực; có thể bấm "Dừng" nếu muốn hủy chờ mà vẫn giữ nguyên toàn bộ dữ liệu đã nhập). Trường hợp không dùng AI hoặc muốn tự biên soạn từ đầu, chọn "Tạo khung kế hoạch thủ công" để khởi tạo ngay bộ khung đầy đủ Mục tiêu, Thiết bị và 04 Hoạt động.',
        ],
      },
      {
        heading: '3. Biên tập, kiểm tra chất lượng và chỉnh sửa cục bộ (Không gian soạn thảo)',
        paragraphs: [
          'Thanh mục lục bên trái cho phép di chuyển nhanh tới Phần đầu, I. Mục tiêu bài học, II. Thiết bị & Học liệu, III. Tiến trình dạy học (từng hoạt động), IV. Điều chỉnh sau bài dạy và các Phụ lục (Phiếu học tập, Câu hỏi & Đáp án, Rubric & Bảng đối chiếu).',
          'Khi bấm vào từng hoạt động, giáo viên chỉnh sửa trực tiếp Tên hoạt động, Thời lượng (phút), Gắn mã mục tiêu, Nội dung nhiệm vụ, Sản phẩm dự kiến và đủ 4 bước tổ chức thực hiện (1. Giao nhiệm vụ/Chuyển giao; 2. Thực hiện nhiệm vụ; 3. Báo cáo, thảo luận; 4. Kết luận, nhận định).',
          'Cột công cụ kiểm định bên phải gồm 3 thẻ hỗ trợ: (1) Thẻ Kiểm tra: chạy kiểm tra logic bằng mã theo thời gian thực (kiểm tổng thời lượng bằng số tiết × số phút, phát hiện mục tiêu chưa gắn hoạt động, Rubric có tổng trọng số khác 100%, câu hỏi thiếu đáp án) và nút "Nhận xét chuyên môn AI"; (2) Thẻ Ngữ pháp: rà soát chính tả, ngữ pháp, diễn đạt sư phạm theo từng phần hoặc toàn bài và cho phép bấm áp dụng từng gợi ý sửa (tự động lưu bản khôi phục trước đó); (3) Thẻ Trợ lý AI: gửi lệnh chỉnh sửa cục bộ duy nhất hoạt động đang chọn, xem bản đối chiếu trước khi áp dụng.',
          'Mọi thao tác sửa được lưu tự động cục bộ; thanh công cụ phía trên hỗ trợ Hoàn tác / Làm lại, chế độ Tập trung (ẩn thanh bên để tập trung soạn thảo) và Lịch sử phiên bản (tự động lưu tối đa 15 mốc gần nhất cho mỗi kế hoạch để khôi phục bất kỳ lúc nào).',
        ],
      },
      {
        heading: '4. Xem trước khổ A4, In/PDF và Xuất tệp Word (.docx)',
        paragraphs: [
          'Nhấn nút "Xem trước" trên thanh công cụ trình soạn thảo để mở cửa sổ Xem trước bản in (Khổ A4). Tại đây giáo viên có thể phóng to/thu nhỏ (75%–150%), chuyển nhanh theo các mục chính và chọn phạm vi hiển thị (Toàn bộ kế hoạch & Phụ lục, Chỉ kế hoạch bài dạy chính, Chỉ phiếu học tập & câu hỏi, Chỉ hướng dẫn cho giáo viên).',
          'Nhấn "In / Lưu PDF" để in trực tiếp hoặc lưu thành tệp PDF chuẩn A4; nhấn "Xuất Word (.docx)" để tải tệp Word hoàn chỉnh về máy tính. Tệp Word xuất ra được định dạng thống nhất: phông Times New Roman cỡ 13 pt, các đề mục và đoạn văn bản thụt đầu dòng 1,27 cm, canh đều hai biên, khoảng cách đoạn before 6 pt, giãn dòng đơn (Single); nội dung trong các bảng không thụt dòng, giãn dòng đơn, căn giữa ô và khoảng cách đoạn 0 pt; cuối giáo án có mục Điều chỉnh sau bài dạy (2 dòng) và khung DUYỆT CỦA TỔ CHUYÊN MÔN / GIÁO VIÊN GIẢNG DẠY.',
        ],
      },
      {
        heading: '5. Quản lý Thư viện, Mẫu kế hoạch và Sao lưu dữ liệu',
        paragraphs: [
          'Trong Thư viện kế hoạch, giáo viên lọc bài dạy theo trạng thái (Nháp, Hoàn thiện, Lưu trữ, Thùng rác), tìm kiếm theo tên bài ở thanh trên cùng, thực hiện Nhân bản để tạo phiên bản dạy cho lớp khác, hoặc chuyển sang Hoàn thiện sau khi đối chiếu xong.',
          'Trong Mẫu kế hoạch, giáo viên có thể xem trước cấu trúc từng mẫu trước khi bấm "Dùng mẫu này". Khi đang mở một giáo án ưng ý trong trình soạn thảo, chọn menu mở rộng -> "Lưu thành mẫu mới" để lưu lại làm mẫu dùng chung cho tổ chuyên môn.',
          'Định kỳ cuối tuần hoặc trước khi đổi trình duyệt/máy tính, vào Cài đặt -> Sao lưu & Khôi phục dữ liệu để xuất tệp .json lưu trữ và nhập lại khi cần.',
        ],
      },
    ],
  },
  {
    id: 'xu-ly-su-co',
    title: 'IV. LƯU Ý QUAN TRỌNG VÀ XỬ LÝ TÌNH HUỐNG THƯỜNG GẶP',
    paragraphs: [
      'Trong quá trình sử dụng, giáo viên cần đối chiếu lại các nội dung AI gắn nhãn "[Cần đối chiếu]" với sách giáo khoa hiện hành trước khi lên lớp và tham khảo bảng xử lý nhanh dưới đây nếu gặp vướng mắc:',
    ],
    table: {
      caption: 'Bảng 2. Một số tình huống thường gặp và cách xử lý',
      headers: ['TT', 'Tình huống gặp phải', 'Nguyên nhân & Cách khắc phục'],
      colWidthsPercent: [8, 34, 58],
      rows: [
        ['1', 'AI chạy lâu hoặc báo gián đoạn mạng tạm thời', 'Với bài nhiều tiết hoặc đính kèm tài liệu dài, hệ thống chạy tác vụ nền và hiển thị tiến độ KB/giây. Giữ kết nối ổn định, chờ tiến trình hoàn tất; nếu báo lỗi, dữ liệu nhập vẫn được giữ nguyên để bấm thử lại ngay hoặc chọn Tạo khung thủ công.'],
        ['2', 'Tải tệp PDF lên nhưng không đọc được chữ', 'Tệp PDF là bản chụp/scan ảnh nên chưa có lớp văn bản. Mở chi tiết tài liệu tại Bước 2 và nhấn nút trích xuất văn bản bằng AI hoặc dán nội dung trọng tâm vào ô văn bản.'],
        ['3', 'Hệ thống báo lệch tổng thời lượng hoạt động', 'Tổng số phút của các hoạt động chưa bằng (Số tiết × Số phút/tiết). Mở từng hoạt động ở Không gian soạn thảo để điều chỉnh lại số phút cho khớp tổng thời lượng tiết học.'],
        ['4', 'Không thấy kế hoạch cũ khi mở trên máy tính khác', 'Dữ liệu được lưu cục bộ trong IndexedDB của từng trình duyệt. Cần xuất tệp sao lưu JSON từ Cài đặt ở máy cũ và nhập vào máy mới.'],
        ['5', 'Giáo án có công thức Toán/Lý/Hóa phức tạp khi xuất Word', 'Hệ thống giữ công thức ở dạng văn bản dễ đọc và hiển thị thông báo; giáo viên có thể mở file .docx trong Microsoft Word và chuyển sang Equation Editor nếu cần trình bày nâng cao.'],
      ],
    },
  },
  {
    id: 'to-chuc-thuc-hien',
    title: 'V. TỔ CHỨC THỰC HIỆN',
    paragraphs: [
      '1. Giáo viên trực tiếp giảng dạy chủ động thiết lập đúng hồ sơ lớp học, sử dụng công cụ kiểm tra logic và rà soát ngữ pháp trước khi xuất bản; chịu trách nhiệm kiểm duyệt tính chính xác khoa học và phù hợp đối tượng học sinh đối với mọi nội dung do AI gợi ý.',
      '2. Tổ chuyên môn thống nhất lựa chọn mẫu kế hoạch phù hợp quy định nhà trường (ưu tiên mẫu Phụ lục 4 - Công văn 5512 đối với các tiết dạy theo khung chuẩn), chia sẻ mẫu và tệp sao lưu tham khảo trong sinh hoạt tổ.',
      '3. Trong quá trình triển khai, nếu có góp ý bổ sung mẫu biểu hoặc điều chỉnh kỹ thuật, giáo viên phản hồi về Tổ chuyên môn để tổng hợp, hoàn thiện quy trình áp dụng.',
    ],
  },
];

const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '334155',
};

const VISIBLE_TABLE_BORDERS = {
  top: BORDER_STYLE,
  bottom: BORDER_STYLE,
  left: BORDER_STYLE,
  right: BORDER_STYLE,
  insideHorizontal: BORDER_STYLE,
  insideVertical: BORDER_STYLE,
};

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function guideRun(
  text: string,
  font: string,
  sizePt: number,
  options?: { bold?: boolean; italics?: boolean; color?: string }
): TextRun {
  return new TextRun({
    text,
    font,
    size: Math.round(sizePt * 2),
    bold: options?.bold,
    italics: options?.italics,
    color: options?.color,
  });
}

function guideParagraph(
  text: string,
  font: string,
  sizePt: number,
  options?: {
    bold?: boolean;
    italics?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    firstLineIndentTwips?: number;
    spacingBefore?: number;
    spacingAfter?: number;
    isTableCell?: boolean;
  }
): Paragraph {
  const isTableCell = options?.isTableCell ?? false;
  return new Paragraph({
    alignment:
      options?.alignment ??
      (isTableCell ? AlignmentType.CENTER : AlignmentType.JUSTIFIED),
    indent: {
      firstLine: isTableCell
        ? 0
        : (options?.firstLineIndentTwips ?? DOCX_STANDARD_FORMAT.firstLineIndentTwips),
    },
    spacing: {
      line: DOCX_STANDARD_FORMAT.lineTwipsSingle,
      lineRule: LineRuleType.AUTO,
      before: isTableCell
        ? DOCX_STANDARD_FORMAT.tableSpacingBeforeTwips
        : (options?.spacingBefore ?? DOCX_STANDARD_FORMAT.spacingBeforeTwips),
      after: isTableCell
        ? DOCX_STANDARD_FORMAT.tableSpacingAfterTwips
        : (options?.spacingAfter ?? DOCX_STANDARD_FORMAT.spacingAfterTwips),
    },
    children: [
      guideRun(text, font, sizePt, {
        bold: options?.bold,
        italics: options?.italics,
      }),
    ],
  });
}

function guideTableCell(
  paragraphs: Paragraph[],
  widthPercent: number,
  shadingFill?: string,
  compactHorizontal = false
): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: shadingFill ? { fill: shadingFill } : undefined,
    margins: {
      top: 90,
      bottom: 90,
      left: compactHorizontal ? 30 : 110,
      right: compactHorizontal ? 30 : 110,
    },
    children:
      paragraphs.length > 0
        ? paragraphs
        : [guideParagraph('', DOCX_STANDARD_FORMAT.font, DOCX_STANDARD_FORMAT.sizePt, { isTableCell: true })],
  });
}

export function createUserGuideDocxDocument(
  metadata: AdminGuideMetadata,
  settings?: Partial<AppSettings>
): { doc: Document; fileName: string } {
  const font = settings?.exportFont?.trim() || DOCX_STANDARD_FORMAT.font;
  const sizePt = settings?.exportFontSizePt || DOCX_STANDARD_FORMAT.sizePt;

  const children: Array<Paragraph | Table> = [];

  // 1. THỂ THỨC PHẦN MỞ ĐẦU (BẢNG 2 CỘT KHÔNG VIỀN THEO NGHỊ ĐỊNH 30/2020/NĐ-CP)
  const leftHeaderParas: Paragraph[] = [];
  if (metadata.parentAgency.trim()) {
    leftHeaderParas.push(
      guideParagraph(metadata.parentAgency.trim().toUpperCase(), font, sizePt, {
        isTableCell: true,
      })
    );
  }
  leftHeaderParas.push(
    guideParagraph(
      metadata.issuingAgency.trim().toUpperCase() || 'ĐƠN VỊ BAN HÀNH',
      font,
      sizePt,
      { bold: true, isTableCell: true }
    ),
    guideParagraph('──────────────', font, sizePt, { isTableCell: true }),
    guideParagraph(metadata.documentNumber.trim() || 'Số: .../HD-...', font, sizePt, {
      isTableCell: true,
    })
  );

  const rightHeaderParas: Paragraph[] = [
    guideParagraph('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', font, sizePt, {
      bold: true,
      isTableCell: true,
    }),
    guideParagraph('Độc lập - Tự do - Hạnh phúc', font, sizePt, {
      bold: true,
      isTableCell: true,
    }),
    guideParagraph('────────────────────────', font, sizePt, { isTableCell: true }),
    guideParagraph(
      `${metadata.issuePlace.trim() || 'Địa danh'}, ${metadata.issueDateText.trim() || 'ngày ... tháng ... năm ...'}`,
      font,
      sizePt,
      { italics: true, isTableCell: true }
    ),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            guideTableCell(leftHeaderParas, 38, undefined, true),
            guideTableCell(rightHeaderParas, 62, undefined, true),
          ],
        }),
      ],
    })
  );

  // 2. TÊN LOẠI VÀ TRÍCH YẾU NỘI DUNG VĂN BẢN
  children.push(
    guideParagraph(USER_GUIDE_DOCUMENT_TITLE, font, sizePt, {
      bold: true,
      alignment: AlignmentType.CENTER,
      firstLineIndentTwips: 0,
      spacingBefore: 200,
    }),
    guideParagraph(USER_GUIDE_DOCUMENT_SUBJECT, font, sizePt, {
      bold: true,
      alignment: AlignmentType.CENTER,
      firstLineIndentTwips: 0,
    }),
    guideParagraph('─────────────────', font, sizePt, {
      alignment: AlignmentType.CENTER,
      firstLineIndentTwips: 0,
    })
  );

  // 3. NỘI DUNG CHÍNH THEO CÁC MỤC I, II, III, IV, V
  for (const section of USER_GUIDE_SECTIONS) {
    children.push(
      guideParagraph(section.title, font, sizePt, {
        bold: true,
      })
    );

    if (section.paragraphs) {
      for (const p of section.paragraphs) {
        children.push(guideParagraph(p, font, sizePt));
      }
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        children.push(
          guideParagraph(sub.heading, font, sizePt, {
            bold: true,
          })
        );
        for (const p of sub.paragraphs) {
          children.push(guideParagraph(p, font, sizePt));
        }
      }
    }

    if (section.table) {
      children.push(
        guideParagraph(section.table.caption, font, sizePt, {
          bold: true,
          italics: true,
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: VISIBLE_TABLE_BORDERS,
          rows: [
            new TableRow({
              tableHeader: true,
              cantSplit: true,
              children: section.table.headers.map((h, idx) =>
                guideTableCell(
                  [guideParagraph(h, font, sizePt, { bold: true, isTableCell: true })],
                  section.table!.colWidthsPercent[idx] ?? Math.floor(100 / section.table!.headers.length),
                  'F1F5F9'
                )
              ),
            }),
            ...section.table.rows.map(
              (row) =>
                new TableRow({
                  cantSplit: true,
                  children: row.map((cellText, idx) =>
                    guideTableCell(
                      [
                        guideParagraph(cellText, font, sizePt, {
                          bold: idx === 1,
                          isTableCell: true,
                        }),
                      ],
                      section.table!.colWidthsPercent[idx] ?? Math.floor(100 / row.length)
                    )
                  ),
                })
            ),
          ],
        })
      );
    }
  }

  // 4. THỂ THỨC KẾT THÚC: NƠI NHẬN & CHỮ KÝ BAN HÀNH
  const recipientParas: Paragraph[] = [
    guideParagraph('Nơi nhận:', font, sizePt, {
      bold: true,
      italics: true,
      isTableCell: true,
    }),
    ...(metadata.recipients.length > 0
      ? metadata.recipients
      : ['Lưu: VT, CM.']
    ).map((r) => guideParagraph(`- ${r.replace(/^\s*[-•]\s*/, '')}`, font, sizePt, { isTableCell: true })),
  ];

  const signatureParas: Paragraph[] = [
    guideParagraph(
      metadata.signerTitle.trim().toUpperCase() || 'HIỆU TRƯỞNG',
      font,
      sizePt,
      { bold: true, isTableCell: true }
    ),
    guideParagraph('(Ký, ghi rõ họ tên và đóng dấu)', font, sizePt, {
      italics: true,
      isTableCell: true,
    }),
    guideParagraph('', font, sizePt, { isTableCell: true }),
    guideParagraph('', font, sizePt, { isTableCell: true }),
    guideParagraph('', font, sizePt, { isTableCell: true }),
    guideParagraph(metadata.signerName.trim() || '....................', font, sizePt, {
      bold: true,
      isTableCell: true,
    }),
  ];

  children.push(
    guideParagraph('', font, sizePt, {
      alignment: AlignmentType.CENTER,
      firstLineIndentTwips: 0,
      spacingBefore: 120,
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            guideTableCell(recipientParas, 48),
            guideTableCell(signatureParas, 52),
          ],
        }),
      ],
    })
  );

  // Số trang căn giữa lề trên, ẩn ở trang thứ nhất (Nghị định 30/2020/NĐ-CP)
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font,
            size: Math.round(sizePt * 2),
          },
          paragraph: {
            spacing: {
              line: DOCX_STANDARD_FORMAT.lineTwipsSingle,
              lineRule: LineRuleType.AUTO,
              before: DOCX_STANDARD_FORMAT.spacingBeforeTwips,
              after: DOCX_STANDARD_FORMAT.spacingAfterTwips,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(15),
              header: convertMillimetersToTwip(10),
            },
          },
        },
        headers: {
          first: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [],
              }),
            ],
          }),
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { firstLine: 0 },
                spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO },
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font,
                    size: Math.round(sizePt * 2),
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return {
    doc,
    fileName: 'Huong_dan_su_dung_Ke_Hoach_Bai_Day_AI.docx',
  };
}

export async function exportUserGuideToDocx(
  metadata: AdminGuideMetadata,
  settings?: Partial<AppSettings>
): Promise<{ fileName: string }> {
  const { doc, fileName } = createUserGuideDocxDocument(metadata, settings);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { fileName };
}
