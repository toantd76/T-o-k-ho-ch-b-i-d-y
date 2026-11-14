import {
  type ExportScope,
  type GrammarStyleSuggestion,
  type LearningActivity,
  type LearningObjective,
  type LessonInput,
  type LessonPlan,
  LessonPlanSchema,
  type PlanVersion,
  type ValidationIssue,
} from '../types/lesson.ts';

export function calculateTotalDuration(periodsCount: number, minutesPerPeriod: number): number {
  const safePeriods = Number.isFinite(periodsCount) ? Math.max(0, Math.round(periodsCount)) : 0;
  const safeMinutes = Number.isFinite(minutesPerPeriod)
    ? Math.max(0, Math.round(minutesPerPeriod))
    : 0;
  return safePeriods * safeMinutes;
}

export interface DurationBreakdown {
  expectedTotalMinutes: number;
  actualTotalMinutes: number;
  differenceMinutes: number;
  perSession: Array<{
    sessionNumber: number;
    title: string;
    expectedMinutes: number;
    actualMinutes: number;
    differenceMinutes: number;
  }>;
}

export function computePlanDurations(plan: LessonPlan): DurationBreakdown {
  const expectedTotalMinutes = calculateTotalDuration(
    plan.inputSnapshot.periodsCount,
    plan.inputSnapshot.minutesPerPeriod
  );
  const actualTotalMinutes = plan.activities.reduce(
    (sum, act) => sum + (Number.isFinite(act.durationMinutes) ? act.durationMinutes : 0),
    0
  );

  const perSession = plan.sessions.map((session) => {
    const sessionActs = plan.activities.filter((a) => a.sessionNumber === session.sessionNumber);
    const actual = sessionActs.reduce(
      (sum, a) => sum + (Number.isFinite(a.durationMinutes) ? a.durationMinutes : 0),
      0
    );
    return {
      sessionNumber: session.sessionNumber,
      title: session.title,
      expectedMinutes: session.durationMinutes,
      actualMinutes: actual,
      differenceMinutes: actual - session.durationMinutes,
    };
  });

  return {
    expectedTotalMinutes,
    actualTotalMinutes,
    differenceMinutes: actualTotalMinutes - expectedTotalMinutes,
    perSession,
  };
}

export function validateLessonPlanCode(plan: LessonPlan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const durations = computePlanDurations(plan);

  if (!plan.title.trim()) {
    issues.push({
      id: 'issue-missing-title',
      severity: 'can_sua',
      origin: 'code',
      title: 'Thiếu tên bài dạy',
      description: 'Kế hoạch bài dạy chưa có tiêu đề bài học.',
      locationLabel: 'Phần đầu kế hoạch',
      reason: 'Tiêu đề là thông tin bắt buộc để lưu và xuất tài liệu.',
      targetSectionId: 'section-header',
    });
  }

  // Kiểm tra thời lượng âm hoặc 0
  for (const act of plan.activities) {
    if (!Number.isFinite(act.durationMinutes) || act.durationMinutes <= 0) {
      issues.push({
        id: `issue-invalid-dur-${act.id}`,
        severity: 'can_sua',
        origin: 'code',
        title: `Thời lượng hoạt động không hợp lệ (${act.title})`,
        description: `Hoạt động "${act.title}" đang có thời lượng ${act.durationMinutes} phút.`,
        locationLabel: `Tiết ${act.sessionNumber} · ${act.title}`,
        reason: 'Thời lượng hoạt động phải lớn hơn 0 phút.',
        targetSectionId: `activity-${act.id}`,
        targetActivityId: act.id,
      });
    }
  }

  // Kiểm tra tổng thời lượng toàn bài
  if (durations.differenceMinutes !== 0) {
    const diffAbs = Math.abs(durations.differenceMinutes);
    const dirLabel = durations.differenceMinutes > 0 ? 'dư' : 'thiếu';
    issues.push({
      id: 'issue-total-duration-mismatch',
      severity: 'can_sua',
      origin: 'code',
      title: `Tổng thời lượng chưa khớp (${durations.actualTotalMinutes}/${durations.expectedTotalMinutes} phút)`,
      description: `Tổng thời gian các hoạt động đang ${dirLabel} ${diffAbs} phút so với kế hoạch (${plan.inputSnapshot.periodsCount} tiết × ${plan.inputSnapshot.minutesPerPeriod} phút).`,
      locationLabel: 'Tiến trình dạy học',
      reason: 'Tổng thời lượng trên lớp phải khớp ngân sách thời gian đã chọn.',
      targetSectionId: 'section-sessions',
    });
  }

  // Kiểm tra từng tiết nếu chọn chia từng tiết
  if (plan.inputSnapshot.sequenceMode === 'chia_tung_tiet') {
    for (const s of durations.perSession) {
      if (s.differenceMinutes !== 0) {
        const diffAbs = Math.abs(s.differenceMinutes);
        const dirLabel = s.differenceMinutes > 0 ? 'vượt' : 'thiếu';
        issues.push({
          id: `issue-session-duration-${s.sessionNumber}`,
          severity: 'can_sua',
          origin: 'code',
          title: `Tiết ${s.sessionNumber} lệch thời lượng (${s.actualMinutes}/${s.expectedMinutes} phút)`,
          description: `Tiết ${s.sessionNumber} (${s.title}) đang ${dirLabel} ${diffAbs} phút.`,
          locationLabel: `Tiết ${s.sessionNumber}`,
          reason: 'Chế độ chia từng tiết yêu cầu tổng thời gian hoạt động trong mỗi tiết khớp với thời lượng tiết.',
          targetSectionId: `session-${s.sessionNumber}`,
        });
      }
    }
  }

  // Kiểm tra trùng mã mục tiêu
  const objectiveCodes = new Map<string, number>();
  const objectiveIds = new Set<string>();
  for (const obj of plan.objectives) {
    const normalizedCode = obj.code.trim().toUpperCase();
    objectiveCodes.set(normalizedCode, (objectiveCodes.get(normalizedCode) ?? 0) + 1);
    if (objectiveIds.has(obj.id)) {
      issues.push({
        id: `issue-dup-obj-id-${obj.id}`,
        severity: 'can_sua',
        origin: 'code',
        title: `Trùng định danh mục tiêu (${obj.code})`,
        description: `Mã ID nội bộ "${obj.id}" xuất hiện nhiều hơn một lần.`,
        locationLabel: 'I. Mục tiêu',
        reason: 'ID mục tiêu cần duy nhất để liên kết hoạt động và bảng đối chiếu chính xác.',
        targetSectionId: 'section-objectives',
      });
    }
    objectiveIds.add(obj.id);
  }
  for (const [code, count] of objectiveCodes.entries()) {
    if (count > 1) {
      issues.push({
        id: `issue-dup-obj-code-${code}`,
        severity: 'can_sua',
        origin: 'code',
        title: `Trùng mã mục tiêu ${code}`,
        description: `Mã mục tiêu ${code} xuất hiện ${count} lần trong phần Mục tiêu.`,
        locationLabel: 'I. Mục tiêu',
        reason: 'Mỗi mục tiêu cần mã MT riêng biệt (MT1, MT2...).',
        targetSectionId: 'section-objectives',
      });
    }
  }

  // Kiểm tra trùng ID hoạt động & liên kết mục tiêu không tồn tại
  const activityIds = new Set<string>();
  const coveredObjectiveIds = new Set<string>();
  const worksheetIds = new Set(plan.worksheets.map((w) => w.id));

  for (const act of plan.activities) {
    if (activityIds.has(act.id)) {
      issues.push({
        id: `issue-dup-act-id-${act.id}`,
        severity: 'can_sua',
        origin: 'code',
        title: `Trùng định danh hoạt động (${act.title})`,
        description: `Hoạt động "${act.title}" dùng lại ID "${act.id}".`,
        locationLabel: `Tiết ${act.sessionNumber} · ${act.title}`,
        reason: 'Mỗi hoạt động cần ID riêng để chỉnh sửa cục bộ không bị nhầm lẫn.',
        targetSectionId: `activity-${act.id}`,
        targetActivityId: act.id,
      });
    }
    activityIds.add(act.id);

    for (const oid of act.objectiveIds) {
      if (!objectiveIds.has(oid)) {
        issues.push({
          id: `issue-dangling-obj-${act.id}-${oid}`,
          severity: 'can_sua',
          origin: 'code',
          title: `Liên kết mục tiêu không tồn tại trong "${act.title}"`,
          description: `Hoạt động "${act.title}" tham chiếu mã mục tiêu (${oid}) không có trong danh sách Mục tiêu.`,
          locationLabel: `Tiết ${act.sessionNumber} · ${act.title}`,
          reason: 'Mục tiêu liên kết có thể đã bị xóa hoặc sửa mã.',
          targetSectionId: `activity-${act.id}`,
          targetActivityId: act.id,
        });
      } else {
        coveredObjectiveIds.add(oid);
      }
    }

    for (const wid of act.linkedWorksheetIds) {
      if (!worksheetIds.has(wid)) {
        issues.push({
          id: `issue-missing-ws-${act.id}-${wid}`,
          severity: 'can_sua',
          origin: 'code',
          title: `Phiếu học tập được nhắc chưa tồn tại (${act.title})`,
          description: `Hoạt động "${act.title}" liên kết tới phiếu học tập (${wid}) nhưng không tìm thấy trong Phụ lục.`,
          locationLabel: `Tiết ${act.sessionNumber} · ${act.title}`,
          reason: 'Cần tạo phiếu tương ứng trong Phụ lục hoặc gỡ liên kết thừa.',
          targetSectionId: `activity-${act.id}`,
          targetActivityId: act.id,
        });
      }
    }
  }

  // Kiểm tra mục tiêu chưa có hoạt động thực hiện
  for (const obj of plan.objectives) {
    if (!coveredObjectiveIds.has(obj.id)) {
      issues.push({
        id: `issue-uncovered-obj-${obj.id}`,
        severity: 'can_xac_nhan',
        origin: 'code',
        title: `Mục tiêu ${obj.code} chưa gắn với hoạt động nào`,
        description: `Mục tiêu ${obj.code} ("${obj.description.slice(0, 70)}...") chưa được gán cho hoạt động dạy học nào.`,
        locationLabel: 'I. Mục tiêu',
        reason: 'Mỗi mục tiêu đặt ra nên có ít nhất một hoạt động và minh chứng kiểm tra.',
        targetSectionId: 'section-objectives',
      });
    }
    if (obj.needsConfirmation) {
      issues.push({
        id: `issue-confirm-obj-${obj.id}`,
        severity: 'can_xac_nhan',
        origin: 'code',
        title: `Cần đối chiếu mục tiêu ${obj.code}`,
        description: `Mục tiêu ${obj.code} được đánh dấu cần đối chiếu lại với chương trình/tài liệu chuẩn.`,
        locationLabel: 'I. Mục tiêu',
        reason: 'Chưa có văn bản yêu cầu cần đạt chính thức đính kèm cho mục này.',
        targetSectionId: 'section-objectives',
      });
    }
  }

  // Kiểm tra câu hỏi trắc nghiệm thiếu đáp án
  for (const q of plan.questions) {
    if (q.type === 'trac_nghiem' && !q.correctAnswerOrGuide.trim()) {
      issues.push({
        id: `issue-missing-answer-${q.id}`,
        severity: 'can_sua',
        origin: 'code',
        title: 'Câu hỏi trắc nghiệm chưa có đáp án',
        description: `Câu hỏi "${q.prompt.slice(0, 60)}..." chưa ghi đáp án đúng.`,
        locationLabel: 'Phụ lục · Câu hỏi củng cố',
        reason: 'Bài tập có đáp án xác định phải có đáp án kèm theo cho giáo viên.',
        targetSectionId: 'section-appendix-questions',
      });
    }
  }

  // Kiểm tra trọng số Rubric
  for (const rubric of plan.rubrics) {
    if (rubric.criteria.length > 0) {
      const totalWeight = rubric.criteria.reduce(
        (sum, c) => sum + (Number.isFinite(c.weightPercent) ? c.weightPercent : 0),
        0
      );
      if (Math.abs(totalWeight - 100) > 0.01) {
        issues.push({
          id: `issue-rubric-weight-${rubric.id}`,
          severity: 'can_sua',
          origin: 'code',
          title: `Tổng trọng số Rubric "${rubric.title}" là ${totalWeight}%`,
          description: `Các tiêu chí trong bảng đánh giá "${rubric.title}" cộng lại bằng ${totalWeight}% (nên bằng 100%).`,
          locationLabel: 'Phụ lục · Rubric đánh giá',
          reason: 'Trọng số các tiêu chí trong một rubric cần cộng đúng 100%.',
          targetSectionId: 'section-appendix-rubrics',
        });
      }
    }
  }

  // Gợi ý kiểm tra nội dung tích hợp nếu có điểm cần xác nhận
  if (plan.itemsNeedingConfirmation.length > 0) {
    issues.push({
      id: 'issue-items-confirmation',
      severity: 'can_xac_nhan',
      origin: 'code',
      title: `Có ${plan.itemsNeedingConfirmation.length} điểm cần giáo viên xác nhận`,
      description: plan.itemsNeedingConfirmation[0],
      locationLabel: 'Phụ lục · Nguồn và điểm cần xác nhận',
      reason: 'Các thông tin chưa có trong tài liệu gốc cần thầy/cô kiểm tra lại trước khi dạy.',
      targetSectionId: 'section-appendix-sources',
    });
  }

  return issues;
}

export function validateLessonPlanData(raw: unknown): {
  success: boolean;
  data?: LessonPlan;
  errors: string[];
} {
  const parsed = LessonPlanSchema.safeParse(raw);
  if (parsed.success) {
    return { success: true, data: parsed.data, errors: [] };
  }
  return {
    success: false,
    errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}

export function createPlanVersionSnapshot(
  plan: LessonPlan,
  label: string,
  summary = ''
): PlanVersion {
  const clonedPlan = JSON.parse(JSON.stringify(plan)) as LessonPlan;
  return {
    id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    planId: plan.id,
    createdAt: new Date().toISOString(),
    label,
    summary,
    snapshot: clonedPlan,
  };
}

export function pruneVersionsForPlan(
  allVersions: PlanVersion[],
  planId: string,
  maxPerPlan = 15
): PlanVersion[] {
  const target = allVersions
    .filter((v) => v.planId === planId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, maxPerPlan);
  const others = allVersions.filter((v) => v.planId !== planId);
  return [...target, ...others];
}

export function sanitizeFileName(title: string, fallback = 'ke-hoach-bai-day'): string {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return (normalized || fallback).slice(0, 70);
}

export function sanitizePlainText(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

export interface DocxExportSectionModel {
  includeHeader: boolean;
  includeObjectives: boolean;
  includeResources: boolean;
  includeSessions: boolean;
  includeReflection: boolean;
  includeWorksheets: boolean;
  includeQuestions: boolean;
  includeAnswerKeys: boolean;
  includeRubrics: boolean;
  includeTeacherAiPrompts: boolean;
  includeEvidenceAndSources: boolean;
  isPrimaryTwoColumn: boolean;
  totalMinutes: number;
  normalizedFileName: string;
}

export function prepareDocxExportModel(
  plan: LessonPlan,
  scope: ExportScope
): DocxExportSectionModel {
  const totalMinutes = calculateTotalDuration(
    plan.inputSnapshot.periodsCount,
    plan.inputSnapshot.minutesPerPeriod
  );
  const suffixMap: Record<ExportScope, string> = {
    all: '',
    main_only: '-ke-hoach-chinh',
    worksheets_only: '-phieu-hoc-tap',
    teacher_guide_only: '-dap-an-rubric-gv',
  };

  return {
    includeHeader: true,
    includeObjectives: scope === 'all' || scope === 'main_only',
    includeResources: scope === 'all' || scope === 'main_only',
    includeSessions: scope === 'all' || scope === 'main_only',
    includeReflection: scope === 'all' || scope === 'main_only',
    includeWorksheets: scope === 'all' || scope === 'worksheets_only',
    includeQuestions: scope === 'all' || scope === 'worksheets_only' || scope === 'teacher_guide_only',
    includeAnswerKeys: scope === 'all' || scope === 'teacher_guide_only',
    includeRubrics: scope === 'all' || scope === 'teacher_guide_only',
    includeTeacherAiPrompts:
      (scope === 'all' || scope === 'teacher_guide_only') && plan.teacherAiPrompts.length > 0,
    includeEvidenceAndSources: scope === 'all' || scope === 'teacher_guide_only',
    isPrimaryTwoColumn: plan.templateType === 'tieu_hoc_2_cot',
    totalMinutes,
    normalizedFileName: `${sanitizeFileName(plan.title)}${suffixMap[scope]}.docx`,
  };
}

export function summarizeSelectedIntegrations(input: LessonInput): string[] {
  const opt = input.pedagogicalOptions;
  const list: string[] = [];
  if (opt.activeMethods) list.push('Phương pháp dạy học tích cực');
  if (opt.games) list.push('Trò chơi học tập');
  if (opt.individualWorksheet) list.push('Phiếu học tập cá nhân');
  if (opt.groupWorksheet) list.push('Phiếu học tập nhóm');
  if (opt.reviewQuestions) list.push('Câu hỏi củng cố');
  if (opt.rubric) list.push('Rubric đánh giá');
  if (opt.stem) list.push('STEM/STEAM');
  if (opt.digitalCompetence) list.push('Năng lực số');
  if (opt.aiUsage) list.push('Sử dụng AI có kiểm chứng');
  if (opt.cyberSafety) list.push('An toàn mạng');
  if (opt.gdqpan) list.push('GDQPAN');
  if (opt.ethicsLifestyle) list.push('Đạo đức, lối sống');
  if (opt.environmentalProtection) list.push('Bảo vệ môi trường');
  if (opt.inclusiveSupport) list.push('Hỗ trợ học hòa nhập');
  if (opt.otherIntegration) list.push('Tích hợp khác');
  return list;
}

function replaceTextExactOrWhole(current: string, originalText: string, suggestedText: string): string {
  if (!current) return current;
  if (current.includes(originalText)) {
    return current.replace(originalText, suggestedText);
  }
  return current;
}

export interface FormattedObjectiveItem {
  id: string;
  code: string;
  category: LearningObjective['category'];
  prefixLabel: string;
  boldPrefix: boolean;
  body: string;
  needsConfirmation: boolean;
}

export interface ObjectivesExportStructure {
  sectionTitle: string;
  knowledgeHeading: string;
  knowledgeItems: FormattedObjectiveItem[];
  competencyHeading: string;
  specificHeading: string;
  specificItems: FormattedObjectiveItem[];
  generalHeading: string;
  generalItems: FormattedObjectiveItem[];
  extraIntegrationHeading: string;
  extraIntegrationItems: FormattedObjectiveItem[];
  qualityHeading: string;
  qualityItems: FormattedObjectiveItem[];
}

function stripLeadingDash(text: string): string {
  return text.replace(/^\s*[-•–]\s*/, '').trim();
}

function isNlsOrAiObjective(obj: LearningObjective): boolean {
  const combined = `${obj.title || ''} ${obj.frameworkCode || ''} ${obj.description || ''}`;
  return (
    /\b\d+\.\d+\.(NC|TC|CB)\d*[a-z]?\b/i.test(combined) ||
    /\b\d+\.[ABCD]\d+\./i.test(combined) ||
    /năng lực số|trí tuệ nhân tạo|công nghệ số|\bAI\b/i.test(combined)
  );
}

export function formatObjectiveDisplayItem(obj: LearningObjective): FormattedObjectiveItem {
  const cleanDesc = stripLeadingDash(obj.description || '');
  const explicitTitle = stripLeadingDash(obj.title || '');
  const explicitCode = (obj.frameworkCode || '').trim();

  if (obj.category === 'kien_thuc') {
    return {
      id: obj.id,
      code: obj.code,
      category: obj.category,
      prefixLabel: '',
      boldPrefix: false,
      body: cleanDesc,
      needsConfirmation: obj.needsConfirmation,
    };
  }

  const isSpecific = obj.category === 'nang_luc_dac_thu' || obj.category === 'tich_hop';

  let prefixLabel = explicitTitle;
  let body = cleanDesc;

  if (!prefixLabel) {
    const colonMatch = cleanDesc.match(/^([^:\n]{4,120}):\s+([\s\S]+)$/);
    if (colonMatch) {
      prefixLabel = colonMatch[1].trim();
      body = colonMatch[2].trim();
    }
  } else if (body.toLowerCase().startsWith(`${prefixLabel.toLowerCase()}:`)) {
    body = body.slice(prefixLabel.length + 1).trim();
  }

  if (explicitCode && !prefixLabel.includes(explicitCode)) {
    if (prefixLabel) {
      prefixLabel = /\([^)]*\)\s*$/.test(prefixLabel)
        ? prefixLabel
        : `${prefixLabel} (Mã ${explicitCode})`;
    } else {
      prefixLabel = isSpecific
        ? `Năng lực đặc thù (Mã ${explicitCode})`
        : `Mã ${explicitCode}`;
    }
  }

  return {
    id: obj.id,
    code: obj.code,
    category: obj.category,
    prefixLabel,
    boldPrefix: isSpecific && Boolean(prefixLabel),
    body,
    needsConfirmation: obj.needsConfirmation,
  };
}

export function buildSpecificCompetencyHeading(plan: LessonPlan): string {
  const input = plan.inputSnapshot;
  const opt = input.pedagogicalOptions;
  const subjectPart = input.subject?.trim() ? `Môn ${input.subject.trim()}` : '';

  const allSpecificAndIntegration = plan.objectives.filter(
    (o) => o.category === 'nang_luc_dac_thu' || o.category === 'tich_hop'
  );
  const combinedText = allSpecificAndIntegration
    .map((o) => `${o.title || ''} ${o.frameworkCode || ''} ${o.description}`)
    .join(' ');

  const hasNls =
    opt.digitalCompetence ||
    /\b\d+\.\d+\.(NC|TC|CB)\d*[a-z]?\b/i.test(combinedText) ||
    /khung năng lực số|công nghệ số/i.test(combinedText);

  const hasAi2422 =
    opt.aiUsage || /\b\d+\.[ABCD]\d+\./i.test(combinedText);

  const tags: string[] = [];
  if (subjectPart) tags.push(subjectPart);
  if (hasNls && hasAi2422 && /\b\d+\.[ABCD]\d+\./i.test(combinedText)) {
    tags.push('Khung Năng lực số & Giáo dục AI');
  } else if (hasNls) {
    tags.push('Khung Năng lực số');
  } else if (hasAi2422) {
    tags.push('Khung Giáo dục AI');
  }

  return tags.length > 0
    ? `a) Năng lực đặc thù (${tags.join(' - ')}):`
    : 'a) Năng lực đặc thù:';
}

export function buildObjectivesExportStructure(plan: LessonPlan): ObjectivesExportStructure {
  const knowledgeItems = plan.objectives
    .filter((o) => o.category === 'kien_thuc')
    .map(formatObjectiveDisplayItem);

  const specificRaw = plan.objectives.filter(
    (o) =>
      o.category === 'nang_luc_dac_thu' ||
      (o.category === 'tich_hop' && isNlsOrAiObjective(o))
  );
  const extraIntegrationRaw = plan.objectives.filter(
    (o) => o.category === 'tich_hop' && !isNlsOrAiObjective(o)
  );

  // If there are no specific objectives at all except general tich_hop, fold them cleanly under specific if NLS/AI isn't separated
  const specificItems = specificRaw.map(formatObjectiveDisplayItem);
  const extraIntegrationItems = extraIntegrationRaw.map(formatObjectiveDisplayItem);
  const generalItems = plan.objectives
    .filter((o) => o.category === 'nang_luc_chung')
    .map(formatObjectiveDisplayItem);
  const qualityItems = plan.objectives
    .filter((o) => o.category === 'pham_chat')
    .map(formatObjectiveDisplayItem);

  return {
    sectionTitle: 'I. MỤC TIÊU BÀI HỌC',
    knowledgeHeading: '1.1. Kiến thức:',
    knowledgeItems,
    competencyHeading: '1.2. Định hướng phát triển năng lực:',
    specificHeading: buildSpecificCompetencyHeading(plan),
    specificItems,
    generalHeading: 'b) Năng lực chung:',
    generalItems,
    extraIntegrationHeading: 'c) Nội dung tích hợp khác:',
    extraIntegrationItems,
    qualityHeading: '1.3. Phẩm chất:',
    qualityItems,
  };
}

export function formatObjectiveReferenceLabel(
  obj: LearningObjective,
  mode: 'compact' | 'detailed' = 'compact'
): string {
  const item = formatObjectiveDisplayItem(obj);
  if (obj.category === 'kien_thuc') {
    if (mode === 'compact') return 'Kiến thức';
    const shortBody = item.body.length > 90 ? `${item.body.slice(0, 87).trim()}...` : item.body;
    return `Kiến thức (${shortBody})`;
  }
  if (item.prefixLabel) {
    return item.prefixLabel;
  }
  if (mode === 'compact') {
    return obj.category === 'nang_luc_chung'
      ? 'Năng lực chung'
      : obj.category === 'pham_chat'
      ? 'Phẩm chất'
      : 'Năng lực đặc thù';
  }
  const shortBody = item.body.length > 90 ? `${item.body.slice(0, 87).trim()}...` : item.body;
  return shortBody || obj.code;
}

export function formatActivityObjectiveSummary(
  objectiveIds: string[],
  objectives: LearningObjective[],
  mode: 'compact' | 'detailed' = 'compact'
): string {
  const labels: string[] = [];
  for (const id of objectiveIds) {
    const obj = objectives.find((o) => o.id === id);
    if (!obj) continue;
    const label = formatObjectiveReferenceLabel(obj, mode);
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }
  if (labels.length === 0) {
    return mode === 'compact' ? '-' : 'Theo mục tiêu chung của bài học';
  }
  return labels.join('; ');
}

export function formatEvidenceRowObjectiveLabel(
  row: { objectiveId: string; objectiveCode: string },
  objectives: LearningObjective[]
): string {
  const obj = objectives.find(
    (o) => o.id === row.objectiveId || o.code === row.objectiveCode
  );
  if (!obj) return row.objectiveCode;
  return formatObjectiveReferenceLabel(obj, 'detailed');
}

export function applyGrammarSuggestionToPlan(
  plan: LessonPlan,
  suggestion: GrammarStyleSuggestion
): { updatedPlan: LessonPlan; applied: boolean } {
  let applied = false;
  const next: LessonPlan = JSON.parse(JSON.stringify(plan)) as LessonPlan;

  const tryUpdate = (current: string): string => {
    const replaced = replaceTextExactOrWhole(current, suggestion.originalText, suggestion.suggestedText);
    if (replaced !== current) applied = true;
    return replaced;
  };

  if (suggestion.fieldKey === 'title' && !suggestion.targetActivityId && !suggestion.targetObjectiveId) {
    next.title = tryUpdate(next.title);
  }

  if (suggestion.fieldKey === 'homework') {
    next.homework = tryUpdate(next.homework);
  }

  if (suggestion.targetObjectiveId) {
    next.objectives = next.objectives.map((obj) => {
      if (obj.id !== suggestion.targetObjectiveId) return obj;
      if (suggestion.fieldKey === 'title') {
        return { ...obj, title: tryUpdate(obj.title || '') };
      }
      return { ...obj, description: tryUpdate(obj.description) };
    });
  }

  if (suggestion.targetActivityId) {
    next.activities = next.activities.map((act) => {
      if (act.id !== suggestion.targetActivityId) return act;
      const updated = { ...act, steps: { ...act.steps } };
      updated.title = tryUpdate(updated.title);
      updated.taskContent = tryUpdate(updated.taskContent);
      updated.expectedProduct = tryUpdate(updated.expectedProduct);
      updated.teacherPrompts = tryUpdate(updated.teacherPrompts);
      updated.studentActions = tryUpdate(updated.studentActions);
      updated.steps.transfer = tryUpdate(updated.steps.transfer);
      updated.steps.execute = tryUpdate(updated.steps.execute);
      updated.steps.report = tryUpdate(updated.steps.report);
      updated.steps.conclude = tryUpdate(updated.steps.conclude);
      return updated;
    });
  }

  // Fallback sweep if specific target ID wasn't matched
  if (!applied) {
    next.title = tryUpdate(next.title);
    if (!applied) next.homework = tryUpdate(next.homework);
    if (!applied) {
      next.objectives = next.objectives.map((obj) => ({
        ...obj,
        description: applied ? obj.description : tryUpdate(obj.description),
      }));
    }
    if (!applied) {
      next.activities = next.activities.map((act) => {
        if (applied) return act;
        const u = { ...act, steps: { ...act.steps } };
        u.title = tryUpdate(u.title);
        if (!applied) u.taskContent = tryUpdate(u.taskContent);
        if (!applied) u.expectedProduct = tryUpdate(u.expectedProduct);
        if (!applied) u.teacherPrompts = tryUpdate(u.teacherPrompts);
        if (!applied) u.studentActions = tryUpdate(u.studentActions);
        if (!applied) u.steps.transfer = tryUpdate(u.steps.transfer);
        if (!applied) u.steps.execute = tryUpdate(u.steps.execute);
        if (!applied) u.steps.report = tryUpdate(u.steps.report);
        if (!applied) u.steps.conclude = tryUpdate(u.steps.conclude);
        return u;
      });
    }
    if (!applied) {
      next.worksheets = next.worksheets.map((ws) => {
        if (applied) return ws;
        return {
          ...ws,
          instructions: tryUpdate(ws.instructions),
          tasks: ws.tasks.map((t) => (applied ? t : tryUpdate(t))),
        };
      });
    }
    if (!applied) {
      next.questions = next.questions.map((q) => {
        if (applied) return q;
        return { ...q, prompt: tryUpdate(q.prompt) };
      });
    }
  }

  return { updatedPlan: next, applied };
}

export function compactFrameworkCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(
      /\(\s*(?:Công văn|CV)\s*3456(?:\/BGDĐT-GDPT)?(?:\s*[,;·\-]\s*(?:bậc\s*[^)]*|[A-Za-z0-9-]+))?\s*\)/gi,
      '(CV 3456)'
    )
    .replace(
      /\(\s*(?:Quyết định|QĐ)\s*2422(?:\/QĐ-BGDĐT)?(?:\s*[,;·\-]\s*[^)]*)?\s*\)/gi,
      '(QĐ 2422)'
    )
    .replace(
      /(?:Công văn|CV)\s*3456\/BGDĐT-GDPT(?:\s*[,;·\-]\s*bậc\s*[A-Za-z0-9-]+)?/gi,
      'CV 3456'
    )
    .replace(/(?:Quyết định|QĐ)\s*2422\/QĐ-BGDĐT/gi, 'QĐ 2422');
}

export function normalizeActivityCompactCitations(activity: LearningActivity): LearningActivity {
  return {
    ...activity,
    title: compactFrameworkCitations(activity.title),
    taskContent: compactFrameworkCitations(activity.taskContent),
    expectedProduct: compactFrameworkCitations(activity.expectedProduct),
    steps: {
      transfer: compactFrameworkCitations(activity.steps.transfer),
      execute: compactFrameworkCitations(activity.steps.execute),
      report: compactFrameworkCitations(activity.steps.report),
      conclude: compactFrameworkCitations(activity.steps.conclude),
    },
    teacherPrompts: compactFrameworkCitations(activity.teacherPrompts),
    studentActions: compactFrameworkCitations(activity.studentActions),
    groupOrganization: compactFrameworkCitations(activity.groupOrganization),
    assessmentCriteria: compactFrameworkCitations(activity.assessmentCriteria),
    commonMistakesAndSupport: compactFrameworkCitations(activity.commonMistakesAndSupport),
    extensionTask: compactFrameworkCitations(activity.extensionTask),
    contingencyPlan: compactFrameworkCitations(activity.contingencyPlan),
  };
}

export function normalizePlanCompactCitations(plan: LessonPlan): LessonPlan {
  return {
    ...plan,
    title: compactFrameworkCitations(plan.title),
    assumptions: plan.assumptions.map(compactFrameworkCitations),
    objectives: plan.objectives.map((o) => ({
      ...o,
      title: compactFrameworkCitations(o.title || ''),
      description: compactFrameworkCitations(o.description),
      sourceRef: compactFrameworkCitations(o.sourceRef),
    })),
    resources: plan.resources.map((r) => ({
      ...r,
      item: compactFrameworkCitations(r.item),
      usedInActivities: compactFrameworkCitations(r.usedInActivities),
    })),
    sessions: plan.sessions.map((s) => ({
      ...s,
      title: compactFrameworkCitations(s.title),
      overviewNote: compactFrameworkCitations(s.overviewNote),
    })),
    activities: plan.activities.map(normalizeActivityCompactCitations),
    worksheets: plan.worksheets.map((ws) => ({
      ...ws,
      title: compactFrameworkCitations(ws.title),
      instructions: compactFrameworkCitations(ws.instructions),
      tasks: ws.tasks.map(compactFrameworkCitations),
      answerGuide: compactFrameworkCitations(ws.answerGuide),
    })),
    questions: plan.questions.map((q) => ({
      ...q,
      prompt: compactFrameworkCitations(q.prompt),
      options: q.options.map(compactFrameworkCitations),
      correctAnswerOrGuide: compactFrameworkCitations(q.correctAnswerOrGuide),
    })),
    answerKeys: plan.answerKeys.map((ak) => ({
      ...ak,
      targetLabel: compactFrameworkCitations(ak.targetLabel),
      answer: compactFrameworkCitations(ak.answer),
      explanation: compactFrameworkCitations(ak.explanation),
    })),
    rubrics: plan.rubrics.map((rub) => ({
      ...rub,
      title: compactFrameworkCitations(rub.title),
      target: compactFrameworkCitations(rub.target),
      criteria: rub.criteria.map((c) => ({
        ...c,
        criterion: compactFrameworkCitations(c.criterion),
        levelGood: compactFrameworkCitations(c.levelGood),
        levelPass: compactFrameworkCitations(c.levelPass),
        levelNeedWork: compactFrameworkCitations(c.levelNeedWork),
      })),
    })),
    teacherAiPrompts: plan.teacherAiPrompts.map(compactFrameworkCitations),
    homework: compactFrameworkCitations(plan.homework),
    objectiveEvidenceMap: plan.objectiveEvidenceMap.map((row) => ({
      ...row,
      productEvidence: compactFrameworkCitations(row.productEvidence),
      assessmentMethod: compactFrameworkCitations(row.assessmentMethod),
    })),
    postLessonReflection: compactFrameworkCitations(plan.postLessonReflection),
  };
}


