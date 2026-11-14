import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Focus,
  History,
  Info,
  Loader2,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Sparkles,
  SpellCheck2,
  Square,
  Trash2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import {
  AiActivityEditProposal,
  AiStatusInfo,
  AppSettings,
  GrammarCheckScope,
  GrammarStyleSuggestion,
  LearningActivity,
  LearningObjective,
  LessonPlan,
  PlanVersion,
  ValidationIssue,
} from '../types/lesson';
import {
  applyGrammarSuggestionToPlan,
  computePlanDurations,
  createPlanVersionSnapshot,
  validateLessonPlanCode,
} from '../lib/lessonLogic';
import { exportLessonPlanToDocx } from '../lib/docxExporter';
import { A4PreviewModal } from '../components/A4PreviewModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface EditorViewProps {
  plan: LessonPlan;
  versions: PlanVersion[];
  settings: AppSettings;
  aiStatus: AiStatusInfo | null;
  saveStatusText: string;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onUpdatePlan: (nextPlan: LessonPlan, recordUndo?: boolean) => void;
  onSaveVersion: (version: PlanVersion) => Promise<void>;
  onSaveAsTemplate: (plan: LessonPlan) => Promise<void>;
  onSaveSampleToLibrary: (plan: LessonPlan) => Promise<void>;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AI_QUICK_COMMANDS = [
  'Viết chi tiết hơn',
  'Rút gọn cho vừa thời lượng',
  'Đơn giản hóa cho học sinh dễ hiểu',
  'Tăng mức độ vận dụng thực tế',
  'Thêm phương án hỗ trợ học sinh',
  'Chuyển sang hoạt động nhóm',
  'Thay bằng hoạt động không cần Internet',
  'Bổ sung phiếu học tập chi tiết',
  'Tạo thêm câu hỏi và đáp án',
  'Bổ sung tiêu chí rubric rõ hơn',
  'Điều chỉnh theo thời lượng mới',
];

type RightTab = 'assistant' | 'quality' | 'grammar';

export function EditorView({
  plan,
  versions,
  settings,
  aiStatus,
  saveStatusText,
  focusMode,
  onToggleFocusMode,
  onUpdatePlan,
  onSaveVersion,
  onSaveAsTemplate,
  onSaveSampleToLibrary,
  onNotify,
}: EditorViewProps) {
  const [undoStack, setUndoStack] = useState<LessonPlan[]>([]);
  const [redoStack, setRedoStack] = useState<LessonPlan[]>([]);
  const [rightOpen, setRightOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [rightTab, setRightTab] = useState<RightTab>('quality');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Selected activity for AI assistant
  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    plan.activities[0]?.id || ''
  );
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [aiEditProposal, setAiEditProposal] = useState<AiActivityEditProposal | null>(null);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const activityDirtyTimestampRef = useRef<number>(0);
  const aiAbortRef = useRef<AbortController | null>(null);

  // AI Semantic Quality Review
  const [aiReviewIssues, setAiReviewIssues] = useState<ValidationIssue[]>([]);
  const [aiReviewing, setAiReviewing] = useState(false);

  // AI Grammar & Style Checker
  const [grammarScope, setGrammarScope] = useState<GrammarCheckScope>('all');
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [grammarSuggestions, setGrammarSuggestions] = useState<
    Array<GrammarStyleSuggestion & { dismissed?: boolean; applied?: boolean }>
  >([]);
  const [grammarError, setGrammarError] = useState('');
  const grammarAbortRef = useRef<AbortController | null>(null);

  // Confirm delete session/activity
  const [confirmRestoreVer, setConfirmRestoreVer] = useState<PlanVersion | null>(null);

  useEffect(() => {
    if (!plan.activities.some((a) => a.id === selectedActivityId)) {
      setSelectedActivityId(plan.activities[0]?.id || '');
    }
  }, [plan.activities, selectedActivityId]);

  const durations = useMemo(() => computePlanDurations(plan), [plan]);
  const codeIssues = useMemo(() => validateLessonPlanCode(plan), [plan]);

  const applyChange = (updater: (current: LessonPlan) => LessonPlan, pushUndo = true) => {
    if (pushUndo) {
      setUndoStack((prev) => [...prev.slice(-29), JSON.parse(JSON.stringify(plan)) as LessonPlan]);
      setRedoStack([]);
    }
    const next = updater(plan);
    onUpdatePlan({ ...next, updatedAt: new Date().toISOString() });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(plan)) as LessonPlan]);
    onUpdatePlan(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(plan)) as LessonPlan]);
    onUpdatePlan(next);
  };

  const scrollToSection = (sectionId: string, activityId?: string) => {
    if (activityId) setSelectedActivityId(activityId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateActivity = (activityId: string, patch: Partial<LearningActivity>) => {
    if (activityId === selectedActivityId) {
      activityDirtyTimestampRef.current = Date.now();
    }
    applyChange((curr) => ({
      ...curr,
      activities: curr.activities.map((a) => (a.id === activityId ? { ...a, ...patch } : a)),
    }));
  };

  const moveActivity = (activityId: string, dir: -1 | 1) => {
    applyChange((curr) => {
      const target = curr.activities.find((a) => a.id === activityId);
      if (!target) return curr;
      const sameSession = curr.activities
        .filter((a) => a.sessionNumber === target.sessionNumber)
        .sort((a, b) => a.order - b.order);
      const idx = sameSession.findIndex((a) => a.id === activityId);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sameSession.length) return curr;
      const copy = [...sameSession];
      const [moved] = copy.splice(idx, 1);
      copy.splice(swapIdx, 0, moved);
      const reordered = copy.map((a, i) => ({ ...a, order: i + 1 }));
      const others = curr.activities.filter((a) => a.sessionNumber !== target.sessionNumber);
      return {
        ...curr,
        activities: [...others, ...reordered].sort(
          (a, b) => a.sessionNumber - b.sessionNumber || a.order - b.order
        ),
      };
    });
  };

  const addActivityToSession = (sessionNumber: number) => {
    const newId = `act-${Date.now()}`;
    applyChange((curr) => {
      const existing = curr.activities.filter((a) => a.sessionNumber === sessionNumber);
      const nextAct: LearningActivity = {
        id: newId,
        sessionNumber,
        order: existing.length + 1,
        phase: 'luyen_tap',
        title: `Hoạt động mới (Tiết ${sessionNumber})`,
        durationMinutes: 10,
        objectiveIds: curr.objectives[0] ? [curr.objectives[0].id] : [],
        taskContent: 'Mô tả nhiệm vụ cụ thể học sinh cần thực hiện.',
        expectedProduct: 'Sản phẩm học tập dự kiến.',
        steps: {
          transfer: 'GV giao nhiệm vụ.',
          execute: 'HS thực hiện nhiệm vụ.',
          report: 'HS báo cáo, trao đổi.',
          conclude: 'GV nhận xét, chốt kiến thức.',
        },
        teacherPrompts: '',
        studentActions: '',
        groupOrganization: 'Cá nhân / Nhóm',
        assessmentCriteria: 'Đạt yêu cầu nhiệm vụ.',
        commonMistakesAndSupport: '',
        extensionTask: '',
        contingencyPlan: '',
        linkedWorksheetIds: [],
      };
      return { ...curr, activities: [...curr.activities, nextAct] };
    });
    setSelectedActivityId(newId);
  };

  const deleteActivity = (activityId: string) => {
    if (plan.activities.length <= 1) {
      onNotify('Kế hoạch cần giữ ít nhất 1 hoạt động.', 'info');
      return;
    }
    applyChange((curr) => ({
      ...curr,
      activities: curr.activities.filter((a) => a.id !== activityId),
    }));
  };

  const addSession = () => {
    const nextNum =
      plan.sessions.reduce((max, s) => Math.max(max, s.sessionNumber), 0) + 1;
    applyChange((curr) => ({
      ...curr,
      inputSnapshot: {
        ...curr.inputSnapshot,
        periodsCount: curr.sessions.length + 1,
      },
      sessions: [
        ...curr.sessions,
        {
          id: `sess-${Date.now()}`,
          sessionNumber: nextNum,
          title: `Tiết ${nextNum}: Nội dung tiếp theo`,
          durationMinutes: curr.inputSnapshot.minutesPerPeriod,
          overviewNote: '',
        },
      ],
    }));
  };

  const deleteSession = (sessionNumber: number) => {
    if (plan.sessions.length <= 1) {
      onNotify('Kế hoạch phải có ít nhất 1 tiết.', 'info');
      return;
    }
    applyChange((curr) => {
      const remainingActs = curr.activities.filter((a) => a.sessionNumber !== sessionNumber);
      const remainingSessions = curr.sessions.filter((s) => s.sessionNumber !== sessionNumber);
      return {
        ...curr,
        inputSnapshot: {
          ...curr.inputSnapshot,
          periodsCount: remainingSessions.length,
        },
        sessions: remainingSessions,
        activities: remainingActs.length > 0 ? remainingActs : curr.activities.slice(0, 1),
      };
    });
  };

  // AI Partial Activity Edit
  const runAiActivityEdit = async (customCmd?: string) => {
    const instruction = (customCmd ?? aiInstruction).trim();
    if (!instruction) {
      setAiErrorMsg('Vui lòng chọn hoặc nhập yêu cầu chỉnh sửa.');
      return;
    }
    if (!selectedActivityId) return;

    const requestStartTs = Date.now();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiEditing(true);
    setAiErrorMsg('');
    setAiEditProposal(null);

    try {
      const res = await fetch('/api/ai/edit-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          activityId: selectedActivityId,
          instruction,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setAiErrorMsg(data.message || 'Không thể tạo đề xuất chỉnh sửa lúc này.');
        return;
      }
      // Bảo vệ không ghi đè nếu giáo viên vừa sửa trực tiếp trong lúc AI đang chạy
      if (activityDirtyTimestampRef.current > requestStartTs) {
        onNotify(
          'Hoạt động vừa được thầy/cô chỉnh sửa trực tiếp trong lúc AI xử lý. Vui lòng xem kỹ đề xuất trước khi áp dụng.',
          'info'
        );
      }
      setAiEditProposal(data.proposal as AiActivityEditProposal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setAiErrorMsg('Mất kết nối mạng khi gửi yêu cầu AI.');
    } finally {
      setAiEditing(false);
      aiAbortRef.current = null;
    }
  };

  const applyAiProposal = async () => {
    if (!aiEditProposal) return;
    // Lưu phiên bản trước thao tác AI
    const snapshot = createPlanVersionSnapshot(
      plan,
      `Trước khi AI sửa: ${aiEditProposal.updatedActivity.title}`,
      aiEditProposal.changeSummary
    );
    await onSaveVersion(snapshot);

    applyChange((curr) => ({
      ...curr,
      activities: curr.activities.map((a) =>
        a.id === aiEditProposal.activityId ? aiEditProposal.updatedActivity : a
      ),
    }));
    setAiEditProposal(null);
    setAiInstruction('');
    onNotify('Đã áp dụng chỉnh sửa AI và lưu bản sao khôi phục trước đó.', 'success');
  };

  // AI Semantic Quality Review
  const runAiQualityReview = async () => {
    setAiReviewing(true);
    try {
      const res = await fetch('/api/ai/review-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.message || 'Không thể chạy kiểm tra chuyên môn AI.', 'error');
        return;
      }
      setAiReviewIssues(data.issues as ValidationIssue[]);
      onNotify(`Đã hoàn tất rà soát chuyên môn (${data.issues.length} nhận xét).`, 'success');
    } catch {
      onNotify('Lỗi kết nối khi kiểm tra chuyên môn bằng AI.', 'error');
    } finally {
      setAiReviewing(false);
    }
  };

  // AI Grammar & Style Check
  const runGrammarCheck = async () => {
    const controller = new AbortController();
    grammarAbortRef.current = controller;
    setGrammarChecking(true);
    setGrammarError('');

    try {
      const res = await fetch('/api/ai/check-grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          scope: grammarScope,
          activityId: grammarScope === 'single_activity' ? selectedActivityId : undefined,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setGrammarError(data.message || 'Không thể kiểm tra chính tả và diễn đạt lúc này.');
        return;
      }
      const list = (data.suggestions as GrammarStyleSuggestion[]) || [];
      setGrammarSuggestions(list);
      onNotify(
        list.length > 0
          ? `Tìm thấy ${list.length} gợi ý chỉnh sửa ngữ pháp và diễn đạt.`
          : 'Không phát hiện lỗi chính tả hoặc diễn đạt bất thường trong phạm vi đã chọn.',
        'success'
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGrammarError('Lỗi kết nối mạng khi kiểm tra ngữ pháp.');
    } finally {
      setGrammarChecking(false);
      grammarAbortRef.current = null;
    }
  };

  const applySingleGrammarFix = async (suggestion: GrammarStyleSuggestion) => {
    const ver = createPlanVersionSnapshot(
      plan,
      `Trước khi sửa diễn đạt (${suggestion.sectionLabel})`,
      suggestion.explanation
    );
    await onSaveVersion(ver);

    const { updatedPlan, applied } = applyGrammarSuggestionToPlan(plan, suggestion);
    if (!applied) {
      onNotify(
        'Đoạn văn bản gốc đã thay đổi so với lúc kiểm tra. Thầy/cô hãy nhấn Đi đến để kiểm tra trực tiếp.',
        'info'
      );
      return;
    }
    onUpdatePlan({ ...updatedPlan, updatedAt: new Date().toISOString() });
    setUndoStack((prev) => [...prev.slice(-29), JSON.parse(JSON.stringify(plan)) as LessonPlan]);
    setGrammarSuggestions((prev) =>
      prev.map((s) => (s.id === suggestion.id ? { ...s, applied: true } : s))
    );
    onNotify('Đã áp dụng sửa lỗi ngữ pháp/diễn đạt.', 'success');
  };

  const applyAllGrammarFixes = async () => {
    const pending = grammarSuggestions.filter((s) => !s.applied && !s.dismissed);
    if (pending.length === 0) return;

    const ver = createPlanVersionSnapshot(
      plan,
      `Trước khi áp dụng ${pending.length} gợi ý ngữ pháp`,
      'Áp dụng hàng loạt gợi ý chính tả & diễn đạt'
    );
    await onSaveVersion(ver);

    let workingPlan = plan;
    let countApplied = 0;
    const appliedIds = new Set<string>();

    for (const s of pending) {
      const res = applyGrammarSuggestionToPlan(workingPlan, s);
      if (res.applied) {
        workingPlan = res.updatedPlan;
        countApplied += 1;
        appliedIds.add(s.id);
      }
    }

    if (countApplied > 0) {
      setUndoStack((prev) => [...prev.slice(-29), JSON.parse(JSON.stringify(plan)) as LessonPlan]);
      onUpdatePlan({ ...workingPlan, updatedAt: new Date().toISOString() });
      setGrammarSuggestions((prev) =>
        prev.map((s) => (appliedIds.has(s.id) ? { ...s, applied: true } : s))
      );
      onNotify(`Đã áp dụng ${countApplied} gợi ý sửa ngữ pháp & diễn đạt.`, 'success');
    } else {
      onNotify('Không có đoạn văn bản khớp tự động để áp dụng.', 'info');
    }
  };

  const handleQuickExportDocx = async () => {
    try {
      const { fileName, formulaNotice } = await exportLessonPlanToDocx(
        plan,
        settings.defaultExportScope || 'all',
        settings
      );
      onNotify(
        formulaNotice ? `Đã tải ${fileName}. Lưu ý: ${formulaNotice}` : `Đã xuất tệp Word: ${fileName}`,
        'success'
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Lỗi xuất file Word.', 'error');
    }
  };

  const handleRestoreVersion = async (ver: PlanVersion) => {
    const backupCurrent = createPlanVersionSnapshot(
      plan,
      'Tự lưu trước khi khôi phục phiên bản cũ',
      ''
    );
    await onSaveVersion(backupCurrent);
    onUpdatePlan({
      ...JSON.parse(JSON.stringify(ver.snapshot)),
      updatedAt: new Date().toISOString(),
    });
    setConfirmRestoreVer(null);
    setVersionsOpen(false);
    onNotify(`Đã khôi phục về phiên bản: ${ver.label}`, 'success');
  };

  const allIssues = [...codeIssues, ...aiReviewIssues];
  const criticalCount = codeIssues.filter((i) => i.severity === 'can_sua').length;

  return (
    <div className="flex flex-col lg:h-[calc(100vh-57px)] lg:overflow-hidden print:h-auto print:overflow-visible">
      {/* Banner bài minh họa nếu chưa lưu vào thư viện */}
      {plan.isSample && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <span>
            Đang xem <strong>Bài dạy minh họa</strong> (chưa trộn vào thư viện cá nhân).
          </span>
          <button
            type="button"
            onClick={() => onSaveSampleToLibrary(plan)}
            className="rounded-lg bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-700"
          >
            Lưu bài này vào thư viện thật
          </button>
        </div>
      )}

      {/* Thanh công cụ soạn thảo */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            aria-label="Hoàn tác"
            title="Hoàn tác"
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            aria-label="Làm lại"
            title="Làm lại"
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <span className="mx-1 text-xs text-slate-500 dark:text-slate-400">
            {saveStatusText}
          </span>

          <span
            className={`ml-1 text-xs font-medium tabular-nums ${
              durations.differenceMinutes === 0
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            Tổng thời lượng: {durations.actualTotalMinutes}/{durations.expectedTotalMinutes} phút
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium ${
              focusMode
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Focus className="h-3.5 w-3.5" />
            <span>{focusMode ? 'Thoát tập trung' : 'Tập trung'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRightOpen(true);
              setRightTab('quality');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            <span>Kiểm tra ({criticalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRightOpen(true);
              setRightTab('grammar');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <SpellCheck2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Ngữ pháp</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Xem trước</span>
          </button>

          <button
            type="button"
            onClick={handleQuickExportDocx}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Word</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:inline-flex"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In / Lưu PDF</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-label="Thao tác bổ sung"
              title="Thao tác bổ sung"
              className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-10 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    applyChange((c) => ({
                      ...c,
                      status: c.status === 'hoan_thien' ? 'nhap' : 'hoan_thien',
                    }));
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>
                    {plan.status === 'hoan_thien'
                      ? 'Chuyển về trạng thái Nháp'
                      : 'Đánh dấu Đã hoàn thiện'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMoreMenuOpen(false);
                    const ver = createPlanVersionSnapshot(plan, 'Lưu mốc thủ công', '');
                    await onSaveVersion(ver);
                    onNotify('Đã lưu một mốc phiên bản mới.', 'success');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Lưu mốc phiên bản</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setVersionsOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Lịch sử phiên bản ({versions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setMoreMenuOpen(false);
                    await onSaveAsTemplate(plan);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Lưu cấu trúc thành Mẫu riêng</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setRightOpen((v) => !v)}
            aria-label={rightOpen ? 'Đóng bảng Trợ lý & Kiểm tra' : 'Mở bảng Trợ lý & Kiểm tra'}
            title={rightOpen ? 'Đóng bảng phải' : 'Mở bảng phải'}
            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {rightOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bố cục 3 cột */}
      <div className="no-print flex flex-1 overflow-hidden">
        {/* CỘT TRÁI: MỤC LỤC */}
        {!focusMode && (
          <aside className="no-print hidden w-52 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 xl:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Mục lục kế hoạch
            </p>
            <nav aria-label="Mục lục kế hoạch bài dạy" className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => scrollToSection('section-header')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Phần đầu & Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-objectives')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                I. Mục tiêu bài học ({plan.objectives.length})
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-resources')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                II. Thiết bị & Học liệu
              </button>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => scrollToSection('section-sessions')}
                  className="block w-full rounded-lg px-2.5 py-1.5 text-left font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  III. Tiến trình dạy học
                </button>
                <div className="mt-1 space-y-1 pl-3">
                  {plan.activities.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => scrollToSection(`activity-${act.id}`, act.id)}
                      className={`block w-full truncate rounded-lg px-2 py-1 text-left transition-colors ${
                        selectedActivityId === act.id
                          ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      T{act.sessionNumber} · {act.title}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('section-reflection')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                IV. Điều chỉnh sau bài dạy
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-appendix-worksheets')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Phụ lục: Phiếu học tập
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-appendix-questions')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Phụ lục: Câu hỏi & Đáp án
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-appendix-rubrics')}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Phụ lục: Rubric & Đối chiếu
              </button>
            </nav>
          </aside>
        )}

        {/* CỘT GIỮA: NỘI DUNG SOẠN THẢO */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* PHẦN ĐẦU */}
            <section
              id="section-header"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-plan-title" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Tên bài dạy
                  </label>
                  <input
                    id="edit-plan-title"
                    type="text"
                    value={plan.title}
                    onChange={(e) => applyChange((c) => ({ ...c, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="edit-school" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    Trường / Tổ chuyên môn
                  </label>
                  <input
                    id="edit-school"
                    type="text"
                    value={plan.inputSnapshot.schoolName}
                    onChange={(e) =>
                      applyChange((c) => ({
                        ...c,
                        inputSnapshot: { ...c.inputSnapshot, schoolName: e.target.value },
                      }))
                    }
                    placeholder="Tên trường..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="edit-teacher" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    Giáo viên soạn
                  </label>
                  <input
                    id="edit-teacher"
                    type="text"
                    value={plan.inputSnapshot.teacherName}
                    onChange={(e) =>
                      applyChange((c) => ({
                        ...c,
                        inputSnapshot: { ...c.inputSnapshot, teacherName: e.target.value },
                      }))
                    }
                    placeholder="Họ tên giáo viên..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Môn {plan.inputSnapshot.subject} · Lớp {plan.inputSnapshot.grade} · Bộ sách{' '}
                {plan.inputSnapshot.bookSeries} · {plan.inputSnapshot.periodsCount} tiết ×{' '}
                {plan.inputSnapshot.minutesPerPeriod} phút
              </p>
            </section>

            {/* I. MỤC TIÊU */}
            <section
              id="section-objectives"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  I. Mục tiêu bài học
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = plan.objectives.length + 1;
                    applyChange((c) => ({
                      ...c,
                      objectives: [
                        ...c.objectives,
                        {
                          id: `obj-${Date.now()}`,
                          code: `MT${nextNum}`,
                          category: 'kien_thuc',
                          title: '',
                          frameworkCode: '',
                          description: 'Mô tả mục tiêu cần đạt...',
                          sourceType: 'de_xuat',
                          needsConfirmation: false,
                          sourceRef: '',
                        },
                      ],
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm mục tiêu</span>
                </button>
              </div>

              <div className="space-y-3">
                {plan.objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={obj.code}
                          aria-label={`Mã mục tiêu ${obj.code}`}
                          onChange={(e) =>
                            applyChange((c) => ({
                              ...c,
                              objectives: c.objectives.map((o) =>
                                o.id === obj.id ? { ...o, code: e.target.value } : o
                              ),
                            }))
                          }
                          className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
                        />
                        <select
                          value={obj.category}
                          aria-label={`Nhóm mục tiêu ${obj.code}`}
                          onChange={(e) =>
                            applyChange((c) => ({
                              ...c,
                              objectives: c.objectives.map((o) =>
                                o.id === obj.id
                                  ? { ...o, category: e.target.value as LearningObjective['category'] }
                                  : o
                              ),
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="kien_thuc">1.1. Kiến thức</option>
                          <option value="nang_luc_dac_thu">1.2a. Năng lực đặc thù</option>
                          <option value="nang_luc_chung">1.2b. Năng lực chung</option>
                          <option value="pham_chat">1.3. Phẩm chất</option>
                          <option value="tich_hop">Tích hợp khác</option>
                        </select>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {obj.sourceType === 'trich_nguon' ? 'Trích nguồn' : 'AI/GV đề xuất'}
                          {obj.needsConfirmation ? ' · Cần đối chiếu' : ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (plan.objectives.length <= 1) return;
                          applyChange((c) => ({
                            ...c,
                            objectives: c.objectives.filter((o) => o.id !== obj.id),
                          }));
                        }}
                        aria-label={`Xóa mục tiêu ${obj.code}`}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {obj.category !== 'kien_thuc' && (
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          value={obj.title ?? ''}
                          aria-label={`Tên năng lực hoặc phẩm chất ${obj.code}`}
                          placeholder={
                            obj.category === 'pham_chat'
                              ? 'Tên phẩm chất (vd: Trung thực & Trách nhiệm)'
                              : obj.category === 'nang_luc_chung'
                              ? 'Tên năng lực chung (vd: Năng lực tự chủ và tự học)'
                              : 'Tên năng lực (vd: Năng lực Tương tác thông qua công nghệ số)'
                          }
                          onChange={(e) =>
                            applyChange((c) => ({
                              ...c,
                              objectives: c.objectives.map((o) =>
                                o.id === obj.id ? { ...o, title: e.target.value } : o
                              ),
                            }))
                          }
                          className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${
                            obj.category === 'nang_luc_dac_thu' ||
                            obj.category === 'tich_hop' ||
                            Boolean(obj.frameworkCode)
                              ? 'sm:col-span-2'
                              : 'sm:col-span-3'
                          }`}
                        />
                        {(obj.category === 'nang_luc_dac_thu' ||
                          obj.category === 'tich_hop' ||
                          Boolean(obj.frameworkCode)) && (
                          <input
                            type="text"
                            value={obj.frameworkCode ?? ''}
                            aria-label={`Mã khung chuẩn ${obj.code}`}
                            placeholder="Mã khung (vd: 2.1.NC1a, 10.C3.1)"
                            onChange={(e) =>
                              applyChange((c) => ({
                                ...c,
                                objectives: c.objectives.map((o) =>
                                  o.id === obj.id ? { ...o, frameworkCode: e.target.value } : o
                                ),
                              }))
                            }
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          />
                        )}
                      </div>
                    )}
                    <textarea
                      rows={2}
                      value={obj.description}
                      aria-label={`Nội dung mục tiêu ${obj.code}`}
                      onChange={(e) =>
                        applyChange((c) => ({
                          ...c,
                          objectives: c.objectives.map((o) =>
                            o.id === obj.id ? { ...o, description: e.target.value } : o
                          ),
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* II. THIẾT BỊ VÀ HỌC LIỆU */}
            <section
              id="section-resources"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  II. Thiết bị dạy học và học liệu
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    applyChange((c) => ({
                      ...c,
                      resources: [
                        ...c.resources,
                        {
                          id: `res-${Date.now()}`,
                          actor: 'gv',
                          item: 'Học liệu bổ sung...',
                          usedInActivities: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm học liệu</span>
                </button>
              </div>
              <div className="space-y-2">
                {plan.resources.map((res) => (
                  <div key={res.id} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <select
                      value={res.actor}
                      aria-label="Đối tượng chuẩn bị"
                      onChange={(e) =>
                        applyChange((c) => ({
                          ...c,
                          resources: c.resources.map((r) =>
                            r.id === res.id
                              ? { ...r, actor: e.target.value as 'gv' | 'hs' }
                              : r
                          ),
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:col-span-2 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="gv">Giáo viên</option>
                      <option value="hs">Học sinh</option>
                    </select>
                    <input
                      type="text"
                      value={res.item}
                      aria-label="Tên thiết bị / học liệu"
                      onChange={(e) =>
                        applyChange((c) => ({
                          ...c,
                          resources: c.resources.map((r) =>
                            r.id === res.id ? { ...r, item: e.target.value } : r
                          ),
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm sm:col-span-6 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={res.usedInActivities}
                      placeholder="Dùng ở hoạt động..."
                      aria-label="Nơi sử dụng"
                      onChange={(e) =>
                        applyChange((c) => ({
                          ...c,
                          resources: c.resources.map((r) =>
                            r.id === res.id ? { ...r, usedInActivities: e.target.value } : r
                          ),
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:col-span-3 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        applyChange((c) => ({
                          ...c,
                          resources: c.resources.filter((r) => r.id !== res.id),
                        }))
                      }
                      aria-label="Xóa học liệu"
                      className="flex items-center justify-center rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:col-span-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* III. TIẾN TRÌNH DẠY HỌC */}
            <section id="section-sessions" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  III. Tiến trình dạy học
                </h2>
                <button
                  type="button"
                  onClick={addSession}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm tiết</span>
                </button>
              </div>

              {plan.sessions.map((sess) => {
                const sessStats = durations.perSession.find(
                  (s) => s.sessionNumber === sess.sessionNumber
                );
                const sessActivities = plan.activities
                  .filter((a) => a.sessionNumber === sess.sessionNumber)
                  .sort((a, b) => a.order - b.order);

                return (
                  <div
                    key={sess.id}
                    id={`session-${sess.sessionNumber}`}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <input
                        type="text"
                        value={sess.title}
                        aria-label={`Tiêu đề tiết ${sess.sessionNumber}`}
                        onChange={(e) =>
                          applyChange((c) => ({
                            ...c,
                            sessions: c.sessions.map((s) =>
                              s.id === sess.id ? { ...s, title: e.target.value } : s
                            ),
                          }))
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
                      />
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            sessStats && sessStats.differenceMinutes === 0
                              ? 'text-teal-700 dark:text-teal-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {sessStats?.actualMinutes ?? 0}/{sess.durationMinutes} phút
                        </span>
                        <button
                          type="button"
                          onClick={() => addActivityToSession(sess.sessionNumber)}
                          className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm hoạt động</span>
                        </button>
                        {plan.sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteSession(sess.sessionNumber)}
                            aria-label={`Xóa tiết ${sess.sessionNumber}`}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {sessActivities.map((act, idx) => {
                        const isSelected = selectedActivityId === act.id;
                        return (
                          <div
                            key={act.id}
                            id={`activity-${act.id}`}
                            onClick={() => setSelectedActivityId(act.id)}
                            className={`space-y-3 rounded-xl border p-4 transition-colors ${
                              isSelected
                                ? 'border-indigo-400 bg-indigo-50/20 dark:border-indigo-700 dark:bg-indigo-950/15'
                                : 'border-slate-200 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-800/30'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <input
                                type="text"
                                value={act.title}
                                aria-label={`Tên hoạt động ${act.title}`}
                                onChange={(e) => updateActivity(act.id, { title: e.target.value })}
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
                              />
                              <div className="flex items-center gap-1.5">
                                <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                                  <span>Phút:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={act.durationMinutes}
                                    onChange={(e) =>
                                      updateActivity(act.id, {
                                        durationMinutes: Math.max(1, Number(e.target.value) || 1),
                                      })
                                    }
                                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold tabular-nums dark:border-slate-700 dark:bg-slate-900"
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveActivity(act.id, -1);
                                  }}
                                  aria-label="Chuyển hoạt động lên"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white disabled:opacity-40 dark:hover:bg-slate-800"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === sessActivities.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveActivity(act.id, 1);
                                  }}
                                  aria-label="Chuyển hoạt động xuống"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white disabled:opacity-40 dark:hover:bg-slate-800"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedActivityId(act.id);
                                    setRightOpen(true);
                                    setRightTab('assistant');
                                  }}
                                  title="Sửa hoạt động này bằng AI"
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                                >
                                  <Wand2 className="h-3.5 w-3.5" />
                                  <span>AI sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteActivity(act.id);
                                  }}
                                  aria-label={`Xóa ${act.title}`}
                                  className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Liên kết mục tiêu */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400">Mục tiêu liên kết:</span>
                              {plan.objectives.map((obj) => {
                                const checked = act.objectiveIds.includes(obj.id);
                                return (
                                  <label
                                    key={obj.id}
                                    title={
                                      obj.title
                                        ? `${obj.title}${obj.frameworkCode ? ` (Mã ${obj.frameworkCode})` : ''}: ${obj.description}`
                                        : obj.description
                                    }
                                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-0.5 ${
                                      checked
                                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200'
                                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const nextIds = e.target.checked
                                          ? [...act.objectiveIds, obj.id]
                                          : act.objectiveIds.filter((x) => x !== obj.id);
                                        updateActivity(act.id, { objectiveIds: nextIds });
                                      }}
                                      className="sr-only"
                                    />
                                    <span>{obj.code}</span>
                                  </label>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                  Nội dung nhiệm vụ
                                </label>
                                <textarea
                                  rows={3}
                                  value={act.taskContent}
                                  onChange={(e) =>
                                    updateActivity(act.id, { taskContent: e.target.value })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                                  Sản phẩm dự kiến
                                </label>
                                <textarea
                                  rows={3}
                                  value={act.expectedProduct}
                                  onChange={(e) =>
                                    updateActivity(act.id, { expectedProduct: e.target.value })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            </div>

                            {/* 4 bước tổ chức thực hiện */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                  1. Chuyển giao nhiệm vụ
                                </label>
                                <textarea
                                  rows={2}
                                  value={act.steps.transfer}
                                  onChange={(e) =>
                                    updateActivity(act.id, {
                                      steps: { ...act.steps, transfer: e.target.value },
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                  2. Thực hiện nhiệm vụ
                                </label>
                                <textarea
                                  rows={2}
                                  value={act.steps.execute}
                                  onChange={(e) =>
                                    updateActivity(act.id, {
                                      steps: { ...act.steps, execute: e.target.value },
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                  3. Báo cáo, thảo luận
                                </label>
                                <textarea
                                  rows={2}
                                  value={act.steps.report}
                                  onChange={(e) =>
                                    updateActivity(act.id, {
                                      steps: { ...act.steps, report: e.target.value },
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                  4. Kết luận, nhận định
                                </label>
                                <textarea
                                  rows={2}
                                  value={act.steps.conclude}
                                  onChange={(e) =>
                                    updateActivity(act.id, {
                                      steps: { ...act.steps, conclude: e.target.value },
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                  Câu hỏi / lệnh cụ thể của giáo viên
                                </label>
                                <textarea
                                  rows={2}
                                  value={act.teacherPrompts}
                                  onChange={(e) =>
                                    updateActivity(act.id, { teacherPrompts: e.target.value })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                                  Đánh giá & Dự kiến sai lầm / Hỗ trợ
                                </label>
                                <textarea
                                  rows={2}
                                  value={act.commonMistakesAndSupport}
                                  onChange={(e) =>
                                    updateActivity(act.id, {
                                      commonMistakesAndSupport: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Nhiệm vụ về nhà */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <label htmlFor="edit-homework" className="mb-1.5 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Nhiệm vụ về nhà (tách riêng)
                </label>
                <textarea
                  id="edit-homework"
                  rows={2}
                  value={plan.homework}
                  onChange={(e) => applyChange((c) => ({ ...c, homework: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </section>

            {/* IV. ĐIỀU CHỈNH SAU BÀI DẠY */}
            <section
              id="section-reflection"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <label htmlFor="edit-reflection" className="mb-1.5 block text-base font-semibold text-slate-900 dark:text-slate-100">
                IV. Điều chỉnh sau bài dạy
              </label>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Phần này dành cho giáo viên ghi nhận thực tế sau khi giảng dạy trên lớp.
              </p>
              <textarea
                id="edit-reflection"
                rows={3}
                value={plan.postLessonReflection}
                onChange={(e) =>
                  applyChange((c) => ({ ...c, postLessonReflection: e.target.value }))
                }
                placeholder="Ghi chú mức độ phù hợp thời gian, điểm học sinh còn lúng túng..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </section>

            {/* PHỤ LỤC: PHIẾU HỌC TẬP */}
            <section
              id="section-appendix-worksheets"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Phụ lục 1. Phiếu học tập học sinh ({plan.worksheets.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    applyChange((c) => ({
                      ...c,
                      worksheets: [
                        ...c.worksheets,
                        {
                          id: `ws-${Date.now()}`,
                          title: `Phiếu học tập số ${c.worksheets.length + 1}`,
                          mode: 'ca_nhan',
                          linkedActivityId: selectedActivityId,
                          instructions: 'Đọc kỹ yêu cầu và hoàn thành trong thời gian quy định.',
                          tasks: ['Câu hỏi / nhiệm vụ 1...'],
                          answerGuide: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm phiếu</span>
                </button>
              </div>
              {plan.worksheets.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chưa có phiếu học tập nào. Thầy/cô có thể thêm phiếu hoặc nhờ AI tạo.
                </p>
              ) : (
                <div className="space-y-4">
                  {plan.worksheets.map((ws) => (
                    <div key={ws.id} className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={ws.title}
                          onChange={(e) =>
                            applyChange((c) => ({
                              ...c,
                              worksheets: c.worksheets.map((w) =>
                                w.id === ws.id ? { ...w, title: e.target.value } : w
                              ),
                            }))
                          }
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            applyChange((c) => ({
                              ...c,
                              worksheets: c.worksheets.filter((w) => w.id !== ws.id),
                            }))
                          }
                          aria-label={`Xóa ${ws.title}`}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={ws.tasks.join('\n')}
                        onChange={(e) =>
                          applyChange((c) => ({
                            ...c,
                            worksheets: c.worksheets.map((w) =>
                              w.id === ws.id
                                ? { ...w, tasks: e.target.value.split('\n') }
                                : w
                            ),
                          }))
                        }
                        placeholder="Mỗi dòng một nhiệm vụ trong phiếu..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PHỤ LỤC: CÂU HỎI & ĐÁP ÁN */}
            <section
              id="section-appendix-questions"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Phụ lục 2. Câu hỏi củng cố & Đáp án ({plan.questions.length})
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    applyChange((c) => ({
                      ...c,
                      questions: [
                        ...c.questions,
                        {
                          id: `q-${Date.now()}`,
                          type: 'trac_nghiem',
                          prompt: 'Nội dung câu hỏi...',
                          options: ['A. ', 'B. ', 'C. ', 'D. '],
                          correctAnswerOrGuide: 'A',
                          linkedObjectiveIds: [],
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Thêm câu hỏi</span>
                </button>
              </div>
              <div className="space-y-3">
                {plan.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Câu {idx + 1} ({q.type === 'trac_nghiem' ? 'Trắc nghiệm' : 'Tự luận'})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          applyChange((c) => ({
                            ...c,
                            questions: c.questions.filter((item) => item.id !== q.id),
                          }))
                        }
                        aria-label={`Xóa câu ${idx + 1}`}
                        className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) =>
                        applyChange((c) => ({
                          ...c,
                          questions: c.questions.map((item) =>
                            item.id === q.id ? { ...item, prompt: e.target.value } : item
                          ),
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={q.correctAnswerOrGuide}
                      placeholder="Đáp án / Hướng dẫn trả lời"
                      onChange={(e) =>
                        applyChange((c) => ({
                          ...c,
                          questions: c.questions.map((item) =>
                            item.id === q.id
                              ? { ...item, correctAnswerOrGuide: e.target.value }
                              : item
                          ),
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* PHỤ LỤC: RUBRIC & ĐỐI CHIẾU */}
            <section
              id="section-appendix-rubrics"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                Phụ lục 3. Rubric đánh giá & Nguồn tham khảo
              </h2>
              {plan.rubrics.map((rub) => (
                <div key={rub.id} className="mb-4 overflow-x-auto">
                  <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {rub.title}
                  </p>
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <th className="p-2">Tiêu chí</th>
                        <th className="p-2">Tỉ trọng (%)</th>
                        <th className="p-2">Mức Tốt</th>
                        <th className="p-2">Mức Đạt</th>
                        <th className="p-2">Cần cố gắng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rub.criteria.map((cr) => (
                        <tr key={cr.id}>
                          <td className="p-2">{cr.criterion}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={cr.weightPercent}
                              aria-label={`Tỉ trọng ${cr.criterion}`}
                              onChange={(e) =>
                                applyChange((c) => ({
                                  ...c,
                                  rubrics: c.rubrics.map((r) =>
                                    r.id === rub.id
                                      ? {
                                          ...r,
                                          criteria: r.criteria.map((x) =>
                                            x.id === cr.id
                                              ? { ...x, weightPercent: Number(e.target.value) || 0 }
                                              : x
                                          ),
                                        }
                                      : r
                                  ),
                                }))
                              }
                              className="w-16 rounded border border-slate-200 bg-white px-2 py-1 tabular-nums dark:border-slate-700 dark:bg-slate-800"
                            />
                          </td>
                          <td className="p-2">{cr.levelGood}</td>
                          <td className="p-2">{cr.levelPass}</td>
                          <td className="p-2">{cr.levelNeedWork}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div id="section-appendix-sources" className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Điểm cần giáo viên xác nhận / đối chiếu ({plan.itemsNeedingConfirmation.length})
                </p>
                {plan.itemsNeedingConfirmation.length === 0 ? (
                  <p className="text-slate-500">Không có ghi chú cần đối chiếu thêm.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                    {plan.itemsNeedingConfirmation.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* CỘT PHẢI: TRỢ LÝ AI, KIỂM TRA CHẤT LƯỢNG & NGỮ PHÁP */}
        {rightOpen && (
          <>
            <div
              className="no-print fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
              onClick={() => setRightOpen(false)}
              aria-hidden="true"
            />
            <aside className="no-print fixed inset-y-0 right-0 z-40 flex w-full max-w-sm shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 lg:static lg:z-auto lg:w-[352px] lg:max-w-none lg:shadow-none">
              {/* Tab chuyển đổi */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="grid flex-1 grid-cols-3 gap-1" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'quality'}
                    onClick={() => setRightTab('quality')}
                    className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
                      rightTab === 'quality'
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-indigo-300 dark:ring-slate-700'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                    }`}
                  >
                    Kiểm tra ({allIssues.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'grammar'}
                    onClick={() => setRightTab('grammar')}
                    className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
                      rightTab === 'grammar'
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-indigo-300 dark:ring-slate-700'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                    }`}
                  >
                    Ngữ pháp
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'assistant'}
                    onClick={() => setRightTab('assistant')}
                    className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
                      rightTab === 'assistant'
                        ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-indigo-300 dark:ring-slate-700'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                    }`}
                  >
                    Trợ lý AI
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Đóng bảng phải"
                  title="Đóng bảng phải"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* TAB 1: KIỂM TRA CHẤT LƯỢNG */}
              {rightTab === 'quality' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Kiểm tra logic bằng mã ({codeIssues.length})
                    </p>
                    <button
                      type="button"
                      disabled={aiReviewing || (aiStatus !== null && !aiStatus.configured)}
                      onClick={runAiQualityReview}
                      className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                      {aiReviewing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{aiReviewing ? 'Đang rà soát...' : 'Nhận xét chuyên môn AI'}</span>
                    </button>
                  </div>

                  {aiStatus && !aiStatus.configured && (
                    <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Cần cấu hình kết nối AI để dùng chức năng nhận xét chuyên môn bằng AI. Phần kiểm tra logic bằng mã vẫn hoạt động bình thường.
                    </p>
                  )}

                  {allIssues.length === 0 ? (
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
                      <p className="font-semibold">Không phát hiện lỗi cấu trúc hay thời lượng</p>
                      <p className="mt-1 opacity-90">
                        Tổng thời lượng khớp, các mục tiêu và phụ lục đều liên kết hợp lệ.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                issue.severity === 'can_sua'
                                  ? 'text-rose-700 dark:text-rose-400'
                                  : issue.severity === 'can_xac_nhan'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-teal-700 dark:text-teal-400'
                              }`}
                            >
                              {issue.severity === 'can_sua' ? (
                                <AlertCircle className="h-3.5 w-3.5" />
                              ) : issue.severity === 'can_xac_nhan' ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <Info className="h-3.5 w-3.5" />
                              )}
                              {issue.severity === 'can_sua'
                                ? 'Cần sửa'
                                : issue.severity === 'can_xac_nhan'
                                ? 'Cần xác nhận'
                                : 'Gợi ý cải thiện'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {issue.origin === 'code' ? 'Kiểm tra mã' : 'Nhận xét AI'}
                            </span>
                          </div>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {issue.title}
                          </p>
                          <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                            {issue.description}
                          </p>
                          {issue.reason && (
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              Lý do: {issue.reason}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">{issue.locationLabel}</span>
                            <button
                              type="button"
                              onClick={() =>
                                scrollToSection(issue.targetSectionId, issue.targetActivityId)
                              }
                              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              Đi đến nội dung
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Lưu ý: Công cụ kiểm tra hỗ trợ phát hiện thiếu sót kỹ thuật và gợi ý sư phạm; giáo viên là người quyết định cuối cùng và đối chiếu theo kế hoạch tổ chuyên môn.
                  </p>
                </div>
              )}

              {/* TAB 2: KIỂM TRA NGỮ PHÁP & DIỄN ĐẠT TIẾNG VIỆT (AI) */}
              {rightTab === 'grammar' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Kiểm tra chính tả, ngữ pháp & diễn đạt
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Phân tích lỗi chính tả, câu trúc chưa tự nhiên hoặc câu lệnh chưa rõ bằng tiếng Việt.
                    </p>
                  </div>

                  {aiStatus && !aiStatus.configured && (
                    <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Cần cấu hình kết nối AI trên máy chủ để sử dụng kiểm tra ngữ pháp và diễn đạt bằng AI.
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="grammar-scope-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Phạm vi kiểm tra
                    </label>
                    <select
                      id="grammar-scope-select"
                      value={grammarScope}
                      onChange={(e) => setGrammarScope(e.target.value as GrammarCheckScope)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="all">Toàn bộ kế hoạch bài dạy</option>
                      <option value="objectives">I. Mục tiêu bài học</option>
                      <option value="activities">III. Tiến trình các hoạt động</option>
                      <option value="single_activity">Hoạt động đang chọn</option>
                      <option value="appendix">Phụ lục (Phiếu & Câu hỏi)</option>
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={grammarChecking || (aiStatus !== null && !aiStatus.configured)}
                        onClick={runGrammarCheck}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {grammarChecking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <SpellCheck2 className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {grammarChecking ? 'Đang kiểm tra...' : 'Kiểm tra ngữ pháp & diễn đạt'}
                        </span>
                      </button>
                      {grammarChecking && (
                        <button
                          type="button"
                          onClick={() => grammarAbortRef.current?.abort()}
                          aria-label="Dừng kiểm tra ngữ pháp"
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>

                  {grammarError && (
                    <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                      {grammarError}
                    </div>
                  )}

                  {grammarSuggestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Gợi ý ({grammarSuggestions.filter((s) => !s.dismissed).length})
                        </span>
                        {grammarSuggestions.some((s) => !s.applied && !s.dismissed) && (
                          <button
                            type="button"
                            onClick={applyAllGrammarFixes}
                            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            Áp dụng tất cả
                          </button>
                        )}
                      </div>

                      {grammarSuggestions
                        .filter((s) => !s.dismissed)
                        .map((s) => (
                          <div
                            key={s.id}
                            className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/40"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                                {s.category === 'chinh_ta'
                                  ? 'Chính tả'
                                  : s.category === 'ngu_phap'
                                  ? 'Ngữ pháp'
                                  : 'Diễn đạt'}
                              </span>
                              <span className="truncate text-[11px] text-slate-500">
                                {s.sectionLabel}
                              </span>
                            </div>

                            <div className="space-y-1 rounded-lg bg-white p-2 dark:bg-slate-900">
                              <p className="text-rose-700 line-through dark:text-rose-400">
                                {s.originalText}
                              </p>
                              <p className="font-medium text-teal-700 dark:text-teal-400">
                                → {s.suggestedText}
                              </p>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300">{s.explanation}</p>

                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => scrollToSection(s.sectionId, s.targetActivityId)}
                                className="font-medium text-slate-600 hover:underline dark:text-slate-300"
                              >
                                Đi đến
                              </button>
                              {s.applied ? (
                                <span className="font-medium text-teal-700 dark:text-teal-400">
                                  Đã áp dụng
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setGrammarSuggestions((prev) =>
                                        prev.map((x) =>
                                          x.id === s.id ? { ...x, dismissed: true } : x
                                        )
                                      )
                                    }
                                    className="text-slate-500 hover:text-slate-700"
                                  >
                                    Bỏ qua
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applySingleGrammarFix(s)}
                                    className="rounded-lg bg-indigo-600 px-2.5 py-1 font-medium text-white hover:bg-indigo-700"
                                  >
                                    Áp dụng sửa
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TRỢ LÝ AI CHỈNH SỬA HOẠT ĐỘNG */}
              {rightTab === 'assistant' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ai-target-act" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Hoạt động đang chọn
                    </label>
                    <select
                      id="ai-target-act"
                      value={selectedActivityId}
                      onChange={(e) => setSelectedActivityId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {plan.activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          Tiết {a.sessionNumber}: {a.title} ({a.durationMinutes}p)
                        </option>
                      ))}
                    </select>
                  </div>

                  {aiStatus && !aiStatus.configured && (
                    <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Cần cấu hình kết nối AI trên máy chủ để sử dụng trợ lý chỉnh sửa từng phần.
                    </div>
                  )}

                  <div>
                    <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Lệnh chỉnh sửa nhanh
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {AI_QUICK_COMMANDS.map((cmd) => (
                        <button
                          key={cmd}
                          type="button"
                          disabled={aiEditing || (aiStatus !== null && !aiStatus.configured)}
                          onClick={() => {
                            setAiInstruction(cmd);
                            runAiActivityEdit(cmd);
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ai-custom-cmd" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Hoặc nhập yêu cầu riêng
                    </label>
                    <textarea
                      id="ai-custom-cmd"
                      rows={3}
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      placeholder="Ví dụ: Đổi ví dụ sang bối cảnh nông nghiệp địa phương và giảm xuống còn 10 phút..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={aiEditing || (aiStatus !== null && !aiStatus.configured)}
                        onClick={() => runAiActivityEdit()}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {aiEditing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                        <span>{aiEditing ? 'Đang tạo đề xuất...' : 'Tạo đề xuất sửa'}</span>
                      </button>
                      {aiEditing && (
                        <button
                          type="button"
                          onClick={() => aiAbortRef.current?.abort()}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                        >
                          Dừng
                        </button>
                      )}
                    </div>
                  </div>

                  {aiErrorMsg && (
                    <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                      {aiErrorMsg}
                    </div>
                  )}

                  {/* Xem trước đề xuất trước khi áp dụng */}
                  {aiEditProposal && (
                    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 text-xs dark:border-indigo-800 dark:bg-indigo-950/30">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                        Đề xuất chỉnh sửa cho hoạt động
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        {aiEditProposal.changeSummary}
                      </p>
                      {aiEditProposal.durationImpactMinutes !== 0 && (
                        <p className="font-medium text-amber-700 dark:text-amber-300">
                          Thay đổi thời lượng:{' '}
                          {aiEditProposal.durationImpactMinutes > 0 ? '+' : ''}
                          {aiEditProposal.durationImpactMinutes} phút
                        </p>
                      )}
                      {aiEditProposal.objectiveImpactNote && (
                        <p className="text-slate-600 dark:text-slate-400">
                          Mục tiêu: {aiEditProposal.objectiveImpactNote}
                        </p>
                      )}
                      <div className="space-y-1 rounded-lg bg-white p-2.5 dark:bg-slate-900">
                        <p className="font-semibold">{aiEditProposal.updatedActivity.title}</p>
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Nhiệm vụ mới:</strong> {aiEditProposal.updatedActivity.taskContent}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Sản phẩm:</strong> {aiEditProposal.updatedActivity.expectedProduct}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={applyAiProposal}
                          className="flex-1 rounded-xl bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
                        >
                          Áp dụng
                        </button>
                        <button
                          type="button"
                          onClick={() => runAiActivityEdit()}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          Thử lại
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiEditProposal(null)}
                          className="rounded-xl px-2.5 py-1.5 text-slate-500 hover:text-slate-800"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </aside>
          </>
        )}
      </div>

      {/* Modal Lịch sử phiên bản */}
      {versionsOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Lịch sử phiên bản kế hoạch"
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold">Lịch sử phiên bản ({versions.length})</h2>
              <button
                type="button"
                onClick={() => setVersionsOpen(false)}
                className="rounded-lg px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {versions.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  Chưa có bản sao lưu phiên bản nào. Hệ thống tự động lưu trước các thao tác AI hoặc khi thầy/cô bấm Lưu mốc phiên bản.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {versions.map((ver) => (
                    <li
                      key={ver.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {ver.label}
                        </p>
                        <p className="text-slate-500">
                          {new Date(ver.createdAt).toLocaleString('vi-VN')}
                        </p>
                        {ver.summary && <p className="mt-0.5 text-slate-600 dark:text-slate-300">{ver.summary}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreVer(ver)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Khôi phục</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmRestoreVer)}
        title="Khôi phục phiên bản cũ?"
        description="Hệ thống sẽ tự động lưu lại trạng thái hiện tại thành một mốc dự phòng trước khi khôi phục phiên bản thầy/cô đã chọn."
        confirmLabel="Khôi phục"
        onConfirm={() => confirmRestoreVer && handleRestoreVersion(confirmRestoreVer)}
        onCancel={() => setConfirmRestoreVer(null)}
      />

      <A4PreviewModal
        open={previewOpen}
        plan={plan}
        settings={settings}
        onClose={() => setPreviewOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
}
