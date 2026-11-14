import {
  AppSettings,
  AppSettingsSchema,
  EducationLevel,
  LessonInput,
  LessonInputSchema,
  LessonPlan,
  LessonTemplate,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  TeacherProfile,
  TeacherProfileSchema,
} from '../types/lesson';

export const BUILT_IN_TEMPLATES: LessonTemplate[] = [
  {
    id: 'tpl-tieu-hoc-2-cot',
    name: 'Kế hoạch bài dạy Tiểu học (Bảng 2 cột GV - HS)',
    level: 'tieu_hoc',
    structureType: 'tieu_hoc_2_cot',
    description:
      'Mẫu tham khảo trình bày rõ tiến trình theo hai cột song song Hoạt động của giáo viên và Hoạt động của học sinh.',
    isBuiltIn: true,
    referenceNote: 'Mẫu tham khảo thực hành Tiểu học (kiểm tra đối chiếu quy định tổ chuyên môn trước khi dùng).',
    sectionsPreview: [
      'Thông tin chung & Thời lượng',
      'I. Mục tiêu bài học (1.1 Kiến thức, 1.2 Năng lực, 1.3 Phẩm chất)',
      'II. Đồ dùng dạy học',
      'III. Các hoạt động dạy học chủ yếu (Bảng 2 cột GV / HS)',
      'IV. Điều chỉnh sau bài dạy',
      'Phụ lục: Phiếu học tập, Câu hỏi, Đáp án',
    ],
    defaultSequenceMode: 'chia_tung_tiet',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-thcs-thpt-standard',
    name: 'Kế hoạch bài dạy THCS / THPT (Chuỗi hoạt động 4 bước)',
    level: 'thcs',
    structureType: 'thcs_thpt_tien_trinh',
    description:
      'Cấu trúc phổ biến cho THCS/THPT với Mục tiêu bài học (1.1 Kiến thức, 1.2 Năng lực, 1.3 Phẩm chất) và chuỗi Chuyển giao — Thực hiện — Báo cáo — Kết luận.',
    isBuiltIn: true,
    referenceNote: 'Mẫu tham khảo thực hành THCS/THPT.',
    sectionsPreview: [
      'Thông tin chung & Thời lượng',
      'I. Mục tiêu bài học (1.1 Kiến thức, 1.2 Năng lực, 1.3 Phẩm chất)',
      'II. Thiết bị dạy học và học liệu',
      'III. Tiến trình dạy học (4 bước tổ chức thực hiện)',
      'IV. Điều chỉnh sau bài dạy',
      'Phụ lục: Phiếu, Câu hỏi, Đáp án, Rubric, Đối chiếu MT',
    ],
    defaultSequenceMode: 'chia_tung_tiet',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-tich-hop-stem',
    name: 'Kế hoạch bài học STEM / STEAM',
    level: 'thcs',
    structureType: 'tich_hop_stem',
    description:
      'Nhấn mạnh quy trình giải quyết vấn đề: Xác định vấn đề, Đề xuất giải pháp, Chế tạo thử nghiệm, Chia sẻ & Cải tiến.',
    isBuiltIn: true,
    referenceNote: 'Mẫu tham khảo bài học STEM thực hành.',
    sectionsPreview: [
      'Thông tin dự án & Bối cảnh vật liệu',
      'I. Mục tiêu tích hợp đa môn',
      'II. Thiết bị, vật liệu & Giới hạn chi phí',
      'III. Tiến trình thiết kế kỹ thuật 5 bước',
      'IV. Điều chỉnh sau bài dạy',
      'Phụ lục: Phiếu thiết kế, Rubric sản phẩm STEM',
    ],
    defaultSequenceMode: 'xuyen_suot',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-on-tap-chuyen-sau',
    name: 'Kế hoạch tiết Ôn tập / Luyện tập chuyên sâu',
    level: 'thpt',
    structureType: 'on_tap_chuyen_sau',
    description:
      'Ưu tiên hệ thống hóa kiến thức trọng tâm, phân tích lỗi sai thường gặp, luyện tập phân hóa và tự đánh giá.',
    isBuiltIn: true,
    referenceNote: 'Mẫu tham khảo cho tiết ôn tập cuối chương / kiểm tra.',
    sectionsPreview: [
      'Thông tin & Phạm vi ôn tập',
      'I. Mục tiêu củng cố & Khắc phục lỗ hổng',
      'II. Học liệu & Hệ thống bài tập',
      'III. Tiến trình: Hệ thống hóa -> Sửa lỗi -> Luyện tập -> Tự đánh giá',
      'IV. Điều chỉnh sau bài dạy',
      'Phụ lục: Hệ thống câu hỏi, Đáp án chi tiết, Bảng tự đánh giá',
    ],
    defaultSequenceMode: 'chia_tung_tiet',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  tieu_hoc: 'Tiểu học',
  thcs: 'THCS',
  thpt: 'THPT',
  gdtx: 'GDTX',
};

export const BOOK_SERIES_OPTIONS = [
  'Kết nối tri thức với cuộc sống',
  'Chân trời sáng tạo',
  'Cánh diều',
  'Cùng học để phát triển năng lực',
  'Tài liệu địa phương / Tự biên soạn',
];

export function createDefaultProfile(): TeacherProfile {
  return TeacherProfileSchema.parse({});
}

export function createDefaultSettings(): AppSettings {
  return AppSettingsSchema.parse({});
}

export function createInitialLessonInput(profile?: TeacherProfile): LessonInput {
  const p = profile ?? createDefaultProfile();
  const level = p.defaultLevel;
  const minutes = p.defaultMinutesByLevel[level] ?? 45;
  const fallbackGradeByLevel =
    level === 'tieu_hoc' ? '4' : level === 'thcs' ? '8' : '10';
  const defaultGrade = p.defaultGrade.trim() || fallbackGradeByLevel;
  const defaultSubject = p.defaultSubject.trim() || p.favoriteSubjects[0] || 'Tin học';
  const defaultTpl =
    level === 'tieu_hoc' ? 'tpl-tieu-hoc-2-cot' : 'tpl-thcs-thpt-standard';

  return LessonInputSchema.parse({
    schoolName: p.schoolName,
    departmentName: p.departmentName,
    teacherName: p.teacherName,
    prepareDate: new Date().toISOString().slice(0, 10),
    teachDate: '',
    level,
    grade: defaultGrade,
    subject: defaultSubject,
    bookSeries: p.favoriteBookSeries || 'Kết nối tri thức với cuộc sống',
    lessonTitle: '',
    periodsCount: 1,
    minutesPerPeriod: minutes,
    templateId: defaultTpl,
    classSize: p.defaultClassSize ?? 44,
    studentCharacteristics: p.defaultStudentCharacteristics,
    equipmentAndMaterials: p.defaultEquipmentAndMaterials,
  });
}

export function createSampleLessonInput(): LessonInput {
  return LessonInputSchema.parse({
    schoolName: 'Trường THCS Minh Hòa (Minh họa)',
    departmentName: 'Tổ Toán - Tin',
    teacherName: 'Cô Nguyễn Thu Hà',
    prepareDate: '2026-11-10',
    teachDate: '2026-11-16',
    level: 'thcs',
    grade: '8',
    subject: 'Toán',
    bookSeries: 'Kết nối tri thức với cuộc sống',
    bookEdition: 'Tập 1',
    lessonTitle: 'Định lí Pythagore trong tam giác vuông (Bài minh họa)',
    lessonType: 'bai_moi',
    periodsCount: 1,
    minutesPerPeriod: 45,
    sequenceMode: 'chia_tung_tiet',
    templateId: 'tpl-thcs-thpt-standard',
    outputLanguage: 'Tiếng Việt',
    learningOutcomesInput:
      'Giải thích được định lí Pythagore; tính được độ dài cạnh trong tam giác vuông khi biết hai cạnh còn lại.',
    coreContent:
      'Quan hệ giữa bình phương cạnh huyền và tổng bình phương hai cạnh góc vuông; vận dụng tính khoảng cách thực tế.',
    priorKnowledge: 'Tam giác vuông, khái niệm cạnh huyền, cạnh góc vuông, căn bậc hai số học.',
    excludedScope: 'Chưa mở rộng sang định lí Pythagore đảo ở tiết này.',
    teacherCustomRequests: 'Ưu tiên hoạt động trực quan trên giấy kẻ ô vuông trước khi phát biểu định lí.',
    classSize: 38,
    studentCharacteristics: 'Học sinh khá năng động, một số em còn nhầm lẫn cạnh huyền khi tam giác xoay hướng.',
    commonDifficulties: 'Quên lấy căn bậc hai ở bước cuối hoặc xác định sai cạnh huyền.',
    inclusiveContextNotes: 'Có 1 học sinh tiếp thu chậm cần phiếu gợi ý từng bước.',
    equipmentAndMaterials: 'Thước thẳng có chia vạch, ê-ke, giấy kẻ ô vuông A4, máy chiếu.',
    internetAccess: 'han_che',
    studentDevices: 'Không dùng thiết bị cá nhân',
    classroomSpace: 'Phòng học chuẩn 40 chỗ, bàn ghép đôi thuận tiện thảo luận nhóm',
    localContext: '',
    documents: [],
    pedagogicalOptions: {
      activeMethods: true,
      activeMethodNames: 'Khám phá trực quan, Thảo luận nhóm cặp đôi',
      games: false,
      gameNotes: '',
      individualWorksheet: true,
      groupWorksheet: false,
      reviewQuestions: true,
      questionFormat: 'Trắc nghiệm + Tự luận ngắn',
      questionCount: 3,
      rubric: true,
      stem: false,
      stemMaterials: '',
      stemBudgetLimit: '',
      stemProduct: '',
      digitalCompetence: false,
      digitalCompetenceNotes: '',
      aiUsage: false,
      aiToolName: '',
      aiDeviceContext: '',
      aiVerificationRule: '',
      cyberSafety: false,
      gdqpan: false,
      ethicsLifestyle: false,
      environmentalProtection: false,
      inclusiveSupport: true,
      inclusiveNeed: 'Học sinh tiếp thu chậm cần hướng dẫn trực quan từng bước.',
      inclusiveAdjustment: 'Bổ sung câu hỏi mồi và ví dụ đã điền sẵn bước 1 trên phiếu.',
      otherIntegration: false,
      otherIntegrationNotes: '',
    },
  });
}

export function createSampleLessonPlan(): LessonPlan {
  const input = createSampleLessonInput();
  const now = new Date().toISOString();
  return {
    id: `sample-plan-${Date.now()}`,
    title: 'Định lí Pythagore trong tam giác vuông (Bài minh họa)',
    status: 'nhap',
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    promptVersion: PROMPT_VERSION,
    templateType: 'thcs_thpt_tien_trinh',
    tags: ['Minh họa', 'Toán', 'Lớp 8'],
    isSample: true,
    inputSnapshot: input,
    assumptions: [
      'Đây là kế hoạch minh họa để thầy/cô trải nghiệm đầy đủ tính năng chỉnh sửa, kiểm tra chất lượng và xuất Word.',
      'Chưa đính kèm trang SGK cụ thể; thầy/cô cần đối chiếu số bài tập với sách đang sử dụng.',
    ],
    objectives: [
      {
        id: 'obj-1',
        code: 'MT1',
        category: 'kien_thuc',
        title: '',
        frameworkCode: '',
        description:
          'Phát biểu được định lí Pythagore về mối liên hệ giữa bình phương cạnh huyền và tổng bình phương độ dài hai cạnh góc vuông trong tam giác vuông.',
        sourceType: 'trich_nguon',
        needsConfirmation: false,
        sourceRef: 'Yêu cầu cần đạt giáo viên nhập',
      },
      {
        id: 'obj-2',
        code: 'MT2',
        category: 'kien_thuc',
        title: '',
        frameworkCode: '',
        description:
          'Nhận biết được cách tính độ dài một cạnh của tam giác vuông khi biết độ dài hai cạnh còn lại và vận dụng giải các bài toán thực tiễn đơn giản.',
        sourceType: 'trich_nguon',
        needsConfirmation: false,
        sourceRef: 'Yêu cầu cần đạt giáo viên nhập',
      },
      {
        id: 'obj-3',
        code: 'MT3',
        category: 'nang_luc_dac_thu',
        title: 'Năng lực tư duy, lập luận và giải quyết vấn đề toán học',
        frameworkCode: '',
        description:
          'Học sinh đo đạc trực quan trên giấy kẻ ô vuông, kiểm chứng hệ thức Pythagore, giải thích cách xác định cạnh huyền và trình bày lời giải chặt chẽ.',
        sourceType: 'trich_nguon',
        needsConfirmation: false,
        sourceRef: 'Yêu cầu cần đạt giáo viên nhập',
      },
      {
        id: 'obj-4',
        code: 'MT4',
        category: 'nang_luc_chung',
        title: 'Năng lực tự chủ và tự học',
        frameworkCode: '',
        description:
          'Chủ động hoàn thành phiếu học tập cá nhân, tự kiểm tra bước lấy căn bậc hai và đối chiếu đơn vị độ dài.',
        sourceType: 'de_xuat',
        needsConfirmation: false,
        sourceRef: '',
      },
      {
        id: 'obj-5',
        code: 'MT5',
        category: 'nang_luc_chung',
        title: 'Năng lực giao tiếp và hợp tác',
        frameworkCode: '',
        description:
          'Phối hợp cặp đôi khi vẽ, đo cạnh huyền, kiểm tra chéo và trình bày kết quả thảo luận rõ ràng.',
        sourceType: 'de_xuat',
        needsConfirmation: true,
        sourceRef: 'Đề xuất hành vi quan sát được (cần đối chiếu khung năng lực của tổ)',
      },
      {
        id: 'obj-6',
        code: 'MT6',
        category: 'nang_luc_chung',
        title: 'Năng lực giải quyết vấn đề và sáng tạo',
        frameworkCode: '',
        description:
          'Vận dụng định lí Pythagore giải quyết tình huống chiếc thang dựa tường và ước lượng độ dài thực tế.',
        sourceType: 'de_xuat',
        needsConfirmation: false,
        sourceRef: '',
      },
      {
        id: 'obj-7',
        code: 'MT7',
        category: 'pham_chat',
        title: 'Trung thực & Trách nhiệm',
        frameworkCode: '',
        description:
          'Ghi nhận trung thực số đo thực hành và hoàn thành đầy đủ phần việc khi phối hợp cùng bạn.',
        sourceType: 'de_xuat',
        needsConfirmation: false,
        sourceRef: '',
      },
      {
        id: 'obj-8',
        code: 'MT8',
        category: 'pham_chat',
        title: 'Chăm chỉ & Cẩn thận',
        frameworkCode: '',
        description:
          'Cẩn thận khi đặt thước đo, tính bình phương, lấy căn bậc hai và giữ gìn dụng cụ học tập.',
        sourceType: 'de_xuat',
        needsConfirmation: false,
        sourceRef: '',
      },
    ],
    resources: [
      {
        id: 'res-1',
        actor: 'gv',
        item: 'Giấy kẻ ô vuông khổ lớn, ê-ke bảng, 40 bản Phiếu học tập số 1 (có bản gợi ý cho HS cần hỗ trợ).',
        usedInActivities: 'Hoạt động 1, Hoạt động 2, Hoạt động 3',
      },
      {
        id: 'res-2',
        actor: 'hs',
        item: 'Thước thẳng có vạch chia cm, ê-ke, bút chì, vở ghi.',
        usedInActivities: 'Tất cả các hoạt động',
      },
    ],
    sessions: [
      {
        id: 'sess-1',
        sessionNumber: 1,
        title: 'Tiết 1: Khám phá và vận dụng định lí Pythagore',
        durationMinutes: 45,
        overviewNote: 'Tiến trình 4 hoạt động (5 + 15 + 15 + 10 = 45 phút).',
      },
    ],
    activities: [
      {
        id: 'act-1',
        sessionNumber: 1,
        order: 1,
        phase: 'khoi_dong',
        title: 'Hoạt động 1: Khởi động — Bài toán chiếc thang dựa tường',
        durationMinutes: 5,
        objectiveIds: ['obj-1'],
        taskContent:
          'Quan sát tình huống: Một chiếc thang dài 5 m đặt cách chân tường 3 m. Làm thế nào biết đỉnh thang chạm tường ở độ cao bao nhiêu mét mà không cần trèo lên đo trực tiếp?',
        expectedProduct: 'Câu trả lời dự đoán ban đầu của học sinh về mối liên hệ ba cạnh tam giác vuông.',
        steps: {
          transfer: 'GV trình chiếu/vẽ hình chiếc thang dựa vào bức tường vuông góc mặt đất và nêu câu hỏi mở.',
          execute: 'HS suy nghĩ cá nhân trong 1 phút, phác họa tam giác vuông vào nháp.',
          report: 'GV gọi 2 HS nêu dự đoán và xác định đâu là cạnh huyền trong hình vẽ.',
          conclude: 'GV ghi nhận dự đoán và đặt vấn đề dẫn vào bài Định lí Pythagore.',
        },
        teacherPrompts:
          'Trong tam giác tạo bởi thang, tường và mặt đất, góc nào là góc vuông? Cạnh nào đối diện với góc vuông đó?',
        studentActions: 'Nhận diện góc vuông, cạnh huyền và nêu phỏng đoán ban đầu.',
        groupOrganization: 'Làm việc cá nhân (5 phút cả trao đổi chung).',
        assessmentCriteria: 'Chỉ đúng góc vuông và cạnh huyền (chiếc thang).',
        commonMistakesAndSupport: 'HS gọi nhầm chiều cao tường là cạnh huyền -> GV dùng ê-ke chỉ cạnh đối diện góc vuông.',
        extensionTask: '',
        contingencyPlan: 'Nếu mất điện không dùng máy chiếu, GV vẽ trực tiếp hình minh họa lên bảng.',
        linkedWorksheetIds: [],
      },
      {
        id: 'act-2',
        sessionNumber: 1,
        order: 2,
        phase: 'hinh_thanh_kien_thuc',
        title: 'Hoạt động 2: Khám phá — Đo đạc và phát hiện định lí Pythagore',
        durationMinutes: 15,
        objectiveIds: ['obj-1', 'obj-3', 'obj-5', 'obj-7', 'obj-8'],
        taskContent:
          'Thực hiện Mục 1 trong Phiếu học tập số 1: Trên giấy kẻ ô vuông, vẽ 2 tam giác vuông có hai cạnh góc vuông lần lượt là (3 cm, 4 cm) và (6 cm, 8 cm). Đo cạnh huyền, tính bình phương từng cạnh rồi so sánh c² với a² + b².',
        expectedProduct: 'Bảng số liệu hoàn chỉnh và phát biểu bằng lời mối quan hệ c² = a² + b².',
        steps: {
          transfer: 'GV phát Phiếu học tập số 1 (kèm phiếu có khung gợi ý sẵn cho HS cần hỗ trợ hòa nhập), hướng dẫn cách đo và điền bảng trong 7 phút.',
          execute: 'HS làm việc theo cặp đôi: một em vẽ và đo, một em tính bình phương và kiểm tra lại.',
          report: '2 cặp đôi đọc bảng kết quả; 1 cặp nhận xét mối quan hệ tìm được.',
          conclude: 'GV chuẩn hóa phát biểu Định lí Pythagore: Trong một tam giác vuông, bình phương độ dài của cạnh huyền bằng tổng bình phương độ dài hai cạnh góc vuông.',
        },
        teacherPrompts:
          'Với hai tam giác vừa vẽ, tổng a² + b² bằng bao nhiêu và c² bằng bao nhiêu? Khi tam giác xoay nghiêng góc vuông lên trên, cạnh huyền nằm ở đâu?',
        studentActions: 'Đo độ dài cạnh huyền (5 cm và 10 cm), tính toán trung thực và phát biểu nhận xét.',
        groupOrganization: 'Cặp đôi cùng bàn (2 phút phát phiếu/ổn định + 7 phút thực hành + 6 phút báo cáo, chốt).',
        assessmentCriteria: 'Điền đúng bảng số liệu và viết đúng hệ thức c² = a² + b².',
        commonMistakesAndSupport: 'Đặt lệch vạch 0 của thước hoặc nhầm thứ tự cạnh huyền -> GV đi từng bàn quan sát nhanh và hướng dẫn.',
        extensionTask: 'Thử kiểm tra thêm với tam giác vuông có cạnh góc vuông 5 cm và 12 cm.',
        contingencyPlan: 'Chuẩn bị sẵn 1 tờ giấy kẻ ô mẫu trên bảng nếu HS quên mang thước kẻ.',
        linkedWorksheetIds: ['ws-1'],
      },
      {
        id: 'act-3',
        sessionNumber: 1,
        order: 3,
        phase: 'luyen_tap',
        title: 'Hoạt động 3: Luyện tập tính độ dài cạnh tam giác vuông',
        durationMinutes: 15,
        objectiveIds: ['obj-2', 'obj-3', 'obj-4', 'obj-5'],
        taskContent:
          'Giải 2 bài tập ở Mục 2 Phiếu học tập số 1: (a) Tìm cạnh huyền khi biết hai cạnh góc vuông 5 cm và 12 cm; (b) Tìm một cạnh góc vuông khi biết cạnh huyền 10 cm và cạnh góc vuông kia 6 cm.',
        expectedProduct: 'Lời giải trình bày đầy đủ 3 bước: nêu tam giác vuông, viết hệ thức Pythagore, tính cạnh và ghi đơn vị.',
        steps: {
          transfer: 'GV giao nhiệm vụ Mục 2, làm mẫu nhanh bước xác định cạnh huyền và nhấn mạnh bước lấy căn bậc hai.',
          execute: 'HS tự giải cá nhân 5 phút, sau đó đổi bài cho bạn cùng bàn kiểm tra chéo 3 phút.',
          report: '2 HS lên bảng trình bày hai câu (a) và (b). Lớp nhận xét phần đổi dấu và đơn vị.',
          conclude: 'GV chốt quy trình 3 bước tính cạnh và lưu ý phân biệt trường hợp tìm cạnh huyền (cộng) với tìm cạnh góc vuông (trừ).',
        },
        teacherPrompts:
          'Ở câu (b), 10 cm là cạnh nào? Ta viết hệ thức bắt đầu từ bình phương cạnh nào?',
        studentActions: 'Viết lời giải vào phiếu, kiểm tra chéo lỗi quên căn bậc hai của bạn.',
        groupOrganization: 'Cá nhân kết hợp kiểm tra chéo cặp đôi.',
        assessmentCriteria: 'Tính đúng 13 cm (câu a) và 8 cm (câu b), không quên dấu căn bậc hai.',
        commonMistakesAndSupport: 'Quên lấy căn bậc hai (ghi x = 64 cm thay vì 8 cm) hoặc cộng thay vì trừ khi tìm cạnh góc vuông. Hỗ trợ HS hòa nhập bằng mẫu điền khuyết.',
        extensionTask: 'Tìm độ dài đường chéo màn hình ti vi hình chữ nhật kích thước 60 cm × 80 cm.',
        contingencyPlan: 'Nếu lớp làm nhanh hơn dự kiến, bổ sung bài tập tam giác vuông xoay ngược đỉnh.',
        linkedWorksheetIds: ['ws-1'],
      },
      {
        id: 'act-4',
        sessionNumber: 1,
        order: 4,
        phase: 'van_dung',
        title: 'Hoạt động 4: Vận dụng giải bài toán chiếc thang và Củng cố nhanh',
        durationMinutes: 10,
        objectiveIds: ['obj-1', 'obj-2', 'obj-3', 'obj-6'],
        taskContent:
          'Quay lại bài toán chiếc thang dài 5 m đặt cách tường 3 m để tính chiều cao đạt được. Sau đó trả lời nhanh 3 câu hỏi củng cố cuối tiết.',
        expectedProduct: 'Lời giải bài toán chiếc thang (4 m) và phiếu trả lời 3 câu hỏi củng cố.',
        steps: {
          transfer: 'GV yêu cầu HS giải nhanh bài toán đầu tiết trong 3 phút, sau đó tổ chức trả lời 3 câu hỏi củng cố.',
          execute: 'HS tính nhanh và giơ thẻ/chọn đáp án trắc nghiệm.',
          report: '1 HS giải thích kết quả 4 m; cả lớp đối chiếu đáp án 3 câu hỏi.',
          conclude: 'GV tổng kết trọng tâm bài học và giao nhiệm vụ về nhà.',
        },
        teacherPrompts:
          'Kết quả thực tế này có khớp với dự đoán đầu giờ của các em không?',
        studentActions: 'Tính h = √(5² - 3²) = 4 m và hoàn thành phần củng cố.',
        groupOrganization: 'Cả lớp, trả lời cá nhân.',
        assessmentCriteria: 'Giải đúng bài toán chiếc thang và đạt ít nhất 2/3 câu củng cố.',
        commonMistakesAndSupport: 'Cộng 5² + 3² -> nhắc lại thang dài 5 m là cạnh huyền.',
        extensionTask: '',
        contingencyPlan: 'Nếu còn ít thời gian, giao câu tự luận số 3 về nhà.',
        linkedWorksheetIds: [],
      },
    ],
    worksheets: [
      {
        id: 'ws-1',
        title: 'Phiếu học tập số 1: Khám phá và vận dụng Định lí Pythagore',
        mode: 'ca_nhan',
        linkedActivityId: 'act-2',
        instructions: 'Làm việc theo hướng dẫn của giáo viên. Với bản hỗ trợ, điền vào các ô đánh dấu (...).',
        tasks: [
          'Mục 1 (Cặp đôi): Đo cạnh huyền c của hai tam giác vuông có cạnh góc vuông (3 cm, 4 cm) và (6 cm, 8 cm). Tính a², b², a² + b² và c².',
          'Mục 2a: Cho tam giác ABC vuông tại A, AB = 5 cm, AC = 12 cm. Tính BC.',
          'Mục 2b: Cho tam giác DEF vuông tại D, EF = 10 cm, DE = 6 cm. Tính DF. (Gợi ý bước 1: Xác định EF là cạnh huyền nên EF² = DE² + DF²).',
        ],
        answerGuide: 'Mục 1: c = 5 cm (25 = 9 + 16), c = 10 cm (100 = 36 + 64). Mục 2a: BC = 13 cm. Mục 2b: DF = 8 cm.',
      },
    ],
    questions: [
      {
        id: 'q-1',
        type: 'trac_nghiem',
        prompt: 'Cho tam giác MNP vuông tại M. Hệ thức nào sau đây đúng theo định lí Pythagore?',
        options: ['A. MN² = MP² + NP²', 'B. NP² = MN² + MP²', 'C. MP² = MN² + NP²', 'D. NP = MN + MP'],
        correctAnswerOrGuide: 'B. NP² = MN² + MP²',
        linkedObjectiveIds: ['obj-1'],
      },
      {
        id: 'q-2',
        type: 'trac_nghiem',
        prompt: 'Một tam giác vuông có độ dài hai cạnh góc vuông là 9 cm và 12 cm. Độ dài cạnh huyền là:',
        options: ['A. 15 cm', 'B. 21 cm', 'C. 225 cm', 'D. 14 cm'],
        correctAnswerOrGuide: 'A. 15 cm',
        linkedObjectiveIds: ['obj-2'],
      },
      {
        id: 'q-3',
        type: 'tu_luan',
        prompt: 'Giải thích vì sao khi tìm độ dài một cạnh góc vuông ta lấy bình phương cạnh huyền trừ bình phương cạnh góc vuông còn lại.',
        options: [],
        correctAnswerOrGuide: 'Từ hệ thức c² = a² + b², suy ra a² = c² - b², rồi lấy căn bậc hai số học vì độ dài cạnh dương.',
        linkedObjectiveIds: ['obj-1', 'obj-2'],
      },
    ],
    answerKeys: [
      { id: 'ak-1', targetLabel: 'Câu 1 (Trắc nghiệm)', answer: 'B. NP² = MN² + MP²', explanation: 'Tam giác vuông tại M nên NP là cạnh huyền.' },
      { id: 'ak-2', targetLabel: 'Câu 2 (Trắc nghiệm)', answer: 'A. 15 cm', explanation: '9² + 12² = 81 + 144 = 225 = 15².' },
      { id: 'ak-3', targetLabel: 'Câu 3 (Tự luận)', answer: 'Biến đổi từ c² = a² + b²', explanation: 'Cần nêu được chuyển vế và điều kiện độ dài > 0.' },
    ],
    rubrics: [
      {
        id: 'rub-1',
        title: 'Bảng kiểm & Rubric đánh giá Phiếu học tập và hợp tác cặp đôi',
        target: 'Phiếu học tập số 1 & Thảo luận cặp đôi',
        criteria: [
          {
            id: 'rc-1',
            criterion: 'Đo đạc chính xác và phát hiện được hệ thức Pythagore',
            weightPercent: 40,
            levelGood: 'Đo chuẩn xác, tính đúng cả 2 trường hợp và phát biểu đúng hệ thức.',
            levelPass: 'Đo lệch nhẹ ≤ 1mm nhưng nhận ra xu hướng c² ≈ a² + b².',
            levelNeedWork: 'Chưa hoàn thành bảng đo hoặc tính sai bình phương.',
          },
          {
            id: 'rc-2',
            criterion: 'Vận dụng tính đúng độ dài cạnh ở Mục 2',
            weightPercent: 40,
            levelGood: 'Giải đúng cả 2 câu, ghi rõ lý do vuông tại đâu và đủ đơn vị.',
            levelPass: 'Giải đúng 1 câu hoặc quên ghi đơn vị.',
            levelNeedWork: 'Xác định nhầm cạnh huyền hoặc quên lấy căn bậc hai.',
          },
          {
            id: 'rc-3',
            criterion: 'Hợp tác và kiểm tra chéo với bạn',
            weightPercent: 20,
            levelGood: 'Trao đổi tích cực, chỉ ra được lỗi sai hoặc điểm tốt trong bài bạn.',
            levelPass: 'Có trao đổi với bạn nhưng nhận xét còn chung chung.',
            levelNeedWork: 'Làm việc rời rạc, chưa trao đổi với bạn.',
          },
        ],
      },
    ],
    teacherAiPrompts: [],
    homework:
      '1. Hoàn thành các bài tập tương tự trong SGK Toán 8 (Tập 1).\n2. Tự tìm 1 vật dụng có dạng tam giác vuông ở nhà, đo hai cạnh góc vuông và dùng định lí Pythagore ước lượng cạnh huyền rồi đo kiểm chứng.',
    objectiveEvidenceMap: [
      {
        objectiveId: 'obj-1',
        objectiveCode: 'MT1',
        activityIds: ['act-1', 'act-2', 'act-4'],
        productEvidence: 'Mục 1 Phiếu học tập số 1 & Câu hỏi củng cố 1',
        assessmentMethod: 'Quan sát và chấm nhanh câu trắc nghiệm',
      },
      {
        objectiveId: 'obj-2',
        objectiveCode: 'MT2',
        activityIds: ['act-3', 'act-4'],
        productEvidence: 'Mục 2 Phiếu học tập số 1 & Câu hỏi củng cố 2',
        assessmentMethod: 'Kiểm tra chéo cặp đôi & Chấm nhanh câu trắc nghiệm',
      },
      {
        objectiveId: 'obj-3',
        objectiveCode: 'MT3',
        activityIds: ['act-2', 'act-3', 'act-4'],
        productEvidence: 'Lời giải Phiếu học tập số 1 & Bài toán chiếc thang',
        assessmentMethod: 'Chấm bài trên bảng & Rubric',
      },
      {
        objectiveId: 'obj-4',
        objectiveCode: 'MT4',
        activityIds: ['act-3'],
        productEvidence: 'Bài làm cá nhân hoàn chỉnh trên phiếu',
        assessmentMethod: 'Quan sát & Tự kiểm tra bước căn bậc hai',
      },
      {
        objectiveId: 'obj-5',
        objectiveCode: 'MT5',
        activityIds: ['act-2', 'act-3'],
        productEvidence: 'Quá trình đo đạc & nhận xét chéo bài bạn',
        assessmentMethod: 'Rubric đánh giá cặp đôi',
      },
      {
        objectiveId: 'obj-6',
        objectiveCode: 'MT6',
        activityIds: ['act-4'],
        productEvidence: 'Lời giải bài toán chiếc thang dựa tường',
        assessmentMethod: 'Hỏi đáp & Nhận xét kết quả thực tế',
      },
      {
        objectiveId: 'obj-7',
        objectiveCode: 'MT7',
        activityIds: ['act-2'],
        productEvidence: 'Số đo ghi nhận trung thực trong bảng thực hành',
        assessmentMethod: 'Quan sát trực tiếp của GV',
      },
      {
        objectiveId: 'obj-8',
        objectiveCode: 'MT8',
        activityIds: ['act-2'],
        productEvidence: 'Hình vẽ chuẩn xác trên giấy kẻ ô và bảo quản thước, ê-ke',
        assessmentMethod: 'Quan sát trực tiếp của GV',
      },
    ],
    sourceReferences: [
      {
        documentName: 'Thông tin nhập tay của giáo viên (Bài minh họa)',
        pageOrSection: 'Dữ liệu khởi tạo',
        excerpt: 'Yêu cầu cần đạt và bối cảnh lớp 8 minh họa.',
        mappedTo: 'Mục tiêu 1.1 Kiến thức, 1.2a Năng lực đặc thù, Hoạt động 2 & 3',
      },
    ],
    itemsNeedingConfirmation: [
      'Đối chiếu số hiệu bài tập cụ thể trong SGK Toán 8 Kết nối tri thức đang giảng dạy trước khi giao về nhà.',
      'Kiểm tra biểu hiện Năng lực giao tiếp và hợp tác theo khung kế hoạch giáo dục của Tổ Toán - Tin.',
    ],
    postLessonReflection: '',
  };
}
