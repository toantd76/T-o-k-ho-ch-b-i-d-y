export interface NlsGradeBand {
  code: string;
  shortCode: string;
  levelName: string;
  grades: number[];
  description: string;
}

export interface NlsComponentItem {
  code: string;
  title: string;
}

export interface NlsDomain {
  id: number;
  title: string;
  components: NlsComponentItem[];
}

export interface AiFrameworkDomain {
  code: 'A' | 'B' | 'C' | 'D';
  competencyCode: 'NLa' | 'NLb' | 'NLc' | 'NLd';
  title: string;
  topics: Array<{ code: string; title: string }>;
}

export interface AiGradeIndicator {
  code: string;
  domain: 'A' | 'B' | 'C' | 'D';
  description: string;
  isExtended?: boolean;
}

export const CV_3456_INFO = {
  documentNumber: 'Công văn 3456/BGDĐT-GDPT',
  compactCode: 'CV 3456',
  issuedDate: '27/06/2025',
  issuer: 'Bộ Giáo dục và Đào tạo',
  legalBasis: 'Thông tư 02/2025/TT-BGDĐT (Khung năng lực số cho người học)',
  shortLabel: 'Công văn 3456/BGDĐT-GDPT (27/06/2025)',
};

export const NLS_GRADE_BANDS: NlsGradeBand[] = [
  {
    code: 'L1-L2-L3',
    shortCode: 'CB1',
    levelName: 'Cơ bản 1',
    grades: [1, 2, 3],
    description: 'Thực hiện các nhiệm vụ đơn giản, với sự hướng dẫn của giáo viên.',
  },
  {
    code: 'L4-L5',
    shortCode: 'CB2',
    levelName: 'Cơ bản 2',
    grades: [4, 5],
    description: 'Thực hiện nhiệm vụ đơn giản, tự chủ và có hướng dẫn khi cần thiết.',
  },
  {
    code: 'L6-L7',
    shortCode: 'TC1',
    levelName: 'Trung cấp 1',
    grades: [6, 7],
    description: 'Thực hiện nhiệm vụ xác định rõ ràng và thường xuyên, tự chủ hoàn toàn.',
  },
  {
    code: 'L8-L9',
    shortCode: 'TC2',
    levelName: 'Trung cấp 2',
    grades: [8, 9],
    description: 'Thực hiện nhiệm vụ xác định rõ ràng và không thường xuyên, độc lập theo nhu cầu cá nhân.',
  },
  {
    code: 'L10-L11-L12',
    shortCode: 'NC1',
    levelName: 'Nâng cao 1',
    grades: [10, 11, 12],
    description: 'Giải quyết các nhiệm vụ và vấn đề khác nhau, thực hiện tự chủ và hướng dẫn người khác.',
  },
];

export const NLS_DOMAINS: NlsDomain[] = [
  {
    id: 1,
    title: 'Khai thác dữ liệu và thông tin',
    components: [
      { code: '1.1', title: 'Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số' },
      { code: '1.2', title: 'Đánh giá dữ liệu, thông tin và nội dung số' },
      { code: '1.3', title: 'Quản lý dữ liệu, thông tin và nội dung số' },
    ],
  },
  {
    id: 2,
    title: 'Giao tiếp và Hợp tác',
    components: [
      { code: '2.1', title: 'Tương tác thông qua công nghệ số' },
      { code: '2.2', title: 'Chia sẻ thông tin và nội dung thông qua công nghệ số' },
      { code: '2.3', title: 'Sử dụng công nghệ số để thực hiện trách nhiệm công dân' },
      { code: '2.4', title: 'Hợp tác thông qua công nghệ số' },
      { code: '2.5', title: 'Quy tắc ứng xử trên mạng' },
      { code: '2.6', title: 'Quản lý danh tính số' },
    ],
  },
  {
    id: 3,
    title: 'Sáng tạo nội dung số',
    components: [
      { code: '3.1', title: 'Phát triển nội dung số' },
      { code: '3.2', title: 'Tích hợp và tạo lập lại nội dung số' },
      { code: '3.3', title: 'Thực thi bản quyền và giấy phép' },
      { code: '3.4', title: 'Lập trình' },
    ],
  },
  {
    id: 4,
    title: 'An toàn',
    components: [
      { code: '4.1', title: 'Bảo vệ thiết bị' },
      { code: '4.2', title: 'Bảo vệ dữ liệu cá nhân và quyền riêng tư' },
      { code: '4.3', title: 'Bảo vệ sức khỏe và an sinh số' },
      { code: '4.4', title: 'Bảo vệ môi trường' },
    ],
  },
  {
    id: 5,
    title: 'Giải quyết vấn đề',
    components: [
      { code: '5.1', title: 'Giải quyết các vấn đề kỹ thuật' },
      { code: '5.2', title: 'Xác định nhu cầu và giải pháp công nghệ' },
      { code: '5.3', title: 'Sử dụng sáng tạo công nghệ số' },
      { code: '5.4', title: 'Xác định các vấn đề cần cải thiện về năng lực số' },
    ],
  },
  {
    id: 6,
    title: 'Ứng dụng trí tuệ nhân tạo',
    components: [
      { code: '6.1', title: 'Hiểu biết về trí tuệ nhân tạo' },
      { code: '6.2', title: 'Sử dụng trí tuệ nhân tạo' },
      { code: '6.3', title: 'Đánh giá trí tuệ nhân tạo' },
    ],
  },
];

export const QD_2422_INFO = {
  documentNumber: 'Quyết định 2422/QĐ-BGDĐT',
  compactCode: 'QĐ 2422',
  issuedDate: '18/08/2026',
  issuer: 'Bộ Giáo dục và Đào tạo',
  title: 'Khung nội dung giáo dục Trí tuệ nhân tạo cho học sinh phổ thông',
  shortLabel: 'Quyết định 2422/QĐ-BGDĐT (18/08/2026)',
};

export const AI_FRAMEWORK_DOMAINS: AiFrameworkDomain[] = [
  {
    code: 'A',
    competencyCode: 'NLa',
    title: 'Tư duy lấy con người làm trung tâm',
    topics: [
      { code: 'A1', title: 'Tính chủ động của con người' },
      { code: 'A2', title: 'AI vì sự tiến bộ của con người' },
      { code: 'A3', title: 'Công dân trong kỉ nguyên AI' },
    ],
  },
  {
    code: 'B',
    competencyCode: 'NLb',
    title: 'Đạo đức AI',
    topics: [
      { code: 'B1', title: 'Các khía cạnh đạo đức của AI' },
      { code: 'B2', title: 'Sử dụng AI an toàn và có trách nhiệm' },
      { code: 'B3', title: 'Nguyên tắc đạo đức và trách nhiệm xã hội' },
    ],
  },
  {
    code: 'C',
    competencyCode: 'NLc',
    title: 'Các kĩ thuật và ứng dụng AI',
    topics: [
      { code: 'C1', title: 'Đặc điểm chính của AI' },
      { code: 'C2', title: 'Ứng dụng AI trong học tập và cuộc sống' },
      { code: 'C3', title: 'Công nghệ AI' },
      { code: 'C4', title: 'Dữ liệu trong AI' },
      { code: 'C5', title: 'Kĩ thuật và thuật toán AI' },
    ],
  },
  {
    code: 'D',
    competencyCode: 'NLd',
    title: 'Thiết kế hệ thống AI',
    topics: [
      { code: 'D1', title: 'Nhận diện và hình thành giải pháp' },
      { code: 'D2', title: 'Cấu trúc và tương tác, cải tiến hệ thống' },
    ],
  },
];

export const AI_GRADE_10_INDICATORS: AiGradeIndicator[] = [
  {
    code: '10.A1.1',
    domain: 'A',
    description: 'Giải thích được vai trò quyết định của con người trong sử dụng, vận hành và tùy chỉnh công nghệ AI.',
  },
  {
    code: '10.A1.2',
    domain: 'A',
    description: 'Nhận thức được con người cần duy trì sự kiểm soát đối với AI để bảo đảm an toàn, công bằng và quyền lợi.',
  },
  {
    code: '10.A2.1',
    domain: 'A',
    description: 'Nêu được một số rủi ro tiềm ẩn khi sử dụng AI (thiên kiến, thông tin sai lệch, phụ thuộc công nghệ) và biện pháp hạn chế.',
  },
  {
    code: '10.A2.MR1',
    domain: 'A',
    isExtended: true,
    description: 'Đề xuất được biện pháp bảo vệ an toàn thông tin cá nhân và tổ chức khi tương tác với hệ thống AI.',
  },
  {
    code: '10.A3.1',
    domain: 'A',
    description: 'Liên hệ được quy định pháp luật liên quan tại Việt Nam (Luật An ninh mạng, Luật Dữ liệu, Luật Bảo vệ dữ liệu cá nhân) khi sử dụng AI.',
  },
  {
    code: '10.B2.1',
    domain: 'B',
    description: 'Nhận diện được hành vi sử dụng AI vi phạm đạo đức, bản quyền hoặc quy định pháp luật.',
  },
  {
    code: '10.B2.MR1',
    domain: 'B',
    isExtended: true,
    description: 'Phân biệt được nội dung do AI tạo sinh, kiểm chứng độ chính xác và khai báo minh bạch khi có sử dụng AI trong học tập.',
  },
  {
    code: '10.B3.1',
    domain: 'B',
    description: 'Phân tích được các vấn đề thiên vị dữ liệu, xâm phạm quyền riêng tư và thiếu minh bạch của hệ thống AI.',
  },
  {
    code: '10.C2.1',
    domain: 'C',
    description: 'Trình bày được một số ứng dụng AI tiêu biểu trong học tập và đời sống tại Việt Nam.',
  },
  {
    code: '10.C2.2',
    domain: 'C',
    description: 'Sử dụng được công cụ AI phù hợp để hỗ trợ tìm hiểu, hệ thống hóa kiến thức hoặc giải quyết bài toán học tập.',
  },
  {
    code: '10.C2.3',
    domain: 'C',
    description: 'Đánh giá được mức độ phù hợp, ưu điểm và giới hạn của kết quả do AI cung cấp trong nhiệm vụ cụ thể.',
  },
  {
    code: '10.C3.1',
    domain: 'C',
    description: 'Nêu được nguyên tắc đặt câu lệnh (prompt) rõ ngữ cảnh, mục tiêu và ràng buộc khi tương tác với AI.',
  },
  {
    code: '10.C3.2',
    domain: 'C',
    description: 'Thực hành viết và tinh chỉnh prompt phù hợp mục tiêu học tập, kết hợp đối chiếu lại với SGK/tài liệu chuẩn.',
  },
  {
    code: '10.C3.3',
    domain: 'C',
    description: 'Phân biệt được AI tạo sinh với AI phân loại/dự đoán trong một số tình huống quen thuộc.',
  },
  {
    code: '10.C4.1',
    domain: 'C',
    description: 'Giải thích được vai trò của chất lượng dữ liệu đầu vào đối với độ tin cậy của kết quả từ AI.',
  },
  {
    code: '10.D1.1',
    domain: 'D',
    description: 'Xác định được bài toán/nhiệm vụ cụ thể trong thực tế mà hệ thống AI có thể hỗ trợ giải quyết.',
  },
  {
    code: '10.D2.1',
    domain: 'D',
    description: 'Mô tả được 5 thành phần cơ bản trong cấu trúc hệ thống AI: dữ liệu, mô hình, thuật toán, đầu ra và phản hồi.',
  },
  {
    code: '10.D2.2',
    domain: 'D',
    description: 'Nhận biết được vấn đề phát sinh khi vận hành hệ thống AI và đề xuất hướng điều chỉnh, cải tiến.',
  },
];

export function parseNumericGrade(grade: string): number | null {
  const match = grade.match(/\d+/);
  if (!match) return null;
  const num = Number.parseInt(match[0], 10);
  if (num >= 1 && num <= 12) return num;
  return null;
}

export function getNlsBandForGrade(grade: string): NlsGradeBand {
  const g = parseNumericGrade(grade);
  if (g !== null) {
    const found = NLS_GRADE_BANDS.find((band) => band.grades.includes(g));
    if (found) return found;
  }
  return NLS_GRADE_BANDS[4]; // Mặc định Nâng cao 1 (L10-L11-L12)
}

export function getNlsQuickChips(subject: string): Array<{ code: string; label: string }> {
  const isInformatics = /tin\s*học/i.test(subject);
  const chips = [
    { code: '1.1', label: '1.1 Tìm kiếm & lọc dữ liệu số' },
    { code: '1.2', label: '1.2 Đánh giá thông tin & nguồn số' },
    { code: '2.4', label: '2.4 Hợp tác qua công nghệ số' },
    { code: '3.1', label: '3.1 Phát triển nội dung số' },
    ...(isInformatics ? [{ code: '3.4', label: '3.4 Lập trình & thuật toán' }] : []),
    { code: '4.2', label: '4.2 Bảo vệ dữ liệu cá nhân' },
    { code: '5.2', label: '5.2 Giải pháp công nghệ số' },
    { code: '6.2', label: '6.2 Ứng dụng AI có kiểm chứng' },
  ];
  return chips;
}

export function getAiQuickChips(grade: string): Array<{ code: string; label: string }> {
  const g = parseNumericGrade(grade);
  if (g === 10) {
    return [
      { code: '10.A1.1', label: '10.A1.1 Vai trò kiểm soát của con người' },
      { code: '10.A3.1', label: '10.A3.1 Pháp luật & bảo vệ dữ liệu' },
      { code: '10.B2.MR1', label: '10.B2.MR1 Kiểm chứng & khai báo AI' },
      { code: '10.C3.1', label: '10.C3.1 Đặt prompt đúng mục tiêu' },
      { code: '10.C3.2', label: '10.C3.2 Thực hành tinh chỉnh prompt' },
      { code: '10.C4.1', label: '10.C4.1 Chất lượng dữ liệu trong AI' },
      { code: '10.D2.1', label: '10.D2.1 5 thành phần hệ thống AI' },
    ];
  }
  const gradeLabel = g ?? 'Lớp';
  return [
    { code: `${gradeLabel}.NLa`, label: `${gradeLabel} · Tư duy lấy con người làm trung tâm (NLa)` },
    { code: `${gradeLabel}.NLb`, label: `${gradeLabel} · Đạo đức & khai báo AI minh bạch (NLb)` },
    { code: `${gradeLabel}.NLc`, label: `${gradeLabel} · Kĩ thuật, dữ liệu & ứng dụng AI (NLc)` },
    { code: `${gradeLabel}.NLd`, label: `${gradeLabel} · Tư duy thiết kế hệ thống AI (NLd)` },
  ];
}

export function buildNlsFrameworkPromptGuidance(
  grade: string,
  subject: string,
  notes?: string
): string {
  const band = getNlsBandForGrade(grade);
  const isInformatics = /tin\s*học/i.test(subject);
  const domainsText = NLS_DOMAINS.map(
    (d) =>
      `  + Miền ${d.id}. ${d.title}: ${d.components.map((c) => `${c.code} (${c.title})`).join('; ')}`
  ).join('\n');

  return `KHUNG TÍCH HỢP NĂNG LỰC SỐ BẮT BUỘC — THEO ${CV_3456_INFO.documentNumber.toUpperCase()} (${CV_3456_INFO.issuedDate}, ${CV_3456_INFO.legalBasis}):
- Bậc thành thạo áp dụng cho Lớp ${grade || '10'}: ${band.code} (${band.levelName}, ký hiệu mã chỉ báo ${band.shortCode}) — ${band.description}
- Quy ước mã chỉ báo trong phần "1.2.a) Năng lực đặc thù": <mã thành phần>.${band.shortCode}<chỉ báo> (ví dụ: 2.1.${band.shortCode}a, 2.2.${band.shortCode}b, 4.1.${band.shortCode}a, 6.2.${band.shortCode}a).
- 6 Miền năng lực & 24 năng lực thành phần chuẩn để lựa chọn "địa chỉ" tích hợp:
${domainsText}
- Yêu cầu triển khai theo Công văn 3456/BGDĐT-GDPT:
  * ${isInformatics ? 'Môn Tin học giữ vai trò chủ đạo trong hình thành Năng lực số; chọn chính xác các năng lực thành phần (1.1–6.3) đưa trực tiếp vào mục tiêu "nang_luc_dac_thu" với title (ví dụ "Năng lực Tương tác thông qua công nghệ số"), frameworkCode (ví dụ "2.1.' + band.shortCode + 'a") và description nêu rõ hành vi của học sinh gắn với hoạt động bài học.' : 'Xác định rõ nội dung, hình thức và "địa chỉ" tích hợp mã năng lực số (1.1–6.3) đưa vào mục tiêu "nang_luc_dac_thu" (ghi rõ title, frameworkCode, description) và từng hoạt động tương ứng.'}
  * Chỉ dùng các mã chuẩn ở trên (1.1 đến 6.3, bậc ${band.code} / ${band.shortCode}), không tự bịa mã miền ngoài danh sách.
  * Khi nhắc tới văn bản hướng dẫn trong nội dung kế hoạch bài dạy, viết gọn là (CV 3456) — KHÔNG ghi dài (CV 3456/BGDĐT-GDPT, bậc ${band.code}).
  * Tích hợp vừa sức, không làm quá tải hay thay đổi yêu cầu cần đạt gốc của môn học; có phương án thay thế bảo đảm công bằng nếu học sinh dùng chung thiết bị hoặc thiếu máy cá nhân.${notes ? `\n- Định hướng riêng của giáo viên về Năng lực số: ${notes}` : ''}`;
}

export function buildAiFrameworkPromptGuidance(
  grade: string,
  subject: string,
  toolName?: string,
  deviceContext?: string,
  verificationRule?: string
): string {
  const g = parseNumericGrade(grade);
  const isInformatics = /tin\s*học/i.test(subject);
  const domainsText = AI_FRAMEWORK_DOMAINS.map(
    (d) =>
      `  + ${d.competencyCode} (${d.code} - ${d.title}): ${d.topics.map((t) => `${t.code} ${t.title}`).join('; ')}`
  ).join('\n');

  const gradeSpecificBlock =
    g === 10
      ? `- Chỉ báo YCCĐ chuẩn Lớp 10 trong Quyết định 2422/QĐ-BGDĐT (chỉ dùng đúng các mã đã liệt kê dưới đây nếu đưa vào mục tiêu/hoạt động):
${AI_GRADE_10_INDICATORS.map((item) => `  * ${item.code}: ${item.description}`).join('\n')}`
      : `- Quy ước mã hoá theo Quyết định 2422/QĐ-BGDĐT là [Lớp].[Mã chủ đề].[Số thứ tự] (thuộc 4 miền NLa/A, NLb/B, NLc/C, NLd/D). Do hệ thống không đính kèm bảng mã chi tiết riêng cho Lớp ${grade}, với Lớp ${grade} hãy mô tả rõ tên miền năng lực (${AI_FRAMEWORK_DOMAINS.map((d) => `${d.competencyCode}: ${d.title}`).join(', ')}) kèm hành vi quan sát được và đánh dấu needsConfirmation = true nếu cần đối chiếu mã chi tiết, TUYỆT ĐỐI không tự bịa mã số con chưa được cung cấp.`;

  return `KHUNG NỘI DUNG GIÁO DỤC TRÍ TUỆ NHÂN TẠO BẮT BUỘC — THEO ${QD_2422_INFO.documentNumber.toUpperCase()} (${QD_2422_INFO.issuedDate}, Bộ GD&ĐT):
- 4 Mạch kiến thức / Miền năng lực đặc thù:
${domainsText}
${gradeSpecificBlock}
- Nguyên tắc sư phạm & đánh giá theo Quyết định 2422/QĐ-BGDĐT:
  * ${isInformatics ? 'Liên thông chặt chẽ với Chương trình GDPT môn Tin học; đưa các mục tiêu năng lực AI (ví dụ "Năng lực Sử dụng Trí tuệ nhân tạo" với mã frameworkCode tương ứng như 10.C3.1 hoặc 6.2.NC1a) trực tiếp vào nhóm "nang_luc_dac_thu" trong phần I. Mục tiêu bài học, lồng ghép tự nhiên không gây quá tải.' : 'Lồng ghép tự nhiên vào nhóm "nang_luc_dac_thu" và hoạt động môn học, không làm thay đổi hay gia tăng quá tải YCCĐ gốc của môn học.'}
  * Ở cấp THPT, ưu tiên phương pháp nghiên cứu trường hợp, phân tích dữ liệu/tình huống, đánh giá rủi ro và sự đánh đổi, tranh biện hoặc phản biện kết quả AI.
  * Đánh giá quá trình thông qua minh chứng (phiếu học tập, bảng kiểm chứng thông tin, sản phẩm số và việc khai báo minh bạch phần có sử dụng AI); KHÔNG tách bài kiểm tra hay đầu điểm riêng cho nội dung giáo dục AI.
  * Bắt buộc có phương án thực hiện không phụ thuộc tài khoản cá nhân học sinh hay dịch vụ trả phí (ví dụ trình chiếu qua máy tính giáo viên, dùng bản minh họa ngoại tuyến hoặc bảng kiểm chứng trên giấy).
  * Công cụ dự kiến: ${toolName || 'Trợ lý AI trình chiếu trên máy giáo viên (không yêu cầu HS tự lập tài khoản)'} | Thiết bị: ${deviceContext || 'Máy tính giáo viên + máy chiếu lớp học'} | Quy tắc kiểm chứng: ${verificationRule || 'Học sinh đối chiếu SGK, tự giải thích kết quả, khai báo minh bạch phần dùng AI và tuyệt đối không nhập dữ liệu cá nhân.'}
  * Khi nhắc tới văn bản khung giáo dục AI trong nội dung kế hoạch bài dạy, viết gọn là (QĐ 2422) — KHÔNG ghi dài (QĐ 2422/QĐ-BGDĐT).`;
}
