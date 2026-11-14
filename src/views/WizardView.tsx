import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  Info,
  Loader2,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import {
  AiStatusInfo,
  EducationLevel,
  LessonInput,
  LessonPlan,
  LessonTemplate,
  LessonType,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  SequenceMode,
  SourceDocRole,
  SourceDocument,
  TeacherProfile,
} from '../types/lesson';
import {
  calculateTotalDuration,
  sanitizePlainText,
  summarizeSelectedIntegrations,
} from '../lib/lessonLogic';
import {
  extractPdfPagesText,
  extractPdfWithAiFallback,
  formatBytes,
  readSourceFile,
} from '../lib/documentReader';
import {
  BOOK_SERIES_OPTIONS,
  EDUCATION_LEVEL_LABELS,
} from '../lib/templatesAndSamples';
import {
  CV_3456_INFO,
  QD_2422_INFO,
  getAiQuickChips,
  getNlsBandForGrade,
  getNlsQuickChips,
} from '../lib/frameworks';

interface WizardViewProps {
  step: number;
  onStepChange: (step: number) => void;
  input: LessonInput;
  onInputChange: (next: LessonInput) => void;
  templates: LessonTemplate[];
  profile: TeacherProfile;
  aiStatus: AiStatusInfo | null;
  onGenerateComplete: (plan: LessonPlan) => void;
  onTrySample: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STEP_TITLES = [
  { num: 1, label: 'Thông tin bài học' },
  { num: 2, label: 'Tài liệu & Bối cảnh' },
  { num: 3, label: 'Yêu cầu thiết kế' },
  { num: 4, label: 'Kiểm tra & Tạo' },
];

const DOC_ROLE_LABELS: Record<SourceDocRole, string> = {
  noi_dung_bai_hoc: 'Tài liệu nội dung bài học',
  yeu_cau_can_dat: 'Tài liệu yêu cầu cần đạt',
  mau_trinh_bay: 'Mẫu trình bày của trường',
  ma_nang_luc: 'Tài liệu mã năng lực / chỉ báo',
};

type GenerationStage =
  | 'idle'
  | 'processing_docs'
  | 'sending'
  | 'generating'
  | 'validating'
  | 'done'
  | 'error';

export function WizardView({
  step,
  onStepChange,
  input,
  onInputChange,
  templates,
  profile,
  aiStatus,
  onGenerateComplete,
  onTrySample,
  onNotify,
}: WizardViewProps) {
  const [showAdminFields, setShowAdminFields] = useState(false);
  const [showAdvancedContent, setShowAdvancedContent] = useState(false);
  const [showContextFields, setShowContextFields] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Document states
  const [docRoleForUpload, setDocRoleForUpload] = useState<SourceDocRole>('noi_dung_bai_hoc');
  const [pasteText, setPasteText] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docError, setDocError] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const rawFilesRef = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generation states
  const [genStage, setGenStage] = useState<GenerationStage>('idle');
  const [genError, setGenError] = useState<{ code?: string; message: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const totalMinutes = calculateTotalDuration(input.periodsCount, input.minutesPerPeriod);
  const totalUploadBytes = input.documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);

  const updateField = <K extends keyof LessonInput>(key: K, value: LessonInput[K]) => {
    onInputChange({ ...input, [key]: value });
  };

  const updateOption = <K extends keyof LessonInput['pedagogicalOptions']>(
    key: K,
    value: LessonInput['pedagogicalOptions'][K]
  ) => {
    onInputChange({
      ...input,
      pedagogicalOptions: {
        ...input.pedagogicalOptions,
        [key]: value,
      },
    });
  };

  const applyDefaultProfile = () => {
    const level = profile.defaultLevel;
    const mins = profile.defaultMinutesByLevel[level] ?? 45;
    onInputChange({
      ...input,
      schoolName: profile.schoolName || input.schoolName,
      departmentName: profile.departmentName || input.departmentName,
      teacherName: profile.teacherName || input.teacherName,
      level,
      grade: profile.defaultGrade || input.grade,
      minutesPerPeriod: mins,
      bookSeries: profile.favoriteBookSeries || input.bookSeries,
      subject: profile.defaultSubject || input.subject || profile.favoriteSubjects[0] || '',
      classSize: profile.defaultClassSize || input.classSize,
      studentCharacteristics: profile.defaultStudentCharacteristics || input.studentCharacteristics,
      equipmentAndMaterials: profile.defaultEquipmentAndMaterials || input.equipmentAndMaterials,
    });
    onNotify('Đã áp dụng thông tin mặc định từ hồ sơ giáo viên.', 'success');
  };

  const validateStep1 = (): boolean => {
    const errs: string[] = [];
    if (!input.grade.trim()) errs.push('Vui lòng chọn hoặc nhập Lớp.');
    if (!input.subject.trim()) errs.push('Vui lòng nhập Môn học / Hoạt động giáo dục.');
    if (!input.lessonTitle.trim()) errs.push('Vui lòng nhập Tên bài học / Chủ đề.');
    if (input.periodsCount < 1 || input.minutesPerPeriod < 15) {
      errs.push('Số tiết và số phút mỗi tiết phải hợp lệ.');
    }
    setStepErrors(errs);
    return errs.length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStepErrors([]);
    onStepChange(Math.min(4, step + 1));
  };

  const goBack = () => {
    setStepErrors([]);
    onStepChange(Math.max(1, step - 1));
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDocError('');
    setUploadingDocs(true);
    let runningBytes = totalUploadBytes;
    const added: SourceDocument[] = [];

    try {
      for (const file of Array.from(files)) {
        const { doc, rawFile } = await readSourceFile(
          file,
          docRoleForUpload,
          input.documents.length + added.length,
          runningBytes
        );
        if (rawFile) rawFilesRef.current.set(doc.id, rawFile);
        runningBytes += doc.sizeBytes;
        added.push(doc);
      }
      if (added.length > 0) {
        updateField('documents', [...input.documents, ...added]);
        setExpandedDocId(added[0].id);
        onNotify(`Đã thêm ${added.length} tài liệu tham khảo.`, 'success');
      }
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Không thể đọc tài liệu đã chọn.');
    } finally {
      setUploadingDocs(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddPastedText = () => {
    const clean = sanitizePlainText(pasteText);
    if (!clean) {
      setDocError('Vui lòng dán nội dung văn bản trước khi thêm.');
      return;
    }
    setDocError('');
    const newDoc: SourceDocument = {
      id: `doc-paste-${Date.now()}`,
      name: pasteTitle.trim() || `Nội dung dán tay #${input.documents.length + 1}`,
      fileType: 'pasted',
      sizeBytes: new Blob([clean]).size,
      role: docRoleForUpload,
      order: input.documents.length,
      status: 'ready',
      extractedText: clean,
      hasPageMapping: false,
    };
    updateField('documents', [...input.documents, newDoc]);
    setPasteText('');
    setPasteTitle('');
    setExpandedDocId(newDoc.id);
    onNotify('Đã thêm văn bản tham khảo.', 'success');
  };

  const handleReExtractPdfPages = async (doc: SourceDocument, pagesExpr: string) => {
    const rawFile = rawFilesRef.current.get(doc.id);
    if (!rawFile) {
      onNotify('Tệp PDF gốc không còn trong bộ nhớ phiên này; vui lòng tải lại tệp nếu muốn trích lại trang.', 'info');
      return;
    }
    try {
      const pdfData = await extractPdfPagesText(rawFile, pagesExpr);
      updateField(
        'documents',
        input.documents.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                selectedPages: pdfData.selectedPages,
                extractedText: pdfData.extractedText,
                unreadableNotes: pdfData.unreadableNotes,
                status: pdfData.unreadableNotes ? 'warning' : 'ready',
              }
            : d
        )
      );
      onNotify(`Đã trích xuất lại trang ${pdfData.selectedPages} từ ${doc.name}.`, 'success');
    } catch {
      onNotify('Không thể trích xuất lại phạm vi trang đã chọn.', 'error');
    }
  };

  const handlePdfAiExtract = async (doc: SourceDocument) => {
    const rawFile = rawFilesRef.current.get(doc.id);
    if (!rawFile) {
      onNotify('Vui lòng tải lại tệp PDF để trích xuất bằng AI.', 'info');
      return;
    }
    updateField(
      'documents',
      input.documents.map((d) => (d.id === doc.id ? { ...d, status: 'processing' } : d))
    );
    try {
      const res = await extractPdfWithAiFallback(rawFile);
      updateField(
        'documents',
        input.documents.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                extractedText: res.extractedText,
                unreadableNotes: res.unreadableNotes,
                status: res.unreadableNotes ? 'warning' : 'ready',
              }
            : d
        )
      );
      onNotify(`Đã trích xuất nội dung ${doc.name} bằng AI.`, 'success');
    } catch (err) {
      updateField(
        'documents',
        input.documents.map((d) => (d.id === doc.id ? { ...d, status: 'warning' } : d))
      );
      onNotify(
        err instanceof Error ? err.message : 'Không thể trích xuất PDF bằng AI.',
        'error'
      );
    }
  };

  const moveDoc = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= input.documents.length) return;
    const copy = [...input.documents];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    updateField(
      'documents',
      copy.map((d, idx) => ({ ...d, order: idx }))
    );
  };

  const removeDoc = (id: string) => {
    rawFilesRef.current.delete(id);
    updateField(
      'documents',
      input.documents
        .filter((d) => d.id !== id)
        .map((d, idx) => ({ ...d, order: idx }))
    );
  };

  const handleGenerateAiPlan = async () => {
    if (!validateStep1()) {
      onStepChange(1);
      return;
    }
    if (genStage !== 'idle' && genStage !== 'error' && genStage !== 'done') return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGenError(null);
    setGenStage('processing_docs');

    const selectedTemplate = templates.find((t) => t.id === input.templateId);

    try {
      await new Promise((r) => setTimeout(r, 180));
      if (controller.signal.aborted) return;

      setGenStage('sending');
      const fetchPromise = fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, template: selectedTemplate }),
        signal: controller.signal,
      });

      setGenStage('generating');
      const res = await fetchPromise;
      if (controller.signal.aborted) return;

      setGenStage('validating');
      const data = await res.json();

      if (!res.ok) {
        setGenStage('error');
        setGenError({
          code: data.errorCode,
          message:
            data.message ||
            'Không thể tạo kế hoạch lúc này. Dữ liệu nháp của thầy/cô vẫn được giữ nguyên.',
        });
        return;
      }

      setGenStage('done');
      onGenerateComplete(data.plan as LessonPlan);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setGenStage('idle');
        onNotify('Đã dừng nhận kết quả từ phiên tạo này. Bản nháp vẫn được giữ nguyên.', 'info');
        return;
      }
      setGenStage('error');
      setGenError({
        code: 'network_error',
        message:
          'Mất kết nối mạng khi đang tạo kế hoạch. Dữ liệu nhập của thầy/cô vẫn được bảo toàn để thử lại.',
      });
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setGenStage('idle');
    }
  };

  const handleCreateManualSkeleton = () => {
    if (!validateStep1()) {
      onStepChange(1);
      return;
    }
    const selectedTemplate = templates.find((t) => t.id === input.templateId);
    const now = new Date().toISOString();
    const sessions = Array.from({ length: input.periodsCount }, (_, idx) => ({
      id: `sess-${idx + 1}`,
      sessionNumber: idx + 1,
      title: `Tiết ${idx + 1}: ${input.lessonTitle}`,
      durationMinutes: input.minutesPerPeriod,
      overviewNote: '',
    }));

    const activities = sessions.flatMap((sess) => {
      const p1 = Math.max(5, Math.round(sess.durationMinutes * 0.15));
      const p2 = Math.max(10, Math.round(sess.durationMinutes * 0.4));
      const p3 = Math.max(10, Math.round(sess.durationMinutes * 0.25));
      const p4 = Math.max(5, sess.durationMinutes - p1 - p2 - p3);

      return [
        {
          id: `act-${sess.sessionNumber}-1`,
          sessionNumber: sess.sessionNumber,
          order: 1,
          phase: 'khoi_dong' as const,
          title: `Khởi động (Tiết ${sess.sessionNumber})`,
          durationMinutes: p1,
          objectiveIds: ['obj-1'],
          taskContent: 'Đặt vấn đề và huy động kiến thức nền liên quan tới bài học.',
          expectedProduct: 'Câu trả lời hoặc dự đoán ban đầu của học sinh.',
          steps: {
            transfer: 'GV nêu tình huống mở đầu và yêu cầu thực hiện.',
            execute: 'HS suy nghĩ cá nhân / trao đổi nhanh.',
            report: '1–2 HS chia sẻ ý kiến.',
            conclude: 'GV kết nối vào nội dung trọng tâm của tiết học.',
          },
          teacherPrompts: 'Em đã biết gì về nội dung này ở bài trước?',
          studentActions: 'Quan sát, trả lời câu hỏi gợi mở.',
          groupOrganization: 'Cá nhân hoặc cặp đôi.',
          assessmentCriteria: 'Nêu được ít nhất 1 liên hệ với bài học.',
          commonMistakesAndSupport: 'Chưa nhớ khái niệm cũ -> GV gợi ý lại ngắn gọn.',
          extensionTask: '',
          contingencyPlan: 'Sử dụng bảng viết trực tiếp nếu thiếu máy chiếu.',
          linkedWorksheetIds: [],
        },
        {
          id: `act-${sess.sessionNumber}-2`,
          sessionNumber: sess.sessionNumber,
          order: 2,
          phase: 'hinh_thanh_kien_thuc' as const,
          title: `Khám phá kiến thức trọng tâm (Tiết ${sess.sessionNumber})`,
          durationMinutes: p2,
          objectiveIds: ['obj-1'],
          taskContent: input.coreContent || 'Tìm hiểu nội dung cốt lõi theo phiếu học tập.',
          expectedProduct: 'Kết quả hoàn thành nhiệm vụ khám phá.',
          steps: {
            transfer: 'GV giao nhiệm vụ và hướng dẫn tiêu chí cần đạt.',
            execute: 'HS thực hiện nhiệm vụ theo nhóm hoặc cá nhân.',
            report: 'Đại diện HS trình bày, các bạn nhận xét.',
            conclude: 'GV chuẩn hóa kiến thức trọng tâm.',
          },
          teacherPrompts: 'Hãy giải thích cơ sở cho kết luận vừa tìm được.',
          studentActions: 'Đọc tài liệu, thảo luận và ghi nhận kết quả.',
          groupOrganization: 'Nhóm 2–4 học sinh.',
          assessmentCriteria: 'Hoàn thành đúng các câu hỏi cốt lõi.',
          commonMistakesAndSupport: 'Hiểu chưa chính xác thuật ngữ -> GV lấy ví dụ minh họa.',
          extensionTask: '',
          contingencyPlan: '',
          linkedWorksheetIds: [],
        },
        {
          id: `act-${sess.sessionNumber}-3`,
          sessionNumber: sess.sessionNumber,
          order: 3,
          phase: 'luyen_tap' as const,
          title: `Luyện tập (Tiết ${sess.sessionNumber})`,
          durationMinutes: p3,
          objectiveIds: ['obj-1'],
          taskContent: 'Thực hành giải quyết bài tập củng cố kiến thức vừa học.',
          expectedProduct: 'Bài làm hoàn chỉnh của học sinh.',
          steps: {
            transfer: 'GV giao bài tập luyện tập.',
            execute: 'HS làm bài cá nhân và kiểm tra chéo.',
            report: 'HS trình bày lời giải.',
            conclude: 'GV sửa lỗi sai phổ biến và chốt cách làm.',
          },
          teacherPrompts: 'Bước nào dễ xảy ra sai sót nhất trong bài tập này?',
          studentActions: 'Giải bài tập và đối chiếu đáp án.',
          groupOrganization: 'Cá nhân.',
          assessmentCriteria: 'Làm đúng quy trình và kết quả.',
          commonMistakesAndSupport: 'Nhầm lẫn bước biến đổi -> GV hướng dẫn từng bước.',
          extensionTask: '',
          contingencyPlan: '',
          linkedWorksheetIds: [],
        },
        {
          id: `act-${sess.sessionNumber}-4`,
          sessionNumber: sess.sessionNumber,
          order: 4,
          phase: 'van_dung' as const,
          title: `Vận dụng & Tổng kết (Tiết ${sess.sessionNumber})`,
          durationMinutes: p4,
          objectiveIds: ['obj-1'],
          taskContent: 'Vận dụng kiến thức vào tình huống thực tiễn và đánh giá nhanh cuối tiết.',
          expectedProduct: 'Phương án giải quyết tình huống thực tế.',
          steps: {
            transfer: 'GV nêu bài toán vận dụng.',
            execute: 'HS thảo luận nhanh phương án.',
            report: 'HS chia sẻ câu trả lời.',
            conclude: 'GV tổng kết bài và hướng dẫn nhiệm vụ về nhà.',
          },
          teacherPrompts: 'Kiến thức hôm nay áp dụng vào tình huống nào quanh em?',
          studentActions: 'Trả lời câu hỏi vận dụng.',
          groupOrganization: 'Cả lớp.',
          assessmentCriteria: 'Nêu được hướng vận dụng hợp lý.',
          commonMistakesAndSupport: '',
          extensionTask: '',
          contingencyPlan: '',
          linkedWorksheetIds: [],
        },
      ];
    });

    const manualPlan: LessonPlan = {
      id: `plan-manual-${Date.now()}`,
      title: input.lessonTitle,
      status: 'nhap',
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
      promptVersion: PROMPT_VERSION,
      templateType:
        selectedTemplate?.structureType ||
        (input.level === 'tieu_hoc' ? 'tieu_hoc_2_cot' : 'thcs_thpt_tien_trinh'),
      tags: [input.subject, `Lớp ${input.grade}`].filter(Boolean),
      isSample: false,
      inputSnapshot: input,
      assumptions: ['Kế hoạch khởi tạo dạng khung thủ công để giáo viên trực tiếp biên soạn.'],
      objectives: [
        {
          id: 'obj-1',
          code: 'MT1',
          category: 'kien_thuc',
          title: '',
          frameworkCode: '',
          description:
            input.learningOutcomesInput.trim() ||
            `Nắm vững và vận dụng được nội dung trọng tâm của bài "${input.lessonTitle}".`,
          sourceType: input.learningOutcomesInput.trim() ? 'trich_nguon' : 'de_xuat',
          needsConfirmation: !input.learningOutcomesInput.trim(),
          sourceRef: '',
        },
      ],
      resources: [
        {
          id: 'res-1',
          actor: 'gv',
          item: input.equipmentAndMaterials || 'Bảng, phấn/bút, giáo án, tài liệu hướng dẫn.',
          usedInActivities: 'Toàn bộ tiết học',
        },
        {
          id: 'res-2',
          actor: 'hs',
          item: 'Sách giáo khoa, vở ghi, dụng cụ học tập.',
          usedInActivities: 'Toàn bộ tiết học',
        },
      ],
      sessions,
      activities,
      worksheets: [],
      questions: [],
      answerKeys: [],
      rubrics: [],
      teacherAiPrompts: [],
      homework: 'Ôn lại nội dung trọng tâm bài học và chuẩn bị bài tiếp theo.',
      objectiveEvidenceMap: [
        {
          objectiveId: 'obj-1',
          objectiveCode: 'MT1',
          activityIds: activities.map((a) => a.id),
          productEvidence: 'Bài làm và câu trả lời của học sinh',
          assessmentMethod: 'Quan sát và hỏi đáp',
        },
      ],
      sourceReferences: input.documents.map((d) => ({
        documentName: d.name,
        pageOrSection: d.selectedPages || 'Toàn bộ tài liệu',
        excerpt: d.extractedText.slice(0, 140),
        mappedTo: 'Nội dung bài học',
      })),
      itemsNeedingConfirmation: ['Bổ sung câu hỏi chi tiết và kiểm tra lại với SGK trước khi dạy.'],
      postLessonReflection: '',
    };

    onGenerateComplete(manualPlan);
  };

  const isGenerating =
    genStage === 'processing_docs' ||
    genStage === 'sending' ||
    genStage === 'generating' ||
    genStage === 'validating';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Thanh tiến trình 4 bước */}
      <nav aria-label="Tiến trình tạo kế hoạch 4 bước" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEP_TITLES.map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <li key={s.num}>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    if (s.num > 1 && !validateStep1()) return;
                    onStepChange(s.num);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isDone
                      ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isDone
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Thông báo lỗi từng bước */}
      {stepErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <p className="font-semibold">Vui lòng kiểm tra các thông tin bắt buộc:</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {stepErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* BƯỚC 1: THÔNG TIN BÀI HỌC */}
      {step === 1 && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Bước 1. Thông tin bài học
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chỉ cần điền các trường có dấu (*) để bắt đầu. Các thông tin hành chính khác có thể bổ sung sau.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyDefaultProfile}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Áp dụng hồ sơ mặc định
              </button>
              <button
                type="button"
                onClick={onTrySample}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                Thử với bài mẫu
              </button>
            </div>
          </div>

          {/* Nhóm trường thiết yếu */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="wiz-level" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Cấp học <span className="text-rose-600">*</span>
              </label>
              <select
                id="wiz-level"
                value={input.level}
                onChange={(e) => {
                  const lvl = e.target.value as EducationLevel;
                  const defaultMins = profile.defaultMinutesByLevel[lvl] ?? (lvl === 'tieu_hoc' ? 35 : 45);
                  onInputChange({
                    ...input,
                    level: lvl,
                    minutesPerPeriod: defaultMins,
                    templateId:
                      lvl === 'tieu_hoc' ? 'tpl-tieu-hoc-2-cot' : input.templateId,
                  });
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {(Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[]).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {EDUCATION_LEVEL_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="wiz-grade" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Lớp <span className="text-rose-600">*</span>
              </label>
              <input
                id="wiz-grade"
                type="text"
                value={input.grade}
                onChange={(e) => updateField('grade', e.target.value)}
                placeholder="Ví dụ: 8, 5A, 10..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="wiz-subject" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Môn học / Hoạt động giáo dục <span className="text-rose-600">*</span>
              </label>
              <input
                id="wiz-subject"
                type="text"
                value={input.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="Ví dụ: Toán, Ngữ văn, Tin học, Khoa học tự nhiên..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="wiz-book" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Bộ sách / Nguồn chương trình
              </label>
              <input
                id="wiz-book"
                list="book-series-list"
                value={input.bookSeries}
                onChange={(e) => updateField('bookSeries', e.target.value)}
                placeholder="Chọn hoặc tự nhập tên bộ sách"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <datalist id="book-series-list">
                {BOOK_SERIES_OPTIONS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="wiz-title" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Tên bài học / Chủ đề <span className="text-rose-600">*</span>
              </label>
              <input
                id="wiz-title"
                type="text"
                value={input.lessonTitle}
                onChange={(e) => updateField('lessonTitle', e.target.value)}
                placeholder="Ví dụ: Bài 15. Định lí Thalès trong tam giác"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="wiz-type" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Loại bài dạy
              </label>
              <select
                id="wiz-type"
                value={input.lessonType}
                onChange={(e) => updateField('lessonType', e.target.value as LessonType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="bai_moi">Bài kiến thức mới</option>
                <option value="luyen_tap">Bài luyện tập</option>
                <option value="thuc_hanh">Bài thực hành / thí nghiệm</option>
                <option value="on_tap">Bài ôn tập</option>
                <option value="du_an">Bài học dự án</option>
              </select>
            </div>

            <div>
              <label htmlFor="wiz-template" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Mẫu kế hoạch bài dạy
              </label>
              <select
                id="wiz-template"
                value={input.templateId}
                onChange={(e) => updateField('templateId', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {input.lessonType === 'on_tap' && (
              <div className="sm:col-span-2">
                <label htmlFor="wiz-review-scope" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phạm vi kiến thức ôn tập
                </label>
                <input
                  id="wiz-review-scope"
                  type="text"
                  value={input.reviewScope}
                  onChange={(e) => updateField('reviewScope', e.target.value)}
                  placeholder="Ví dụ: Chương II (Bài 4 đến Bài 8) — tập trung sửa lỗi tính toán..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            {/* Thời lượng */}
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div>
                <label htmlFor="wiz-periods" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Số tiết <span className="text-rose-600">*</span>
                </label>
                <input
                  id="wiz-periods"
                  type="number"
                  min={1}
                  max={12}
                  value={input.periodsCount}
                  onChange={(e) => updateField('periodsCount', Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="wiz-minutes" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phút / tiết <span className="text-rose-600">*</span>
                </label>
                <input
                  id="wiz-minutes"
                  type="number"
                  min={15}
                  max={90}
                  value={input.minutesPerPeriod}
                  onChange={(e) =>
                    updateField('minutesPerPeriod', Math.max(15, Number(e.target.value) || 45))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tổng thời lượng
                </span>
                <div className="flex h-[38px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-indigo-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-indigo-300">
                  {totalMinutes} phút
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="wiz-sequence" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Cách tổ chức tiến trình
              </label>
              <select
                id="wiz-sequence"
                value={input.sequenceMode}
                onChange={(e) => updateField('sequenceMode', e.target.value as SequenceMode)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="chia_tung_tiet">Chia rõ từng tiết</option>
                <option value="xuyen_suot">Tiến trình xuyên suốt các tiết</option>
              </select>
            </div>

            <div>
              <label htmlFor="wiz-lang" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Ngôn ngữ kế hoạch
              </label>
              <select
                id="wiz-lang"
                value={input.outputLanguage}
                onChange={(e) => updateField('outputLanguage', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Tiếng Anh (English)">Tiếng Anh (English)</option>
                <option value="Song ngữ Việt - Anh">Song ngữ Việt - Anh</option>
              </select>
            </div>
          </div>

          {/* Thu gọn: Thông tin hành chính */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdminFields((v) => !v)}
              aria-expanded={showAdminFields}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              <span>Thông tin hành chính (Trường, Tổ chuyên môn, Giáo viên, Ngày dạy)</span>
              {showAdminFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAdminFields && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="wiz-school" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Trường
                  </label>
                  <input
                    id="wiz-school"
                    type="text"
                    value={input.schoolName}
                    onChange={(e) => updateField('schoolName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-dept" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Tổ chuyên môn
                  </label>
                  <input
                    id="wiz-dept"
                    type="text"
                    value={input.departmentName}
                    onChange={(e) => updateField('departmentName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-teacher" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Họ tên giáo viên
                  </label>
                  <input
                    id="wiz-teacher"
                    type="text"
                    value={input.teacherName}
                    onChange={(e) => updateField('teacherName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="wiz-prep-date" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                      Ngày soạn
                    </label>
                    <input
                      id="wiz-prep-date"
                      type="date"
                      value={input.prepareDate}
                      onChange={(e) => updateField('prepareDate', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="wiz-teach-date" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                      Ngày dạy
                    </label>
                    <input
                      id="wiz-teach-date"
                      type="date"
                      value={input.teachDate}
                      onChange={(e) => updateField('teachDate', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Thu gọn: Định hướng nội dung chuyên sâu */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvancedContent((v) => !v)}
              aria-expanded={showAdvancedContent}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              <span>Định hướng nội dung & Yêu cầu cần đạt (nâng cao, tùy chọn)</span>
              {showAdvancedContent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAdvancedContent && (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="wiz-outcomes" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Yêu cầu cần đạt (từ chương trình hoặc giáo viên xác định)
                  </label>
                  <textarea
                    id="wiz-outcomes"
                    rows={2}
                    value={input.learningOutcomesInput}
                    onChange={(e) => updateField('learningOutcomesInput', e.target.value)}
                    placeholder="Dán yêu cầu cần đạt chính thức nếu có..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="wiz-core" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Nội dung cốt lõi cần nhấn mạnh
                  </label>
                  <textarea
                    id="wiz-core"
                    rows={2}
                    value={input.coreContent}
                    onChange={(e) => updateField('coreContent', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="wiz-prior" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                      Kiến thức nền học sinh đã có
                    </label>
                    <input
                      id="wiz-prior"
                      type="text"
                      value={input.priorKnowledge}
                      onChange={(e) => updateField('priorKnowledge', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="wiz-excluded" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                      Phạm vi không đưa vào bài này
                    </label>
                    <input
                      id="wiz-excluded"
                      type="text"
                      value={input.excludedScope}
                      onChange={(e) => updateField('excludedScope', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="wiz-custom-req" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Yêu cầu riêng của giáo viên
                  </label>
                  <textarea
                    id="wiz-custom-req"
                    rows={2}
                    value={input.teacherCustomRequests}
                    onChange={(e) => updateField('teacherCustomRequests', e.target.value)}
                    placeholder="Ví dụ: Bắt đầu bằng tình huống thực tế ở địa phương, giảm bớt lý thuyết hàn lâm..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BƯỚC 2: TÀI LIỆU & BỐI CẢNH LỚP */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Khu vực tài liệu đầu vào */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Bước 2. Tài liệu tham khảo & Bối cảnh lớp học
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Hỗ trợ PDF, DOCX, TXT, ảnh PNG/JPEG (tối đa 10 MB/tệp, tổng 20 MB) hoặc dán văn bản trực tiếp.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                Lưu ý bảo vệ dữ liệu: Không tải lên danh sách họ tên, số điện thoại hoặc thông tin cá nhân của học sinh. Nội dung tài liệu trích xuất sẽ được gửi tới dịch vụ AI khi thầy/cô bấm tạo kế hoạch.
              </span>
            </div>

            {/* Chọn vai trò tài liệu trước khi tải */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="doc-role-select" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Loại tài liệu sắp thêm
                </label>
                <select
                  id="doc-role-select"
                  value={docRoleForUpload}
                  onChange={(e) => setDocRoleForUpload(e.target.value as SourceDocRole)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {(Object.keys(DOC_ROLE_LABELS) as SourceDocRole[]).map((role) => (
                    <option key={role} value={role}>
                      {DOC_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end text-xs text-slate-500 dark:text-slate-400">
                Tổng dung lượng đã tải: <span className="ml-1 font-semibold tabular-nums">{formatBytes(totalUploadBytes)}</span> / 20 MB
              </div>
            </div>

            {/* Vùng kéo thả */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                  : 'border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40'
              }`}
            >
              <FileUp className="h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Kéo thả tệp vào đây hoặc chọn từ máy
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Chấp nhận: .pdf, .docx, .txt, .png, .jpg, .jpeg
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="sr-only"
                id="wizard-file-input"
              />
              <button
                type="button"
                disabled={uploadingDocs}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {uploadingDocs ? 'Đang trích xuất tài liệu...' : 'Chọn tệp từ thiết bị'}
              </button>
            </div>

            {docError && (
              <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {docError}
              </div>
            )}

            {/* Dán nội dung trực tiếp */}
            <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Hoặc dán đoạn văn bản bài học / yêu cầu cần đạt
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Tên gợi nhớ (ví dụ: SGK trang 42)"
                  aria-label="Tên gợi nhớ đoạn văn bản dán"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <div className="sm:col-span-2 flex gap-2">
                  <textarea
                    rows={2}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Dán nội dung văn bản tham khảo tại đây..."
                    aria-label="Nội dung văn bản dán"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddPastedText}
                    className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách tài liệu đã thêm */}
            {input.documents.length > 0 && (
              <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Danh sách tài liệu theo thứ tự ưu tiên ({input.documents.length})
                </h3>
                {input.documents.map((doc, idx) => {
                  const isOpen = expandedDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {idx + 1}. {doc.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {doc.fileType.toUpperCase()} · {formatBytes(doc.sizeBytes)} ·{' '}
                              {DOC_ROLE_LABELS[doc.role]}
                              {doc.pageCount ? ` · ${doc.pageCount} trang` : ''}
                              {' · '}
                              {doc.status === 'processing'
                                ? 'Đang xử lý'
                                : doc.status === 'warning'
                                ? 'Cần kiểm tra nội dung'
                                : 'Sẵn sàng'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveDoc(idx, -1)}
                            disabled={idx === 0}
                            aria-label={`Đưa ${doc.name} lên`}
                            title="Đưa lên"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-white disabled:opacity-40 dark:hover:bg-slate-700"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDoc(idx, 1)}
                            disabled={idx === input.documents.length - 1}
                            aria-label={`Đưa ${doc.name} xuống`}
                            title="Đưa xuống"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-white disabled:opacity-40 dark:hover:bg-slate-700"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedDocId(isOpen ? null : doc.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-white dark:text-indigo-400 dark:hover:bg-slate-700"
                          >
                            {isOpen ? 'Thu gọn' : 'Xem & sửa nội dung'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDoc(doc.id)}
                            aria-label={`Xóa tài liệu ${doc.name}`}
                            title="Xóa tài liệu"
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {doc.unreadableNotes && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          Lưu ý: {doc.unreadableNotes}
                        </p>
                      )}

                      {isOpen && (
                        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                                Vai trò tài liệu
                              </label>
                              <select
                                value={doc.role}
                                onChange={(e) =>
                                  updateField(
                                    'documents',
                                    input.documents.map((d) =>
                                      d.id === doc.id ? { ...d, role: e.target.value as SourceDocRole } : d
                                    )
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                              >
                                {(Object.keys(DOC_ROLE_LABELS) as SourceDocRole[]).map((role) => (
                                  <option key={role} value={role}>
                                    {DOC_ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {doc.fileType === 'pdf' && doc.pageCount && (
                              <div>
                                <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                                  Chọn trang PDF cần dùng (1–{doc.pageCount})
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={doc.selectedPages || `1-${doc.pageCount}`}
                                    onChange={(e) =>
                                      updateField(
                                        'documents',
                                        input.documents.map((d) =>
                                          d.id === doc.id ? { ...d, selectedPages: e.target.value } : d
                                        )
                                      )
                                    }
                                    placeholder="Ví dụ: 1-3, 5"
                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReExtractPdfPages(
                                        doc,
                                        doc.selectedPages || `1-${doc.pageCount}`
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                                  >
                                    Lấy trang
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePdfAiExtract(doc)}
                                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                                  >
                                    Đọc bằng AI
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                              Nội dung đã trích xuất (thầy/cô có thể chỉnh sửa trực tiếp trước khi dùng)
                            </label>
                            <textarea
                              rows={5}
                              value={doc.extractedText}
                              onChange={(e) =>
                                updateField(
                                  'documents',
                                  input.documents.map((d) =>
                                    d.id === doc.id ? { ...d, extractedText: e.target.value } : d
                                  )
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bối cảnh lớp học */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <button
              type="button"
              onClick={() => setShowContextFields((v) => !v)}
              aria-expanded={showContextFields}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Bối cảnh lớp học & Điều kiện thiết bị (tùy chọn)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Giúp thiết kế hoạt động sát sĩ số, thiết bị thực tế và nhu cầu hỗ trợ học sinh (chỉ mô tả nhu cầu chung, không ghi tên riêng HS).
                </p>
              </div>
              {showContextFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showContextFields && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
                <div>
                  <label htmlFor="ctx-size" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Sĩ số lớp
                  </label>
                  <input
                    id="ctx-size"
                    type="number"
                    min={1}
                    max={120}
                    value={input.classSize ?? ''}
                    onChange={(e) =>
                      updateField('classSize', e.target.value ? Number(e.target.value) : null)
                    }
                    placeholder="Ví dụ: 40"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="ctx-net" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Kết nối Internet tại lớp
                  </label>
                  <select
                    id="ctx-net"
                    value={input.internetAccess}
                    onChange={(e) =>
                      updateField('internetAccess', e.target.value as LessonInput['internetAccess'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="co_on_dinh">Có Internet ổn định</option>
                    <option value="han_che">Internet hạn chế / chập chờn</option>
                    <option value="khong_co">Không có Internet</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ctx-devices" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Thiết bị học sinh được sử dụng
                  </label>
                  <input
                    id="ctx-devices"
                    type="text"
                    value={input.studentDevices}
                    onChange={(e) => updateField('studentDevices', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="ctx-space" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Không gian lớp học
                  </label>
                  <input
                    id="ctx-space"
                    type="text"
                    value={input.classroomSpace}
                    onChange={(e) => updateField('classroomSpace', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ctx-equip" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Thiết bị & vật liệu sẵn có của giáo viên/nhà trường
                  </label>
                  <input
                    id="ctx-equip"
                    type="text"
                    value={input.equipmentAndMaterials}
                    onChange={(e) => updateField('equipmentAndMaterials', e.target.value)}
                    placeholder="Máy chiếu, bảng phụ, bộ thí nghiệm, giấy A0..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="ctx-char" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Đặc điểm học sinh
                  </label>
                  <textarea
                    id="ctx-char"
                    rows={2}
                    value={input.studentCharacteristics}
                    onChange={(e) => updateField('studentCharacteristics', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="ctx-diff" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Khó khăn / lỗi thường gặp của học sinh
                  </label>
                  <textarea
                    id="ctx-diff"
                    rows={2}
                    value={input.commonDifficulties}
                    onChange={(e) => updateField('commonDifficulties', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="ctx-inclusive" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Nhu cầu hỗ trợ học hòa nhập (không ghi tên riêng HS)
                  </label>
                  <input
                    id="ctx-inclusive"
                    type="text"
                    value={input.inclusiveContextNotes}
                    onChange={(e) => updateField('inclusiveContextNotes', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="ctx-local" className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    Đặc điểm địa phương (nếu muốn gắn thực tế)
                  </label>
                  <input
                    id="ctx-local"
                    type="text"
                    value={input.localContext}
                    onChange={(e) => updateField('localContext', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BƯỚC 3: YÊU CẦU THIẾT KẾ */}
      {step === 3 && (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Bước 3. Tùy chọn phương pháp, học liệu & tích hợp
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Chỉ bật những mục thực sự phù hợp với tiết dạy. Khi bật, các trường chi tiết tương ứng sẽ mở ra.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Phương pháp dạy học tích cực */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.activeMethods}
                onChange={(e) => updateOption('activeMethods', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Phương pháp dạy học tích cực
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Thảo luận nhóm, dạy học giải quyết vấn đề, trạm học tập...
                </span>
              </div>
            </label>

            {/* Trò chơi */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.games}
                onChange={(e) => updateOption('games', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Trò chơi học tập
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Khởi động hoặc củng cố nhanh phù hợp lứa tuổi.
                </span>
              </div>
            </label>

            {/* Phiếu cá nhân */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.individualWorksheet}
                onChange={(e) => updateOption('individualWorksheet', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Phiếu học tập cá nhân
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tạo sẵn nhiệm vụ in phát cho từng học sinh.
                </span>
              </div>
            </label>

            {/* Phiếu nhóm */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.groupWorksheet}
                onChange={(e) => updateOption('groupWorksheet', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Phiếu học tập nhóm
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Kèm phân công vai trò và thời gian thảo luận.
                </span>
              </div>
            </label>

            {/* Câu hỏi củng cố */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.reviewQuestions}
                onChange={(e) => updateOption('reviewQuestions', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Câu hỏi củng cố & Đáp án
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tự chọn dạng câu hỏi và số lượng.
                </span>
              </div>
            </label>

            {/* Rubric */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.rubric}
                onChange={(e) => updateOption('rubric', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Bảng kiểm & Rubric đánh giá
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Đánh giá sản phẩm học tập theo tiêu chí rõ ràng.
                </span>
              </div>
            </label>

            {/* STEM */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.stem}
                onChange={(e) => updateOption('stem', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Giáo dục STEM / STEAM
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Gồm vấn đề, tiêu chí, thiết kế, thử nghiệm và cải tiến.
                </span>
              </div>
            </label>

            {/* Năng lực số */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.digitalCompetence}
                onChange={(e) => updateOption('digitalCompetence', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Tích hợp Năng lực số
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Theo ({CV_3456_INFO.compactCode})
                </span>
              </div>
            </label>

            {/* Sử dụng AI */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.aiUsage}
                onChange={(e) => updateOption('aiUsage', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Khung nội dung AI & Hướng dẫn dùng AI có kiểm chứng
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Theo ({QD_2422_INFO.compactCode}) · 4 miền NLa–NLd
                </span>
              </div>
            </label>

            {/* Hỗ trợ học hòa nhập */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.inclusiveSupport}
                onChange={(e) => updateOption('inclusiveSupport', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Hỗ trợ học hòa nhập
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Điều chỉnh nhiệm vụ theo nhu cầu hỗ trợ thực tế.
                </span>
              </div>
            </label>

            {/* Các mục tích hợp phụ */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.cyberSafety}
                onChange={(e) => updateOption('cyberSafety', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  An toàn mạng
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Kỹ năng bảo mật và ứng xử an toàn trên không gian số.
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.ethicsLifestyle}
                onChange={(e) => updateOption('ethicsLifestyle', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Đạo đức, lối sống
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Lồng ghép giáo dục phẩm chất qua hành động cụ thể.
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.environmentalProtection}
                onChange={(e) => updateOption('environmentalProtection', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Bảo vệ môi trường
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Liên hệ tiết kiệm năng lượng, giảm rác thải trong bài học.
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.gdqpan}
                onChange={(e) => updateOption('gdqpan', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Giáo dục quốc phòng và an ninh
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Lồng ghép phù hợp môn Lịch sử, Địa lí, GDCD...
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 sm:col-span-2">
              <input
                type="checkbox"
                checked={input.pedagogicalOptions.otherIntegration}
                onChange={(e) => updateOption('otherIntegration', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <div>
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                  Nội dung tích hợp khác
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tự nhập chủ đề tích hợp (ví dụ: Di sản văn hóa địa phương, Hướng nghiệp...).
                </span>
              </div>
            </label>
          </div>

          {/* Các trường điều kiện chỉ mở khi bật */}
          <div className="space-y-4">
            {input.pedagogicalOptions.activeMethods && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <label htmlFor="opt-active-methods" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phương pháp dạy học tích cực mong muốn
                </label>
                <input
                  id="opt-active-methods"
                  type="text"
                  value={input.pedagogicalOptions.activeMethodNames}
                  onChange={(e) => updateOption('activeMethodNames', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            )}

            {input.pedagogicalOptions.reviewQuestions && (
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 sm:grid-cols-2">
                <div>
                  <label htmlFor="opt-q-format" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Dạng câu hỏi củng cố
                  </label>
                  <input
                    id="opt-q-format"
                    type="text"
                    value={input.pedagogicalOptions.questionFormat}
                    onChange={(e) => updateOption('questionFormat', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="opt-q-count" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Số lượng câu hỏi
                  </label>
                  <input
                    id="opt-q-count"
                    type="number"
                    min={1}
                    max={20}
                    value={input.pedagogicalOptions.questionCount}
                    onChange={(e) =>
                      updateOption('questionCount', Math.max(1, Number(e.target.value) || 4))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {input.pedagogicalOptions.stem && (
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 sm:grid-cols-3">
                <div>
                  <label htmlFor="opt-stem-mat" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Vật liệu STEM dự kiến
                  </label>
                  <input
                    id="opt-stem-mat"
                    type="text"
                    value={input.pedagogicalOptions.stemMaterials}
                    onChange={(e) => updateOption('stemMaterials', e.target.value)}
                    placeholder="Bìa cứng, que gỗ, dây thun..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="opt-stem-cost" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Giới hạn chi phí
                  </label>
                  <input
                    id="opt-stem-cost"
                    type="text"
                    value={input.pedagogicalOptions.stemBudgetLimit}
                    onChange={(e) => updateOption('stemBudgetLimit', e.target.value)}
                    placeholder="Dưới 20.000đ/nhóm hoặc tái chế"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="opt-stem-prod" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Sản phẩm mong muốn
                  </label>
                  <input
                    id="opt-stem-prod"
                    type="text"
                    value={input.pedagogicalOptions.stemProduct}
                    onChange={(e) => updateOption('stemProduct', e.target.value)}
                    placeholder="Mô hình cầu, mạch điện đơn giản..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {input.pedagogicalOptions.digitalCompetence && (() => {
              const nlsBand = getNlsBandForGrade(input.grade);
              const nlsChips = getNlsQuickChips(input.subject);
              return (
                <div className="space-y-3 rounded-xl border border-indigo-100 bg-slate-50 p-4 dark:border-indigo-900/40 dark:bg-slate-800/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
                      Khung Năng lực số ({CV_3456_INFO.compactCode})
                    </p>
                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                      Bậc {nlsBand.code} ({nlsBand.levelName})
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {nlsBand.description} AI sẽ gắn mã chỉ báo chuẩn (1.1–6.3) kèm &ldquo;địa chỉ&rdquo; tích hợp rõ trong từng hoạt động, không gây quá tải.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {nlsChips.map((chip) => {
                      const active = input.pedagogicalOptions.digitalCompetenceNotes.includes(chip.code);
                      return (
                        <button
                          key={chip.code}
                          type="button"
                          onClick={() => {
                            const current = input.pedagogicalOptions.digitalCompetenceNotes.trim();
                            const next = active
                              ? current
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter((s) => s && !s.includes(chip.code))
                                  .join(', ')
                              : current
                              ? `${current}, ${chip.label}`
                              : chip.label;
                            updateOption('digitalCompetenceNotes', next);
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            active
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label htmlFor="opt-digital" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Chỉ báo Năng lực số chọn tích hợp (theo CV 3456)
                    </label>
                    <input
                      id="opt-digital"
                      type="text"
                      value={input.pedagogicalOptions.digitalCompetenceNotes}
                      onChange={(e) => updateOption('digitalCompetenceNotes', e.target.value)}
                      placeholder="Bấm chọn nhanh ở trên hoặc nhập chỉ báo (ví dụ: 1.1, 3.4 Lập trình, 5.2)..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
              );
            })()}

            {input.pedagogicalOptions.aiUsage && (() => {
              const aiChips = getAiQuickChips(input.grade);
              return (
                <div className="space-y-3 rounded-xl border border-teal-100 bg-slate-50 p-4 dark:border-teal-900/40 dark:bg-slate-800/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-teal-900 dark:text-teal-300">
                      Khung nội dung giáo dục AI ({QD_2422_INFO.compactCode})
                    </p>
                    <span className="rounded-lg bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                      Lớp {input.grade || '10'} · Không tách đầu điểm riêng
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Bám sát 4 miền NLa–NLd, yêu cầu khai báo minh bạch phần sử dụng AI, đánh giá quá trình qua minh chứng và luôn có phương án không phụ thuộc tài khoản trả phí.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiChips.map((chip) => {
                      const active = input.pedagogicalOptions.aiVerificationRule.includes(chip.code);
                      return (
                        <button
                          key={chip.code}
                          type="button"
                          onClick={() => {
                            const current = input.pedagogicalOptions.aiVerificationRule.trim();
                            const marker = `[${chip.code}]`;
                            const next = active
                              ? current.replace(marker, '').replace(/\s{2,}/g, ' ').trim()
                              : current
                              ? `${current} ${marker}`
                              : marker;
                            updateOption('aiVerificationRule', next);
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            active
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="opt-ai-tool" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Công cụ AI dự kiến
                      </label>
                      <input
                        id="opt-ai-tool"
                        type="text"
                        value={input.pedagogicalOptions.aiToolName}
                        onChange={(e) => updateOption('aiToolName', e.target.value)}
                        placeholder="Trợ lý hỏi đáp trên máy GV..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="opt-ai-dev" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Thiết bị sử dụng
                      </label>
                      <input
                        id="opt-ai-dev"
                        type="text"
                        value={input.pedagogicalOptions.aiDeviceContext}
                        onChange={(e) => updateOption('aiDeviceContext', e.target.value)}
                        placeholder="Máy tính GV và máy chiếu chung"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="opt-ai-rule" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Yêu cầu kiểm chứng & mã QĐ 2422
                      </label>
                      <input
                        id="opt-ai-rule"
                        type="text"
                        value={input.pedagogicalOptions.aiVerificationRule}
                        onChange={(e) => updateOption('aiVerificationRule', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {input.pedagogicalOptions.inclusiveSupport && (
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 sm:grid-cols-2">
                <div>
                  <label htmlFor="opt-inc-need" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nhu cầu hỗ trợ học sinh (không ghi tên riêng)
                  </label>
                  <input
                    id="opt-inc-need"
                    type="text"
                    value={input.pedagogicalOptions.inclusiveNeed}
                    onChange={(e) => updateOption('inclusiveNeed', e.target.value)}
                    placeholder="Ví dụ: Cần chữ lớn, cần phiếu hướng dẫn từng bước..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="opt-inc-adj" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Hình thức điều chỉnh mong muốn
                  </label>
                  <input
                    id="opt-inc-adj"
                    type="text"
                    value={input.pedagogicalOptions.inclusiveAdjustment}
                    onChange={(e) => updateOption('inclusiveAdjustment', e.target.value)}
                    placeholder="Ví dụ: Thêm gợi ý bước 1, tăng thời gian trả lời..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {input.pedagogicalOptions.otherIntegration && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <label htmlFor="opt-other-int" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mô tả nội dung tích hợp khác
                </label>
                <input
                  id="opt-other-int"
                  type="text"
                  value={input.pedagogicalOptions.otherIntegrationNotes}
                  onChange={(e) => updateOption('otherIntegrationNotes', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* BƯỚC 4: KIỂM TRA VÀ TẠO */}
      {step === 4 && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Bước 4. Kiểm tra tóm tắt & Tạo kế hoạch
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Rà soát nhanh các thông số trước khi gửi yêu cầu tạo kế hoạch bài dạy.
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Tên bài học</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                {input.lessonTitle}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Môn · Lớp · Bộ sách</dt>
              <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {input.subject} · Lớp {input.grade} · {input.bookSeries || 'Không ghi'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Thời lượng</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-slate-800 dark:text-slate-200">
                {input.periodsCount} tiết × {input.minutesPerPeriod} phút = {totalMinutes} phút
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Tài liệu đính kèm</dt>
              <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {input.documents.length > 0
                  ? `${input.documents.length} tài liệu (${input.documents.map((d) => d.name).join(', ')})`
                  : 'Không có (tạo từ thông tin nhập tay)'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500 dark:text-slate-400">Tùy chọn sư phạm đã bật</dt>
              <dd className="mt-0.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {summarizeSelectedIntegrations(input).join(' · ') || 'Cấu trúc tiêu chuẩn'}
              </dd>
            </div>
          </dl>

          {/* Trạng thái AI thật */}
          {aiStatus && !aiStatus.configured && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Cần cấu hình kết nối AI</p>
                <p className="mt-0.5 leading-relaxed">
                  {aiStatus.message} Thầy/cô vẫn có thể chọn nút &ldquo;Tạo khung kế hoạch thủ công&rdquo; bên dưới để tự soạn thảo và xuất Word.
                </p>
              </div>
            </div>
          )}

          {/* Tiến trình thật khi đang tạo */}
          {isGenerating && (
            <div
              aria-live="polite"
              className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm font-medium text-indigo-900 dark:text-indigo-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {genStage === 'processing_docs' && 'Đang xử lý tài liệu và ràng buộc thời lượng...'}
                    {genStage === 'sending' && 'Đang gửi yêu cầu tới máy chủ...'}
                    {genStage === 'generating' && 'Đang tạo kế hoạch bài dạy theo cấu trúc...'}
                    {genStage === 'validating' && 'Đang kiểm tra cấu trúc và liên kết mục tiêu...'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Dừng</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-indigo-700/80 dark:text-indigo-300/80">
                Nếu bấm Dừng, trình duyệt sẽ hủy chờ phản hồi và giữ nguyên bản nháp hiện tại.
              </p>
            </div>
          )}

          {/* Thông báo lỗi rõ ràng */}
          {genStage === 'error' && genError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="space-y-1">
                <p className="font-semibold">Không thể hoàn tất tạo kế hoạch bằng AI</p>
                <p>{genError.message}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleCreateManualSkeleton}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Tạo khung kế hoạch thủ công
            </button>
            <button
              type="button"
              disabled={isGenerating || (aiStatus !== null && !aiStatus.configured)}
              onClick={handleGenerateAiPlan}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isGenerating ? 'Đang tạo kế hoạch...' : 'Tạo kế hoạch bằng AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Điều hướng quay lại / tiếp tục */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || isGenerating}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </button>

        {step < 4 && (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <span>Tiếp tục</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
