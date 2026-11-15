import { z } from 'zod';

export const SCHEMA_VERSION = 1;
export const PROMPT_VERSION = '2026.1.0';

export type EducationLevel = 'tieu_hoc' | 'thcs' | 'thpt' | 'gdtx';
export type LessonType = 'bai_moi' | 'luyen_tap' | 'thuc_hanh' | 'on_tap' | 'du_an';
export type SequenceMode = 'chia_tung_tiet' | 'xuyen_suot';
export type PlanStatus = 'nhap' | 'hoan_thien' | 'luu_tru' | 'thung_rac';
export type TemplateStructureType =
  | 'tieu_hoc_2_cot'
  | 'thcs_thpt_tien_trinh'
  | 'thcs_thpt_cv5512'
  | 'tich_hop_stem'
  | 'on_tap_chuyen_sau';

export type SourceDocRole =
  | 'noi_dung_bai_hoc'
  | 'yeu_cau_can_dat'
  | 'mau_trinh_bay'
  | 'ma_nang_luc';

export type ExportScope =
  | 'all'
  | 'main_only'
  | 'worksheets_only'
  | 'teacher_guide_only';

export const TeacherProfileSchema = z.object({
  schoolName: z.string().default('Trường THPT Đắk Song'),
  departmentName: z.string().default(''),
  teacherName: z.string().default('Trần Công Toàn'),
  defaultLevel: z.enum(['tieu_hoc', 'thcs', 'thpt', 'gdtx']).default('thpt'),
  defaultGrade: z.string().default('10'),
  defaultSubject: z.string().default('Tin học'),
  defaultClassSize: z.number().int().min(1).max(120).default(44),
  defaultStudentCharacteristics: z
    .string()
    .default(
      'Lớp có 44 học sinh; khoảng 2/3 số học sinh có trình độ từ Trung bình trở lên, 1/3 còn lại cần hướng dẫn từng bước.'
    ),
  defaultEquipmentAndMaterials: z
    .string()
    .default('Máy tính giáo viên, máy chiếu, bảng, phấn/bút, SGK Tin học 10'),
  defaultMinutesByLevel: z
    .object({
      tieu_hoc: z.number().int().min(15).max(90).default(35),
      thcs: z.number().int().min(15).max(90).default(45),
      thpt: z.number().int().min(15).max(90).default(45),
      gdtx: z.number().int().min(15).max(90).default(45),
    })
    .default({ tieu_hoc: 35, thcs: 45, thpt: 45, gdtx: 45 }),
  favoriteBookSeries: z.string().default('Kết nối tri thức với cuộc sống'),
  favoriteSubjects: z.array(z.string()).default(['Tin học']),
});
export type TeacherProfile = z.infer<typeof TeacherProfileSchema>;

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  exportFont: z.string().default('Times New Roman'),
  exportFontSizePt: z.number().min(11).max(16).default(13),
  marginTopMm: z.number().min(10).max(35).default(20),
  marginBottomMm: z.number().min(10).max(35).default(20),
  marginLeftMm: z.number().min(15).max(40).default(25),
  marginRightMm: z.number().min(10).max(35).default(15),
  lineSpacing: z.number().min(1).max(2).default(1),
  defaultExportScope: z
    .enum(['all', 'main_only', 'worksheets_only', 'teacher_guide_only'])
    .default('all'),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const SourceDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fileType: z.enum(['pdf', 'docx', 'txt', 'image', 'pasted']),
  mimeType: z.string().optional(),
  sizeBytes: z.number().nonnegative().default(0),
  role: z
    .enum(['noi_dung_bai_hoc', 'yeu_cau_can_dat', 'mau_trinh_bay', 'ma_nang_luc'])
    .default('noi_dung_bai_hoc'),
  order: z.number().int().nonnegative().default(0),
  status: z.enum(['ready', 'processing', 'warning', 'error']).default('ready'),
  extractedText: z.string().default(''),
  pageCount: z.number().int().nonnegative().optional(),
  selectedPages: z.string().optional(),
  unreadableNotes: z.string().optional(),
  hasPageMapping: z.boolean().default(false),
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const PedagogicalOptionsSchema = z.object({
  activeMethods: z.boolean().default(true),
  activeMethodNames: z.string().default('Thảo luận nhóm, Dạy học giải quyết vấn đề'),
  games: z.boolean().default(false),
  gameNotes: z.string().default(''),
  individualWorksheet: z.boolean().default(true),
  groupWorksheet: z.boolean().default(false),
  reviewQuestions: z.boolean().default(true),
  questionFormat: z.string().default('Trắc nghiệm + Tự luận ngắn'),
  questionCount: z.number().int().min(1).max(20).default(4),
  rubric: z.boolean().default(true),
  stem: z.boolean().default(false),
  stemMaterials: z.string().default(''),
  stemBudgetLimit: z.string().default(''),
  stemProduct: z.string().default(''),
  digitalCompetence: z.boolean().default(false),
  digitalCompetenceNotes: z.string().default(''),
  aiUsage: z.boolean().default(false),
  aiToolName: z.string().default(''),
  aiDeviceContext: z.string().default(''),
  aiVerificationRule: z
    .string()
    .default('Học sinh kiểm chứng thông tin từ SGK, giải thích cách làm và không nhập dữ liệu cá nhân.'),
  cyberSafety: z.boolean().default(false),
  gdqpan: z.boolean().default(false),
  ethicsLifestyle: z.boolean().default(false),
  environmentalProtection: z.boolean().default(false),
  inclusiveSupport: z.boolean().default(false),
  inclusiveNeed: z.string().default(''),
  inclusiveAdjustment: z.string().default(''),
  otherIntegration: z.boolean().default(false),
  otherIntegrationNotes: z.string().default(''),
});
export type PedagogicalOptions = z.infer<typeof PedagogicalOptionsSchema>;

export const LessonInputSchema = z.object({
  schoolName: z.string().default('Trường THPT Đắk Song'),
  departmentName: z.string().default(''),
  teacherName: z.string().default('Trần Công Toàn'),
  prepareDate: z.string().default(''),
  teachDate: z.string().default(''),
  level: z.enum(['tieu_hoc', 'thcs', 'thpt', 'gdtx']).default('thpt'),
  grade: z.string().default('10'),
  subject: z.string().default('Tin học'),
  bookSeries: z.string().default('Kết nối tri thức với cuộc sống'),
  bookEdition: z.string().default(''),
  lessonTitle: z.string().default(''),
  lessonType: z.enum(['bai_moi', 'luyen_tap', 'thuc_hanh', 'on_tap', 'du_an']).default('bai_moi'),
  reviewScope: z.string().default(''),
  periodsCount: z.number().int().min(1).max(12).default(1),
  minutesPerPeriod: z.number().int().min(15).max(90).default(45),
  sequenceMode: z.enum(['chia_tung_tiet', 'xuyen_suot']).default('chia_tung_tiet'),
  templateId: z.string().default('tpl-thcs-thpt-standard'),
  outputLanguage: z.string().default('Tiếng Việt'),
  // Nội dung
  learningOutcomesInput: z.string().default(''),
  coreContent: z.string().default(''),
  priorKnowledge: z.string().default(''),
  excludedScope: z.string().default(''),
  teacherCustomRequests: z.string().default(''),
  // Bối cảnh lớp
  classSize: z.number().int().min(1).max(120).nullable().default(44),
  studentCharacteristics: z
    .string()
    .default(
      'Lớp có 44 học sinh; khoảng 2/3 số học sinh có trình độ từ Trung bình trở lên, 1/3 còn lại cần hướng dẫn từng bước.'
    ),
  commonDifficulties: z.string().default(''),
  inclusiveContextNotes: z.string().default(''),
  equipmentAndMaterials: z
    .string()
    .default('Máy tính giáo viên, máy chiếu, bảng, phấn/bút, SGK Tin học 10'),
  internetAccess: z.enum(['co_on_dinh', 'han_che', 'khong_co']).default('co_on_dinh'),
  studentDevices: z.string().default('Không yêu cầu thiết bị cá nhân'),
  classroomSpace: z.string().default('Phòng học tiêu chuẩn'),
  localContext: z.string().default(''),
  // Tài liệu & tùy chọn sư phạm
  documents: z.array(SourceDocumentSchema).default([]),
  pedagogicalOptions: PedagogicalOptionsSchema.default(() => PedagogicalOptionsSchema.parse({})),
});
export type LessonInput = z.infer<typeof LessonInputSchema>;

export const LearningObjectiveSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  category: z.enum([
    'kien_thuc',
    'nang_luc_chung',
    'nang_luc_dac_thu',
    'pham_chat',
    'tich_hop',
  ]),
  title: z.string().default(''),
  frameworkCode: z.string().default(''),
  description: z.string().min(1),
  sourceType: z.enum(['trich_nguon', 'de_xuat']).default('de_xuat'),
  needsConfirmation: z.boolean().default(false),
  sourceRef: z.string().default(''),
});
export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;

export const ResourceItemSchema = z.object({
  id: z.string().min(1),
  actor: z.enum(['gv', 'hs']),
  item: z.string().min(1),
  usedInActivities: z.string().default(''),
});
export type ResourceItem = z.infer<typeof ResourceItemSchema>;

export const ActivityStepsSchema = z.object({
  transfer: z.string().min(1),
  execute: z.string().min(1),
  report: z.string().min(1),
  conclude: z.string().min(1),
});
export type ActivitySteps = z.infer<typeof ActivityStepsSchema>;

export const LearningActivitySchema = z.object({
  id: z.string().min(1),
  sessionNumber: z.number().int().min(1).default(1),
  order: z.number().int().min(1).default(1),
  phase: z
    .enum(['khoi_dong', 'hinh_thanh_kien_thuc', 'luyen_tap', 'van_dung', 'ket_thuc'])
    .default('hinh_thanh_kien_thuc'),
  title: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(180),
  objectiveIds: z.array(z.string()).default([]),
  taskContent: z.string().min(1),
  expectedProduct: z.string().min(1),
  steps: ActivityStepsSchema,
  teacherPrompts: z.string().default(''),
  studentActions: z.string().default(''),
  groupOrganization: z.string().default(''),
  assessmentCriteria: z.string().default(''),
  commonMistakesAndSupport: z.string().default(''),
  extensionTask: z.string().default(''),
  contingencyPlan: z.string().default(''),
  linkedWorksheetIds: z.array(z.string()).default([]),
});
export type LearningActivity = z.infer<typeof LearningActivitySchema>;

export const LessonSessionSchema = z.object({
  id: z.string().min(1),
  sessionNumber: z.number().int().min(1),
  title: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  overviewNote: z.string().default(''),
});
export type LessonSession = z.infer<typeof LessonSessionSchema>;

export const WorksheetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  mode: z.enum(['ca_nhan', 'nhom']).default('ca_nhan'),
  linkedActivityId: z.string().default(''),
  instructions: z.string().default(''),
  tasks: z.array(z.string()).default([]),
  answerGuide: z.string().default(''),
});
export type Worksheet = z.infer<typeof WorksheetSchema>;

export const AssessmentQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trac_nghiem', 'tu_luan', 'van_dap', 'thuc_hanh']).default('trac_nghiem'),
  prompt: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctAnswerOrGuide: z.string().default(''),
  linkedObjectiveIds: z.array(z.string()).default([]),
});
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;

export const AnswerKeySchema = z.object({
  id: z.string().min(1),
  targetLabel: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().default(''),
});
export type AnswerKey = z.infer<typeof AnswerKeySchema>;

export const RubricCriterionSchema = z.object({
  id: z.string().min(1),
  criterion: z.string().min(1),
  weightPercent: z.number().min(0).max(100),
  levelGood: z.string().min(1),
  levelPass: z.string().min(1),
  levelNeedWork: z.string().min(1),
});
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

export const RubricSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  target: z.string().default('Sản phẩm học tập'),
  criteria: z.array(RubricCriterionSchema).default([]),
});
export type Rubric = z.infer<typeof RubricSchema>;

export const ObjectiveEvidenceRowSchema = z.object({
  objectiveId: z.string().min(1),
  objectiveCode: z.string().min(1),
  activityIds: z.array(z.string()).default([]),
  productEvidence: z.string().default(''),
  assessmentMethod: z.string().default(''),
});
export type ObjectiveEvidenceRow = z.infer<typeof ObjectiveEvidenceRowSchema>;

export const SourceReferenceSchema = z.object({
  documentName: z.string().min(1),
  pageOrSection: z.string().default('Chưa xác định trang cụ thể'),
  excerpt: z.string().default(''),
  mappedTo: z.string().default(''),
});
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const ValidationIssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['can_sua', 'can_xac_nhan', 'goi_y']),
  origin: z.enum(['code', 'ai']).default('code'),
  title: z.string().min(1),
  description: z.string().min(1),
  locationLabel: z.string().default(''),
  reason: z.string().default(''),
  targetSectionId: z.string().default('overview'),
  targetActivityId: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const LessonPlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['nhap', 'hoan_thien', 'luu_tru', 'thung_rac']).default('nhap'),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  schemaVersion: z.number().int().default(SCHEMA_VERSION),
  promptVersion: z.string().default(PROMPT_VERSION),
  templateType: z
    .enum([
      'tieu_hoc_2_cot',
      'thcs_thpt_tien_trinh',
      'thcs_thpt_cv5512',
      'tich_hop_stem',
      'on_tap_chuyen_sau',
    ])
    .default('thcs_thpt_tien_trinh'),
  tags: z.array(z.string()).default([]),
  isSample: z.boolean().default(false),
  inputSnapshot: LessonInputSchema,
  assumptions: z.array(z.string()).default([]),
  objectives: z.array(LearningObjectiveSchema).min(1),
  resources: z.array(ResourceItemSchema).default([]),
  sessions: z.array(LessonSessionSchema).min(1),
  activities: z.array(LearningActivitySchema).min(1),
  worksheets: z.array(WorksheetSchema).default([]),
  questions: z.array(AssessmentQuestionSchema).default([]),
  answerKeys: z.array(AnswerKeySchema).default([]),
  rubrics: z.array(RubricSchema).default([]),
  teacherAiPrompts: z.array(z.string()).default([]),
  homework: z.string().default(''),
  objectiveEvidenceMap: z.array(ObjectiveEvidenceRowSchema).default([]),
  sourceReferences: z.array(SourceReferenceSchema).default([]),
  itemsNeedingConfirmation: z.array(z.string()).default([]),
  postLessonReflection: z.string().default(''),
});
export type LessonPlan = z.infer<typeof LessonPlanSchema>;

export const PlanVersionSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  createdAt: z.string().min(1),
  label: z.string().min(1),
  summary: z.string().default(''),
  snapshot: LessonPlanSchema,
});
export type PlanVersion = z.infer<typeof PlanVersionSchema>;

export const LessonTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(['tieu_hoc', 'thcs', 'thpt', 'gdtx']),
  structureType: z.enum([
    'tieu_hoc_2_cot',
    'thcs_thpt_tien_trinh',
    'thcs_thpt_cv5512',
    'tich_hop_stem',
    'on_tap_chuyen_sau',
  ]),
  description: z.string(),
  isBuiltIn: z.boolean().default(false),
  referenceNote: z.string().default('Mẫu tham khảo thực hành'),
  sectionsPreview: z.array(z.string()),
  defaultSequenceMode: z.enum(['chia_tung_tiet', 'xuyen_suot']).default('chia_tung_tiet'),
  createdAt: z.string(),
});
export type LessonTemplate = z.infer<typeof LessonTemplateSchema>;

export const BackupPayloadSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  profile: TeacherProfileSchema,
  settings: AppSettingsSchema,
  plans: z.array(LessonPlanSchema),
  versions: z.array(PlanVersionSchema).default([]),
  templates: z.array(LessonTemplateSchema).default([]),
});
export type BackupPayload = z.infer<typeof BackupPayloadSchema>;

export interface AiStatusInfo {
  configured: boolean;
  model: string;
  message: string;
}

export interface AiActivityEditProposal {
  activityId: string;
  updatedActivity: LearningActivity;
  changeSummary: string;
  durationImpactMinutes: number;
  objectiveImpactNote: string;
}

export const GrammarCheckScopeSchema = z.enum([
  'all',
  'objectives',
  'activities',
  'appendix',
  'single_activity',
]);
export type GrammarCheckScope = z.infer<typeof GrammarCheckScopeSchema>;

export const GrammarStyleSuggestionSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['chinh_ta', 'ngu_phap', 'dien_dat']).default('dien_dat'),
  sectionId: z.string().min(1),
  sectionLabel: z.string().min(1),
  targetActivityId: z.string().optional(),
  targetObjectiveId: z.string().optional(),
  fieldKey: z.string().default(''),
  originalText: z.string().min(1),
  suggestedText: z.string().min(1),
  explanation: z.string().min(1),
});
export type GrammarStyleSuggestion = z.infer<typeof GrammarStyleSuggestionSchema>;

